import { Document } from "@langchain/core/documents";
import { and, eq } from "drizzle-orm";
import { PDFParse } from "pdf-parse";
import type { JobWithMetadata } from "pg-boss";
import { db } from "@/db/index";
import { sources, type PdfSourceMetadata } from "@/db/models/source";
import { embeddings } from "@/lib/embeddings";
import { getMinioBucket, getMinioClient } from "@/lib/minio";
import {
  EMBED_BATCH_SIZE,
  filterValidChunks,
  limitChunks,
  MAX_EXTRACTED_CHARS,
  splitDocuments,
} from "@/features/sources/pipeline/chunker";
import { upsertChunks } from "@/features/sources/pipeline/qdrantUpsert";
import {
  isRetryableJob,
  markIndexingStatus,
} from "@/features/sources/lib/jobs";

type IndexPdfJobData = {
  sourceId: string;
};

function capPagesByCharacterBudget(
  pages: { num: number; text: string }[],
  budget: number,
) {
  const capped: { num: number; text: string }[] = [];
  let used = 0;
  let truncated = false;

  for (const page of pages) {
    if (used >= budget) {
      truncated = true;
      break;
    }

    const remaining = budget - used;
    if (page.text.length <= remaining) {
      capped.push(page);
      used += page.text.length;
      continue;
    }

    capped.push({
      num: page.num,
      text: page.text.slice(0, remaining),
    });
    used = budget;
    truncated = true;
    break;
  }

  return { capped, truncated, indexedCharacterCount: used };
}

export async function indexPdfJob(jobs: JobWithMetadata<IndexPdfJobData>[]) {
  const [job] = jobs;
  if (!job) return;

  const { sourceId } = job.data;
  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.status, "active")))
    .limit(1);

  if (!source || source.type !== "pdf") {
    return;
  }

  await markIndexingStatus(sourceId, "indexing");

  try {
    const metadata = source.metadata as PdfSourceMetadata;
    const objectStream = await getMinioClient().getObject(
      getMinioBucket(),
      metadata.storageKey,
    );

    const chunks: Buffer[] = [];
    for await (const chunk of objectStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    await parser.destroy().catch(() => undefined);

    const {
      capped,
      truncated,
      indexedCharacterCount,
    } = capPagesByCharacterBudget(textResult.pages, MAX_EXTRACTED_CHARS);

    const docs = capped.map(
      (page) =>
        new Document({
          pageContent: page.text,
          metadata: {
            sourceId,
            notebookId: source.notebookId,
            pageNumber: page.num,
          },
        }),
    );

    const split = limitChunks(
      filterValidChunks(await splitDocuments(docs)),
    );

    for (let i = 0; i < split.length; i += EMBED_BATCH_SIZE) {
      const batch = split.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await embeddings.embedDocuments(
        batch.map((chunk) => chunk.pageContent),
      );

      await upsertChunks({
        sourceId,
        notebookId: source.notebookId,
        sourceType: "pdf",
        chunks: batch.map((chunk, index) => ({
          content: chunk.pageContent,
          embedding: vectors[index],
          metadata: {
            pageNumber:
              typeof chunk.metadata.pageNumber === "number"
                ? chunk.metadata.pageNumber
                : undefined,
          },
        })),
      });
    }

    await db
      .update(sources)
      .set({
        indexingStatus: "indexed",
        metadata: {
          ...metadata,
          pageCount: textResult.total,
          truncated,
          indexedCharacterCount,
          indexedChunkCount: split.length,
        },
      })
      .where(and(eq(sources.id, sourceId), eq(sources.status, "active")));
  } catch (error) {
    await markIndexingStatus(
      sourceId,
      isRetryableJob(job) ? "retrying" : "failed",
    );
    throw error;
  }
}

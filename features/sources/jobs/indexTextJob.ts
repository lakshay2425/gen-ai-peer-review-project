import { Document } from "@langchain/core/documents";
import { and, eq } from "drizzle-orm";
import type { JobWithMetadata } from "pg-boss";
import { db } from "@/db/index";
import { sources, type TextSourceMetadata } from "@/db/models/source";
import { embeddings } from "@/lib/embeddings";
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

type IndexTextJobData = {
  sourceId: string;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

export async function indexTextJob(
  jobs: JobWithMetadata<IndexTextJobData>[],
) {
  const [job] = jobs;
  if (!job) {
    console.warn("[index-text] received empty job batch");
    return;
  }

  const { sourceId } = job.data;
  console.log(
    `[index-text] start sourceId=${sourceId} jobId=${job.id} attempt=${job.retryCount + 1}/${job.retryLimit + 1}`,
  );

  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.status, "active")))
    .limit(1);

  if (!source || source.type !== "text") {
    console.warn(
      `[index-text] skip sourceId=${sourceId} reason=${
        !source ? "not_found_or_inactive" : `wrong_type:${source.type}`
      }`,
    );
    return;
  }

  await markIndexingStatus(sourceId, "indexing");
  console.log(`[index-text] status=indexing sourceId=${sourceId}`);

  try {
    const metadata = source.metadata as TextSourceMetadata;
    if (!metadata?.content) {
      throw new Error("Text source metadata.content is missing or empty");
    }

    const content = metadata.content.slice(0, MAX_EXTRACTED_CHARS);
    console.log(
      `[index-text] contentChars=${metadata.content.length} cappedChars=${content.length}`,
    );

    const docs = [
      new Document({
        pageContent: content,
        metadata: {
          sourceId,
          notebookId: source.notebookId,
        },
      }),
    ];

    const chunks = limitChunks(filterValidChunks(await splitDocuments(docs)));
    console.log(`[index-text] chunks=${chunks.length}`);

    if (chunks.length === 0) {
      throw new Error("No valid chunks produced from text content");
    }

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      console.log(
        `[index-text] embedding batch ${i / EMBED_BATCH_SIZE + 1} size=${batch.length}`,
      );

      const vectors = await embeddings.embedDocuments(
        batch.map((chunk) => chunk.pageContent),
      );
      console.log(
        `[index-text] embeddings received batch=${i / EMBED_BATCH_SIZE + 1} vectors=${vectors.length}`,
      );

      await upsertChunks({
        sourceId,
        notebookId: source.notebookId,
        sourceType: "text",
        chunks: batch.map((chunk, index) => ({
          content: chunk.pageContent,
          embedding: vectors[index],
          metadata: {},
        })),
      });
      console.log(
        `[index-text] upserted batch ${i / EMBED_BATCH_SIZE + 1} to Qdrant`,
      );
    }

    await markIndexingStatus(sourceId, "indexed");
    console.log(`[index-text] success sourceId=${sourceId} status=indexed`);
  } catch (error) {
    const nextStatus = isRetryableJob(job) ? "retrying" : "failed";
    console.error(
      `[index-text] error sourceId=${sourceId} nextStatus=${nextStatus} attempt=${job.retryCount + 1}/${job.retryLimit + 1}`,
      formatError(error),
    );
    console.error(error);
    await markIndexingStatus(sourceId, nextStatus);
    throw error;
  }
}

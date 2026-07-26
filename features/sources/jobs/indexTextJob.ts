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

export async function indexTextJob(
  jobs: JobWithMetadata<IndexTextJobData>[],
) {
  const [job] = jobs;
  if (!job) return;

  const { sourceId } = job.data;

  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.status, "active")))
    .limit(1);

  if (!source || source.type !== "text") {
    return;
  }

  await markIndexingStatus(sourceId, "indexing");

  try {
    const metadata = source.metadata as TextSourceMetadata;
    const content = metadata.content.slice(0, MAX_EXTRACTED_CHARS);

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

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await embeddings.embedDocuments(
        batch.map((chunk) => chunk.pageContent),
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
    }

    await markIndexingStatus(sourceId, "indexed");
  } catch (error) {
    await markIndexingStatus(
      sourceId,
      isRetryableJob(job) ? "retrying" : "failed",
    );
    throw error;
  }
}

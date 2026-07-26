import { Document } from "@langchain/core/documents";
import { and, eq } from "drizzle-orm";
import type { JobWithMetadata } from "pg-boss";
import { fetchTranscript } from "youtube-transcript";
import { db } from "@/db/index";
import { sources, type YoutubeSourceMetadata } from "@/db/models/source";
import { embeddings } from "@/lib/embeddings";
import {
  EMBED_BATCH_SIZE,
  filterValidChunks,
  limitChunks,
} from "@/features/sources/pipeline/chunker";
import { upsertChunks } from "@/features/sources/pipeline/qdrantUpsert";
import {
  isRetryableJob,
  markIndexingStatus,
} from "@/features/sources/lib/jobs";

type IndexYoutubeJobData = {
  sourceId: string;
};

type TranscriptSegment = {
  text: string;
  offset: number;
};

function groupTranscriptSegments(transcript: TranscriptSegment[]) {
  const rawChunks: { text: string; startTime: number }[] = [];
  let currentSegments: TranscriptSegment[] = [];

  for (const segment of transcript) {
    currentSegments.push(segment);
    const wordCount = currentSegments.reduce(
      (acc, item) =>
        acc + item.text.trim().split(/\s+/).filter(Boolean).length,
      0,
    );

    if (wordCount >= 300) {
      rawChunks.push({
        text: currentSegments.map((item) => item.text).join(" ").trim(),
        startTime: Math.floor(currentSegments[0].offset),
      });
      currentSegments = [];
    }
  }

  if (currentSegments.length > 0) {
    rawChunks.push({
      text: currentSegments.map((item) => item.text).join(" ").trim(),
      startTime: Math.floor(currentSegments[0].offset),
    });
  }

  return rawChunks;
}

export async function indexYoutubeJob(
  jobs: JobWithMetadata<IndexYoutubeJobData>[],
) {
  const [job] = jobs;
  if (!job) return;

  const { sourceId } = job.data;
  console.log(
    `[index-youtube] start sourceId=${sourceId} jobId=${job.id} attempt=${job.retryCount + 1}/${job.retryLimit + 1}`,
  );

  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.status, "active")))
    .limit(1);

  if (!source || source.type !== "youtube") {
    console.warn(
      `[index-youtube] skip sourceId=${sourceId} reason=${
        !source ? "not_found_or_inactive" : `wrong_type:${source.type}`
      }`,
    );
    return;
  }

  await markIndexingStatus(sourceId, "indexing");
  console.log(`[index-youtube] status=indexing sourceId=${sourceId}`);

  try {
    const metadata = source.metadata as YoutubeSourceMetadata;
    console.log(`[index-youtube] fetching transcript videoId=${metadata.videoId}`);
    const transcript = (await fetchTranscript(
      metadata.videoId,
    )) as TranscriptSegment[];

    if (!transcript.length) {
      throw new Error("No transcript available for this YouTube video");
    }
    console.log(`[index-youtube] transcriptSegments=${transcript.length}`);

    const grouped = groupTranscriptSegments(transcript);
    const docs = grouped.map(
      (chunk) =>
        new Document({
          pageContent: chunk.text,
          metadata: {
            sourceId,
            notebookId: source.notebookId,
            startTime: chunk.startTime,
          },
        }),
    );

    const chunks = limitChunks(filterValidChunks(docs));

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await embeddings.embedDocuments(
        batch.map((chunk) => chunk.pageContent),
      );

      await upsertChunks({
        sourceId,
        notebookId: source.notebookId,
        sourceType: "youtube",
        chunks: batch.map((chunk, index) => ({
          content: chunk.pageContent,
          embedding: vectors[index],
          metadata: {
            startTime:
              typeof chunk.metadata.startTime === "number"
                ? chunk.metadata.startTime
                : undefined,
          },
        })),
      });
    }

    await markIndexingStatus(sourceId, "indexed");
    console.log(`[index-youtube] success sourceId=${sourceId} status=indexed`);
  } catch (error) {
    const nextStatus = isRetryableJob(job) ? "retrying" : "failed";
    console.error(
      `[index-youtube] error sourceId=${sourceId} nextStatus=${nextStatus}`,
      error,
    );
    await markIndexingStatus(sourceId, nextStatus);
    throw error;
  }
}

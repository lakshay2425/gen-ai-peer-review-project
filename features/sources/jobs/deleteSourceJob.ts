import { and, eq } from "drizzle-orm";
import type { JobWithMetadata } from "pg-boss";
import { db } from "@/db/index";
import { sources, type PdfSourceMetadata } from "@/db/models/source";
import { getMinioBucket, getMinioClient } from "@/lib/minio";
import { deleteChunksBySourceId } from "@/features/sources/pipeline/qdrantUpsert";

type DeleteSourceJobData = {
  sourceId: string;
};

export async function deleteSourceJob(
  jobs: JobWithMetadata<DeleteSourceJobData>[],
) {
  const [job] = jobs;
  if (!job) return;

  const { sourceId } = job.data;
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!source) {
    return;
  }

  if (source.type === "pdf") {
    const metadata = source.metadata as PdfSourceMetadata;
    if (metadata.storageKey) {
      try {
        await getMinioClient().removeObject(
          getMinioBucket(),
          metadata.storageKey,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes("not found")) {
          throw error;
        }
      }
    }
  }

  await deleteChunksBySourceId(sourceId);

  await db
    .delete(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.status, "deleting")));
}

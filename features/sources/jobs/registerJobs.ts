import { getBoss, QUEUE_NAMES } from "@/lib/pgboss";
import { ensureQdrantCollection } from "@/lib/qdrant";
import { deleteSourceJob } from "./deleteSourceJob";
import { indexPdfJob } from "./indexPdfJob";
import { indexTextJob } from "./indexTextJob";
import { indexYoutubeJob } from "./indexYoutubeJob";

export async function registerJobs() {
  await ensureQdrantCollection();
  const boss = await getBoss();

  await boss.work(QUEUE_NAMES.indexText, { includeMetadata: true }, indexTextJob);
  await boss.work(
    QUEUE_NAMES.indexYoutube,
    { includeMetadata: true },
    indexYoutubeJob,
  );
  await boss.work(QUEUE_NAMES.indexPdf, { includeMetadata: true }, indexPdfJob);
  await boss.work(
    QUEUE_NAMES.deleteSource,
    { includeMetadata: true },
    deleteSourceJob,
  );
}

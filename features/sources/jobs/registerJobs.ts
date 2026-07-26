import { getBoss, QUEUE_NAMES } from "@/lib/pgboss";
import { ensureQdrantCollection } from "@/lib/qdrant";
import { deleteSourceJob } from "./deleteSourceJob";
import { indexPdfJob } from "./indexPdfJob";
import { indexTextJob } from "./indexTextJob";
import { indexYoutubeJob } from "./indexYoutubeJob";

export async function registerJobs() {
  console.log("[worker] ensuring Qdrant collection...");
  await ensureQdrantCollection();
  console.log("[worker] Qdrant collection ready");

  const boss = await getBoss();

  await boss.work(QUEUE_NAMES.indexText, { includeMetadata: true }, indexTextJob);
  console.log(`[worker] subscribed: ${QUEUE_NAMES.indexText}`);

  await boss.work(
    QUEUE_NAMES.indexYoutube,
    { includeMetadata: true },
    indexYoutubeJob,
  );
  console.log(`[worker] subscribed: ${QUEUE_NAMES.indexYoutube}`);

  await boss.work(QUEUE_NAMES.indexPdf, { includeMetadata: true }, indexPdfJob);
  console.log(`[worker] subscribed: ${QUEUE_NAMES.indexPdf}`);

  await boss.work(
    QUEUE_NAMES.deleteSource,
    { includeMetadata: true },
    deleteSourceJob,
  );
  console.log(`[worker] subscribed: ${QUEUE_NAMES.deleteSource}`);
}

import { fromDrizzle } from "pg-boss";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { sources } from "@/db/models/source";
import { getBoss } from "@/lib/pgboss";

export async function sendInTransaction(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  queueName: string,
  data: object,
  options: { singletonKey?: string } = {},
) {
  const boss = await getBoss();
  const jobId = await boss.send(queueName, data, {
    ...options,
    db: fromDrizzle(tx, sql),
  });

  if (!jobId) {
    console.warn(
      `[jobs] NOT enqueued (deduped/null id) queue=${queueName} data=${JSON.stringify(data)} singletonKey=${options.singletonKey ?? "none"} — a job with this key is likely already created/active/retrying`,
    );
  } else {
    console.log(
      `[jobs] enqueued queue=${queueName} jobId=${jobId} data=${JSON.stringify(data)} singletonKey=${options.singletonKey ?? "none"}`,
    );
  }

  return jobId;
}

/** Cancel created/retry/active jobs for a source so a fresh reindex can run immediately. */
export async function cancelJobsForSource(
  queueName: string,
  sourceId: string,
) {
  const boss = await getBoss();

  // Index jobs use singletonKey = sourceId; also match by payload as a fallback.
  const byKey = await boss.findJobs(queueName, {
    key: sourceId,
    queued: true,
  });
  const byData = await boss.findJobs(queueName, {
    data: { sourceId },
    queued: true,
  });

  const seen = new Set<string>();
  const cancellable = [...byKey, ...byData].filter((job) => {
    if (seen.has(job.id)) return false;
    seen.add(job.id);
    return ["created", "retry", "active"].includes(job.state);
  });

  if (cancellable.length === 0) {
    console.log(
      `[jobs] no cancellable jobs for queue=${queueName} sourceId=${sourceId}`,
    );
    return;
  }

  await boss.cancel(
    queueName,
    cancellable.map((job) => job.id),
  );
  console.log(
    `[jobs] cancelled ${cancellable.length} job(s) queue=${queueName} sourceId=${sourceId} ids=${cancellable.map((j) => j.id).join(",")}`,
  );
}

export function isRetryableJob(job: {
  retryCount: number;
  retryLimit: number;
}) {
  return job.retryCount < job.retryLimit;
}

export async function markIndexingStatus(
  sourceId: string,
  indexingStatus: "pending" | "indexing" | "retrying" | "indexed" | "failed",
) {
  await db
    .update(sources)
    .set({ indexingStatus })
    .where(and(eq(sources.id, sourceId), eq(sources.status, "active")));
}

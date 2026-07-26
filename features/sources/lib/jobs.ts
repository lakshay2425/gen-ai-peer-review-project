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
  return boss.send(queueName, data, {
    ...options,
    db: fromDrizzle(tx, sql),
  });
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

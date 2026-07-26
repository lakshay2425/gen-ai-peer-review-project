import "dotenv/config";
import { registerJobs } from "@/features/sources/jobs/registerJobs";
import { getBoss } from "@/lib/pgboss";

async function main() {
  const boss = await getBoss();
  await registerJobs();

  console.log("[worker] source indexing workers registered");

  const shutdown = async () => {
    console.log("[worker] shutting down");
    await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});

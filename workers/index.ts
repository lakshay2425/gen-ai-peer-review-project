import dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

async function main() {
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const qdrantUrl = process.env.QDRANT_URL ?? "(missing)";

  console.log("[worker] starting");
  console.log(`[worker] DATABASE_URL set: ${hasDatabaseUrl}`);
  console.log(`[worker] OPENAI_API_KEY set: ${hasOpenAiKey}`);
  console.log(`[worker] QDRANT_URL: ${qdrantUrl}`);

  if (!hasOpenAiKey) {
    console.warn(
      "[worker] WARNING: OPENAI_API_KEY is missing — embedding calls will fail",
    );
  }

  const { getBoss } = await import("@/lib/pgboss");
  const { registerJobs } = await import("@/features/sources/jobs/registerJobs");

  const boss = await getBoss();
  await registerJobs();

  console.log("[worker] source indexing workers registered");
  console.log("[worker] listening for jobs...");

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

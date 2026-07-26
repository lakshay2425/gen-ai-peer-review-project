import { PgBoss } from "pg-boss";

export const QUEUE_NAMES = {
  indexText: "index-text",
  indexYoutube: "index-youtube",
  indexPdf: "index-pdf",
  deleteSource: "delete-source",
} as const;

let boss: PgBoss | undefined;
let startPromise: Promise<PgBoss> | null = null;

export async function getBoss() {
  if (boss) return boss;
  if (!startPromise) {
    startPromise = startBoss().catch((error) => {
      startPromise = null;
      throw error;
    });
  }
  return startPromise;
}

async function startBoss() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const instance = new PgBoss({ connectionString });

  instance.on("error", (error) => {
    console.error("[pg-boss] error", error);
  });

  await instance.start();
  console.log("[pg-boss] started");

  for (const name of Object.values(QUEUE_NAMES)) {
    await instance.createQueue(name, {
      retryLimit: 3,
      // Short delay so bad keys / transient errors show up quickly in the worker logs.
      retryDelay: 5,
      retryBackoff: true,
      expireInSeconds: 900,
    });
    console.log(`[pg-boss] queue ready: ${name}`);
  }

  boss = instance;
  return instance;
}

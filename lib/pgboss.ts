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
  await instance.start();

  for (const name of Object.values(QUEUE_NAMES)) {
    await instance.createQueue(name, {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 900,
    });
  }

  boss = instance;
  return instance;
}

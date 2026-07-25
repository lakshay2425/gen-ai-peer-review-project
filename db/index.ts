import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Module-level singleton — created on first use, not at import time.
// This allows `next build` to evaluate API route modules without DATABASE_URL.
let _db: DrizzleDb | undefined;

function getDatabase(): DrizzleDb {
  if (_db) return _db;

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // `prepare: false` is required for Supabase / PgBouncer compatibility
  const client = postgres(DATABASE_URL, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * Drizzle database instance.
 * Lazily initialised on first query so `next build` can statically analyse
 * route modules without a live DATABASE_URL in the environment.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = getDatabase();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

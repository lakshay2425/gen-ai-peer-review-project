import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * The `id` is the auth service's user ID (JWT `sub`), not a generated UUID.
 * This ties the local user row to the identity the external auth service issued.
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  role: varchar("role").notNull().default("user"),
  /** Subscription / pricing plan for the user, e.g. "free" | "pro" | "enterprise" */
  plan: varchar("plan").notNull().default("free"),
  fullName: varchar("full_name").notNull(),
  email: varchar("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const notebookStatusEnum = pgEnum("notebook_status", [
  "active",
  "deleted",
]);

export const notebooks = pgTable("notebooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title").notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: notebookStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;

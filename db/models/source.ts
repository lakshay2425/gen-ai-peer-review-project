import {
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { notebooks } from "./notebook";

export const sourceTypeEnum = pgEnum("source_type", ["pdf", "text", "youtube"]);

export const sourceIndexingStatusEnum = pgEnum("source_indexing_status", [
  "pending",
  "indexing",
  "retrying",
  "indexed",
  "failed",
]);

export const sourceStatusEnum = pgEnum("source_status", ["active", "deleting"]);

export type PdfSourceMetadata = {
  storageKey: string;
  pageCount?: number;
  truncated?: boolean;
  indexedCharacterCount?: number;
  indexedChunkCount?: number;
};

export type YoutubeSourceMetadata = {
  videoId: string;
  url: string;
};

export type TextSourceMetadata = {
  content: string;
};

export type SourceMetadata =
  | PdfSourceMetadata
  | YoutubeSourceMetadata
  | TextSourceMetadata;

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    type: sourceTypeEnum("type").notNull(),
    title: varchar("title").notNull(),
    metadata: jsonb("metadata").$type<SourceMetadata>().notNull(),
    indexingStatus: sourceIndexingStatusEnum("indexing_status")
      .notNull()
      .default("pending"),
    status: sourceStatusEnum("status").notNull().default("active"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("sources_notebook_id_idempotency_key_unique").on(
      table.notebookId,
      table.idempotencyKey,
    ),
  ],
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

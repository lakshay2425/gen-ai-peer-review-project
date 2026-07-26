"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { sources, type PdfSourceMetadata, type Source } from "@/db/models/source";
import { AuthError, getCurrentUserId } from "@/lib/auth";
import { getMinioBucket, getMinioClient } from "@/lib/minio";
import { QUEUE_NAMES } from "@/lib/pgboss";
import {
  cancelJobsForSource,
  sendInTransaction,
} from "@/features/sources/lib/jobs";
import {
  getOwnedActiveNotebook,
  getOwnedActiveSource,
} from "@/features/sources/lib/ownership";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const uuidSchema = z.string().uuid();
const idempotencyKeySchema = z.string().uuid();
const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or less");
const contentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(2_000_000, "Content exceeds 2MB character limit");

function toPublicSource(source: Source) {
  return {
    id: source.id,
    notebookId: source.notebookId,
    type: source.type,
    title: source.title,
    indexingStatus: source.indexingStatus,
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    metadata:
      source.type === "youtube"
        ? {
            videoId: (source.metadata as { videoId: string }).videoId,
            url: (source.metadata as { url: string }).url,
          }
        : source.type === "pdf"
          ? {
              pageCount: (source.metadata as { pageCount?: number }).pageCount,
              truncated: (source.metadata as { truncated?: boolean }).truncated,
            }
          : undefined,
  };
}

export type PublicSource = ReturnType<typeof toPublicSource>;

export async function listSources(notebookId: string) {
  const userId = await getCurrentUserId();
  const parsedNotebookId = uuidSchema.parse(notebookId);
  await getOwnedActiveNotebook(parsedNotebookId, userId);

  const rows = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.notebookId, parsedNotebookId),
        eq(sources.status, "active"),
      ),
    )
    .orderBy(desc(sources.createdAt));

  return rows.map(toPublicSource);
}

export async function getSourceStatus(notebookId: string, sourceId: string) {
  const userId = await getCurrentUserId();
  const source = await getOwnedActiveSource(
    uuidSchema.parse(notebookId),
    uuidSchema.parse(sourceId),
    userId,
  );

  return {
    id: source.id,
    indexingStatus: source.indexingStatus,
    status: source.status,
  };
}

export async function createTextSource(input: {
  notebookId: string;
  title: string;
  content: string;
  idempotencyKey: string;
}) {
  const userId = await getCurrentUserId();
  const notebookId = uuidSchema.parse(input.notebookId);
  const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
  const title = titleSchema.parse(input.title);
  const content = contentSchema.parse(input.content);

  return db.transaction(async (tx) => {
    await getOwnedActiveNotebook(notebookId, userId, tx);

    const [inserted] = await tx
      .insert(sources)
      .values({
        notebookId,
        type: "text",
        title,
        metadata: { content },
        indexingStatus: "pending",
        status: "active",
        idempotencyKey,
      })
      .onConflictDoNothing({
        target: [sources.notebookId, sources.idempotencyKey],
      })
      .returning();

    const source =
      inserted ??
      (
        await tx
          .select()
          .from(sources)
          .where(
            and(
              eq(sources.notebookId, notebookId),
              eq(sources.idempotencyKey, idempotencyKey),
              eq(sources.status, "active"),
            ),
          )
          .limit(1)
      )[0];

    if (!source) {
      throw new AuthError("Failed to create source", 500);
    }

    if (inserted) {
      await sendInTransaction(
        tx,
        QUEUE_NAMES.indexText,
        { sourceId: source.id },
        { singletonKey: source.id },
      );
    }

    return toPublicSource(source);
  });
}

function extractYoutubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export async function createYoutubeSource(input: {
  notebookId: string;
  url: string;
  idempotencyKey: string;
}) {
  const userId = await getCurrentUserId();
  const notebookId = uuidSchema.parse(input.notebookId);
  const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
  const url = z.string().url().parse(input.url.trim());
  const videoId = extractYoutubeVideoId(url);

  if (!videoId) {
    throw new AuthError("Invalid YouTube URL", 400);
  }

  return db.transaction(async (tx) => {
    await getOwnedActiveNotebook(notebookId, userId, tx);

    const [inserted] = await tx
      .insert(sources)
      .values({
        notebookId,
        type: "youtube",
        title: `YouTube: ${videoId}`,
        metadata: { videoId, url },
        indexingStatus: "pending",
        status: "active",
        idempotencyKey,
      })
      .onConflictDoNothing({
        target: [sources.notebookId, sources.idempotencyKey],
      })
      .returning();

    const source =
      inserted ??
      (
        await tx
          .select()
          .from(sources)
          .where(
            and(
              eq(sources.notebookId, notebookId),
              eq(sources.idempotencyKey, idempotencyKey),
              eq(sources.status, "active"),
            ),
          )
          .limit(1)
      )[0];

    if (!source) {
      throw new AuthError("Failed to create source", 500);
    }

    if (inserted) {
      await sendInTransaction(
        tx,
        QUEUE_NAMES.indexYoutube,
        { sourceId: source.id },
        { singletonKey: source.id },
      );
    }

    return toPublicSource(source);
  });
}

export async function initPdfUpload(input: {
  notebookId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  idempotencyKey: string;
}) {
  const userId = await getCurrentUserId();
  const notebookId = uuidSchema.parse(input.notebookId);
  const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
  const fileName = titleSchema.parse(input.fileName);
  const fileSize = z
    .number()
    .int()
    .positive()
    .max(MAX_PDF_BYTES, "PDF size exceeds 10MB limit")
    .parse(input.fileSize);
  const mimeType = z
    .string()
    .refine((value) => value === "application/pdf", "Only PDF uploads are supported")
    .parse(input.mimeType);

  await getOwnedActiveNotebook(notebookId, userId);

  const sourceId = crypto.randomUUID();
  const storageKey = `notebooks/${notebookId}/${sourceId}.pdf`;

  const [inserted] = await db
    .insert(sources)
    .values({
      id: sourceId,
      notebookId,
      type: "pdf",
      title: fileName,
      metadata: { storageKey },
      indexingStatus: "pending",
      status: "active",
      idempotencyKey,
    })
    .onConflictDoNothing({
      target: [sources.notebookId, sources.idempotencyKey],
    })
    .returning();

  const source =
    inserted ??
    (
      await db
        .select()
        .from(sources)
        .where(
          and(
            eq(sources.notebookId, notebookId),
            eq(sources.idempotencyKey, idempotencyKey),
            eq(sources.status, "active"),
          ),
        )
        .limit(1)
    )[0];

  if (!source) {
    throw new AuthError("Failed to create PDF source", 500);
  }

  if (!inserted) {
    return {
      source: toPublicSource(source),
      alreadyExists: true as const,
      upload: null,
    };
  }

  const minio = getMinioClient();
  const bucket = getMinioBucket();
  const policy = minio.newPostPolicy();
  policy.setBucket(bucket);
  policy.setKey(storageKey);
  policy.setContentType(mimeType);
  policy.setContentLengthRange(1, fileSize);
  policy.setExpires(new Date(Date.now() + 10 * 60 * 1000));

  const upload = await minio.presignedPostPolicy(policy);

  return {
    source: toPublicSource(source),
    alreadyExists: false as const,
    upload: {
      postURL: upload.postURL,
      formData: upload.formData,
      storageKey,
      sourceId: source.id,
    },
  };
}

export async function confirmPdfUpload(input: {
  notebookId: string;
  sourceId: string;
}) {
  const userId = await getCurrentUserId();
  const notebookId = uuidSchema.parse(input.notebookId);
  const sourceId = uuidSchema.parse(input.sourceId);

  return db.transaction(async (tx) => {
    const source = await getOwnedActiveSource(notebookId, sourceId, userId, tx);
    if (source.type !== "pdf") {
      throw new AuthError("Source is not a PDF", 400);
    }

    const metadata = source.metadata as PdfSourceMetadata;
    const stat = await getMinioClient().statObject(
      getMinioBucket(),
      metadata.storageKey,
    );

    if (!stat.size || stat.size > MAX_PDF_BYTES) {
      throw new AuthError("Uploaded PDF failed size verification", 400);
    }

    await sendInTransaction(
      tx,
      QUEUE_NAMES.indexPdf,
      { sourceId: source.id },
      { singletonKey: source.id },
    );

    return toPublicSource(source);
  });
}

export async function deleteSource(notebookId: string, sourceId: string) {
  const userId = await getCurrentUserId();
  const parsedNotebookId = uuidSchema.parse(notebookId);
  const parsedSourceId = uuidSchema.parse(sourceId);

  return db.transaction(async (tx) => {
    const source = await getOwnedActiveSource(
      parsedNotebookId,
      parsedSourceId,
      userId,
      tx,
    );

    const [updated] = await tx
      .update(sources)
      .set({ status: "deleting" })
      .where(and(eq(sources.id, source.id), eq(sources.status, "active")))
      .returning();

    if (!updated) {
      throw new AuthError("Source not found", 404);
    }

    const indexQueue =
      updated.type === "pdf"
        ? QUEUE_NAMES.indexPdf
        : updated.type === "youtube"
          ? QUEUE_NAMES.indexYoutube
          : QUEUE_NAMES.indexText;

    // Stop any delayed retries so delete can finish cleanly.
    await cancelJobsForSource(indexQueue, updated.id);

    await sendInTransaction(
      tx,
      QUEUE_NAMES.deleteSource,
      { sourceId: updated.id },
      { singletonKey: `delete-${updated.id}` },
    );

    return { success: true };
  });
}

export async function reindexSource(notebookId: string, sourceId: string) {
  const userId = await getCurrentUserId();
  const parsedNotebookId = uuidSchema.parse(notebookId);
  const parsedSourceId = uuidSchema.parse(sourceId);

  return db.transaction(async (tx) => {
    const source = await getOwnedActiveSource(
      parsedNotebookId,
      parsedSourceId,
      userId,
      tx,
    );

    if (source.status === "deleting") {
      throw new AuthError("Source is being deleted", 409);
    }

    const [updated] = await tx
      .update(sources)
      .set({ indexingStatus: "pending" })
      .where(and(eq(sources.id, source.id), eq(sources.status, "active")))
      .returning();

    if (!updated) {
      throw new AuthError("Source not found", 404);
    }

    const queueName =
      updated.type === "pdf"
        ? QUEUE_NAMES.indexPdf
        : updated.type === "youtube"
          ? QUEUE_NAMES.indexYoutube
          : QUEUE_NAMES.indexText;

    // Cancel stuck retry/created jobs from previous bad API key attempts, then
    // enqueue a fresh job immediately (unique singleton key avoids dedupe).
    await cancelJobsForSource(queueName, updated.id);

    await sendInTransaction(
      tx,
      queueName,
      { sourceId: updated.id },
      { singletonKey: `${updated.id}:reindex:${Date.now()}` },
    );

    return toPublicSource(updated);
  });
}

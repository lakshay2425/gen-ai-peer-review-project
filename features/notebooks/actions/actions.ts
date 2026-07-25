"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/index";
import { notebooks } from "@/db/models/notebook";
import { AuthError, getCurrentUserId } from "@/lib/auth";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or less");

export async function createNotebook(title = "Untitled notebook") {
  const userId = await getCurrentUserId();
  const parsedTitle = titleSchema.parse(title);

  const [notebook] = await db
    .insert(notebooks)
    .values({
      title: parsedTitle,
      userId,
    })
    .returning();

  revalidatePath("/dashboard");
  return notebook;
}

export async function getNotebooks() {
  const userId = await getCurrentUserId();

  return db
    .select()
    .from(notebooks)
    .where(and(eq(notebooks.userId, userId), eq(notebooks.status, "active")))
    .orderBy(desc(notebooks.updatedAt));
}

export async function getNotebookById(id: string) {
  const userId = await getCurrentUserId();

  const [notebook] = await db
    .select()
    .from(notebooks)
    .where(
      and(
        eq(notebooks.id, id),
        eq(notebooks.userId, userId),
        eq(notebooks.status, "active"),
      ),
    )
    .limit(1);

  return notebook ?? null;
}

export async function updateNotebookTitle(id: string, title: string) {
  const userId = await getCurrentUserId();
  const parsedTitle = titleSchema.parse(title);

  const [notebook] = await db
    .update(notebooks)
    .set({
      title: parsedTitle,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notebooks.id, id),
        eq(notebooks.userId, userId),
        eq(notebooks.status, "active"),
      ),
    )
    .returning();

  if (!notebook) {
    throw new AuthError("Notebook not found", 404);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${id}`);
  return notebook;
}

export async function deleteNotebook(id: string) {
  const userId = await getCurrentUserId();

  const [notebook] = await db
    .update(notebooks)
    .set({
      status: "deleted",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notebooks.id, id),
        eq(notebooks.userId, userId),
        eq(notebooks.status, "active"),
      ),
    )
    .returning();

  if (!notebook) {
    throw new AuthError("Notebook not found", 404);
  }

  revalidatePath("/dashboard");
  return notebook;
}

export async function deleteAllNotebooks() {
  const userId = await getCurrentUserId();

  const deleted = await db
    .update(notebooks)
    .set({
      status: "deleted",
      updatedAt: new Date(),
    })
    .where(and(eq(notebooks.userId, userId), eq(notebooks.status, "active")))
    .returning({ id: notebooks.id });

  revalidatePath("/dashboard");
  return { count: deleted.length };
}

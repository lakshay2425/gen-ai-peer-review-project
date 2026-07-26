import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { notebooks } from "@/db/models/notebook";
import { sources } from "@/db/models/source";
import { AuthError } from "@/lib/auth";

type QueryExecutor = Pick<typeof db, "select">;

export async function getOwnedActiveNotebook(
  notebookId: string,
  userId: string,
  dbLike: QueryExecutor = db,
) {
  const [notebook] = await dbLike
    .select()
    .from(notebooks)
    .where(
      and(
        eq(notebooks.id, notebookId),
        eq(notebooks.userId, userId),
        eq(notebooks.status, "active"),
      ),
    )
    .limit(1);

  if (!notebook) {
    throw new AuthError("Notebook not found", 404);
  }

  return notebook;
}

export async function getOwnedActiveSource(
  notebookId: string,
  sourceId: string,
  userId: string,
  dbLike: QueryExecutor = db,
) {
  await getOwnedActiveNotebook(notebookId, userId, dbLike);

  const [source] = await dbLike
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.id, sourceId),
        eq(sources.notebookId, notebookId),
        eq(sources.status, "active"),
      ),
    )
    .limit(1);

  if (!source) {
    throw new AuthError("Source not found", 404);
  }

  return source;
}

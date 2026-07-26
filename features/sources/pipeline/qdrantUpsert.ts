import { v5 as uuidv5 } from "uuid";
import {
  ensureQdrantCollection,
  getQdrantClient,
  QDRANT_COLLECTION,
} from "@/lib/qdrant";

const POINT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export type UpsertChunkInput = {
  content: string;
  embedding: number[];
  metadata?: {
    pageNumber?: number;
    startTime?: number;
  };
};

export async function upsertChunks({
  sourceId,
  notebookId,
  sourceType,
  chunks,
}: {
  sourceId: string;
  notebookId: string;
  sourceType: "pdf" | "text" | "youtube";
  chunks: UpsertChunkInput[];
}) {
  await ensureQdrantCollection();
  const qdrant = getQdrantClient();

  const points = chunks.map((chunk, index) => ({
    id: uuidv5(`${sourceId}-${index}`, POINT_NAMESPACE),
    vector: chunk.embedding,
    payload: {
      sourceId,
      notebookId,
      sourceType,
      chunkIndex: index,
      content: chunk.content,
      metadata: chunk.metadata ?? {},
    },
  }));

  await qdrant.upsert(QDRANT_COLLECTION, {
    wait: true,
    points,
  });
}

export async function deleteChunksBySourceId(sourceId: string) {
  await ensureQdrantCollection();
  const qdrant = getQdrantClient();

  await qdrant.delete(QDRANT_COLLECTION, {
    wait: true,
    filter: {
      must: [{ key: "sourceId", match: { value: sourceId } }],
    },
  });
}

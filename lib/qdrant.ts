import { QdrantClient } from "@qdrant/js-client-rest";

export const QDRANT_COLLECTION = "chunks";
export const EMBEDDING_DIMENSIONS = 1536;

let client: QdrantClient | undefined;
let initPromise: Promise<void> | null = null;

export function getQdrantClient() {
  if (client) return client;

  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error("QDRANT_URL environment variable is not set");
  }

  client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });

  return client;
}

export async function ensureQdrantCollection() {
  if (!initPromise) {
    initPromise = initializeQdrantCollection().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function initializeQdrantCollection() {
  const qdrant = getQdrantClient();
  const { collections } = await qdrant.getCollections();
  const exists = collections.some(
    (collection) => collection.name === QDRANT_COLLECTION,
  );

  if (!exists) {
    try {
      await qdrant.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: EMBEDDING_DIMENSIONS,
          distance: "Cosine",
        },
      });
    } catch (error) {
      // Concurrent workers may create the collection at the same time.
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("already")) {
        throw error;
      }
    }
  }

  const info = await qdrant.getCollection(QDRANT_COLLECTION);
  const vectors = info.config.params.vectors;
  const size =
    vectors && typeof vectors === "object" && "size" in vectors
      ? vectors.size
      : undefined;
  const distance =
    vectors && typeof vectors === "object" && "distance" in vectors
      ? vectors.distance
      : undefined;

  if (size !== EMBEDDING_DIMENSIONS || distance !== "Cosine") {
    throw new Error(
      `Qdrant collection "${QDRANT_COLLECTION}" has incompatible vector config`,
    );
  }

  await ensurePayloadIndex("sourceId");
  await ensurePayloadIndex("notebookId");
}

async function ensurePayloadIndex(fieldName: string) {
  const qdrant = getQdrantClient();
  try {
    await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
      field_name: fieldName,
      field_schema: "keyword",
      wait: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("already")) {
      throw error;
    }
  }
}

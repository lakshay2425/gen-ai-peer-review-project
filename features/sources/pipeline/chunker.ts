import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const MAX_EXTRACTED_CHARS = 2_000_000;
export const MAX_CHUNKS_PER_SOURCE = 4000;
export const EMBED_BATCH_SIZE = 100;
export const MIN_CHUNK_CHARS = 50;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});

export async function splitDocuments(docs: Document[]) {
  return splitter.splitDocuments(docs);
}

export function filterValidChunks(chunks: Document[]) {
  return chunks.filter(
    (chunk) => chunk.pageContent.trim().length > MIN_CHUNK_CHARS,
  );
}

export function limitChunks(chunks: Document[]) {
  return chunks.slice(0, MAX_CHUNKS_PER_SOURCE);
}

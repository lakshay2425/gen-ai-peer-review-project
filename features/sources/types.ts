export type SourceType = "text" | "youtube" | "website" | "pdf";

export type IndexingStatus =
  | "pending"
  | "indexing"
  | "retrying"
  | "indexed"
  | "failed";

export type PublicSource = {
  id: string;
  notebookId: string;
  type: Exclude<SourceType, "website">;
  title: string;
  indexingStatus: IndexingStatus;
  status: "active" | "deleting";
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata?: {
    videoId?: string;
    url?: string;
    pageCount?: number;
    truncated?: boolean;
  };
};

export type SourceFormPayload =
  | { type: "text"; title: string; content: string }
  | { type: "youtube"; url: string }
  | { type: "website"; url: string }
  | { type: "pdf"; fileName: string; file?: File; fileSize?: number };

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  text: "Text",
  youtube: "YouTube Video Link",
  website: "Website Link",
  pdf: "PDF",
};

export function getSourceLabel(payload: SourceFormPayload): string {
  switch (payload.type) {
    case "text":
      return payload.title || "Untitled text";
    case "youtube":
      return payload.url;
    case "website":
      return payload.url;
    case "pdf":
      return payload.fileName;
  }
}

export function isTerminalIndexingStatus(status: IndexingStatus) {
  return status === "indexed" || status === "failed";
}

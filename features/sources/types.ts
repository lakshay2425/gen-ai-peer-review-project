export type SourceType = "text" | "youtube" | "website" | "pdf";

export type LocalSource = {
  id: string;
  type: SourceType;
  label: string;
};

export type SourceFormPayload =
  | { type: "text"; title: string; content: string }
  | { type: "youtube"; url: string }
  | { type: "website"; url: string }
  | { type: "pdf"; fileName: string };

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

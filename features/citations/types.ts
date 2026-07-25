export type CitationType = "youtube" | "pdf" | "text" | "website";

export type YoutubeCitation = {
  citationType: "youtube";
  videoId: string;
  startTime: number; // seconds
};

export type PdfCitation = {
  citationType: "pdf";
  presignedUrl: string;
  pageNumber: number;
};

export type TextCitation = {
  citationType: "text";
  content: string;
  highlightText: string;
};

export type WebsiteCitation = {
  citationType: "website";
  url: string;
};

export type Citation =
  | YoutubeCitation
  | PdfCitation
  | TextCitation
  | WebsiteCitation;

export const CITATION_TYPE_LABELS: Record<CitationType, string> = {
  youtube: "YouTube Video",
  pdf: "PDF",
  text: "Text",
  website: "Website",
};

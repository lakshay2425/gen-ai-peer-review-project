import type { Citation } from "./types";

export const demoCitations: Citation[] = [
  {
    citationType: "youtube",
    videoId: "dQw4w9WgXcQ",
    startTime: 42,
  },
  {
    citationType: "pdf",
    // Public sample PDF for demo rendering until the presigned-url API is wired
    presignedUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pageNumber: 1,
  },
  {
    citationType: "text",
    content:
      "GeminiLM helps researchers turn uploaded sources into grounded insights. You can chat with your documents, generate structured summaries, and explore key takeaways without leaving your notebook.",
    highlightText: "grounded insights",
  },
  {
    citationType: "website",
    url: "https://example.com",
  },
];

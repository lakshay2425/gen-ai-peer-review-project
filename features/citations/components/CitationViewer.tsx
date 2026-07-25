import type { Citation } from "@/features/citations/types";
import PdfCitationViewer from "./PdfCitationViewer";
import TextCitationViewer from "./TextCitationViewer";
import WebsiteCitationViewer from "./WebsiteCitationViewer";
import YoutubeCitationViewer from "./YoutubeCitationViewer";

type CitationViewerProps = {
  citation: Citation;
};

export default function CitationViewer({ citation }: CitationViewerProps) {
  switch (citation.citationType) {
    case "youtube":
      return <YoutubeCitationViewer citation={citation} />;
    case "pdf":
      return <PdfCitationViewer citation={citation} />;
    case "text":
      return <TextCitationViewer citation={citation} />;
    case "website":
      return <WebsiteCitationViewer citation={citation} />;
    default: {
      const _exhaustive: never = citation;
      return _exhaustive;
    }
  }
}

"use client";

import { useState } from "react";
import type { PdfCitation } from "@/features/citations/types";
// import { fetchPdfCitationUrl } from "@/features/citations/service/pdfCitationApi";

type PdfCitationViewerProps = {
  citation: PdfCitation;
};

export default function PdfCitationViewer({ citation }: PdfCitationViewerProps) {
  const { presignedUrl, pageNumber } = citation;
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // When the documents API is ready, fetch a fresh URL instead of using the
  // prop directly:
  //
  // useEffect(() => {
  //   let cancelled = false;
  //   async function loadUrl() {
  //     try {
  //       setIsLoading(true);
  //       const url = await fetchPdfCitationUrl(documentId);
  //       if (!cancelled) setResolvedUrl(url);
  //     } catch {
  //       if (!cancelled) setHasError(true);
  //     } finally {
  //       if (!cancelled) setIsLoading(false);
  //     }
  //   }
  //   loadUrl();
  //   return () => {
  //     cancelled = true;
  //   };
  // }, [documentId]);

  const src = `${presignedUrl}#page=${pageNumber}`;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <p className="text-xs text-gray-500">Page {pageNumber}</p>

      {hasError ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Unable to load this PDF in the panel.
          </p>
          <a
            href={presignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Open PDF in a new tab
          </a>
        </div>
      ) : (
        <div className="relative flex-1 min-h-[320px] overflow-hidden rounded-xl border border-gray-100 bg-white">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
            </div>
          )}
          <iframe
            src={src}
            title={`PDF citation — page ${pageNumber}`}
            className="h-full w-full min-h-[320px]"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </div>
      )}
    </div>
  );
}

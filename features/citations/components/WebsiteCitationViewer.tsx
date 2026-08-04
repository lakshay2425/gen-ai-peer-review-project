"use client";

import { useState } from "react";
import type { WebsiteCitation } from "@/features/citations/types";

type WebsiteCitationViewerProps = {
  citation: WebsiteCitation;
};

export default function WebsiteCitationViewer({
  citation,
}: WebsiteCitationViewerProps) {
  const { url } = citation;
  const [showFallback, setShowFallback] = useState(false);

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {showFallback ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            This website cannot be embedded here (many sites block iframes).
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open in new tab
          </a>
        </div>
      ) : (
        <div className="relative flex-1 min-h-[320px] overflow-hidden rounded-xl border border-border bg-card">
          <iframe
            src={url}
            title="Website citation"
            className="h-full w-full min-h-[320px]"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            onError={() => setShowFallback(true)}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate" title={url}>
          {url}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {!showFallback && (
            <button
              type="button"
              onClick={() => setShowFallback(true)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Can&apos;t see it?
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import CitationPanel from "@/features/citations/components/CitationPanel";
import type { Citation } from "@/features/citations/types";
import SourcesPanel from "@/features/sources/components/SourcesPanel";
import { useSources } from "@/features/sources/hooks";
import ChatPanel from "./ChatPanel";

type NotebookWorkspaceLayoutProps = {
  notebookId: string;
};

export default function NotebookWorkspaceLayout({
  notebookId,
}: NotebookWorkspaceLayoutProps) {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null,
  );
  const { data: sources = [] } = useSources(notebookId);
  const hasIndexedSource = sources.some(
    (source) => source.indexingStatus === "indexed",
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <SourcesPanel notebookId={notebookId} />
      <div className="flex flex-1 flex-col lg:flex-row gap-6 min-w-0">
        <ChatPanel
          chatEnabled={hasIndexedSource}
          onCitationClick={setSelectedCitation}
        />
        {selectedCitation && (
          <CitationPanel
            citation={selectedCitation}
            onClose={() => setSelectedCitation(null)}
          />
        )}
      </div>
    </div>
  );
}

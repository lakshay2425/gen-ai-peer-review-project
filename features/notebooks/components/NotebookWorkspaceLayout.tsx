"use client";

import { useState } from "react";
import CitationPanel from "@/features/citations/components/CitationPanel";
import type { Citation } from "@/features/citations/types";
import SourcesPanel from "@/features/sources/components/SourcesPanel";
import ChatPanel from "./ChatPanel";

export default function NotebookWorkspaceLayout() {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null,
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <SourcesPanel />
      <div className="flex flex-1 flex-col lg:flex-row gap-6 min-w-0">
        <ChatPanel onCitationClick={setSelectedCitation} />
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

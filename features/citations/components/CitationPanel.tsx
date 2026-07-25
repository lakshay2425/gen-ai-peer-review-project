"use client";

import {
  CITATION_TYPE_LABELS,
  type Citation,
} from "@/features/citations/types";
import CitationViewer from "./CitationViewer";

type CitationPanelProps = {
  citation: Citation;
  onClose: () => void;
};

export default function CitationPanel({
  citation,
  onClose,
}: CitationPanelProps) {
  return (
    <aside className="w-full lg:w-96 shrink-0 rounded-2xl border border-gray-100 bg-gray-50 p-5 flex flex-col min-h-[420px] lg:min-h-0">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 mb-1">Citation</p>
          <h2 className="text-lg font-semibold text-gray-900">
            {CITATION_TYPE_LABELS[citation.citationType]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 transition-colors"
          aria-label="Close citation panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <CitationViewer citation={citation} />
      </div>
    </aside>
  );
}

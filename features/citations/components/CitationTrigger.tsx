"use client";

import {
  CITATION_TYPE_LABELS,
  type Citation,
} from "@/features/citations/types";

type CitationTriggerProps = {
  citation: Citation;
  label?: string;
  onClick: (citation: Citation) => void;
};

export default function CitationTrigger({
  citation,
  label,
  onClick,
}: CitationTriggerProps) {
  const displayLabel = label ?? CITATION_TYPE_LABELS[citation.citationType];

  return (
    <button
      type="button"
      onClick={() => onClick(citation)}
      className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors align-baseline mx-0.5"
    >
      {displayLabel}
    </button>
  );
}

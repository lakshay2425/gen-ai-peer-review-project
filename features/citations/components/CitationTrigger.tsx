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
      className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors align-baseline mx-0.5"
    >
      {displayLabel}
    </button>
  );
}

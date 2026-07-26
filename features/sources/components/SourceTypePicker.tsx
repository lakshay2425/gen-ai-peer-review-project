"use client";

import type { ReactNode } from "react";
import type { SourceType } from "@/features/sources/types";

type SourceTypePickerProps = {
  onSelect: (type: SourceType) => void;
};

const sourceOptions: {
  type: SourceType;
  label: string;
  description: string;
  color: string;
  bg: string;
  comingSoon?: boolean;
  icon: ReactNode;
}[] = [
  {
    type: "text",
    label: "Text",
    description: "Paste notes, articles, or any plain text",
    color: "text-blue-500",
    bg: "bg-blue-50",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
  },
  {
    type: "youtube",
    label: "YouTube Video Link",
    description: "Add a lecture, tutorial, or talk",
    color: "text-rose-500",
    bg: "bg-rose-50",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
    ),
  },
  {
    type: "website",
    label: "Website Link",
    description: "Add a blog post, doc, or web page",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    comingSoon: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253M3 12a8.96 8.96 0 0 0 .284 2.253m0 0A11.978 11.978 0 0 0 12 16.5c2.81 0 5.384-.983 7.413-2.609"
        />
      </svg>
    ),
  },
  {
    type: "pdf",
    label: "PDF",
    description: "Upload a research paper or document",
    color: "text-red-500",
    bg: "bg-red-50",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
  },
];

export default function SourceTypePicker({ onSelect }: SourceTypePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sourceOptions.map((option) => (
        <button
          key={option.type}
          type="button"
          disabled={option.comingSoon}
          onClick={() => {
            if (!option.comingSoon) onSelect(option.type);
          }}
          className={`rounded-xl border border-gray-100 bg-white p-4 text-left transition-all ${
            option.comingSoon
              ? "cursor-not-allowed opacity-60"
              : "hover:border-gray-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div
              className={`inline-flex rounded-lg ${option.bg} ${option.color} p-2.5`}
            >
              {option.icon}
            </div>
            {option.comingSoon ? (
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Coming soon
              </span>
            ) : null}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {option.label}
          </h3>
          <p className="text-xs text-gray-500">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

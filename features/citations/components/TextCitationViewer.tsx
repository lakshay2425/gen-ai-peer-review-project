import type { TextCitation } from "@/features/citations/types";

type TextCitationViewerProps = {
  citation: TextCitation;
};

function renderHighlightedContent(content: string, highlightText: string) {
  const trimmedHighlight = highlightText.trim();
  if (!trimmedHighlight) {
    return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  const lowerContent = content.toLowerCase();
  const lowerHighlight = trimmedHighlight.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerHighlight);

  if (matchIndex === -1) {
    return (
      <>
        <p className="text-xs text-amber-600 mb-3">
          Highlighted passage was not found in this source excerpt.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </>
    );
  }

  const before = content.slice(0, matchIndex);
  const match = content.slice(matchIndex, matchIndex + trimmedHighlight.length);
  const after = content.slice(matchIndex + trimmedHighlight.length);

  return (
    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
      {before}
      <mark className="bg-indigo-100 text-indigo-900 rounded px-0.5">
        {match}
      </mark>
      {after}
    </p>
  );
}

export default function TextCitationViewer({
  citation,
}: TextCitationViewerProps) {
  const { content, highlightText } = citation;

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-gray-100 bg-white p-4">
      {renderHighlightedContent(content, highlightText)}
    </div>
  );
}

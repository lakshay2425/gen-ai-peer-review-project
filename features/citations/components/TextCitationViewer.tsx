import type { TextCitation } from "@/features/citations/types";

type TextCitationViewerProps = {
  citation: TextCitation;
};

function renderHighlightedContent(content: string, highlightText: string) {
  const trimmedHighlight = highlightText.trim();
  if (!trimmedHighlight) {
    return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  const lowerContent = content.toLowerCase();
  const lowerHighlight = trimmedHighlight.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerHighlight);

  if (matchIndex === -1) {
    return (
      <>
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          Highlighted passage was not found in this source excerpt.
        </p>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </>
    );
  }

  const before = content.slice(0, matchIndex);
  const match = content.slice(matchIndex, matchIndex + trimmedHighlight.length);
  const after = content.slice(matchIndex + trimmedHighlight.length);

  return (
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
      {before}
      <mark className="bg-primary/20 text-primary rounded px-0.5">
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
    <div className="h-full overflow-y-auto rounded-xl border border-border bg-card p-4">
      {renderHighlightedContent(content, highlightText)}
    </div>
  );
}

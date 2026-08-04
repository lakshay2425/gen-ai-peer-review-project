"use client";

import { useSources } from "@/features/sources/hooks";
import AddSourceButton from "./AddSourceButton";
import SourceListItem from "./SourceListItem";

type SourcesPanelProps = {
  notebookId: string;
};

export default function SourcesPanel({ notebookId }: SourcesPanelProps) {
  const { data: sources = [], isLoading, isError } = useSources(notebookId);
  const hasSources = sources.length > 0;

  return (
    <aside className="w-full lg:w-80 shrink-0 rounded-2xl border border-border bg-muted/30 p-5 flex flex-col">
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">Sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add content for this notebook to explore with AI.
        </p>
      </div>

      <div className="flex-1 mb-4 min-h-[180px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-card">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 px-4 text-center">
            <p className="text-sm text-destructive">Failed to load sources.</p>
          </div>
        ) : !hasSources ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No sources added yet. Start by adding your first source.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sources.map((source) => (
              <SourceListItem
                key={source.id}
                notebookId={notebookId}
                source={source}
              />
            ))}
          </ul>
        )}
      </div>

      <AddSourceButton
        notebookId={notebookId}
        label={hasSources ? "Add source" : "Add your first source"}
      />
    </aside>
  );
}

"use client";

import { useNotebooks } from "@/features/notebooks/hooks";
import EmptyNotebooksState from "./EmptyNotebooksState";
import NotebookGrid from "./NotebookGrid";
import NotebooksHeader from "./NotebooksHeader";

export default function NotebooksView() {
  const { data: notebooks, isLoading, isError } = useNotebooks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-12 text-center">
        <p className="text-sm text-destructive">
          Failed to load notebooks. Please refresh and try again.
        </p>
      </div>
    );
  }

  if (!notebooks || notebooks.length === 0) {
    return <EmptyNotebooksState />;
  }

  return (
    <>
      <NotebooksHeader />
      <NotebookGrid notebooks={notebooks} />
    </>
  );
}

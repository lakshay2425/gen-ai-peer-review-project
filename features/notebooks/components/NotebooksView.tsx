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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
        <p className="text-sm text-red-600">
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

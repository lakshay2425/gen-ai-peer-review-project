"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import NotebookWorkspaceHeader from "@/features/notebooks/components/NotebookWorkspaceHeader";
import NotebookWorkspaceLayout from "@/features/notebooks/components/NotebookWorkspaceLayout";
import { useNotebook } from "@/features/notebooks/hooks";

export default function NotebookPage() {
  const params = useParams<{ notebookId: string }>();
  const notebookId = params.notebookId;
  const { data: notebook, isLoading, isError } = useNotebook(notebookId);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </main>
      </div>
    );
  }

  if (isError || !notebook) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-heading text-2xl font-semibold text-foreground mb-3">
              Notebook not found
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              This notebook may have been deleted or you do not have access to it.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Back to notebooks
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <NotebookWorkspaceHeader
            notebookId={notebook.id}
            title={notebook.title}
          />
          <NotebookWorkspaceLayout notebookId={notebook.id} />
        </div>
      </main>
    </div>
  );
}

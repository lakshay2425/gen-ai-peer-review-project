"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import NotebookWorkspaceHeader from "@/features/notebooks/components/NotebookWorkspaceHeader";
import { useNotebook } from "@/features/notebooks/hooks";
import SourcesPanel from "@/features/sources/components/SourcesPanel";

export default function NotebookPage() {
  const params = useParams<{ notebookId: string }>();
  const notebookId = params.notebookId;
  const { data: notebook, isLoading, isError } = useNotebook(notebookId);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </main>
      </div>
    );
  }

  if (isError || !notebook) {
    return (
      <div className="flex flex-col min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Notebook not found
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              This notebook may have been deleted or you do not have access to it.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Back to notebooks
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <NotebookWorkspaceHeader
            notebookId={notebook.id}
            title={notebook.title}
          />
          <div className="flex flex-col lg:flex-row gap-6">
            <SourcesPanel />
            <section className="flex-1 min-h-[420px] rounded-2xl border border-gray-100 bg-gray-50 p-8 flex items-center justify-center">
              <p className="text-sm text-gray-500 text-center max-w-md">
                Chat and summaries will appear here once you add a source.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

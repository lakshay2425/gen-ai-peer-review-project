"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import type { Notebook } from "@/db/models/notebook";
import { useDeleteNotebook } from "@/features/notebooks/hooks";
import EditableNotebookTitle from "./EditableNotebookTitle";

type NotebookCardProps = {
  notebook: Notebook;
};

export default function NotebookCard({ notebook }: NotebookCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { mutate, isPending } = useDeleteNotebook();

  const handleDelete = () => {
    mutate(notebook.id, {
      onSuccess: () => {
        toast.success("Notebook deleted");
        setShowDeleteDialog(false);
        router.push("/dashboard");
      },
      onError: () => {
        toast.error("Failed to delete notebook");
      },
    });
  };

  return (
    <>
      <Link
        href={`/dashboard/${notebook.id}`}
        className="group block rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className="min-w-0 flex-1"
            onClick={(event) => event.preventDefault()}
          >
            <EditableNotebookTitle
              notebookId={notebook.id}
              title={notebook.title}
            />
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Delete notebook"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 9.673A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-9.673.149.023a.75.75 0 0 0-.23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Updated {new Date(notebook.updatedAt).toLocaleDateString()}
        </p>
      </Link>

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete notebook"
        description="This notebook will be removed from your list. This action cannot be undone."
        confirmLabel="Delete"
        isLoading={isPending}
      />
    </>
  );
}

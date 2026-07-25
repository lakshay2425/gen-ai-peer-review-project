"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useDeleteAllNotebooks } from "@/features/notebooks/hooks";

export default function DeleteAllNotebooksButton() {
  const [showDialog, setShowDialog] = useState(false);
  const { mutate, isPending } = useDeleteAllNotebooks();

  const handleDeleteAll = () => {
    mutate(undefined, {
      onSuccess: ({ count }) => {
        setShowDialog(false);
        if (count === 0) {
          toast.success("No notebooks to delete");
          return;
        }
        toast.success(
          count === 1 ? "1 notebook deleted" : `${count} notebooks deleted`,
        );
      },
      onError: () => {
        toast.error("Failed to delete notebooks");
      },
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
      >
        Delete all
      </button>

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={handleDeleteAll}
        title="Delete all notebooks"
        description="All of your notebooks will be removed from your list. This action cannot be undone."
        confirmLabel="Delete all"
        isLoading={isPending}
      />
    </>
  );
}

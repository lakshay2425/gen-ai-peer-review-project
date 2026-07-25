"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingOverlay } from "@/app/components/LoadingOverlay";
import {
  notebookKeys,
  useCreateNotebook,
} from "@/features/notebooks/hooks";

type CreateNotebookButtonProps = {
  label: string;
  className?: string;
};

export default function CreateNotebookButton({
  label,
  className,
}: CreateNotebookButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useCreateNotebook();

  const handleCreate = () => {
    mutate(undefined, {
      onSuccess: (notebook) => {
        queryClient.setQueryData(notebookKeys.detail(notebook.id), notebook);
        router.replace(`/dashboard/${notebook.id}`);
        toast.success("Notebook created");
        queryClient.invalidateQueries({ queryKey: notebookKeys.list() });
      },
      onError: () => {
        toast.error("Failed to create notebook");
      },
    });
  };

  return (
    <>
      {isPending && <LoadingOverlay message="Creating notebook..." />}
      <button
        type="button"
        onClick={handleCreate}
        disabled={isPending}
        className={
          className ??
          "inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-60"
        }
      >
        {isPending ? "Creating..." : label}
      </button>
    </>
  );
}

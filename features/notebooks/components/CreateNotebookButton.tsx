"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCreateNotebook } from "@/features/notebooks/hooks";

type CreateNotebookButtonProps = {
  label: string;
  className?: string;
};

export default function CreateNotebookButton({
  label,
  className,
}: CreateNotebookButtonProps) {
  const router = useRouter();
  const { mutate, isPending } = useCreateNotebook();

  const handleCreate = () => {
    const idempotencyKey = crypto.randomUUID();
    mutate(
      { idempotencyKey },
      {
        onSuccess: (notebook) => {
          router.replace(`/dashboard/${notebook.id}`);
          toast.success("Notebook created");
        },
        onError: () => {
          toast.error("Failed to create notebook");
        },
      },
    );
  };

  return (
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
  );
}

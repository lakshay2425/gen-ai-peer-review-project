"use client";

import { useState } from "react";
import AddSourceDialog from "./AddSourceDialog";

type AddSourceButtonProps = {
  notebookId: string;
  label: string;
};

export default function AddSourceButton({
  notebookId,
  label,
}: AddSourceButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        {label}
      </button>
      <AddSourceDialog
        notebookId={notebookId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

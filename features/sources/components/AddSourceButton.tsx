"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full"
      >
        {label}
      </Button>
      <AddSourceDialog
        notebookId={notebookId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

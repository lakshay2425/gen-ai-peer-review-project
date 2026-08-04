"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateNotebookTitle } from "@/features/notebooks/hooks";

type EditableNotebookTitleProps = {
  notebookId: string;
  title: string;
  className?: string;
  inputClassName?: string;
};

export default function EditableNotebookTitle({
  notebookId,
  title,
  className = "text-base font-semibold text-foreground",
  inputClassName = "w-full text-base font-semibold",
}: EditableNotebookTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const { mutate, isPending } = useUpdateNotebookTitle();

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Title cannot be empty");
      return;
    }

    if (trimmed === title) {
      setIsEditing(false);
      return;
    }

    mutate(
      { id: notebookId, title: trimmed },
      {
        onSuccess: () => {
          toast.success("Title updated");
          setIsEditing(false);
        },
        onError: () => {
          toast.error("Failed to update title");
        },
      },
    );
  };

  const handleCancel = () => {
    setDraft(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={inputClassName}
          autoFocus
          disabled={isPending}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSave();
            if (event.key === "Escape") handleCancel();
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`truncate ${className}`}>{title}</span>
      <button
        type="button"
        onClick={() => {
          setDraft(title);
          setIsEditing(true);
        }}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Edit title"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
        </svg>
      </button>
    </div>
  );
}

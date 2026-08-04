"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Dialog from "@/app/components/Dialog";
import { Button } from "@/components/ui/button";
import {
  useCreatePdfSource,
  useCreateTextSource,
  useCreateYoutubeSource,
} from "@/features/sources/hooks";
import type { SourceType } from "@/features/sources/types";
import { SOURCE_TYPE_LABELS } from "@/features/sources/types";
import PdfSourceForm from "./PdfSourceForm";
import SourceTypePicker from "./SourceTypePicker";
import TextSourceForm from "./TextSourceForm";
import YoutubeSourceForm from "./YoutubeSourceForm";

type AddSourceDialogProps = {
  notebookId: string;
  open: boolean;
  onClose: () => void;
};

export default function AddSourceDialog({
  notebookId,
  open,
  onClose,
}: AddSourceDialogProps) {
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);
  const createText = useCreateTextSource(notebookId);
  const createYoutube = useCreateYoutubeSource(notebookId);
  const createPdf = useCreatePdfSource(notebookId);

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  const title = selectedType
    ? `Add ${SOURCE_TYPE_LABELS[selectedType]}`
    : "Add source";

  return (
    <Dialog open={open} onClose={handleClose} title={title}>
      {!selectedType ? (
        <SourceTypePicker onSelect={setSelectedType} />
      ) : selectedType === "text" ? (
        <TextSourceForm
          onCancel={() => setSelectedType(null)}
          onSubmit={(data) => {
            if (!data.title || !data.content) {
              toast.error("Title and content are required");
              return;
            }

            const idempotencyKey = crypto.randomUUID();
            handleClose();
            createText.mutate(
              {
                notebookId,
                title: data.title,
                content: data.content,
                idempotencyKey,
              },
              {
                onError: () => toast.error("Failed to add text source"),
              },
            );
          }}
        />
      ) : selectedType === "youtube" ? (
        <YoutubeSourceForm
          onCancel={() => setSelectedType(null)}
          onSubmit={(data) => {
            if (!data.url.trim()) {
              toast.error("YouTube URL is required");
              return;
            }

            const idempotencyKey = crypto.randomUUID();
            handleClose();
            createYoutube.mutate(
              {
                notebookId,
                url: data.url.trim(),
                idempotencyKey,
              },
              {
                onError: () => toast.error("Failed to add YouTube source"),
              },
            );
          }}
        />
      ) : selectedType === "pdf" ? (
        <PdfSourceForm
          onCancel={() => setSelectedType(null)}
          onSubmit={(data) => {
            const idempotencyKey = crypto.randomUUID();
            handleClose();
            createPdf.mutate(
              {
                ...data,
                idempotencyKey,
              },
              {
                onError: () => toast.error("Failed to add PDF source"),
              },
            );
          }}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This source type is coming soon.
          </p>
          <Button variant="outline" onClick={() => setSelectedType(null)}>
            Back
          </Button>
        </div>
      )}
    </Dialog>
  );
}

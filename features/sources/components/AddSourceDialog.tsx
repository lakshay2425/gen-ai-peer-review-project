"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Dialog from "@/app/components/Dialog";
import type { SourceType } from "@/features/sources/types";
import { SOURCE_TYPE_LABELS } from "@/features/sources/types";
import PdfSourceForm from "./PdfSourceForm";
import SourceTypePicker from "./SourceTypePicker";
import TextSourceForm from "./TextSourceForm";
import WebsiteSourceForm from "./WebsiteSourceForm";
import YoutubeSourceForm from "./YoutubeSourceForm";

type AddSourceDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function AddSourceDialog({ open, onClose }: AddSourceDialogProps) {
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  const handleAdd = () => {
    toast.success("Source upload will be implemented soon");
    handleClose();
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
          onSubmit={() => handleAdd()}
        />
      ) : selectedType === "youtube" ? (
        <YoutubeSourceForm
          onCancel={() => setSelectedType(null)}
          onSubmit={() => handleAdd()}
        />
      ) : selectedType === "website" ? (
        <WebsiteSourceForm
          onCancel={() => setSelectedType(null)}
          onSubmit={() => handleAdd()}
        />
      ) : (
        <PdfSourceForm
          onCancel={() => setSelectedType(null)}
          onSubmit={() => handleAdd()}
        />
      )}
    </Dialog>
  );
}

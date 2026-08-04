"use client";

import Dialog from "./Dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? "Deleting..." : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

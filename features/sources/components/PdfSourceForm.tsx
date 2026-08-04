"use client";

import { Button } from "@/components/ui/button";

type PdfSourceFormProps = {
  onSubmit: (data: {
    fileName: string;
    file: File;
    fileSize: number;
    mimeType: string;
  }) => void;
  onCancel: () => void;
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export default function PdfSourceForm({ onSubmit, onCancel }: PdfSourceFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const file = formData.get("file");

        if (!(file instanceof File)) {
          return;
        }

        if (file.type !== "application/pdf") {
          event.currentTarget.reportValidity();
          return;
        }

        if (file.size > MAX_PDF_BYTES) {
          window.alert("PDF size exceeds 10MB limit");
          return;
        }

        onSubmit({
          fileName: file.name,
          file,
          fileSize: file.size,
          mimeType: file.type || "application/pdf",
        });
      }}
    >
      <div>
        <label htmlFor="pdf-file" className="block text-sm font-medium text-foreground mb-1.5">
          PDF file
        </label>
        <input
          id="pdf-file"
          name="file"
          type="file"
          accept=".pdf,application/pdf"
          required
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Maximum size 10MB.</p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button type="submit">Add</Button>
      </div>
    </form>
  );
}

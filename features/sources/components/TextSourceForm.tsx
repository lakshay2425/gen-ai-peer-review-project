"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type TextSourceFormProps = {
  onSubmit: (data: { title: string; content: string }) => void;
  onCancel: () => void;
};

export default function TextSourceForm({
  onSubmit,
  onCancel,
}: TextSourceFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
          title: String(formData.get("title") ?? "").trim(),
          content: String(formData.get("content") ?? "").trim(),
        });
      }}
    >
      <div>
        <label htmlFor="text-title" className="block text-sm font-medium text-foreground mb-1.5">
          Title
        </label>
        <Input
          id="text-title"
          name="title"
          type="text"
          required
          placeholder="e.g. Research notes"
        />
      </div>
      <div>
        <label htmlFor="text-content" className="block text-sm font-medium text-foreground mb-1.5">
          Content
        </label>
        <Textarea
          id="text-content"
          name="content"
          required
          rows={6}
          placeholder="Paste your text here..."
          className="resize-y"
        />
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

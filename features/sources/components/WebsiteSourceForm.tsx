"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type WebsiteSourceFormProps = {
  onSubmit: (data: { url: string }) => void;
  onCancel: () => void;
};

export default function WebsiteSourceForm({
  onSubmit,
  onCancel,
}: WebsiteSourceFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
          url: String(formData.get("url") ?? "").trim(),
        });
      }}
    >
      <div>
        <label htmlFor="website-url" className="block text-sm font-medium text-foreground mb-1.5">
          Website URL
        </label>
        <Input
          id="website-url"
          name="url"
          type="url"
          required
          placeholder="https://example.com/article"
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

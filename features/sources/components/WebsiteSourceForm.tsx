"use client";

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
        <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-1.5">
          Website URL
        </label>
        <input
          id="website-url"
          name="url"
          type="url"
          required
          placeholder="https://example.com/article"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          Add
        </button>
      </div>
    </form>
  );
}

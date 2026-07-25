"use client";

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
        <label htmlFor="text-title" className="block text-sm font-medium text-gray-700 mb-1.5">
          Title
        </label>
        <input
          id="text-title"
          name="title"
          type="text"
          required
          placeholder="e.g. Research notes"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 mb-1.5">
          Content
        </label>
        <textarea
          id="text-content"
          name="content"
          required
          rows={6}
          placeholder="Paste your text here..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
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

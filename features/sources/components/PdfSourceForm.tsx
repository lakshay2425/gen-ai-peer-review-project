"use client";

type PdfSourceFormProps = {
  onSubmit: (data: { fileName: string }) => void;
  onCancel: () => void;
};

export default function PdfSourceForm({ onSubmit, onCancel }: PdfSourceFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const file = formData.get("file") as File | null;
        onSubmit({
          fileName: file?.name ?? "document.pdf",
        });
      }}
    >
      <div>
        <label htmlFor="pdf-file" className="block text-sm font-medium text-gray-700 mb-1.5">
          PDF file
        </label>
        <input
          id="pdf-file"
          name="file"
          type="file"
          accept=".pdf,application/pdf"
          required
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
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

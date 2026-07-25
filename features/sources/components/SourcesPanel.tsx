import AddSourceButton from "./AddSourceButton";

export default function SourcesPanel() {
  return (
    <aside className="w-full lg:w-80 shrink-0 rounded-2xl border border-gray-100 bg-gray-50 p-5 flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Sources</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add content for this notebook to explore with AI.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center mb-4">
        <p className="text-sm text-gray-500 mb-4">
          No sources added yet. Start by adding your first source.
        </p>
      </div>

      <AddSourceButton label="Add your first source" />
    </aside>
  );
}

import CreateNotebookButton from "./CreateNotebookButton";
import DeleteAllNotebooksButton from "./DeleteAllNotebooksButton";

export default function NotebooksHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Your notebooks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload sources and explore your content with AI.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <DeleteAllNotebooksButton />
        <CreateNotebookButton label="Create notebook" />
      </div>
    </div>
  );
}

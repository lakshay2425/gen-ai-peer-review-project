import Link from "next/link";
import EditableNotebookTitle from "./EditableNotebookTitle";

type NotebookWorkspaceHeaderProps = {
  notebookId: string;
  title: string;
};

export default function NotebookWorkspaceHeader({
  notebookId,
  title,
}: NotebookWorkspaceHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clipRule="evenodd"
          />
        </svg>
        Back to notebooks
      </Link>
      <EditableNotebookTitle
        notebookId={notebookId}
        title={title}
        className="text-2xl font-semibold text-gray-900"
        inputClassName="w-full rounded-lg border border-gray-200 px-3 py-2 text-2xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

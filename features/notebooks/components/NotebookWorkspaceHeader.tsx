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
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
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
        className="font-heading text-2xl font-semibold text-foreground"
        inputClassName="w-full font-heading text-2xl font-semibold"
      />
    </div>
  );
}

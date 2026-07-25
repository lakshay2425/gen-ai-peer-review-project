import type { Notebook } from "@/db/models/notebook";
import NotebookCard from "./NotebookCard";

type NotebookGridProps = {
  notebooks: Notebook[];
};

export default function NotebookGrid({ notebooks }: NotebookGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {notebooks.map((notebook) => (
        <NotebookCard key={notebook.id} notebook={notebook} />
      ))}
    </div>
  );
}

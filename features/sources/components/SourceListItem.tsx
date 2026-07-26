"use client";

import toast from "react-hot-toast";
import {
  useDeleteSource,
  useReindexSource,
  useSourceStatusPolling,
} from "@/features/sources/hooks";
import type { PublicSource } from "@/features/sources/types";
import { SOURCE_TYPE_LABELS } from "@/features/sources/types";

type SourceListItemProps = {
  notebookId: string;
  source: PublicSource;
};

function StatusIndicator({
  status,
}: {
  status: PublicSource["indexingStatus"];
}) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        Pending
      </span>
    );
  }

  if (status === "indexing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Indexing
      </span>
    );
  }

  if (status === "retrying") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        Retrying
      </span>
    );
  }

  if (status === "indexed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Indexed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Failed
    </span>
  );
}

export default function SourceListItem({
  notebookId,
  source,
}: SourceListItemProps) {
  const shouldPoll =
    source.indexingStatus === "pending" ||
    source.indexingStatus === "indexing" ||
    source.indexingStatus === "retrying";

  useSourceStatusPolling(notebookId, source.id, shouldPoll);

  const deleteMutation = useDeleteSource(notebookId);
  const reindexMutation = useReindexSource(notebookId);

  return (
    <li className="rounded-xl border border-gray-100 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {source.title}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {SOURCE_TYPE_LABELS[source.type]}
          </p>
          <div className="mt-2">
            <StatusIndicator status={source.indexingStatus} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {source.indexingStatus === "failed" ? (
            <button
              type="button"
              disabled={reindexMutation.isPending}
              onClick={() =>
                reindexMutation.mutate(source.id, {
                  onError: () => toast.error("Failed to reindex source"),
                })
              }
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-60"
            >
              Retry
            </button>
          ) : null}
          <button
            type="button"
            disabled={deleteMutation.isPending || source.id.startsWith("optimistic-")}
            onClick={() =>
              deleteMutation.mutate(source.id, {
                onError: () => toast.error("Failed to delete source"),
              })
            }
            className="text-xs font-medium text-gray-400 hover:text-red-500 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

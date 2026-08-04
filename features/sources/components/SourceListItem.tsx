"use client";

import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
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
      <Badge variant="secondary" className="gap-1.5">
        <span className="h-2 w-2 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
        Pending
      </Badge>
    );
  }

  if (status === "indexing") {
    return (
      <Badge variant="secondary" className="gap-1.5 text-amber-600 dark:text-amber-400">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Indexing
      </Badge>
    );
  }

  if (status === "retrying") {
    return (
      <Badge variant="secondary" className="gap-1.5 text-orange-600 dark:text-orange-400">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        Retrying
      </Badge>
    );
  }

  if (status === "indexed") {
    return (
      <Badge variant="secondary" className="gap-1.5 text-emerald-600 dark:text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Indexed
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1.5">
      <span className="h-2 w-2 rounded-full bg-destructive" />
      Failed
    </Badge>
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
    <li className="rounded-xl border border-border bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {source.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
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
              className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-60"
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
            className="text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

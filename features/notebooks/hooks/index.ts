"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { Notebook } from "@/db/models/notebook";
import {
  createNotebook,
  deleteAllNotebooks,
  deleteNotebook,
  getNotebookById,
  getNotebooks,
  updateNotebookTitle,
} from "@/features/notebooks/actions/actions";

export const notebookKeys = {
  all: ["notebooks"] as const,
  lists: () => [...notebookKeys.all, "list"] as const,
  list: () => [...notebookKeys.lists()] as const,
  details: () => [...notebookKeys.all, "detail"] as const,
  detail: (id: string) => [...notebookKeys.details(), id] as const,
};

function makeOptimisticNotebook(
  title: string,
  idempotencyKey: string,
): Notebook {
  const now = new Date();
  return {
    id: `optimistic-${idempotencyKey}`,
    title,
    userId: "optimistic",
    status: "active",
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
}

function replaceOptimisticNotebook(
  queryClient: QueryClient,
  idempotencyKey: string,
  notebook: Notebook,
) {
  queryClient.setQueryData(notebookKeys.detail(notebook.id), notebook);
  queryClient.setQueryData(notebookKeys.list(), (current: Notebook[] | undefined) => {
    if (!current) return [notebook];
    const withoutOptimistic = current.filter(
      (item) => item.id !== `optimistic-${idempotencyKey}`,
    );
    const exists = withoutOptimistic.some((item) => item.id === notebook.id);
    return exists
      ? withoutOptimistic.map((item) =>
          item.id === notebook.id ? notebook : item,
        )
      : [notebook, ...withoutOptimistic];
  });
}

export function useNotebooks(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notebookKeys.list(),
    queryFn: getNotebooks,
    enabled: options?.enabled ?? true,
  });
}

export function useNotebook(id: string) {
  return useQuery({
    queryKey: notebookKeys.detail(id),
    queryFn: () => getNotebookById(id),
    enabled: !!id && !id.startsWith("optimistic-"),
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: { title?: string; idempotencyKey?: string }) =>
      createNotebook(input),
    onMutate: async (input) => {
      const title = input?.title?.trim() || "Untitled notebook";
      const idempotencyKey = input?.idempotencyKey ?? crypto.randomUUID();

      await queryClient.cancelQueries({ queryKey: notebookKeys.list() });
      const previous = queryClient.getQueryData<Notebook[]>(notebookKeys.list());
      const optimistic = makeOptimisticNotebook(title, idempotencyKey);

      queryClient.setQueryData(notebookKeys.list(), (current: Notebook[] | undefined) => [
        optimistic,
        ...(current ?? []),
      ]);

      return { previous, idempotencyKey };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notebookKeys.list(), context.previous);
      }
    },
    onSuccess: (notebook, _input, context) => {
      if (context?.idempotencyKey) {
        replaceOptimisticNotebook(queryClient, context.idempotencyKey, notebook);
      } else {
        queryClient.setQueryData(notebookKeys.detail(notebook.id), notebook);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.list() });
    },
  });
}

export function useUpdateNotebookTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateNotebookTitle(id, title),
    onSuccess: (notebook) => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.list() });
      queryClient.invalidateQueries({
        queryKey: notebookKeys.detail(notebook.id),
      });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNotebook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.list() });
    },
  });
}

export function useDeleteAllNotebooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllNotebooks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.list() });
    },
  });
}

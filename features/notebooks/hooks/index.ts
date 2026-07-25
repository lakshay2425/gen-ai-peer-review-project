"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    enabled: !!id,
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => createNotebook(title),
    onSuccess: (notebook) => {
      queryClient.setQueryData(notebookKeys.detail(notebook.id), notebook);
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

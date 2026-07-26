"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createTextSource,
  createYoutubeSource,
  confirmPdfUpload,
  deleteSource,
  getSourceStatus,
  initPdfUpload,
  listSources,
  reindexSource,
  type PublicSource,
} from "@/features/sources/actions/actions";

export const sourceKeys = {
  all: ["sources"] as const,
  lists: () => [...sourceKeys.all, "list"] as const,
  list: (notebookId: string) => [...sourceKeys.lists(), notebookId] as const,
  status: (notebookId: string, sourceId: string) =>
    [...sourceKeys.all, "status", notebookId, sourceId] as const,
};

function makeOptimisticSource(input: {
  notebookId: string;
  type: PublicSource["type"];
  title: string;
  idempotencyKey: string;
}): PublicSource {
  const now = new Date();
  return {
    id: `optimistic-${input.idempotencyKey}`,
    notebookId: input.notebookId,
    type: input.type,
    title: input.title,
    indexingStatus: "pending",
    status: "active",
    createdAt: now,
    updatedAt: now,
    metadata: undefined,
  };
}

function replaceOptimisticSource(
  queryClient: QueryClient,
  notebookId: string,
  idempotencyKey: string,
  source: PublicSource,
) {
  queryClient.setQueryData(
    sourceKeys.list(notebookId),
    (current: PublicSource[] | undefined) => {
      if (!current) return [source];
      const withoutOptimistic = current.filter(
        (item) => item.id !== `optimistic-${idempotencyKey}`,
      );
      const exists = withoutOptimistic.some((item) => item.id === source.id);
      return exists
        ? withoutOptimistic.map((item) =>
            item.id === source.id ? source : item,
          )
        : [source, ...withoutOptimistic];
    },
  );
}

export function useSources(notebookId: string) {
  return useQuery({
    queryKey: sourceKeys.list(notebookId),
    queryFn: () => listSources(notebookId),
    enabled: !!notebookId,
  });
}

export function useSourceStatusPolling(
  notebookId: string,
  sourceId: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: sourceKeys.status(notebookId, sourceId),
    queryFn: async () => {
      const status = await getSourceStatus(notebookId, sourceId);
      queryClient.setQueryData(
        sourceKeys.list(notebookId),
        (current: PublicSource[] | undefined) =>
          current?.map((source) =>
            source.id === sourceId
              ? { ...source, indexingStatus: status.indexingStatus }
              : source,
          ) ?? current,
      );
      return status;
    },
    enabled: enabled && !!notebookId && !!sourceId && !sourceId.startsWith("optimistic-"),
    refetchInterval: (query) => {
      const status = query.state.data?.indexingStatus;
      if (!status || status === "indexed" || status === "failed") {
        return false;
      }
      return 3000;
    },
  });
}

export function useCreateTextSource(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTextSource,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: sourceKeys.list(notebookId),
      });
      const previous = queryClient.getQueryData<PublicSource[]>(
        sourceKeys.list(notebookId),
      );
      const optimistic = makeOptimisticSource({
        notebookId,
        type: "text",
        title: input.title,
        idempotencyKey: input.idempotencyKey,
      });

      queryClient.setQueryData(
        sourceKeys.list(notebookId),
        (current: PublicSource[] | undefined) => [
          optimistic,
          ...(current ?? []),
        ],
      );

      return { previous, idempotencyKey: input.idempotencyKey };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sourceKeys.list(notebookId), context.previous);
      }
    },
    onSuccess: (source, _input, context) => {
      if (context?.idempotencyKey) {
        replaceOptimisticSource(
          queryClient,
          notebookId,
          context.idempotencyKey,
          source,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) });
    },
  });
}

export function useCreateYoutubeSource(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createYoutubeSource,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: sourceKeys.list(notebookId),
      });
      const previous = queryClient.getQueryData<PublicSource[]>(
        sourceKeys.list(notebookId),
      );
      const optimistic = makeOptimisticSource({
        notebookId,
        type: "youtube",
        title: input.url,
        idempotencyKey: input.idempotencyKey,
      });

      queryClient.setQueryData(
        sourceKeys.list(notebookId),
        (current: PublicSource[] | undefined) => [
          optimistic,
          ...(current ?? []),
        ],
      );

      return { previous, idempotencyKey: input.idempotencyKey };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sourceKeys.list(notebookId), context.previous);
      }
    },
    onSuccess: (source, _input, context) => {
      if (context?.idempotencyKey) {
        replaceOptimisticSource(
          queryClient,
          notebookId,
          context.idempotencyKey,
          source,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) });
    },
  });
}

export function useCreatePdfSource(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      fileName: string;
      file: File;
      fileSize: number;
      mimeType: string;
      idempotencyKey: string;
    }) => {
      const init = await initPdfUpload({
        notebookId,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        idempotencyKey: input.idempotencyKey,
      });

      if (init.alreadyExists || !init.upload) {
        return init.source;
      }

      const body = new FormData();
      for (const [key, value] of Object.entries(init.upload.formData)) {
        body.append(key, value);
      }
      body.append("file", input.file);

      const uploadResponse = await fetch(init.upload.postURL, {
        method: "POST",
        body,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload PDF to storage");
      }

      return confirmPdfUpload({
        notebookId,
        sourceId: init.source.id,
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: sourceKeys.list(notebookId),
      });
      const previous = queryClient.getQueryData<PublicSource[]>(
        sourceKeys.list(notebookId),
      );
      const optimistic = makeOptimisticSource({
        notebookId,
        type: "pdf",
        title: input.fileName,
        idempotencyKey: input.idempotencyKey,
      });

      queryClient.setQueryData(
        sourceKeys.list(notebookId),
        (current: PublicSource[] | undefined) => [
          optimistic,
          ...(current ?? []),
        ],
      );

      return { previous, idempotencyKey: input.idempotencyKey };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sourceKeys.list(notebookId), context.previous);
      }
    },
    onSuccess: (source, _input, context) => {
      if (context?.idempotencyKey) {
        replaceOptimisticSource(
          queryClient,
          notebookId,
          context.idempotencyKey,
          source,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) });
    },
  });
}

export function useDeleteSource(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: string) => deleteSource(notebookId, sourceId),
    onMutate: async (sourceId) => {
      await queryClient.cancelQueries({
        queryKey: sourceKeys.list(notebookId),
      });
      const previous = queryClient.getQueryData<PublicSource[]>(
        sourceKeys.list(notebookId),
      );
      queryClient.setQueryData(
        sourceKeys.list(notebookId),
        (current: PublicSource[] | undefined) =>
          current?.filter((source) => source.id !== sourceId) ?? [],
      );
      return { previous };
    },
    onError: (_error, _sourceId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sourceKeys.list(notebookId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) });
    },
  });
}

export function useReindexSource(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: string) => reindexSource(notebookId, sourceId),
    onSuccess: (source) => {
      queryClient.setQueryData(
        sourceKeys.list(notebookId),
        (current: PublicSource[] | undefined) =>
          current?.map((item) => (item.id === source.id ? source : item)) ?? [
            source,
          ],
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) });
    },
  });
}

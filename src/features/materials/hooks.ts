/**
 * React Query bindings for materials and the SAP syncs.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialsApi, productsApi, type MaterialListQuery } from './api';
import type { ApiQuery } from '@/infrastructure/api/types';

export const materialKeys = {
  all: ['materials'] as const,
  materials: (q: MaterialListQuery) => [...materialKeys.all, 'materials', q] as const,
  material: (id: string) => [...materialKeys.all, 'material', id] as const,
  references: (path: string) => [...materialKeys.all, 'references', path] as const,
  stockDetail: (q: ApiQuery) => [...materialKeys.all, 'stock-detail', q] as const,
};

export const productKeys = materialKeys;

/** The local master. Paged server-side — 15,500 rows never come down at once. */
export function useMaterials(query: MaterialListQuery = {}) {
  return useQuery({
    queryKey: materialKeys.materials(query),
    queryFn: ({ signal }) => materialsApi.listMaterials(query, signal),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useMaterial(materialId: string | null) {
  return useQuery({
    queryKey: materialKeys.material(materialId ?? ''),
    queryFn: ({ signal }) => materialsApi.getMaterial(materialId!, signal),
    enabled: Boolean(materialId),
    staleTime: 5 * 60_000,
  });
}

/** One reference catalogue. Cached hard: these change only when SAP is re-synced. */
export function useMaterialReferences(path: string, enabled = true) {
  return useQuery({
    queryKey: materialKeys.references(path),
    queryFn: ({ signal }) => materialsApi.listReferences(path, signal),
    enabled,
    staleTime: 30 * 60_000,
  });
}

/**
 * Live batch stock from SAP.
 *
 * `retry: false` on purpose. When SAP is unreachable each attempt burns the full
 * timeout, so the default retries turn a twenty-second wait into a minute before the
 * screen admits anything is wrong.
 */
export function useStockDetail(query: ApiQuery = {}, enabled = true) {
  return useQuery({
    queryKey: materialKeys.stockDetail(query),
    queryFn: ({ signal }) => materialsApi.listStockDetail(query, signal),
    enabled,
    retry: false,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/** Queues all three syncs. Returns job ids, not counts. */
export function useSyncAll() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => materialsApi.syncAll(),
    // The jobs run in the background, so there is nothing to refetch yet. Invalidating
    // here would show the same pre-sync numbers and imply the refresh had finished.
    onSuccess: () => client.invalidateQueries({ queryKey: materialKeys.all, refetchType: 'none' }),
  });
}

/** Runs one sync and waits for its counts. */
export function useSyncOne() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ kind, maximumPages }: { kind: 'materials' | 'stock' | 'references'; maximumPages?: number }) => {
      if (kind === 'materials') return materialsApi.syncMaterials(maximumPages);
      if (kind === 'stock') return materialsApi.syncStock(maximumPages);
      return materialsApi.syncReferences();
    },
    onSettled: () => client.invalidateQueries({ queryKey: materialKeys.all }),
  });
}

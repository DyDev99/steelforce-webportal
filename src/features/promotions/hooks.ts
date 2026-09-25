/**
 * React Query bindings for promotions.
 *
 * Every mutation invalidates the list as well as the promotion it acted on: a transition
 * changes the open version's status, which is what the catalogue and the approval queue
 * are filtered by, so patching only the detail leaves both lists showing a decision that
 * has already been taken.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionsApi, type CreatePromotionInput } from './api';

export const promotionKeys = {
  all: ['promotions'] as const,
  list: (query: Record<string, unknown>) => [...promotionKeys.all, 'list', query] as const,
  detail: (id: string) => [...promotionKeys.all, 'detail', id] as const,
  categoryMappings: () => [...promotionKeys.all, 'category-mappings'] as const,
};

/** The catalogue. */
export function usePromotions(
  query: {
    status?: string;
    businessType?: string;
    sapStatus?: string;
    search?: string;
    pageSize?: number;
  } = {}
) {
  return useQuery({
    queryKey: promotionKeys.list(query),
    queryFn: ({ signal }) => promotionsApi.list(query, signal),
    staleTime: 30_000,
  });
}

/**
 * One promotion, with its versions.
 *
 * `staleTime: 0` — this is what somebody reads before signing, and a stale copy could
 * show a version another approver has already decided.
 */
export function usePromotion(id: string | undefined) {
  return useQuery({
    queryKey: promotionKeys.detail(id ?? ''),
    queryFn: ({ signal }) => promotionsApi.get(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

/** The category → SAP price group join. Changes rarely. */
export function useCategoryMappings() {
  return useQuery({
    queryKey: promotionKeys.categoryMappings(),
    queryFn: ({ signal }) => promotionsApi.listCategoryMappings(signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePromotionInput) => promotionsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Submit, approve, reject, activate, deactivate or cancel. */
export function usePromotionTransition(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      action: 'submit' | 'approve' | 'reject' | 'activate' | 'deactivate' | 'cancel';
      comment?: string;
      reason?: string;
    }) => promotionsApi.transition(id, input.action, { comment: input.comment, reason: input.reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Queues the SAP condition. */
export function useSyncPromotionToSap(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => promotionsApi.syncToSap(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

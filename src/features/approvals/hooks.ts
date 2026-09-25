/**
 * React Query bindings for the approval hub.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from './api';

export const approvalKeys = {
  all: ['approvals'] as const,
  quotations: () => [...approvalKeys.all, 'quotations'] as const,
  depots: () => [...approvalKeys.all, 'depots'] as const,
  depot: (id: string) => [...approvalKeys.all, 'depot', id] as const,
};

/** Quotations sitting at the approval gate. */
export function usePendingQuotations(pageSize = 50, enabled = true) {
  return useQuery({
    queryKey: [...approvalKeys.quotations(), pageSize],
    queryFn: ({ signal }) => approvalsApi.pendingQuotations(pageSize, signal),
    enabled,
    staleTime: 30_000,
  });
}

/** Depot registrations awaiting credit approval. */
export function usePendingDepots(pageSize = 50, enabled = true) {
  return useQuery({
    queryKey: [...approvalKeys.depots(), pageSize],
    queryFn: ({ signal }) => approvalsApi.pendingDepots(pageSize, signal),
    enabled,
    staleTime: 30_000,
  });
}

/**
 * One depot registration, in full, for the decision page.
 *
 * `staleTime: 0` unlike the queues above. A queue count may lag half a minute without
 * costing anything; the record somebody is about to commit a credit limit against may
 * not, and an approval changes the depot's own code, so a cached copy goes wrong the
 * moment the decision lands.
 */
export function useDepotApproval(id: string | undefined) {
  return useQuery({
    queryKey: approvalKeys.depot(id ?? ''),
    queryFn: ({ signal }) => approvalsApi.depotDetail(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

/**
 * Approves a depot, then re-reads it.
 *
 * Invalidated rather than patched from the response. Approving pushes the depot to SAP
 * and, on success, SAP's customer number becomes the depot's code — so the local copy is
 * stale in a way that matters, and the queue it came from has lost a row.
 */
export function useApproveDepot(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approvalsApi.approveDepot(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: approvalKeys.depot(id) }),
        queryClient.invalidateQueries({ queryKey: approvalKeys.depots() }),
      ]);
    },
  });
}

/** Refuses a depot, then re-reads it. The reason is required by the server. */
export function useRejectDepot(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => approvalsApi.rejectDepot(id, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: approvalKeys.depot(id) }),
        queryClient.invalidateQueries({ queryKey: approvalKeys.depots() }),
      ]);
    },
  });
}

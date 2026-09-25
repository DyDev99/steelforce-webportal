/**
 * React Query bindings for the agreement pipeline.
 *
 * Every mutation invalidates the whole `promotions` key. The four screens are one
 * pipeline: approving a request creates terms and queues SAP work, and closing a SAP
 * task flips a term to effective. Patching one list by hand would leave the other three
 * describing a state that no longer exists.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agreementWriteApi,
  promotionsApi,
  type AgreementOutcome,
  type AgreementLineInput,
  type CreateAgreementInput,
} from './api';

export const promotionKeys = {
  all: ['promotions'] as const,
  requests: (q: object) => [...promotionKeys.all, 'requests', q] as const,
  request: (id: string) => [...promotionKeys.all, 'request', id] as const,
  terms: (q: object) => [...promotionKeys.all, 'terms', q] as const,
  sapTasks: (status?: string) => [...promotionKeys.all, 'sap-tasks', status ?? null] as const,
  categoryMappings: () => [...promotionKeys.all, 'category-mappings'] as const,
  pickupRules: () => [...promotionKeys.all, 'pickup-rules'] as const,
};

export function useAgreementRequests(
  query: { status?: string; step?: number; page?: number; pageSize?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: promotionKeys.requests(query),
    queryFn: ({ signal }) => promotionsApi.listRequests(query, signal),
    enabled,
    staleTime: 30_000,
  });
}

/** Disabled until a row is opened — the detail carries lines and the full timeline. */
export function useAgreementRequest(requestId: string | null) {
  return useQuery({
    queryKey: promotionKeys.request(requestId ?? ''),
    queryFn: ({ signal }) => promotionsApi.getRequest(requestId!, signal),
    enabled: Boolean(requestId),
    staleTime: 15_000,
  });
}

export function useAgreementTerms(query: { state?: string; categoryCode?: string; page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: promotionKeys.terms(query),
    queryFn: ({ signal }) => promotionsApi.listTerms(query, signal),
    staleTime: 30_000,
  });
}

export function useSapTasks(status?: string) {
  return useQuery({
    queryKey: promotionKeys.sapTasks(status),
    queryFn: ({ signal }) => promotionsApi.listSapTasks(status, signal),
    staleTime: 30_000,
  });
}

export function useCategoryMappings() {
  return useQuery({
    queryKey: promotionKeys.categoryMappings(),
    queryFn: ({ signal }) => promotionsApi.listCategoryMappings(signal),
    staleTime: 5 * 60_000,
  });
}

export function usePickupRules() {
  return useQuery({
    queryKey: promotionKeys.pickupRules(),
    queryFn: ({ signal }) => promotionsApi.listPickupRules(signal),
    staleTime: 5 * 60_000,
  });
}

/** Records an approver's decision on one step. */
export function useActOnStep() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      stepOrder,
      outcome,
      comment,
    }: {
      requestId: string;
      stepOrder: number;
      outcome: AgreementOutcome;
      comment?: string;
    }) => promotionsApi.actOnStep(requestId, stepOrder, outcome, comment),
    onSettled: () => client.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Closes a SAP condition task, which is what makes the term chargeable. */
export function useCompleteSapTask() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, conditionRecord, notes }: { taskId: string; conditionRecord: string; notes?: string }) =>
      promotionsApi.completeSapTask(taskId, conditionRecord, notes),
    onSettled: () => client.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Raises a new draft request. */
export function useCreateAgreement() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAgreementInput) => agreementWriteApi.create(input),
    onSettled: () => client.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Replaces a draft's lines and remarks. */
export function useUpdateAgreement() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      remarks,
      lines,
    }: {
      requestId: string;
      remarks?: string;
      lines: AgreementLineInput[];
    }) => agreementWriteApi.update(requestId, { remarks, lines }),
    onSettled: () => client.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Sends a draft onto the approval chain. */
export function useSubmitAgreement() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => agreementWriteApi.submit(requestId),
    onSettled: () => client.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Retracts a request the author no longer wants signed. */
export function useWithdrawAgreement() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => agreementWriteApi.withdraw(requestId),
    onSettled: () => client.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

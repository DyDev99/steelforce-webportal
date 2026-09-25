import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitsApi } from './api';
import type { ApiQuery } from '@/infrastructure/api/types';

export const visitKeys = {
  all: ['visits'] as const,
  list: (filters: ApiQuery) => [...visitKeys.all, 'list', filters] as const,
  detail: (id: string) => [...visitKeys.all, 'detail', id] as const,
  photos: (id: string) => [...visitKeys.all, 'photos', id] as const,
  inventory: (id: string) => [...visitKeys.all, 'inventory', id] as const,
  telemetry: (repId: string, filters: ApiQuery) => [...visitKeys.all, 'telemetry', repId, filters] as const,
  fraudAlerts: (filters: ApiQuery) => [...visitKeys.all, 'fraud-alerts', filters] as const,
};

export function useVisits(filters: ApiQuery = {}) {
  return useQuery({
    queryKey: visitKeys.list(filters),
    queryFn: ({ signal }) => visitsApi.listVisits(filters, signal),
    staleTime: 30_000,
  });
}

export function useVisitDetails(visitId: string) {
  return useQuery({
    queryKey: visitKeys.detail(visitId),
    queryFn: ({ signal }) => visitsApi.getVisit(visitId, signal),
    enabled: !!visitId,
    staleTime: 60_000,
  });
}

export function useProofPhotos(visitId: string) {
  return useQuery({
    queryKey: visitKeys.photos(visitId),
    queryFn: ({ signal }) => visitsApi.getPhotos(visitId, signal),
    enabled: !!visitId,
    staleTime: 60_000,
  });
}

export function useTelemetry(repId: string, filters: ApiQuery = {}) {
  return useQuery({
    queryKey: visitKeys.telemetry(repId, filters),
    queryFn: ({ signal }) => visitsApi.getTelemetry(repId, filters, signal),
    enabled: !!repId,
    staleTime: 30_000,
  });
}

export function useFraudAlerts(filters: ApiQuery = { minimumSeverity: 'high' }) {
  return useQuery({
    queryKey: visitKeys.fraudAlerts(filters),
    queryFn: ({ signal }) => visitsApi.getFraudAlerts(filters, signal),
    staleTime: 30_000,
  });
}

export function useDepotInventory(visitId: string) {
  return useQuery({
    queryKey: visitKeys.inventory(visitId),
    queryFn: ({ signal }) => visitsApi.getInventory(visitId, signal),
    enabled: !!visitId,
    staleTime: 60_000,
  });
}

export function usePublishRoute() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (route: any) => visitsApi.publishRoute(route),
    onSuccess: () => {
      // Invalidate visits to fetch the new routes
      qc.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

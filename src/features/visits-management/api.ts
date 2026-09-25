import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData, unwrapList, unwrapPage } from '@/infrastructure/api/envelope';
import type { ApiQuery } from '@/infrastructure/api/types';

const API_V1 = '/api/v1';

// Schemas
export const VisitStatus = z.enum(['pending', 'enRoute', 'arrived', 'checkedIn', 'checkedOut', 'missed']);
export const FraudSeverity = z.enum(['none', 'low', 'medium', 'high', 'critical']);
export const FraudCode = z.enum(['MOCK_LOCATION', 'IMPOSSIBLE_SPEED', 'VPN_DETECTED', 'POOR_ACCURACY', 'OUTSIDE_GEOFENCE', 'DISTANCE_MISMATCH', '*']).catch('*' as any); // Catch-all for unknown codes

export const VisitSchema = z.object({
  id: z.string().optional().catch(''), // Often visitId is the id
  visitId: z.string().optional(),
  routeId: z.string().optional(),
  repId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  repName: z.string().optional(),
  status: VisitStatus.catch('pending'),
  fraudSeverity: FraudSeverity.catch('none'),
  fraudCodes: z.array(FraudCode).optional().catch([]),
  hasOverride: z.boolean().optional(),
  overrideReason: z.string().optional().nullable(),
  checkedInAt: z.string().nullable().optional(),
  checkedOutAt: z.string().nullable().optional(),
  plannedArrival: z.string().nullable().optional(),
  plannedDeparture: z.string().nullable().optional(),
  hasProofPhoto: z.boolean().optional(),
  reportedDistanceMetres: z.number().nullable().optional(),
  verifiedDistanceMetres: z.number().nullable().optional(),
}).passthrough();

export type Visit = z.infer<typeof VisitSchema>;

export const VisitPageSchema = z.object({
  items: z.array(VisitSchema),
  totalCount: z.number(),
}).passthrough();

export const PhotoSchema = z.object({
  id: z.string(),
  contentUrl: z.string().nullable(),
  uploadState: z.string(),
}).passthrough();

export const TelemetrySampleSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  capturedAt: z.string(),
}).passthrough();

export const FraudAlertSchema = z.object({
  id: z.string().optional(),
  visitId: z.string().optional(),
  repId: z.string(),
  repName: z.string().optional(),
  severity: FraudSeverity,
  code: FraudCode,
  blocked: z.boolean().optional(),
  capturedAt: z.string(),
  receivedAt: z.string().optional(),
}).passthrough();

export const FraudAlertPageSchema = z.object({
  items: z.array(FraudAlertSchema),
  totalCount: z.number(),
}).passthrough();

export const InventoryAuditSchema = z.object({
  itemId: z.string(),
  band: z.enum(['low', 'medium', 'high']).catch('medium'),
}).passthrough();

// API Endpoints
export const visitsApi = {
  listVisits: async (query?: ApiQuery, signal?: AbortSignal) => {
    const data = await apiClient.get<any>(`${API_V1}/admin/visits`, { query, signal });
    return VisitPageSchema.parse(unwrapPage(data));
  },

  getVisit: async (visitId: string, signal?: AbortSignal) => {
    const data = await apiClient.get<any>(`${API_V1}/admin/visits/${visitId}`, { signal });
    return VisitSchema.parse(unwrapData(data));
  },

  getPhotos: async (visitId: string, signal?: AbortSignal) => {
    const data = await apiClient.get<any>(`${API_V1}/admin/visits/${visitId}/photos`, { signal });
    return z.array(PhotoSchema).parse(unwrapList(data));
  },

  getTelemetry: async (repId: string, query?: ApiQuery, signal?: AbortSignal) => {
    const data = await apiClient.get<any>(`${API_V1}/admin/telemetry/reps/${repId}`, { query, signal });
    return z.array(TelemetrySampleSchema).parse(unwrapList(data));
  },

  getFraudAlerts: async (query?: ApiQuery, signal?: AbortSignal) => {
    const data = await apiClient.get<any>(`${API_V1}/admin/field/fraud-alerts`, { query, signal });
    return FraudAlertPageSchema.parse(unwrapPage(data));
  },

  getInventory: async (visitId: string, signal?: AbortSignal) => {
    const data = await apiClient.get<any>(`${API_V1}/admin/visits/${visitId}/inventory`, { signal });
    return z.array(InventoryAuditSchema).parse(unwrapList(data));
  },

  publishRoute: async (route: any, signal?: AbortSignal) => {
    return apiClient.post<any>(`${API_V1}/admin/routes/publish`, { body: route, signal });
  }
};

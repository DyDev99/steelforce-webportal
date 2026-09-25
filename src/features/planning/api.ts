/**
 * The planning module's HTTP boundary.
 *
 * Everything here mirrors `AdminPlanningController` on the backend. The demo fixtures
 * in `data/demo-data.ts` remain as a fallback for a portal pointed at no API — see
 * `adapters.ts` for how the two shapes are reconciled and, more importantly, for which
 * fields the backend deliberately does not model.
 */
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData, unwrapPage } from '@/infrastructure/api/envelope';
import type { ApiQuery } from '@/infrastructure/api/types';

const API_V1 = '/api/v1';
const PLANNING = `${API_V1}/admin/planning`;

// --- Schemas ---------------------------------------------------------------

export const PlanLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const GeoPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyMetres: z.number(),
});

/**
 * Stop execution states, exactly as `RouteStop.Status` spells them.
 *
 * `catch` rather than a strict parse: a backend that adds a seventh state should make a
 * card render as pending, not blank the whole board.
 */
export const PlanningStopStatus = z
  .enum(['pending', 'enRoute', 'arrived', 'checkedIn', 'checkedOut', 'missed'])
  .catch('pending');

export const PlanningCustomerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  territory: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: PlanLocationSchema.nullable().optional(),
  creditLimit: z.number().default(0),
  creditBalance: z.number().default(0),
  currency: z.string().default('USD'),
  lifetimeValue: z.number().default(0),
  totalOrders: z.number().default(0),
  lastOrderDate: z.string().nullable().optional(),
  lastVisitDate: z.string().nullable().optional(),
  assignedSalesRepId: z.string().nullable().optional(),
});

export const PlanningStopSchema = z.object({
  id: z.string(),
  planId: z.string(),
  repId: z.string(),
  repName: z.string().nullable().optional(),
  sequence: z.number(),
  status: PlanningStopStatus,
  plannedArrival: z.string(),
  plannedDeparture: z.string(),
  actualArrival: z.string().nullable().optional(),
  actualDeparture: z.string().nullable().optional(),
  estimatedMinutes: z.number().default(0),
  distanceFromPreviousKm: z.number().nullable().optional(),
  canEdit: z.boolean().default(true),
  customer: PlanningCustomerSchema.nullable().optional(),
});

export const PlanningRepSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  employeeCode: z.string().nullable().optional(),
  territory: z.string().nullable().optional(),
  depotCode: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  planId: z.string().nullable().optional(),
  routeStatus: z.string().nullable().optional(),
  assignedStops: z.number().default(0),
  completedStops: z.number().default(0),
  capacity: z.number().default(12),
  plannedDistanceKm: z.number().nullable().optional(),
  plannedMinutes: z.number().default(0),
  lastKnownLocation: GeoPointSchema.nullable().optional(),
  lastSeenAt: z.string().nullable().optional(),
});

export const PlanningKpiSchema = z.object({
  totalStops: z.number().default(0),
  completedStops: z.number().default(0),
  inProgressStops: z.number().default(0),
  pendingStops: z.number().default(0),
  missedStops: z.number().default(0),
  unscheduledCustomers: z.number().default(0),
  repsWithRoutes: z.number().default(0),
  totalReps: z.number().default(0),
  coveragePercent: z.number().nullable().optional(),
  completionPercent: z.number().nullable().optional(),
  totalDistanceKm: z.number().default(0),
  averageDistanceKm: z.number().nullable().optional(),
  plannedMinutes: z.number().default(0),
});

export const PlanningBoardSchema = z.object({
  date: z.string(),
  kpis: PlanningKpiSchema,
  reps: z.array(PlanningRepSchema).default([]),
  stops: z.array(PlanningStopSchema).default([]),
});

export const PlanningCandidateSchema = z.object({
  customer: PlanningCustomerSchema,
  daysSinceLastVisit: z.number().nullable().optional(),
  scheduledElsewhere: z.boolean().default(false),
});

export const PlanningCandidatePageSchema = z.object({
  items: z.array(PlanningCandidateSchema).default([]),
  totalCount: z.number().default(0),
});

export const AssignStopResultSchema = z.object({
  stopId: z.string(),
  planId: z.string(),
  sequence: z.number(),
  plannedArrival: z.string(),
  plannedDeparture: z.string(),
  createdPlan: z.boolean().default(false),
});

export const OptimizeResultSchema = z.object({
  planId: z.string(),
  strategy: z.string(),
  stopsMoved: z.number().default(0),
  distanceBeforeKm: z.number().nullable().optional(),
  distanceAfterKm: z.number().nullable().optional(),
  stops: z.array(z.unknown()).default([]),
});

export const PlanningTrendPointSchema = z.object({
  date: z.string(),
  scheduledStops: z.number().default(0),
  completedStops: z.number().default(0),
  missedStops: z.number().default(0),
  activeReps: z.number().default(0),
  distanceKm: z.number().default(0),
});

export const PlanningBreakdownSchema = z.object({
  key: z.string(),
  scheduledStops: z.number().default(0),
  completedStops: z.number().default(0),
});

export const PlanningAnalyticsSchema = z.object({
  from: z.string(),
  to: z.string(),
  totals: PlanningKpiSchema,
  trend: z.array(PlanningTrendPointSchema).default([]),
  byStatus: z.array(PlanningBreakdownSchema).default([]),
  byProvince: z.array(PlanningBreakdownSchema).default([]),
  byCustomerType: z.array(PlanningBreakdownSchema).default([]),
  byRep: z.array(PlanningBreakdownSchema).default([]),
});

export type PlanningCustomerDto = z.infer<typeof PlanningCustomerSchema>;
export type PlanningStopDto = z.infer<typeof PlanningStopSchema>;
export type PlanningRepDto = z.infer<typeof PlanningRepSchema>;
export type PlanningKpiDto = z.infer<typeof PlanningKpiSchema>;
export type PlanningBoardDto = z.infer<typeof PlanningBoardSchema>;
export type PlanningCandidateDto = z.infer<typeof PlanningCandidateSchema>;
export type PlanningAnalyticsDto = z.infer<typeof PlanningAnalyticsSchema>;
export type AssignStopResultDto = z.infer<typeof AssignStopResultSchema>;
export type OptimizeResultDto = z.infer<typeof OptimizeResultSchema>;

/** The five orderings the server implements, as it spells them. */
export const OPTIMIZE_STRATEGY_WIRE = [
  'distance',
  'priority',
  'customerValue',
  'plannedTime',
  'territory',
] as const;

export type OptimizeStrategyWire = (typeof OPTIMIZE_STRATEGY_WIRE)[number];

export interface AssignStopInput {
  repId: string;
  visitDate: string;
  customerId: string;
  plannedArrival?: string;
  durationMinutes?: number;
}

// --- Endpoints -------------------------------------------------------------

export const planningApi = {
  /** One day's whole board: reps, their stops, the customers behind them, the KPIs. */
  getBoard: async (
    query: { date?: string; repId?: string; territory?: string } = {},
    signal?: AbortSignal
  ): Promise<PlanningBoardDto> => {
    const body = await apiClient.get<unknown>(`${PLANNING}/board`, { query: query as ApiQuery, signal });
    return PlanningBoardSchema.parse(unwrapData(body));
  },

  /** The unscheduled pool for a day, paged and filterable. */
  getCandidates: async (query: ApiQuery = {}, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${PLANNING}/candidates`, { query, signal });

    // Paged, so the rows are the bare `data` array and the total sits in
    // `meta.pagination` — parsing `data` straight into a { items, totalCount } schema
    // throws, and the pool then silently renders empty.
    return PlanningCandidatePageSchema.parse(unwrapPage(body));
  },

  /** Puts one customer on one representative's day. Creates the route if needed. */
  assignStop: async (input: AssignStopInput, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${PLANNING}/stops`, { body: input, signal });
    return AssignStopResultSchema.parse(unwrapData(body));
  },

  /** Takes one stop off a day. Refused once the representative has reached it. */
  unassignStop: (stopId: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`${PLANNING}/stops/${stopId}`, { signal }),

  /**
   * Rearranges a plan.
   *
   * `stopIds` must be every stop on the route exactly once — the server refuses a
   * partial order rather than applying it to the prefix.
   */
  reorderStops: async (planId: string, stopIds: string[], signal?: AbortSignal) => {
    const body = await apiClient.put<unknown>(`${PLANNING}/plans/${planId}/sequence`, {
      body: { stopIds },
      signal,
    });
    return unwrapData(body);
  },

  /** Reorders a plan by one of the five server-side strategies. */
  optimizePlan: async (planId: string, strategy: OptimizeStrategyWire, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${PLANNING}/plans/${planId}/optimize`, {
      body: { strategy },
      signal,
    });
    return OptimizeResultSchema.parse(unwrapData(body));
  },

  /** Aggregates for the analytics screen. Window defaults to this month to date. */
  getAnalytics: async (
    query: { from?: string; to?: string; repId?: string; territory?: string } = {},
    signal?: AbortSignal
  ): Promise<PlanningAnalyticsDto> => {
    const body = await apiClient.get<unknown>(`${PLANNING}/analytics`, {
      query: query as ApiQuery,
      signal,
    });
    return PlanningAnalyticsSchema.parse(unwrapData(body));
  },
};

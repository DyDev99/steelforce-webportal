/**
 * The Sales Reps board's HTTP boundary.
 *
 * Mirrors `AdminSalesRepsController` — `/api/v1/admin/sales-reps`. Note the path: the
 * platform calls them *sales-reps*, not *sales-representatives*.
 *
 * ## What the platform does and does not know about a representative
 *
 * A "sales representative" is not a separate entity here — it is a user account holding
 * the `access.mobile` permission, which is the same rule that decides who may sign in to
 * the handset. So the identity fields (name, e-mail, territory, depot, roles) are real
 * and authoritative.
 *
 * The **performance** figures are counted live from route stops. There is no scorecard
 * table and no nightly rollup, which is deliberate: a second set of numbers would
 * disagree with the visits board the first time a stop was re-synced.
 *
 * Consequently there is **no monthly target, no revenue, no order count and no star
 * rating** on this endpoint, and the backend contract says so explicitly — those are HR
 * and finance figures that live in no table on this platform. `successRate` is
 * completion against what was *scheduled*, which the platform does know. Anything on
 * screen claiming otherwise would be invented here in the browser, which is no better
 * than inventing it on the server.
 */
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData, unwrapPage } from '@/infrastructure/api/envelope';
import type { ApiQuery } from '@/infrastructure/api/types';

const API_V1 = '/api/v1';
const SALES_REPS = `${API_V1}/admin/sales-reps`;

/**
 * Field performance over a window, counted from route stops.
 *
 * `successRate` is null when nothing was scheduled — **not zero**. Zero reads as a
 * representative who failed every call; null is a representative who was given none,
 * and a board that renders them the same way libels somebody.
 */
export const RepMetricsSchema = z.object({
  from: z.string(),
  to: z.string(),
  scheduledVisits: z.number().default(0),
  completedVisits: z.number().default(0),
  missedVisits: z.number().default(0),
  successRate: z.number().nullable().optional(),
  flaggedVisits: z.number().default(0),
});

export const SalesRepSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  employeeCode: z.string().nullable().optional(),
  /** The sales territory. The API calls this `zone`. */
  zone: z.string().nullable().optional(),
  depotCode: z.string().nullable().optional(),
  roles: z.array(z.string()).default([]),
  /** False when the field account is suspended and cannot sign in. */
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().nullable().optional(),
  metrics: RepMetricsSchema,
});

/** One entry in a representative's recent field activity. */
export const RepActivitySchema = z.object({
  type: z.enum(['checkIn', 'checkOut', 'missed']).catch('checkIn'),
  timestamp: z.string(),
  visitId: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
});

/** The route header the detail endpoint returns for today. */
export const RepActiveRouteSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    territory: z.string().nullable().optional(),
    visitDate: z.string(),
    status: z.string(),
    stopCount: z.number().default(0),
    completedStopCount: z.number().default(0),
    estimatedDistanceKm: z.number().nullable().optional(),
  })
  .passthrough();

export const SalesRepDetailSchema = z.object({
  rep: SalesRepSchema,
  joinDate: z.string(),
  activeRoute: RepActiveRouteSchema.nullable().optional(),
  recentActivity: z.array(RepActivitySchema).default([]),
});

export const SalesRepPageSchema = z.object({
  items: z.array(SalesRepSchema).default([]),
  totalCount: z.number().default(0),
});

export type RepMetricsDto = z.infer<typeof RepMetricsSchema>;
export type SalesRepDto = z.infer<typeof SalesRepSchema>;
export type SalesRepDetailDto = z.infer<typeof SalesRepDetailSchema>;
export type RepActivityDto = z.infer<typeof RepActivitySchema>;

export interface SalesRepListQuery extends ApiQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  territoryCode?: string;
  /** Start of the metrics window. Defaults server-side to the first of this month. */
  from?: string;
  /** End of the metrics window, inclusive. Defaults server-side to today. */
  to?: string;
}

/** Fields a PATCH may change. Omitted fields are left alone. */
export interface UpdateSalesRepInput {
  /** New sales territory. Send an empty string to clear it. */
  zone?: string;
  /** `active` or `suspended`. Suspending additionally requires `users.deactivate`. */
  status?: 'active' | 'suspended';
}

export const salesRepsApi = {
  /** Pages the field representatives with their performance for a window. */
  list: async (query: SalesRepListQuery = {}, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(SALES_REPS, { query, signal });

    // Paged: the rows arrive as a bare `data` array with the total in
    // `meta.pagination`, so the envelope has to be decoded before the schema sees it.
    return SalesRepPageSchema.parse(unwrapPage(body));
  },

  /** One representative, today's route and their recent field activity. */
  get: async (repId: string, query: { from?: string; to?: string } = {}, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${SALES_REPS}/${repId}`, {
      query: query as ApiQuery,
      signal,
    });

    return SalesRepDetailSchema.parse(unwrapData(body));
  },

  /**
   * Reassigns a territory, or suspends and reinstates an account.
   *
   * Writes through the same user-management path as the Users screen, so the
   * last-administrator guard, the audit entry and the device-session revocation all
   * apply exactly as they do there.
   */
  update: async (repId: string, input: UpdateSalesRepInput, signal?: AbortSignal) => {
    const body = await apiClient.patch<unknown>(`${SALES_REPS}/${repId}`, {
      body: input,
      signal,
    });

    return SalesRepSchema.parse(unwrapData(body));
  },
};

// --- SAP sales employees ----------------------------------------------------

/**
 * One row of SAP's personnel master — **not** a field representative.
 *
 * See `AdminSalesEmployeesController`. A sales employee is a name SAP sends, stamped on
 * customer records to say who owns the account. A representative is a platform user
 * account that can sign in to the handset and be given a route. There are thousands of
 * the first and a handful of the second.
 */
export const SalesEmployeeSchema = z.object({
  personnelNumber: z.string(),
  fullName: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  deactivatedAt: z.string().nullable().optional(),
  synchronisedAt: z.string().nullable().optional(),
});

export const SalesEmployeePageSchema = z.object({
  items: z.array(SalesEmployeeSchema).default([]),
  totalCount: z.number().default(0),
});

export type SalesEmployeeDto = z.infer<typeof SalesEmployeeSchema>;

export interface SalesEmployeeListQuery extends ApiQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export const salesEmployeesApi = {
  /** Pages SAP's sales employee register. Search matches personnel number or name. */
  list: async (query: SalesEmployeeListQuery = {}, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${API_V1}/admin/sales-employees`, { query, signal });

    return SalesEmployeePageSchema.parse(unwrapPage(body));
  },
};

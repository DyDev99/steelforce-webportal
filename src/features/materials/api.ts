/**
 * The materials module's HTTP boundary — `MaterialsController`.
 *
 * ## Two kinds of read, and the difference matters
 *
 * **Cached reads** hit the platform's own tables, filled by the SAP syncs. The material
 * master (~15,500 rows) and the five reference catalogues (~450) are all local, so they
 * are fast and they work whether or not SAP is reachable.
 *
 * **Live reads** go through to SAP on every call: batch-level stock detail, a material's
 * availability, and the material check. They are the truth, they are slow, and **they
 * fail when SAP is unreachable** — which, since SAP sits on an internal address, is the
 * normal state outside the office network. They are given a short timeout and their own
 * error handling rather than being allowed to hang a screen for a minute.
 *
 * Mixing the two on one screen without saying which is which is how somebody reads a
 * cached band as a live quantity and promises stock that is not there.
 */
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData, unwrapList, unwrapPage } from '@/infrastructure/api/envelope';
import type { ApiQuery } from '@/infrastructure/api/types';

const API_V1 = '/api/v1';
const MATERIALS = `${API_V1}/admin/materials`;

/**
 * How long to wait on a read that goes through to SAP.
 *
 * The server itself gives up around sixty seconds. Waiting that long behind a spinner
 * teaches people the screen is broken; twenty seconds is long enough for a healthy SAP
 * and short enough to say "not answering" while somebody is still watching.
 */
const SAP_TIMEOUT_MS = 20_000;

export const MaterialSchema = z.object({
  id: z.string(),
  material: z.string(),
  name: z.string(),
  materialName: z.string().nullable().optional(),
  materialKhName: z.string().nullable().optional(),
  materialType: z.string().nullable().optional(),
  materialTypeName: z.string().nullable().optional(),
  materialGroup: z.string().nullable().optional(),
  materialGroupName: z.string().nullable().optional(),
  baseUnit: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  isBlocked: z.boolean().default(false),
});

/** A row of any of the five reference catalogues — they share one shape. */
export const MaterialReferenceSchema = z.object({
  code: z.string(),
  name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  plant: z.string().nullable().optional(),
});

export const StockDetailSchema = z
  .object({
    material: z.string(),
    materialName: z.string().nullable().optional(),
    plant: z.string().nullable().optional(),
    storageLocation: z.string().nullable().optional(),
    batch: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
  })
  .passthrough();

/** What a synchronous sync reports when it finishes. */
export const SyncSummarySchema = z.object({
  success: z.boolean().default(false),
  inserted: z.number().default(0),
  updated: z.number().default(0),
  skipped: z.number().default(0),
  removed: z.number().optional(),
  total: z.number().default(0),
  sapTotalCount: z.number().optional(),
  isPartial: z.boolean().optional(),
  capturedAt: z.string().optional(),
  durationMs: z.number().default(0),
});

/** What `sync-all` returns — job ids, not counts. The work has not happened yet. */
export const SyncQueuedSchema = z.object({
  referencesJobId: z.string(),
  materialsJobId: z.string(),
  stockJobId: z.string(),
  message: z.string(),
});

const MaterialPageSchema = z.object({
  items: z.array(MaterialSchema).default([]),
  totalCount: z.number().default(0),
});

const StockPageSchema = z.object({
  items: z.array(StockDetailSchema).default([]),
  totalCount: z.number().default(0),
});

export type MaterialDto = z.infer<typeof MaterialSchema>;
export type MaterialReferenceDto = z.infer<typeof MaterialReferenceSchema>;
export type StockDetailDto = z.infer<typeof StockDetailSchema>;
export type SyncSummaryDto = z.infer<typeof SyncSummarySchema>;
export type SyncQueuedDto = z.infer<typeof SyncQueuedSchema>;

/** The five SAP reference catalogues, in the order the Categories screen lists them. */
export const REFERENCE_KINDS = [
  { key: 'types', label: 'Material types', path: 'types' },
  { key: 'groups', label: 'Material groups', path: 'groups' },
  { key: 'price-groups', label: 'Price groups', path: 'price-groups' },
  { key: 'plants', label: 'Plants', path: 'plants' },
  { key: 'storage-locations', label: 'Storage locations', path: 'storage-locations' },
] as const;

export type ReferenceKind = (typeof REFERENCE_KINDS)[number]['key'];

export interface MaterialListQuery extends ApiQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  materialType?: string;
  materialGroup?: string;
}

export const materialsApi = {
  // --- Cached: the platform's own tables -----------------------------------

  /** Pages the material master held locally. Fast, and independent of SAP. */
  listMaterials: async (query: MaterialListQuery = {}, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(MATERIALS, { query, signal });

    return MaterialPageSchema.parse(unwrapPage(body));
  },

  /** One material's full record. */
  getMaterial: async (materialId: string, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${MATERIALS}/${materialId}`, { signal });

    return unwrapData<Record<string, unknown>>(body);
  },

  /** One of the five reference catalogues. */
  listReferences: async (path: string, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${MATERIALS}/${path}`, { signal });

    return z.array(MaterialReferenceSchema).parse(unwrapList(body));
  },

  // --- Live: straight through to SAP ---------------------------------------

  /**
   * Batch-level stock, read live from SAP.
   *
   * **Detail rows sum to the cached summary, so the two must never be added together.**
   * The live feed holds roughly 17,500 detail positions against the summary's 6,332.
   */
  listStockDetail: async (query: ApiQuery = {}, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${MATERIALS}/stock/detail`, {
      query,
      signal,
      timeoutMs: SAP_TIMEOUT_MS,
    });

    return StockPageSchema.parse(unwrapPage(body));
  },

  // --- Synchronisation ------------------------------------------------------

  /**
   * Refreshes everything, in the background.
   *
   * Returns `202` with three Hangfire job ids and no counts — the work has been
   * accepted, not done. This is the one-click refresh; the three below are for when
   * somebody needs a specific part and is willing to wait for the numbers.
   */
  syncAll: async (signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${MATERIALS}/sync-all`, { signal });

    return SyncQueuedSchema.parse(unwrapData(body));
  },

  /**
   * Pulls the material master and reconciles it. **Synchronous and slow** — around four
   * minutes for the full master, so it is given room rather than the usual timeout.
   */
  syncMaterials: async (maximumPages: number | undefined, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${MATERIALS}/sync`, {
      query: (maximumPages ? { maximumPages } : {}) as ApiQuery,
      signal,
      timeoutMs: 5 * 60_000,
    });

    return SyncSummarySchema.parse(unwrapData(body));
  },

  /** Pulls the stock snapshot. A partial read is refused server-side rather than imported. */
  syncStock: async (maximumPages: number | undefined, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${MATERIALS}/sync-stock`, {
      query: (maximumPages ? { maximumPages } : {}) as ApiQuery,
      signal,
      timeoutMs: 5 * 60_000,
    });

    return SyncSummarySchema.parse(unwrapData(body));
  },

  /** Pulls the five reference catalogues. Seconds, not minutes. */
  syncReferences: async (signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${MATERIALS}/sync-references`, {
      signal,
      timeoutMs: 60_000,
    });

    return SyncSummarySchema.parse(unwrapData(body));
  },
};

export const productsApi = materialsApi;

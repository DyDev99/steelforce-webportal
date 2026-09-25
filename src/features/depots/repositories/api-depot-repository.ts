import { apiClient } from '@/infrastructure/api/client';
import type { PageResult } from '@/infrastructure/repositories/types';
import {
  depotStatusToWire,
  mapCustomerToDepot,
  mapDepotToCustomerPayload,
  type CustomerDto,
  type CustomerListItemDto,
} from './mappers';
import type {
  CreateDepotInput,
  Depot,
  DepotListQuery,
  DepotRepository,
  DepotSapOperations,
  SapSyncStatus,
  UpdateDepotInput,
} from './types';

const API_V1 = '/api/v1';

/** The admin envelope every non-mobile endpoint returns. */
interface ApiWrapped<T> {
  data: T;
  meta?: { pagination?: { totalCount?: number; hasNextPage?: boolean } };
}

/**
 * Depots, served by the platform's customer API.
 *
 * "Depot" is the portal's word for what the backend calls a customer: one trading
 * account, one master record. The paths below say `customers` because that is what
 * the API is called; nothing above this file needs to know.
 *
 * Verified against `docs/feature/depot/api/admin.md` and `CustomersController`.
 */
export class ApiDepotRepository implements DepotRepository {
  /**
   * @param currentUserId Resolves `scope: 'assigned'` — "my depots" — into a rep
   * filter. Row visibility is the API's decision, made from `customers.readall`: a
   * representative is confined to their own customers whatever is asked for here, and
   * an administrator sees everything *unless* a scope narrows it. Without this, "My
   * Depots" would show an administrator the entire master.
   */
  constructor(private readonly currentUserId?: () => string | null) {}

  async list(query: DepotListQuery = {}, signal?: AbortSignal): Promise<PageResult<Depot>> {
    const pageNumber = query.page ?? 1;
    // The endpoint clamps at 1,000; 200 fills a back-office grid in one request.
    const pageSize = query.pageSize ?? query.limit ?? 200;

    // An explicit rep wins; otherwise 'assigned' means the signed-in user. Scope 'all'
    // and an absent scope both send nothing and let permissions decide.
    const assignedSalesRepId =
      query.salesRepId ?? (query.scope === 'assigned' ? this.currentUserId?.() ?? undefined : undefined);

    // The depot directory, not the shared customer endpoint: `/admin/depots` demands
    // `customers.readall`, applies no row scoping, pages up to 1,000 and omits the
    // document blobs. `/customers` would cap at 200 and attach every photograph.
    const res = await apiClient.get<ApiWrapped<CustomerListItemDto[]>>(`${API_V1}/admin/depots`, {
      query: {
        pageNumber,
        pageSize,
        search: query.search?.trim() || undefined,
        // Statuses the API does not model — "Needs Follow-up", "At Risk" — map to
        // undefined and simply do not filter, rather than returning nothing.
        // A lifecycle value is the API's own vocabulary and passes through; the CRM
        // status still goes through the translation that cannot represent all of it.
        status: query.lifecycle ?? depotStatusToWire(query.status),
        assignedSalesRepId,
        sort: query.sort,
      },
      signal,
    });

    const items = (res.data ?? []).map((row) => mapCustomerToDepot(row));

    return {
      items,
      total: res.meta?.pagination?.totalCount ?? items.length,
      nextCursor: res.meta?.pagination?.hasNextPage ? String(pageNumber + 1) : null,
    };
  }

  async getById(id: string, signal?: AbortSignal): Promise<Depot | null> {
    // A customer the caller may not see answers 404, deliberately: distinguishing it
    // from 403 would confirm the record exists. Null is the honest answer either way.
    const res = await apiClient.get<ApiWrapped<CustomerDto>>(`${API_V1}/customers/${id}`, {
      signal,
    });
    return res.data ? mapCustomerToDepot(res.data) : null;
  }

  async create(input: CreateDepotInput, signal?: AbortSignal): Promise<Depot> {
    const res = await apiClient.post<ApiWrapped<CustomerDto>>(`${API_V1}/customers`, {
      body: mapDepotToCustomerPayload(input),
      signal,
    });
    return mapCustomerToDepot(res.data);
  }

  async update(id: string, input: UpdateDepotInput, signal?: AbortSignal): Promise<Depot> {
    const res = await apiClient.put<ApiWrapped<CustomerDto>>(`${API_V1}/customers/${id}`, {
      body: mapDepotToCustomerPayload(input),
      signal,
    });
    return mapCustomerToDepot(res.data);
  }

  async delete(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete<void>(`${API_V1}/customers/${id}`, { signal });
  }

  // ── Lifecycle, beyond CRUD ──────────────────────────────────────────────
  // Separate endpoints rather than a status field on PUT: approving is an act with
  // its own permission and its own audit row, not an edit.

  /** Submits a draft for approval. Requires `customers.update`. */
  async submit(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/customers/${id}/submit`, { signal });
  }

  /**
   * Advances a registration one step. Approval is a chain, not a switch: only the
   * final stage makes a depot Active. Requires `customers.approve`.
   */
  async approve(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/admin/depots/${id}/approve`, { signal });
  }

  /**
   * Refuses a registration. The reason is required and is stored on the record, so
   * the representative who captured the shop learns what to fix.
   *
   * Guarded by `approvals.region`, which the command enforces itself — not
   * `customers.approve`.
   */
  async reject(id: string, reason: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/admin/depots/${id}/reject`, {
      body: { reason },
      signal,
    });
  }

  /** Suspends a trading account. Requires `customers.approve`. */
  async suspend(id: string, reason?: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/customers/${id}/suspend`, {
      body: reason ? { reason } : undefined,
      signal,
    });
  }

  /** Returns a suspended account to trading. Requires `customers.approve`. */
  async reinstate(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/customers/${id}/reinstate`, { signal });
  }

  /**
   * The SAP boundary. Every call needs `customers.sync`.
   *
   * Note the two controllers: master-data pull lives on `/customers/sync-sap`, while
   * the registration pipeline lives under `/customers/sap/*`. That split is the
   * backend's, not ours, and is why these are grouped here rather than spread across
   * the CRUD methods above.
   */
  readonly sap: DepotSapOperations = {
    async status(signal?: AbortSignal): Promise<SapSyncStatus> {
      const res = await apiClient.get<ApiWrapped<SapSyncStatus>>(`${API_V1}/customers/sap/status`, {
        signal,
      });
      return res.data;
    },

    async pullMasterData(signal?: AbortSignal): Promise<void> {
      // 204. Long-running server-side; returning promptly does not mean it finished.
      await apiClient.post<void>(`${API_V1}/customers/sync-sap`, { signal });
    },

    async pullReferences(signal?: AbortSignal): Promise<void> {
      await apiClient.post<void>(`${API_V1}/customers/sap/sync-references`, { signal });
    },

    async pushPending(signal?: AbortSignal): Promise<void> {
      await apiClient.post<void>(`${API_V1}/customers/sap/push-pending`, { signal });
    },

    async retryRejected(customerIds?: string[], signal?: AbortSignal): Promise<void> {
      // An absent or empty list means every rejected customer, which the API treats
      // as the ordinary case: re-queuing changes a status and calls nothing.
      await apiClient.post<void>(`${API_V1}/customers/sap/retry-rejected`, {
        body: { customerIds: customerIds ?? [] },
        signal,
      });
    },
  };

  /** Looks a depot up by its trading code, including a code SAP has since replaced. */
  async getByCode(code: string, signal?: AbortSignal): Promise<Depot | null> {
    const res = await apiClient.get<ApiWrapped<CustomerDto>>(
      `${API_V1}/customers/by-code/${encodeURIComponent(code)}`,
      { signal }
    );
    return res.data ? mapCustomerToDepot(res.data) : null;
  }
}

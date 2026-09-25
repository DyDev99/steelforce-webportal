import { apiClient } from '@/infrastructure/api/client';
import type { PageResult } from '@/infrastructure/repositories/types';
import type { NonBpDepot, NonBpDepotListQuery, NonBpDepotRepository } from './non-bp-types';

const API_V1 = '/api/v1';

interface ApiWrapped<T> {
  data: T;
  meta?: { pagination?: { totalCount?: number; hasNextPage?: boolean } };
}

/**
 * Prospects, from `/api/v1/admin/non-bp-depots`.
 *
 * Requires `noncustomers.readall`: the endpoint is the unscoped back-office view. A
 * caller who may only see their own captures gets a 403 here rather than a silently
 * filtered "all", which is the right failure.
 *
 * No mapper — the response shape is already the model. A translation layer with
 * nothing to translate is just somewhere for the two to drift apart.
 */
export class ApiNonBpDepotRepository implements NonBpDepotRepository {
  async list(
    query: NonBpDepotListQuery = {},
    signal?: AbortSignal
  ): Promise<PageResult<NonBpDepot>> {
    const pageNumber = query.page ?? 1;
    // The endpoint clamps at 1,000; 200 fills a back-office grid in one request.
    const pageSize = query.pageSize ?? query.limit ?? 200;

    const res = await apiClient.get<ApiWrapped<NonBpDepot[]>>(`${API_V1}/admin/non-bp-depots`, {
      query: {
        pageNumber,
        pageSize,
        search: query.search?.trim() || undefined,
        status: query.status,
        createdBySalesRepId: query.createdBySalesRepId,
        territoryCode: query.territoryCode,
      },
      signal,
    });

    const items = res.data ?? [];

    return {
      items,
      total: res.meta?.pagination?.totalCount ?? items.length,
      nextCursor: res.meta?.pagination?.hasNextPage ? String(pageNumber + 1) : null,
    };
  }
}

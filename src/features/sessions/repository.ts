import { apiClient } from '@/infrastructure/api/client';
import type { PageResult } from '@/infrastructure/repositories/types';
import type { AdminSession, AdminSessionQuery } from './types';

const API_V1 = '/api/v1';

interface ApiWrapped<T> {
  data: T;
  meta?: { pagination?: { totalCount?: number; hasNextPage?: boolean } };
}

/**
 * The signed-in device fleet.
 *
 * Thin by design: the API's shape is already what the screen renders, so mapping
 * would only create somewhere for the two to disagree.
 */
export const adminSessionsRepository = {
  async list(query: AdminSessionQuery = {}, signal?: AbortSignal): Promise<PageResult<AdminSession>> {
    const pageNumber = query.pageNumber ?? 1;
    const pageSize = query.pageSize ?? 50;

    const res = await apiClient.get<ApiWrapped<AdminSession[]>>(`${API_V1}/admin/sessions`, {
      query: {
        pageNumber,
        pageSize,
        search: query.search?.trim() || undefined,
        status: query.status,
        repId: query.repId,
        includeRevoked: query.includeRevoked,
      },
      signal,
    });

    const items = res.data ?? [];

    return {
      items,
      total: res.meta?.pagination?.totalCount ?? items.length,
      nextCursor: res.meta?.pagination?.hasNextPage ? String(pageNumber + 1) : null,
    };
  },

  /**
   * Ends one device.
   *
   * **Not instantaneous.** It stops the session renewing, so the device is locked
   * out within the access token's remaining lifetime — at most 15 minutes. For a
   * genuinely lost handset, revoke *and* deactivate the account, which rolls the
   * security stamp and closes the window immediately.
   *
   * Idempotent: revoking an already-revoked session succeeds and changes nothing.
   */
  async revoke(sessionId: string, reason?: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/admin/sessions/${sessionId}/revoke`, {
      body: { reason },
      signal,
    });
  },
};

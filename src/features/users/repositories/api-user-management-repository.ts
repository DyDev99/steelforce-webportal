import type {
  AppUser,
  AppUserWithRelations,
  PermissionModuleGroup,
  Role,
  RoleItem,
  UserDetails,
  UserListItem,
} from '@/domain/entities/user';
import { apiClient } from '@/infrastructure/api/client';
import type { PageResult } from '@/infrastructure/repositories/types';
import {
  flattenPermissionsMatrixToArray,
  mapCreateInputToPayload,
  mapRoleItemToDomain,
  mapUpdateInputToPayload,
  mapUserDetailsToDomain,
  mapUserListItemToDomain,
} from './mappers';
import type {
  ApiWrappedResponse,
  CreateRolePayload,
  CreateUserInput,
  PermissionRepository,
  RoleRepository,
  UpdateProfilePayload,
  UpdateRolePayload,
  UpdateUserInput,
  UserListQuery,
  UserRepository,
} from './types';

const API_V1 = '/api/v1';

export class ApiUserRepository implements UserRepository {
  async list(query: UserListQuery = {}, signal?: AbortSignal): Promise<PageResult<AppUserWithRelations>> {
    const pageNumber = query.pageNumber ?? query.page ?? 1;
    const pageSize = query.pageSize ?? query.limit ?? 25;
    const search = query.search?.trim() || undefined;
    const isActive =
      query.isActive !== undefined
        ? query.isActive
        : query.accountStatus
        ? query.accountStatus === 'active'
        : undefined;

    const res = await apiClient.get<ApiWrappedResponse<UserListItem[]>>(`${API_V1}/users`, {
      query: {
        pageNumber,
        pageSize,
        search,
        isActive,
        role: query.role ?? query.roleId,
        department: query.department ?? query.departmentId,
        territoryCode: query.territoryCode,
        sort: query.sort ?? '-createdAt',
      },
      signal,
    });

    const items = (res.data || []).map(mapUserListItemToDomain);
    const total = res.meta?.pagination?.totalCount ?? items.length;

    return {
      items,
      total,
      nextCursor: res.meta?.pagination?.hasNextPage ? String(pageNumber + 1) : null,
    };
  }

  async getById(id: string, signal?: AbortSignal): Promise<AppUserWithRelations | null> {
    try {
      const res = await apiClient.get<ApiWrappedResponse<UserDetails>>(`${API_V1}/users/${id}`, { signal });
      return res.data ? mapUserDetailsToDomain(res.data) : null;
    } catch {
      return null;
    }
  }

  async create(input: CreateUserInput, signal?: AbortSignal): Promise<AppUserWithRelations> {
    const payload = mapCreateInputToPayload(input);
    const res = await apiClient.post<ApiWrappedResponse<UserDetails>>(`${API_V1}/users`, {
      body: payload,
      signal,
    });
    return mapUserDetailsToDomain(res.data);
  }

  async update(id: string, input: UpdateUserInput, signal?: AbortSignal): Promise<AppUserWithRelations> {
    const payload = mapUpdateInputToPayload(input);
    const res = await apiClient.put<ApiWrappedResponse<UserDetails>>(`${API_V1}/users/${id}`, {
      body: payload,
      signal,
    });
    return mapUserDetailsToDomain(res.data);
  }

  async delete(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete<void>(`${API_V1}/users/${id}`, { signal });
  }

  async deleteMany(ids: string[], signal?: AbortSignal): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(id, signal)));
  }

  async updateMyProfile(payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUser> {
    const formData = new FormData();
    if (payload.fullName !== undefined) formData.append('fullName', payload.fullName);
    if (payload.jobTitle !== undefined) formData.append('jobTitle', payload.jobTitle ?? '');
    if (payload.preferredLanguage !== undefined) formData.append('preferredLanguage', payload.preferredLanguage ?? '');
    if (payload.timeZoneId !== undefined) formData.append('timeZoneId', payload.timeZoneId ?? '');
    
    if (payload.removeAvatar) {
      formData.append('removeAvatar', 'true');
    } else if (payload.avatar) {
      formData.append('avatar', payload.avatar);
    }

    const res = await apiClient.put<ApiWrappedResponse<UserDetails>>(`${API_V1}/users/me/profile`, {
      body: formData,
      signal,
    });
    return mapUserDetailsToDomain(res.data);
  }

  async updateUserProfile(id: string, payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUserWithRelations> {
    const formData = new FormData();
    if (payload.fullName !== undefined) formData.append('fullName', payload.fullName);
    if (payload.jobTitle !== undefined) formData.append('jobTitle', payload.jobTitle ?? '');
    if (payload.preferredLanguage !== undefined) formData.append('preferredLanguage', payload.preferredLanguage ?? '');
    if (payload.timeZoneId !== undefined) formData.append('timeZoneId', payload.timeZoneId ?? '');
    
    if (payload.removeAvatar) {
      formData.append('removeAvatar', 'true');
    } else if (payload.avatar) {
      formData.append('avatar', payload.avatar);
    }

    const res = await apiClient.put<ApiWrappedResponse<UserDetails>>(`${API_V1}/users/${id}/profile`, {
      body: formData,
      signal,
    });
    return mapUserDetailsToDomain(res.data);
  }

  async setStatus(id: string, isActiveOrStatus: boolean | string, signal?: AbortSignal): Promise<void> {
    const isActive = typeof isActiveOrStatus === 'boolean' ? isActiveOrStatus : isActiveOrStatus === 'active';
    await apiClient.patch<void>(`${API_V1}/users/${id}/status`, {
      body: { isActive },
      signal,
    });
  }

  async unlock(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/users/${id}/unlock`, { signal });
  }

  async resetPassword(id: string, newPassword: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/users/${id}/reset-password`, {
      body: { newPassword },
      signal,
    });
  }

  async revokeSessions(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post<void>(`${API_V1}/users/${id}/sessions/revoke`, { signal });
  }

  async directory(signal?: AbortSignal): Promise<Record<string, AppUser>> {
    const result = await this.list({ pageSize: 200 }, signal);
    const map: Record<string, AppUser> = {};
    for (const item of result.items) {
      map[item.id] = item;
    }
    return map;
  }
}

export class ApiRoleRepository implements RoleRepository {
  async list(signal?: AbortSignal): Promise<PageResult<Role>> {
    const res = await apiClient.get<ApiWrappedResponse<RoleItem[]>>(`${API_V1}/roles`, { signal });
    const items = (res.data || []).map(mapRoleItemToDomain);
    return {
      items,
      total: items.length,
      nextCursor: null,
    };
  }

  async getById(id: string, signal?: AbortSignal): Promise<Role | null> {
    try {
      const res = await apiClient.get<ApiWrappedResponse<RoleItem>>(`${API_V1}/roles/${id}`, { signal });
      return res.data ? mapRoleItemToDomain(res.data) : null;
    } catch {
      return null;
    }
  }

  async create(input: CreateRolePayload, signal?: AbortSignal): Promise<Role> {
    const res = await apiClient.post<ApiWrappedResponse<RoleItem>>(`${API_V1}/roles`, {
      body: input,
      signal,
    });
    return mapRoleItemToDomain(res.data);
  }

  async updateRole(id: string, input: UpdateRolePayload, signal?: AbortSignal): Promise<Role> {
    const res = await apiClient.put<ApiWrappedResponse<RoleItem>>(`${API_V1}/roles/${id}`, {
      body: input,
      signal,
    });
    return mapRoleItemToDomain(res.data);
  }

  async delete(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete<void>(`${API_V1}/roles/${id}`, { signal });
  }

  async updatePermissions(
    id: string,
    permissions: Record<string, string[]> | string[],
    signal?: AbortSignal
  ): Promise<void> {
    const permArray = Array.isArray(permissions)
      ? permissions
      : flattenPermissionsMatrixToArray(permissions);

    await apiClient.put<void>(`${API_V1}/roles/${id}/permissions`, {
      body: { permissions: permArray },
      signal,
    });
  }

  async userCounts(signal?: AbortSignal): Promise<Record<string, number>> {
    const res = await this.list(signal);
    const map: Record<string, number> = {};
    for (const role of res.items) {
      map[role.id] = role.user_count ?? 0;
      map[role.name] = role.user_count ?? 0;
    }
    return map;
  }
}

export class ApiPermissionRepository implements PermissionRepository {
  async listGrouped(signal?: AbortSignal): Promise<PermissionModuleGroup[]> {
    const res = await apiClient.get<ApiWrappedResponse<PermissionModuleGroup[]>>(`${API_V1}/permissions`, {
      signal,
    });
    return res.data || [];
  }
}

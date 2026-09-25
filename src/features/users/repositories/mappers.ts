import type {
  AppUserWithRelations,
  Role,
  RoleItem,
  UserDetails,
  UserListItem,
} from '@/domain/entities/user';
import type {
  CreateUserInput,
  CreateUserPayload,
  UpdateUserInput,
  UpdateUserPayload,
} from './types';

/**
 * Pure mappers translating between Backend Wire DTOs and Frontend Domain Entities.
 * Shields the application from schema/naming differences.
 */

export function mapUserListItemToDomain(dto: UserListItem): AppUserWithRelations {
  const roleName = dto.roles?.[0] ?? 'User';
  return {
    id: dto.id,
    full_name: dto.fullName,
    username: dto.email ? dto.email.split('@')[0] : (dto.employeeCode || dto.id),
    email: dto.email,
    phone: dto.phoneNumber,
    employee_id: dto.employeeCode,
    position: dto.jobTitle,
    department_id: dto.department,
    gender: null,
    birthday: null,
    address: dto.territoryCode,
    role_id: roleName,
    manager_name: null,
    join_date: dto.createdAt,
    employment_status: dto.isActive ? 'Active' : 'Inactive',
    account_status: dto.isActive ? 'active' : 'disabled',
    avatar_url: null,
    temp_password: null,
    force_password_reset: false,
    failed_login_attempts: 0,
    last_login: dto.lastLoginAt,
    last_password_change: null,
    created_at: dto.createdAt,
    updated_at: dto.createdAt,
    deleted_at: null,
    department: dto.department ? { id: dto.department, name: dto.department, description: null, manager_name: null, created_at: dto.createdAt } : null,
    role: {
      id: roleName,
      name: roleName,
      description: null,
      is_system: false,
      permissions: {},
      created_at: dto.createdAt,
    },
  };
}

export function mapUserDetailsToDomain(dto: UserDetails): AppUserWithRelations {
  const base = mapUserListItemToDomain(dto);
  return {
    ...base,
    avatar_url: dto.avatarUrl,
    account_status: dto.isLockedOut ? 'locked' : dto.isActive ? 'active' : 'disabled',
    updated_at: dto.updatedAt || dto.createdAt,
    role: {
      id: dto.roles?.[0] || 'User',
      name: dto.roles?.[0] || 'User',
      description: null,
      is_system: false,
      permissions: groupPermissionsArrayToMatrix(dto.permissions || []),
      created_at: dto.createdAt,
    },
  };
}

export function mapRoleItemToDomain(dto: RoleItem): Role {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    is_system: dto.isSystem,
    user_count: dto.userCount,
    permissions: groupPermissionsArrayToMatrix(dto.permissions || []),
    created_at: new Date().toISOString(),
  };
}

export function groupPermissionsArrayToMatrix(permissions: string[]): Record<string, string[]> {
  const matrix: Record<string, string[]> = {};
  for (const perm of permissions) {
    const parts = perm.split('.');
    if (parts.length >= 2) {
      const mod = parts[0];
      const act = parts.slice(1).join('.');
      if (!matrix[mod]) matrix[mod] = [];
      if (!matrix[mod].includes(act)) matrix[mod].push(act);
    } else {
      if (!matrix['general']) matrix['general'] = [];
      if (!matrix['general'].includes(perm)) matrix['general'].push(perm);
    }
  }
  return matrix;
}

export function flattenPermissionsMatrixToArray(matrix: Record<string, string[]>): string[] {
  const list: string[] = [];
  for (const [mod, acts] of Object.entries(matrix)) {
    for (const act of acts) {
      list.push(`${mod}.${act}`);
    }
  }
  return list;
}

export function mapCreateInputToPayload(input: CreateUserInput): CreateUserPayload {
  const inp = input as any;
  return {
    fullName: inp.fullName || inp.full_name || '',
    email: inp.email || '',
    phoneNumber: inp.phoneNumber || inp.phone || null,
    password: inp.password || inp.temp_password || 'InitialPassword123!',
    employeeCode: inp.employeeCode || inp.employee_id || null,
    jobTitle: inp.jobTitle || inp.position || null,
    department: inp.department || inp.department_id || null,
    territoryCode: inp.territoryCode || inp.address || null,
    depotCode: inp.depotCode || null,
    preferredLanguage: inp.preferredLanguage || 'km-KH',
    timeZoneId: inp.timeZoneId || 'Asia/Phnom_Penh',
    roles: Array.isArray(inp.roles) ? inp.roles : (inp.role_id ? [inp.role_id] : ['Sales Representative']),
    isActive: inp.isActive !== undefined ? inp.isActive : inp.account_status !== 'disabled',
    avatarUrl: inp.avatarUrl || inp.avatar_url || null,
  };
}

export function mapUpdateInputToPayload(input: UpdateUserInput): UpdateUserPayload {
  const inp = input as any;
  return {
    fullName: inp.fullName || inp.full_name || '',
    phoneNumber: inp.phoneNumber || inp.phone || null,
    employeeCode: inp.employeeCode || inp.employee_id || null,
    jobTitle: inp.jobTitle || inp.position || null,
    department: inp.department || inp.department_id || null,
    territoryCode: inp.territoryCode || inp.address || null,
    depotCode: inp.depotCode || null,
    preferredLanguage: inp.preferredLanguage || 'km-KH',
    timeZoneId: inp.timeZoneId || 'Asia/Phnom_Penh',
    roles: Array.isArray(inp.roles) ? inp.roles : (inp.role_id ? [inp.role_id] : []),
    isActive: inp.isActive !== undefined ? inp.isActive : inp.account_status ? inp.account_status === 'active' : true,
    avatarUrl: inp.avatarUrl || inp.avatar_url || null,
  };
}

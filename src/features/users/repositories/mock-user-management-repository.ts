import * as store from '@/features/users/data/mock-store';
import type {
  AppUser,
  AppUserWithRelations,
  Department,
  PermissionModuleGroup,
  Role,
} from '@/domain/entities/user';
import type { PageResult } from '@/infrastructure/repositories/types';
import type {
  AuditRepository,
  CreateUserInput,
  DepartmentInput,
  DepartmentRepository,
  PermissionRepository,
  RoleRepository,
  UpdateProfilePayload,
  UpdateUserInput,
  UserListQuery,
  UserRepository,
} from './types';

/**
 * Development-only adapters over the existing in-memory store. They add no
 * behavior of their own — filtering here mirrors what the pages already did
 * client-side, so a real API adapter can move that work server-side without the
 * pages noticing.
 */

function page<T>(items: T[]): PageResult<T> {
  return { items, total: items.length, nextCursor: null };
}

export class MockUserRepository implements UserRepository {
  async list(query: UserListQuery = {}): Promise<PageResult<AppUserWithRelations>> {
    const term = query.search?.trim().toLocaleLowerCase();
    const rows = (await store.fetchUsers()).filter((user) => {
      if (query.accountStatus && user.account_status !== query.accountStatus) return false;
      if (query.departmentId && user.department_id !== query.departmentId) return false;
      if (query.roleId && user.role_id !== query.roleId) return false;
      if (!term) return true;
      return [user.full_name, user.username, user.employee_id, user.email]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(term));
    });
    const pageSize = query.pageSize ?? query.limit ?? rows.length;
    const start = Math.max(0, (query.page ?? 1) - 1) * pageSize;
    return { items: rows.slice(start, start + pageSize), total: rows.length, nextCursor: null };
  }

  getById(id: string): Promise<AppUserWithRelations | null> {
    return store.fetchUserById(id);
  }

  create(input: CreateUserInput): Promise<AppUserWithRelations> {
    const inp = input as Record<string, unknown>;
    const mapped: Partial<AppUser> = {
      full_name: (inp.fullName as string) || (inp.full_name as string) || '',
      email: (inp.email as string) || null,
      phone: (inp.phoneNumber as string) || (inp.phone as string) || null,
      employee_id: (inp.employeeCode as string) || (inp.employee_id as string) || null,
      position: (inp.jobTitle as string) || (inp.position as string) || null,
      department_id: (inp.department as string) || (inp.department_id as string) || null,
      address: (inp.territoryCode as string) || (inp.address as string) || null,
      role_id: Array.isArray(inp.roles) ? (inp.roles[0] as string) : (inp.role_id as string) || null,
      temp_password: (inp.password as string) || (inp.temp_password as string) || null,
      account_status:
        inp.isActive !== undefined
          ? inp.isActive
            ? 'active'
            : 'disabled'
          : (inp.account_status as string) || 'active',
      employment_status: (inp.employment_status as string) || 'Active',
    };
    return store.createUser(mapped);
  }

  async update(id: string, input: UpdateUserInput): Promise<AppUserWithRelations> {
    const inp = input as Record<string, unknown>;
    const patch: Partial<AppUser> = {
      full_name: (inp.fullName as string) || (inp.full_name as string),
      phone: (inp.phoneNumber as string) || (inp.phone as string),
      employee_id: (inp.employeeCode as string) || (inp.employee_id as string),
      position: (inp.jobTitle as string) || (inp.position as string),
      department_id: (inp.department as string) || (inp.department_id as string),
      address: (inp.territoryCode as string) || (inp.address as string),
      role_id: Array.isArray(inp.roles) ? (inp.roles[0] as string) : (inp.role_id as string),
      account_status:
        inp.isActive !== undefined
          ? inp.isActive
            ? 'active'
            : 'disabled'
          : (inp.account_status as string),
    };
    await store.updateUser(id, patch);
    const updated = await store.fetchUserById(id);
    if (!updated) throw new Error(`User ${id} was not found after update.`);
    return updated;
  }

  async updateMyProfile(payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUser> {
    const users = await store.fetchUsers();
    // Default mock user
    const me = users.find((u) => u.username === 'omid.farahi') || users[0];
    if (!me) throw new Error('Not logged in');
    return this.updateUserProfile(me.id, payload, signal);
  }

  async updateUserProfile(id: string, payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUserWithRelations> {
    const patch: Partial<AppUser> = {};
    if (payload.fullName !== undefined) patch.full_name = payload.fullName;
    if (payload.jobTitle !== undefined) patch.position = payload.jobTitle;
    
    if (payload.removeAvatar) {
      patch.avatar_url = null;
    } else if (payload.avatar) {
      patch.avatar_url = URL.createObjectURL(payload.avatar);
    }

    await store.updateUser(id, patch);
    const updated = await store.fetchUserById(id);
    if (!updated) throw new Error(`User ${id} not found.`);
    return updated;
  }

  delete(id: string): Promise<void> {
    return store.deleteUsers([id]);
  }

  deleteMany(ids: string[]): Promise<void> {
    return store.deleteUsers(ids);
  }

  async setStatus(id: string, isActiveOrStatus: boolean | string): Promise<void> {
    const status = typeof isActiveOrStatus === 'boolean' ? (isActiveOrStatus ? 'active' : 'disabled') : isActiveOrStatus;
    return store.setUserStatus(id, status);
  }

  unlock(id: string): Promise<void> {
    return store.unlockUser(id);
  }

  resetPassword(id: string, tempPassword: string): Promise<void> {
    return store.resetUserPassword(id, tempPassword);
  }

  async revokeSessions(id: string): Promise<void> {
    return store.revokeSession(id);
  }

  directory(): Promise<Record<string, AppUser>> {
    return store.fetchUserDirectory();
  }
}

export class MockDepartmentRepository implements DepartmentRepository {
  async list(): Promise<PageResult<Department>> {
    return page(await store.fetchDepartments());
  }

  create(input: DepartmentInput): Promise<Department> {
    return store.createDepartment(input);
  }

  update(id: string, input: DepartmentInput): Promise<void> {
    return store.updateDepartment(id, input);
  }

  delete(id: string): Promise<void> {
    return store.deleteDepartment(id);
  }

  userCounts(): Promise<Record<string, number>> {
    return store.fetchUserCountsByDepartment();
  }
}

export class MockRoleRepository implements RoleRepository {
  async list(): Promise<PageResult<Role>> {
    return page(await store.fetchRoles());
  }

  getById(id: string): Promise<Role | null> {
    return store.fetchRoleById(id);
  }

  create(input: { name: string; description?: string | null }): Promise<Role> {
    return store.createRole({ name: input.name, description: input.description ?? undefined });
  }

  updateRole(id: string, input: { name: string; description?: string | null }): Promise<Role> {
    return store.updateRole(id, { name: input.name, description: input.description ?? undefined });
  }

  delete(id: string): Promise<void> {
    return store.deleteRole(id);
  }

  updatePermissions(id: string, permissions: Record<string, string[]> | string[]): Promise<void> {
    const matrix = Array.isArray(permissions)
      ? permissions.reduce<Record<string, string[]>>((acc, p) => {
          const [m, a] = p.split('.');
          if (m && a) {
            acc[m] = acc[m] || [];
            acc[m].push(a);
          }
          return acc;
        }, {})
      : permissions;
    return store.updateRolePermissions(id, matrix);
  }

  userCounts(): Promise<Record<string, number>> {
    return store.fetchUserCountsByRole();
  }
}

export class MockPermissionRepository implements PermissionRepository {
  async listGrouped(): Promise<PermissionModuleGroup[]> {
    return [
      {
        module: 'Identity',
        permissions: [
          {
            id: '01923f70-0000-7000-8000-000000000001',
            name: 'users.read',
            module: 'Identity',
            displayName: 'View users',
            description: 'View the user directory and user detail.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000002',
            name: 'users.create',
            module: 'Identity',
            displayName: 'Create users',
            description: 'Invite or create new user accounts.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000003',
            name: 'users.update',
            module: 'Identity',
            displayName: 'Edit users',
            description: 'Change user profile details and assignments.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000004',
            name: 'users.deactivate',
            module: 'Identity',
            displayName: 'Deactivate users',
            description: 'Enable or disable user accounts.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000005',
            name: 'roles.read',
            module: 'Identity',
            displayName: 'View roles',
            description: 'Inspect roles and permission grants.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000006',
            name: 'roles.manage',
            module: 'Identity',
            displayName: 'Manage roles',
            description: 'Create, update, and delete roles.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000007',
            name: 'permissions.read',
            module: 'Identity',
            displayName: 'View permissions',
            description: 'Inspect permission matrix.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000008',
            name: 'permissions.manage',
            module: 'Identity',
            displayName: 'Manage permissions',
            description: 'Assign permissions to roles.',
            isSystem: true,
          },
          {
            id: '01923f70-0000-7000-8000-000000000009',
            name: 'sessions.revoke',
            module: 'Identity',
            displayName: 'Revoke sessions',
            description: 'Force sign-out across all devices.',
            isSystem: true,
          },
        ],
      },
      {
        module: 'Orders',
        permissions: [
          {
            id: '01923f70-0000-7000-8000-000000000010',
            name: 'orders.read',
            module: 'Orders',
            displayName: 'View orders',
            description: 'View orders and order histories.',
            isSystem: false,
          },
          {
            id: '01923f70-0000-7000-8000-000000000011',
            name: 'orders.create',
            module: 'Orders',
            displayName: 'Create orders',
            description: 'Create new customer orders.',
            isSystem: false,
          },
          {
            id: '01923f70-0000-7000-8000-000000000012',
            name: 'orders.approve',
            module: 'Orders',
            displayName: 'Approve orders',
            description: 'Approve orders exceeding field threshold limits.',
            isSystem: false,
          },
        ],
      },
      {
        module: 'Customers',
        permissions: [
          {
            id: '01923f70-0000-7000-8000-000000000020',
            name: 'customers.read',
            module: 'Customers',
            displayName: 'View customers',
            description: 'View customer directory and details.',
            isSystem: false,
          },
          {
            id: '01923f70-0000-7000-8000-000000000021',
            name: 'customers.create',
            module: 'Customers',
            displayName: 'Create customers',
            description: 'Onboard and register new customers.',
            isSystem: false,
          },
        ],
      },
      {
        module: 'Visits',
        permissions: [
          {
            id: '01923f70-0000-7000-8000-000000000030',
            name: 'visits.read',
            module: 'Visits',
            displayName: 'View visits',
            description: 'View visit plans and check-ins.',
            isSystem: false,
          },
          {
            id: '01923f70-0000-7000-8000-000000000031',
            name: 'visits.create',
            module: 'Visits',
            displayName: 'Create visits',
            description: 'Check-in and record field visits.',
            isSystem: false,
          },
        ],
      },
    ];
  }
}

export class MockAuditRepository implements AuditRepository {
  async activityLogs(userId?: string | null) {
    return page(await store.fetchActivityLogs(userId));
  }

  async loginHistory(userId?: string | null) {
    return page(await store.fetchLoginHistory(userId));
  }

  revokeSession(id: string): Promise<void> {
    return store.revokeSession(id);
  }
}

import {
  seedActivityLogs,
  seedDepartments,
  seedLoginHistory,
  seedRoles,
  seedUsers,
} from './mock-data';
import type {
  ActivityLog,
  AppUser,
  AppUserWithRelations,
  Department,
  LoginHistoryRecord,
  Role,
} from '@/domain/entities/user';

/**
 * In-memory stand-in for the backend. Edits persist for the browser session and
 * reset on reload, which is what a static demo wants — no network, no env vars.
 */

let departments: Department[] = seedDepartments.map((d) => ({ ...d }));
let roles: Role[] = seedRoles.map((r) => ({ ...r }));
let users: AppUser[] = seedUsers.map((u) => ({ ...u }));
let activityLogs: ActivityLog[] = seedActivityLogs.map((l) => ({ ...l }));
let loginHistory: LoginHistoryRecord[] = seedLoginHistory.map((s) => ({ ...s }));

/** Small delay so the existing loading skeletons still have a moment to show. */
const LATENCY_MS = 220;

function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function withRelations(u: AppUser): AppUserWithRelations {
  return {
    ...u,
    department: departments.find((d) => d.id === u.department_id) ?? null,
    role: roles.find((r) => r.id === u.role_id) ?? null,
  };
}

/** Mutations leave a trail so the activity log reflects what you just did. */
function recordActivity(action: string, targetUserId: string | null = null) {
  activityLogs = [
    {
      id: nextId('log'),
      user_id: users.find((u) => u.username === 'omid.farahi')?.id ?? null,
      action,
      target_user_id: targetUserId,
      ip_address: '192.168.1.100',
      browser: 'Chrome 120',
      device: 'Desktop',
      status: 'success',
      created_at: new Date().toISOString(),
    },
    ...activityLogs,
  ];
}

// ---------------------------------------------------------------- users

export function fetchUsers(): Promise<AppUserWithRelations[]> {
  const rows = users
    .filter((u) => !u.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(withRelations);
  return settle(rows);
}

export function fetchUserById(id: string): Promise<AppUserWithRelations | null> {
  const found = users.find((u) => u.id === id && !u.deleted_at);
  return settle(found ? withRelations(found) : null);
}

export function createUser(input: Partial<AppUser>): Promise<AppUserWithRelations> {
  const timestamp = new Date().toISOString();
  const created: AppUser = {
    id: nextId('user'),
    full_name: input.full_name || 'Unnamed User',
    employee_id: input.employee_id ?? `EMP-${String(users.length + 1).padStart(3, '0')}`,
    username: input.username || 'new.user',
    email: input.email ?? null,
    phone: input.phone ?? null,
    gender: input.gender ?? null,
    birthday: input.birthday ?? null,
    address: input.address ?? null,
    department_id: input.department_id ?? null,
    position: input.position ?? null,
    role_id: input.role_id ?? null,
    manager_name: input.manager_name ?? null,
    join_date: input.join_date ?? null,
    employment_status: input.employment_status ?? 'Active',
    account_status: input.account_status ?? 'active',
    avatar_url: input.avatar_url ?? null,
    temp_password: input.temp_password ?? null,
    force_password_reset: input.force_password_reset ?? true,
    failed_login_attempts: 0,
    last_login: null,
    last_password_change: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  users = [created, ...users];
  recordActivity('User Created', created.id);
  return settle(withRelations(created));
}

export function updateUser(id: string, patch: Partial<AppUser>): Promise<void> {
  users = users.map((u) =>
    u.id === id ? { ...u, ...patch, updated_at: new Date().toISOString() } : u
  );
  return settle(undefined);
}

export function setUserStatus(id: string, accountStatus: string): Promise<void> {
  const label = accountStatus === 'active' ? 'User Enabled' : 'User Disabled';
  recordActivity(label, id);
  return updateUser(id, { account_status: accountStatus });
}

export function unlockUser(id: string): Promise<void> {
  recordActivity('User Unlocked', id);
  return updateUser(id, { account_status: 'active', failed_login_attempts: 0 });
}

export function resetUserPassword(id: string, tempPassword: string): Promise<void> {
  recordActivity('Password Reset', id);
  return updateUser(id, {
    temp_password: tempPassword,
    force_password_reset: true,
    last_password_change: new Date().toISOString(),
  });
}

export function deleteUsers(ids: string[]): Promise<void> {
  const timestamp = new Date().toISOString();
  users = users.map((u) => (ids.includes(u.id) ? { ...u, deleted_at: timestamp } : u));
  ids.forEach((id) => recordActivity('User Deleted', id));
  return settle(undefined);
}

// ---------------------------------------------------------- departments

export function fetchDepartments(): Promise<Department[]> {
  return settle([...departments].sort((a, b) => a.name.localeCompare(b.name)));
}

export function createDepartment(
  input: Pick<Department, 'name' | 'description' | 'manager_name'>
): Promise<Department> {
  const created: Department = {
    id: nextId('dept'),
    name: input.name,
    description: input.description,
    manager_name: input.manager_name,
    created_at: new Date().toISOString(),
  };
  departments = [...departments, created];
  recordActivity('Department Created');
  return settle(created);
}

export function updateDepartment(
  id: string,
  patch: Pick<Department, 'name' | 'description' | 'manager_name'>
): Promise<void> {
  departments = departments.map((d) => (d.id === id ? { ...d, ...patch } : d));
  recordActivity('Department Updated');
  return settle(undefined);
}

export function deleteDepartment(id: string): Promise<void> {
  departments = departments.filter((d) => d.id !== id);
  // Mirror the old ON DELETE SET NULL behaviour.
  users = users.map((u) => (u.department_id === id ? { ...u, department_id: null } : u));
  recordActivity('Department Deleted');
  return settle(undefined);
}

// ---------------------------------------------------------------- roles

export function fetchRoles(): Promise<Role[]> {
  const rows = [...roles].sort((a, b) => {
    if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return settle(rows);
}

export function fetchRoleById(id: string): Promise<Role | null> {
  const found = roles.find((r) => r.id === id);
  return settle(found ? { ...found } : null);
}

export function createRole(input: { name: string; description?: string }): Promise<Role> {
  const created: Role = {
    id: nextId('role'),
    name: input.name,
    description: input.description || '',
    is_system: false,
    permissions: {},
    created_at: new Date().toISOString(),
  };
  roles = [...roles, created];
  recordActivity('Role Created');
  return settle(created);
}

export function updateRole(id: string, input: { name: string; description?: string }): Promise<Role> {
  let updatedRole: Role | null = null;
  roles = roles.map((r) => {
    if (r.id === id) {
      updatedRole = { ...r, name: input.name, description: input.description ?? r.description };
      return updatedRole;
    }
    return r;
  });
  recordActivity('Role Updated');
  if (!updatedRole) throw new Error(`Role ${id} not found`);
  return settle(updatedRole);
}

export function deleteRole(id: string): Promise<void> {
  roles = roles.filter((r) => r.id !== id);
  users = users.map((u) => (u.role_id === id ? { ...u, role_id: null } : u));
  recordActivity('Role Deleted');
  return settle(undefined);
}

export function updateRolePermissions(
  id: string,
  permissions: Record<string, string[]>
): Promise<void> {
  roles = roles.map((r) => (r.id === id ? { ...r, permissions } : r));
  recordActivity('Permissions Updated');
  return settle(undefined);
}

/** role_id -> number of non-deleted users. */
export function fetchUserCountsByRole(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const u of users) {
    if (u.deleted_at || !u.role_id) continue;
    counts[u.role_id] = (counts[u.role_id] || 0) + 1;
  }
  return settle(counts);
}

/** department_id -> number of non-deleted users. */
export function fetchUserCountsByDepartment(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const u of users) {
    if (u.deleted_at || !u.department_id) continue;
    counts[u.department_id] = (counts[u.department_id] || 0) + 1;
  }
  return settle(counts);
}

// ------------------------------------------------------ logs & sessions

export function fetchActivityLogs(userId?: string | null): Promise<ActivityLog[]> {
  const rows = activityLogs
    .filter((l) => !userId || l.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return settle(rows);
}

export function fetchLoginHistory(userId?: string | null): Promise<LoginHistoryRecord[]> {
  const rows = loginHistory
    .filter((s) => !userId || s.user_id === userId)
    .sort((a, b) => b.login_time.localeCompare(a.login_time));
  return settle(rows);
}

export function revokeSession(id: string): Promise<void> {
  loginHistory = loginHistory.map((s) =>
    s.id === id ? { ...s, logout_time: new Date().toISOString() } : s
  );
  recordActivity('Session Revoked');
  return settle(undefined);
}

/** Lookup map used by the log tables to show who did what. */
export function fetchUserDirectory(): Promise<Record<string, AppUser>> {
  const map: Record<string, AppUser> = {};
  for (const u of users) map[u.id] = u;
  return settle(map);
}

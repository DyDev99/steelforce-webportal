import { environment } from '@/config/environment';
import {
  ApiPermissionRepository,
  ApiRoleRepository,
  ApiUserRepository,
} from './api-user-management-repository';
import {
  MockAuditRepository,
  MockDepartmentRepository,
  MockPermissionRepository,
  MockRoleRepository,
  MockUserRepository,
} from './mock-user-management-repository';
import type {
  AuditRepository,
  DepartmentRepository,
  PermissionRepository,
  RoleRepository,
  UserRepository,
} from './types';

export type {
  ApiWrappedResponse,
  AuditRepository,
  CreateRolePayload,
  CreateUserInput,
  CreateUserPayload,
  DepartmentInput,
  DepartmentRepository,
  PermissionRepository,
  RoleRepository,
  UpdateRolePayload,
  UpdateUserInput,
  UpdateUserPayload,
  UserListQuery,
  UserListQueryParams,
  UserRepository,
} from './types';

export {
  flattenPermissionsMatrixToArray,
  groupPermissionsArrayToMatrix,
  mapCreateInputToPayload,
  mapRoleItemToDomain,
  mapUpdateInputToPayload,
  mapUserDetailsToDomain,
  mapUserListItemToDomain,
} from './mappers';

export {
  ApiPermissionRepository,
  ApiRoleRepository,
  ApiUserRepository,
} from './api-user-management-repository';

export {
  MockAuditRepository,
  MockDepartmentRepository,
  MockPermissionRepository,
  MockRoleRepository,
  MockUserRepository,
} from './mock-user-management-repository';

export const usersRepository: UserRepository = new ApiUserRepository();
export const rolesRepository: RoleRepository = new ApiRoleRepository();
export const permissionsRepository: PermissionRepository = new ApiPermissionRepository();

export const departmentsRepository: DepartmentRepository = new MockDepartmentRepository();
export const auditRepository: AuditRepository = new MockAuditRepository();

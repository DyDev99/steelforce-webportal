import type {
  ActivityLog,
  AppUser,
  Department,
  LoginHistoryRecord,
  Role,
} from '@/domain/entities/user';

// Timestamps are relative to load time so the demo always looks current.
// Nothing here is rendered during SSR (pages fetch in an effect), so the
// server/client difference never reaches the DOM.
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const hoursAgo = (n: number) => iso(now - n * 3_600_000);
const daysAgo = (n: number) => iso(now - n * 86_400_000);
const dateOnly = (isoString: string) => isoString.slice(0, 10);

export const seedDepartments: Department[] = [
  { id: 'dept-sales', name: 'Sales', description: 'Sales and business development', manager_name: 'Ahmad Reza', created_at: daysAgo(900) },
  { id: 'dept-finance', name: 'Finance', description: 'Financial operations and accounting', manager_name: 'Sara Karimi', created_at: daysAgo(900) },
  { id: 'dept-hr', name: 'HR', description: 'Human resources', manager_name: 'Mehdi Ahmadi', created_at: daysAgo(900) },
  { id: 'dept-warehouse', name: 'Warehouse', description: 'Inventory and logistics', manager_name: 'Reza Mohammadi', created_at: daysAgo(900) },
  { id: 'dept-it', name: 'IT', description: 'Information technology', manager_name: 'Niloofar S.', created_at: daysAgo(900) },
  { id: 'dept-admin', name: 'Administration', description: 'General administration', manager_name: 'Omid Farahi', created_at: daysAgo(900) },
];

export const seedRoles: Role[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    description: 'Full system access with no restrictions',
    is_system: true,
    permissions: {
      dashboard: ['view', 'edit'],
      orders: ['create', 'view', 'update', 'delete', 'export'],
      customers: ['create', 'view', 'update', 'delete'],
      users: ['create', 'view', 'update', 'delete', 'reset_password'],
      reports: ['view', 'export'],
      settings: ['manage'],
      visits: ['view', 'manage'],
      products: ['view', 'manage'],
      roles: ['read', 'manage'],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-administrator',
    name: 'Administrator',
    description: 'System administration with user management',
    is_system: true,
    permissions: {
      dashboard: ['view', 'edit'],
      orders: ['create', 'view', 'update', 'delete', 'export'],
      customers: ['create', 'view', 'update', 'delete'],
      users: ['create', 'view', 'update', 'delete', 'reset_password'],
      reports: ['view', 'export'],
      settings: ['manage'],
      visits: ['view', 'manage'],
      products: ['view', 'manage'],
      roles: ['read', 'manage'],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description: 'Department manager with oversight access',
    is_system: true,
    permissions: {
      dashboard: ['view'],
      orders: ['create', 'view', 'update', 'export'],
      customers: ['create', 'view', 'update'],
      users: ['view'],
      reports: ['view', 'export'],
      settings: [],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-sales-supervisor',
    name: 'Sales Supervisor',
    description: 'Supervises sales representatives',
    is_system: true,
    permissions: {
      dashboard: ['view'],
      orders: ['create', 'view', 'update', 'export'],
      customers: ['create', 'view', 'update'],
      users: ['view'],
      reports: ['view'],
      settings: [],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-sales-rep',
    name: 'Sales Representative',
    description: 'Field sales and customer visits',
    is_system: true,
    permissions: {
      dashboard: ['view'],
      orders: ['create', 'view', 'update'],
      customers: ['create', 'view', 'update'],
      users: [],
      reports: [],
      settings: [],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-finance',
    name: 'Finance',
    description: 'Financial operations',
    is_system: true,
    permissions: {
      dashboard: ['view'],
      orders: ['view', 'export'],
      customers: ['view'],
      users: ['view'],
      reports: ['view', 'export'],
      settings: [],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-warehouse',
    name: 'Warehouse',
    description: 'Inventory management',
    is_system: true,
    permissions: {
      dashboard: ['view'],
      orders: ['view', 'update'],
      customers: ['view'],
      users: [],
      reports: ['view'],
      settings: [],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-customer-service',
    name: 'Customer Service',
    description: 'Customer support',
    is_system: true,
    permissions: {
      dashboard: ['view'],
      orders: ['view'],
      customers: ['view', 'update'],
      users: [],
      reports: [],
      settings: [],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    is_system: true,
    permissions: {
      dashboard: ['view'],
      orders: ['view'],
      customers: ['view'],
      users: ['view'],
      reports: ['view'],
      settings: [],
    },
    created_at: daysAgo(900),
  },
  {
    id: 'role-regional-lead',
    name: 'Regional Lead',
    description: 'Custom role for provincial sales oversight',
    is_system: false,
    permissions: {
      dashboard: ['view'],
      orders: ['view', 'update', 'export'],
      customers: ['view', 'update'],
      users: ['view'],
      reports: ['view', 'export'],
      settings: [],
    },
    created_at: daysAgo(120),
  },
];

let userSeq = 0;

function user(
  input: Partial<AppUser> & Pick<AppUser, 'full_name' | 'username'>
): AppUser {
  userSeq += 1;
  return {
    id: `user-${String(userSeq).padStart(2, '0')}`,
    employee_id: `EMP-${String(userSeq).padStart(3, '0')}`,
    email: `${input.username}@steelforce.com`,
    phone: null,
    gender: null,
    birthday: null,
    address: null,
    department_id: null,
    position: null,
    role_id: null,
    manager_name: null,
    join_date: null,
    employment_status: 'Active',
    account_status: 'active',
    avatar_url: null,
    temp_password: null,
    force_password_reset: false,
    failed_login_attempts: 0,
    last_login: null,
    last_password_change: null,
    created_at: daysAgo(240 - userSeq * 8),
    updated_at: daysAgo(12),
    deleted_at: null,
    ...input,
  };
}

export const seedUsers: AppUser[] = [
  user({
    full_name: 'Ahmad Reza', username: 'ahmad.reza', phone: '+98 912 345 6789', gender: 'Male',
    birthday: '1985-03-15', address: 'Tehran, Iran', department_id: 'dept-sales', position: 'Sales Manager',
    role_id: 'role-sales-supervisor', manager_name: 'Omid Farahi', join_date: '2020-01-15',
    last_login: hoursAgo(2), last_password_change: daysAgo(30),
  }),
  user({
    full_name: 'Sara Karimi', username: 'sara.karimi', phone: '+98 912 222 3344', gender: 'Female',
    birthday: '1990-07-22', address: 'Isfahan, Iran', department_id: 'dept-finance', position: 'Financial Analyst',
    role_id: 'role-finance', manager_name: 'Mehdi Ahmadi', join_date: '2021-06-01',
    last_login: daysAgo(1), last_password_change: daysAgo(15),
  }),
  user({
    full_name: 'Mehdi Ahmadi', username: 'mehdi.ahmadi', phone: '+98 912 555 7788', gender: 'Male',
    birthday: '1988-11-30', address: 'Tehran, Iran', department_id: 'dept-hr', position: 'HR Manager',
    role_id: 'role-manager', manager_name: 'Omid Farahi', join_date: '2019-03-10',
    last_login: hoursAgo(5), last_password_change: daysAgo(60),
  }),
  user({
    full_name: 'Niloofar S.', username: 'niloofar.s', phone: '+98 912 888 9900', gender: 'Female',
    birthday: '1992-01-18', address: 'Tehran, Iran', department_id: 'dept-it', position: 'IT Specialist',
    role_id: 'role-administrator', manager_name: 'Omid Farahi', join_date: '2022-09-15',
    force_password_reset: true, failed_login_attempts: 2,
    last_login: daysAgo(3), last_password_change: daysAgo(90),
  }),
  user({
    full_name: 'Reza Mohammadi', username: 'reza.mohammadi', phone: '+98 912 111 2233', gender: 'Male',
    birthday: '1983-05-25', address: 'Khouzestan, Iran', department_id: 'dept-warehouse',
    position: 'Warehouse Supervisor', role_id: 'role-warehouse', manager_name: 'Omid Farahi',
    join_date: '2018-07-20', account_status: 'disabled', failed_login_attempts: 5,
    last_login: daysAgo(10), last_password_change: daysAgo(45),
  }),
  user({
    full_name: 'Omid Farahi', username: 'omid.farahi', phone: '+98 912 444 5566', gender: 'Male',
    birthday: '1980-09-12', address: 'Tehran, Iran', department_id: 'dept-admin', position: 'General Manager',
    role_id: 'role-super-admin', join_date: '2017-01-05',
    last_login: hoursAgo(1), last_password_change: daysAgo(20),
  }),
  user({
    full_name: 'Leila Hosseini', username: 'leila.hosseini', phone: '+98 912 777 8899', gender: 'Female',
    birthday: '1995-04-08', address: 'Tehran, Iran', department_id: 'dept-sales',
    position: 'Sales Representative', role_id: 'role-sales-rep', manager_name: 'Ahmad Reza',
    join_date: '2023-02-14', force_password_reset: true,
    last_login: hoursAgo(6), last_password_change: daysAgo(5),
  }),
  user({
    full_name: 'Kian Mehrabi', username: 'kian.mehrabi', phone: '+98 912 666 1122', gender: 'Male',
    birthday: '1993-12-03', address: 'Isfahan, Iran', department_id: 'dept-sales',
    position: 'Sales Representative', role_id: 'role-sales-rep', manager_name: 'Ahmad Reza',
    join_date: '2023-05-20', last_login: hoursAgo(8), last_password_change: daysAgo(10),
  }),
  user({
    full_name: 'Parisa Tehrani', username: 'parisa.tehrani', phone: '+98 912 333 4455', gender: 'Female',
    birthday: '1991-08-19', address: 'Shiraz, Iran', department_id: 'dept-finance', position: 'Accountant',
    role_id: 'role-finance', manager_name: 'Sara Karimi', join_date: '2021-11-08',
    last_login: daysAgo(2), last_password_change: daysAgo(25),
  }),
  user({
    full_name: 'Babak Nouri', username: 'babak.nouri', phone: '+98 912 999 0011', gender: 'Male',
    birthday: '1987-02-27', address: 'Tabriz, Iran', department_id: 'dept-warehouse',
    position: 'Inventory Clerk', role_id: 'role-warehouse', manager_name: 'Reza Mohammadi',
    join_date: '2020-08-03', account_status: 'locked', failed_login_attempts: 5,
    last_login: daysAgo(7), last_password_change: daysAgo(120),
  }),
  user({
    full_name: 'Shirin Alavi', username: 'shirin.alavi', phone: '+98 912 121 3141', gender: 'Female',
    birthday: '1994-06-11', address: 'Mashhad, Iran', department_id: 'dept-admin',
    position: 'Customer Support Lead', role_id: 'role-customer-service', manager_name: 'Omid Farahi',
    join_date: '2022-04-18', last_login: hoursAgo(14), last_password_change: daysAgo(40),
  }),
  user({
    full_name: 'Arash Kamali', username: 'arash.kamali', phone: '+98 912 515 1617', gender: 'Male',
    birthday: '1989-10-05', address: 'Karaj, Iran', department_id: 'dept-it', position: 'Systems Engineer',
    role_id: 'role-viewer', manager_name: 'Niloofar S.', join_date: '2023-09-01',
    last_login: daysAgo(4), last_password_change: daysAgo(18),
  }),
  user({
    full_name: 'Maryam Rostami', username: 'maryam.rostami', phone: '+98 912 818 1920', gender: 'Female',
    birthday: '1996-03-29', address: 'Tehran, Iran', department_id: 'dept-sales',
    position: 'Regional Sales Lead', role_id: 'role-regional-lead', manager_name: 'Ahmad Reza',
    join_date: '2024-01-22', last_login: hoursAgo(20), last_password_change: daysAgo(8),
  }),
  user({
    full_name: 'Hossein Zarei', username: 'hossein.zarei', phone: '+98 912 242 5262', gender: 'Male',
    birthday: '1986-12-14', address: 'Qom, Iran', department_id: 'dept-hr', position: 'Recruiter',
    role_id: 'role-viewer', manager_name: 'Mehdi Ahmadi', join_date: '2022-02-07',
    account_status: 'disabled', last_login: daysAgo(21), last_password_change: daysAgo(75),
  }),
];

const activityTemplates: { action: string; status: string }[] = [
  { action: 'Login', status: 'success' },
  { action: 'User Created', status: 'success' },
  { action: 'Password Reset', status: 'success' },
  { action: 'Role Changed', status: 'success' },
  { action: 'Login Failed', status: 'failed' },
  { action: 'User Disabled', status: 'success' },
  { action: 'Permissions Updated', status: 'success' },
  { action: 'Department Created', status: 'success' },
  { action: 'Export Generated', status: 'success' },
  { action: 'Session Revoked', status: 'failed' },
];

const browsers = ['Chrome 120', 'Firefox 121', 'Safari 17', 'Edge 120'];
const devices = ['Desktop', 'Laptop', 'Mobile', 'Tablet'];

export const seedActivityLogs: ActivityLog[] = Array.from({ length: 42 }, (_, i) => {
  const template = activityTemplates[i % activityTemplates.length];
  const actor = seedUsers[i % seedUsers.length];
  return {
    id: `log-${String(i + 1).padStart(2, '0')}`,
    user_id: actor.id,
    action: template.action,
    target_user_id: null,
    ip_address: `192.168.1.${100 + (i % 40)}`,
    browser: browsers[i % browsers.length],
    device: devices[i % devices.length],
    status: template.status,
    created_at: hoursAgo(i * 3 + 1),
  };
});

const operatingSystems = ['Windows 11', 'macOS 14', 'iOS 17', 'Android 14'];
const locations = ['Tehran, Iran', 'Isfahan, Iran', 'Shiraz, Iran', 'Tabriz, Iran', 'Mashhad, Iran'];

export const seedLoginHistory: LoginHistoryRecord[] = Array.from({ length: 38 }, (_, i) => {
  const actor = seedUsers[i % seedUsers.length];
  const loginAt = now - (i * 5 + 1) * 3_600_000;
  // Leave the four most recent successful sessions open so the page has
  // something to revoke.
  const stillOpen = i < 4;
  const failed = i % 9 === 5;
  return {
    id: `login-${String(i + 1).padStart(2, '0')}`,
    user_id: actor.id,
    login_time: iso(loginAt),
    logout_time: stillOpen || failed ? null : iso(loginAt + (30 + (i % 6) * 45) * 60_000),
    device: devices[i % devices.length],
    browser: browsers[i % browsers.length],
    os: operatingSystems[i % operatingSystems.length],
    ip_address: `192.168.1.${100 + (i % 40)}`,
    location: locations[i % locations.length],
    status: failed ? 'failed' : 'success',
    created_at: iso(loginAt),
  };
});

export { dateOnly };

/**
 * Domain model for the Sales Stop Planning module.
 *
 * These shapes are tuned for what the UI renders, not for the wire format. The module
 * talks to `/api/v1/admin/planning` through `api.ts`; `adapters.ts` projects the
 * backend contracts onto the types below and documents, field by field, which of them
 * the platform actually stores and which are derived in the browser.
 *
 * The dimensions below that the backend supplies open-ended values for — sales
 * organisation, division, province, customer type, team — are unions widened with
 * `string`. The listed constants stay as the filter vocabulary and keep autocompletion;
 * the widening is what lets a real territory the fixtures never imagined through
 * instead of being narrowed away to a value the data can never match.
 */

export const SALES_ORGS = ['ISI Steel', 'ISI Roofing', 'ISI Pipe', 'ISI Distribution'] as const;
export type SalesOrg = (typeof SALES_ORGS)[number] | (string & {});

export const DIVISIONS = ['Retail', 'Project', 'Wholesale', 'Modern Trade'] as const;
export type Division = (typeof DIVISIONS)[number] | (string & {});

export const PROVINCES = ['Phnom Penh', 'Kandal', 'Battambang', 'Siem Reap', 'Kampong Speu'] as const;
export type Province = (typeof PROVINCES)[number] | (string & {});

export const CUSTOMER_TYPES = [
  'Hardware Shop',
  'Steel Shop',
  'Depot',
  'Contractor',
  'Retail Shop',
  'Distributor',
  'Construction Site',
  'Outlet',
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number] | (string & {});

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STOP_STATUSES = ['Unassigned', 'Assigned', 'In Progress', 'Completed', 'Skipped'] as const;
export type StopStatus = (typeof STOP_STATUSES)[number];

export const REP_STATUSES = ['Working', 'On Route', 'Break', 'Offline'] as const;
export type RepStatus = (typeof REP_STATUSES)[number];

export const TEAMS = ['Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta', 'Team Echo'] as const;
export type Team = (typeof TEAMS)[number] | (string & {});

export const CREDIT_STATUSES = ['Good Standing', 'Watchlist', 'On Hold', 'Overdue'] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Depot extends LatLng {
  id: string;
  name: string;
  code: string;
  province: Province;
  address: string;
  salesOrg: SalesOrg;
}

export interface Customer extends LatLng {
  id: string;
  code: string;
  name: string;
  type: CustomerType;
  salesOrg: SalesOrg;
  division: Division;
  province: Province;
  district: string;
  address: string;
  contactPerson: string;
  phone: string;
  workingHours: string;
  creditStatus: CreditStatus;
  creditLimit: number;
  outstanding: number;
  outstandingOrders: number;
  lastVisit: string | null;
  totalVisits: number;
  lifetimeValue: number;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  notes: string;
}

export interface SalesRep extends LatLng {
  id: string;
  employeeId: string;
  name: string;
  initials: string;
  team: Team;
  salesOrg: SalesOrg;
  division: Division;
  province: Province;
  phone: string;
  status: RepStatus;
  online: boolean;
  capacity: number;
  distanceCovered: number;
  currentLocation: string;
  shift: string;
  avatarHue: number;
  rating: number;
}

export interface Stop {
  id: string;
  seq: number;
  customerId: string;
  depotId: string;
  repId: string | null;
  priority: Priority;
  status: StopStatus;
  plannedStart: string;
  estimatedMinutes: number;
  distanceKm: number;
  visitReason: string;
  notes: string;
  orderValue: number;
  photos: number;
}

/** A stop joined with its customer — what nearly every card actually needs. */
export interface StopView extends Stop {
  customer: Customer;
}

export interface HistoryEvent {
  id: string;
  date: string;
  label: string;
  detail: string;
  kind: 'visit' | 'order' | 'payment' | 'note';
}

export interface PlanningFilters {
  search: string;
  salesOrg: SalesOrg | 'All';
  division: Division | 'All';
  province: Province | 'All';
  district: string | 'All';
  customerType: CustomerType | 'All';
  priority: Priority | 'All';
  repId: string | 'All';
  assignment: 'All' | 'Assigned' | 'Unassigned';
  visitDate: string;
}

export const OPTIMIZE_STRATEGIES = [
  'Distance',
  'Priority',
  'Customer Level',
  'Planned Time',
  'Sales Territory',
] as const;
export type OptimizeStrategy = (typeof OPTIMIZE_STRATEGIES)[number];

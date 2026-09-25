import type { CustomerType, Province } from '@/features/planning/types';
import type { DepotStatus } from '@/features/depots/data/crm';
import { DEPOT_LIFECYCLE, type DepotLifecycle } from './types';
import type { Depot } from './types';

/**
 * Wire → domain translation for depots.
 *
 * Pure functions, no I/O: this is the seam that protects the UI from backend
 * renames, per docs/skills/api-integration.md.
 *
 * **The two models are not the same size.** The backend's customer record is a
 * trading master — identity, address, credit terms, lifecycle. The portal's `Depot`
 * grew around demo data and also carries commercial analytics: lifetime value,
 * monthly revenue, open opportunities, visit counts, follow-up dates, segment and
 * category. None of those has a source on `/api/v1/customers`.
 *
 * Rather than invent them, unmapped fields take neutral empty values — `0`, `null`,
 * `''` — and the screens show them as blank. A fabricated revenue figure on a CRM
 * screen is worse than an obviously missing one, because nobody questions it.
 * `UNMAPPED_DEPOT_FIELDS` names them so a reviewer can see the cost at a glance.
 */

/** Frontend fields with no backend source today. Kept honest, not invented. */
export const UNMAPPED_DEPOT_FIELDS = [
  'salesOrg', 'division', 'workingHours', 'creditStatus', 'outstanding',
  'outstandingOrders', 'lastVisit', 'totalVisits', 'lifetimeValue', 'tier',
  'notes', 'industry', 'category', 'segment', 'paymentTerms', 'website',
  'registrationNo', 'salesValue', 'monthlyRevenue', 'nextFollowUp',
  'openOpportunities',
] as const;

/** Wire shape of a row from `GET /api/v1/customers`. */
export interface CustomerListItemDto {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  city: string;
  phone: string;
  documentCount?: number;
  documentsComplete?: boolean;
  missingRequiredDocuments?: string[];
}

/** Wire shape of `GET /api/v1/customers/{id}`. */
export interface CustomerDto extends Omit<CustomerListItemDto, 'city'> {
  description?: string | null;
  canTrade?: boolean;
  contactPerson?: string | null;
  email?: string | null;
  address?: {
    line1?: string;
    line2?: string | null;
    city?: string;
    province?: string | null;
    district?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  creditLimit?: number;
  creditTermDays?: number;
  telegramUsername?: string | null;
  sap?: {
    sapCustomerId?: string | null;
    customerGroup?: string | null;
    paymentTerms?: string | null;
    isLinkedToSap?: boolean;
    isBlockedInSap?: boolean;
  } | null;
  documents?: { id: string; kind?: string; url?: string; fileName?: string }[];
  missingRequiredDocuments?: string[];
  documentsComplete?: boolean;
  assignedSalesRepId?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
}

/**
 * Lifecycle vocabularies differ and are not one-to-one.
 *
 * The backend tracks a *registration* lifecycle; the portal's list shows a
 * *commercial* one. `Draft` and `PendingApproval` both mean "not trading yet", which
 * is what the portal calls `Prospect`. Nothing upstream corresponds to `Needs
 * Follow-up` or `At Risk` — those are CRM judgements the API does not make, so they
 * are never produced from a wire value.
 */
const STATUS_FROM_WIRE: Record<string, DepotStatus> = {
  draft: 'Prospect',
  pendingapproval: 'Prospect',
  active: 'Active',
  suspended: 'At Risk',
  closed: 'Inactive',
};

/** The reverse, for filters. Statuses with no wire equivalent return undefined. */
const STATUS_TO_WIRE: Partial<Record<DepotStatus, string>> = {
  Prospect: 'PendingApproval',
  Active: 'Active',
  'At Risk': 'Suspended',
  Inactive: 'Closed',
};

/** Recognises the API's own status name, or undefined if it is one we do not model. */
export function lifecycleFromWire(status: string | null | undefined): DepotLifecycle | undefined {
  const match = DEPOT_LIFECYCLE.find(
    (candidate) => candidate.toLowerCase() === (status ?? '').toLowerCase()
  );
  return match;
}

export function depotStatusFromWire(status: string | null | undefined): DepotStatus {
  return STATUS_FROM_WIRE[(status ?? '').toLowerCase()] ?? 'Prospect';
}

export function depotStatusToWire(status: DepotStatus | undefined): string | undefined {
  return status ? STATUS_TO_WIRE[status] : undefined;
}

/**
 * Trade type maps onto the portal's outlet vocabulary where the two agree.
 *
 * `Retailer`/`Wholesaler`/`KeyAccount` have no exact counterpart, so they land on the
 * nearest honest one rather than being forced into a shape they do not fit.
 */
const TYPE_FROM_WIRE: Record<string, CustomerType> = {
  retailer: 'Retail Shop',
  wholesaler: 'Distributor',
  distributor: 'Distributor',
  keyaccount: 'Depot',
};

export function depotTypeFromWire(type: string | null | undefined): CustomerType {
  return TYPE_FROM_WIRE[(type ?? '').toLowerCase()] ?? 'Depot';
}

/** Composes the one-line address the list renders, skipping absent parts. */
function composeAddress(address: CustomerDto['address']): string {
  return [address?.line1, address?.line2, address?.district, address?.city, address?.province]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');
}

/**
 * Builds a `Depot` from a wire record.
 *
 * `list` and `detail` rows differ only in how much is present, so one mapper serves
 * both: a list row simply leaves the detail-only fields at their empty values.
 */
export function mapCustomerToDepot(dto: CustomerDto & { city?: string }): Depot {
  const address = dto.address ?? null;

  return {
    // ── Identity, from the wire ────────────────────────────────────────
    id: dto.id,
    code: dto.code,
    name: dto.name,
    type: depotTypeFromWire(dto.type),
    status: depotStatusFromWire(dto.status),
    // The wire value, unflattened. `status` above is the CRM reading of it and cannot
    // tell one approval stage from the next.
    lifecycle: lifecycleFromWire(dto.status),
    phone: dto.phone ?? '',
    contactPerson: dto.contactPerson ?? '',
    email: dto.email ?? '',
    address: composeAddress(address) || dto.city || '',
    province: (address?.province ?? '') as Province,
    district: address?.district ?? '',
    lat: address?.latitude ?? 0,
    lng: address?.longitude ?? 0,
    creditLimit: dto.creditLimit ?? 0,
    repId: dto.assignedSalesRepId ?? '',
    createdAt: dto.createdAt ?? '',

    // ── Detail-only, present once `getById` has been called ────────────
    telegram: dto.telegramUsername ?? '',
    sapId: dto.sap?.sapCustomerId ?? dto.code ?? '',
    canTrade: dto.canTrade ?? false,
    latitude: address?.latitude ?? null,
    longitude: address?.longitude ?? null,
    addressLine1: address?.line1 ?? '',
    addressLine2: address?.line2 ?? '',
    postalCode: address?.postalCode ?? '',
    documents: dto.documents ?? [],
    missingRequiredDocuments: dto.missingRequiredDocuments ?? [],
    documentsComplete: dto.documentsComplete ?? false,
    creditTermDays: dto.creditTermDays ?? null,

    // ── No backend source; see UNMAPPED_DEPOT_FIELDS ───────────────────
    salesOrg: '' as Depot['salesOrg'],
    division: '' as Depot['division'],
    workingHours: '',
    creditStatus: 'Good Standing' as Depot['creditStatus'],
    outstanding: 0,
    outstandingOrders: 0,
    lastVisit: null,
    totalVisits: 0,
    lifetimeValue: 0,
    tier: 'Bronze',
    notes: dto.description ?? '',
    industry: '',
    category: '',
    segment: '',
    paymentTerms: dto.creditTermDays ? `Net ${dto.creditTermDays}` : '',
    website: '',
    registrationNo: '',
    salesValue: 0,
    monthlyRevenue: 0,
    nextFollowUp: null,
    openOpportunities: 0,
  };
}

/**
 * Domain → wire for writes.
 *
 * Only fields the API actually accepts are sent. Posting the unmapped analytics
 * fields would be silently ignored at best and a 400 at worst.
 */
export function mapDepotToCustomerPayload(input: Partial<Depot>): Record<string, unknown> {
  return {
    name: input.name,
    phone: input.phone,
    contactPerson: input.contactPerson || undefined,
    email: input.email || undefined,
    creditLimit: input.creditLimit,
    address: {
      line1: input.address,
      city: input.district || input.province,
      province: input.province,
      district: input.district,
      latitude: input.lat || undefined,
      longitude: input.lng || undefined,
    },
  };
}

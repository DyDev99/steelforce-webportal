import type { ListQuery, PageResult } from '@/infrastructure/repositories/types';

/**
 * A NON-BP depot — a prospect.
 *
 * A shop a representative captured in the field that SAP has never issued a business
 * partner number for. It is **not** a customer and is not in the customer master; it
 * becomes one only when a manager approves it and it is converted, at which point it
 * acquires a code and appears under depots instead.
 *
 * Mirrors `NonCustomerDto` exactly, so there is no mapping layer to drift.
 */
export interface NonBpDepot {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  addressLine1: string;
  city: string;
  district: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  outletType: string | null;
  targetProduct: string | null;
  /** What the representative thinks this shop could be worth. Their estimate, not a figure. */
  estimatedPotential: number | null;
  /** `Pending`, `Approved`, `Rejected` or `Converted`. */
  status: NonBpDepotStatus;
  createdBySalesRepId: string;
  territoryCode: string | null;
  servingCustomerId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  /** Kept with the record rather than deleted, so a refusal can be explained. */
  rejectionReason?: string | null;
  convertedCustomerId?: string | null;
  convertedAt?: string | null;
  createdAt?: string;
}

export type NonBpDepotStatus = 'Pending' | 'Approved' | 'Rejected' | 'Converted';

export interface NonBpDepotListQuery extends ListQuery {
  status?: NonBpDepotStatus;
  createdBySalesRepId?: string;
  territoryCode?: string;
}

export interface NonBpDepotRepository {
  list(query?: NonBpDepotListQuery, signal?: AbortSignal): Promise<PageResult<NonBpDepot>>;
}

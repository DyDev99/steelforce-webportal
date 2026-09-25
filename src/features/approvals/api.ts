/**
 * The approval hub's HTTP boundary.
 *
 * Three queues live in three different modules, and this is the only place that knows
 * all three. It owns no endpoints of its own — it reads the same ones the individual
 * screens do, so a count here can never disagree with the list it links to.
 *
 * ## What counts as "needs approval" in each module
 *
 * The three are genuinely different shapes of work, and flattening them into one list
 * would lose what a reviewer needs to know:
 *
 * - **Quotations** — a single gate. One person approves, returns or rejects.
 * - **Depots** — a registration awaiting credit authority, with documents that may be
 *   incomplete. Approving commits the business to a credit limit.
 * - **Promotions** — a *four-signature chain*, so "needs approval" is not one state but
 *   four, and which of them is yours depends on the permissions you hold.
 */
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData, unwrapPage } from '@/infrastructure/api/envelope';
import type { ApiQuery } from '@/infrastructure/api/types';

const API_V1 = '/api/v1';

export const PendingQuotationSchema = z.object({
  id: z.string(),
  number: z.string(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  status: z.number().or(z.string()),
  statusDisplay: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  net: z.number().nullable().optional(),
  lineCount: z.number().default(0),
  validTo: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

export const PendingDepotSchema = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  name: z.string(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  documentCount: z.number().default(0),
  documentsComplete: z.boolean().default(false),
  missingRequiredDocuments: z.array(z.string()).default([]),
});

export type PendingQuotationDto = z.infer<typeof PendingQuotationSchema>;
export type PendingDepotDto = z.infer<typeof PendingDepotSchema>;

const QuotationPageSchema = z.object({
  items: z.array(PendingQuotationSchema).default([]),
  totalCount: z.number().default(0),
});

const DepotPageSchema = z.object({
  items: z.array(PendingDepotSchema).default([]),
  totalCount: z.number().default(0),
});

/**
 * One depot registration, in full, for the approval decision.
 *
 * ## Why this is the customer endpoint and not a bespoke one
 *
 * `GET /admin/depots/pending-approval` answers "who is waiting" and carries only what a
 * queue row shows. The decision needs the whole record — address, documents, the SAP
 * block — and `GET /customers/{id}` already returns exactly that. A second endpoint
 * would be a second thing to keep in step with the first.
 *
 * ## Every field here is one the backend actually sends
 *
 * The screen this feeds used to read a hardcoded fixture, which invented `industry`,
 * `segment`, `tier`, `creditScore`, projected revenue, operating hours and a dozen more.
 * None of those exist in the platform. They are absent from this schema deliberately, so
 * that the page cannot render a number nobody entered — an approver committing the
 * business to a credit limit has to be looking at facts.
 */
export const DepotDocumentSchema = z.object({
  id: z.string(),
  type: z.string().nullable().optional(),
  typeDisplay: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  url: z.string().nullable().optional(),
  publicUrl: z.string().nullable().optional(),
  uploadedAt: z.string().nullable().optional(),
});

export const DepotContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
});

export const DepotAddressSchema = z.object({
  line1: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  houseNo: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const DepotSapSchema = z.object({
  sapCustomerId: z.string().nullable().optional(),
  salesOrg: z.string().nullable().optional(),
  distributionChannel: z.string().nullable().optional(),
  division: z.string().nullable().optional(),
  customerGroup: z.string().nullable().optional(),
  priceGroup: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  salesOffice: z.string().nullable().optional(),
  salesGroup: z.string().nullable().optional(),
  shippingCondition: z.string().nullable().optional(),
  creditControlArea: z.string().nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  isLinkedToSap: z.boolean().nullable().optional(),
  hasCompleteSalesArea: z.boolean().nullable().optional(),
  isBlockedInSap: z.boolean().nullable().optional(),
});

export const DepotSapRegistrationSchema = z.object({
  status: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  registeredAt: z.string().nullable().optional(),
  lastError: z.string().nullable().optional(),
  attemptCount: z.number().nullable().optional(),
  isReadyToRegister: z.boolean().nullable().optional(),
});

export const DepotBusinessPartnerSchema = z.object({
  bpRole: z.string().nullable().optional(),
  accountGroup: z.string().nullable().optional(),
  partnerCategory: z.string().nullable().optional(),
  partnerGroup: z.string().nullable().optional(),
  partnerFunction: z.string().nullable().optional(),
  personnelNumber: z.string().nullable().optional(),
  searchTerm1: z.string().nullable().optional(),
  searchTerm2: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  telephone: z.string().nullable().optional(),
  mobilePhone: z.string().nullable().optional(),
  taxCountry: z.string().nullable().optional(),
  taxType: z.string().nullable().optional(),
  taxClass: z.string().nullable().optional(),
  isReadyForSapCreate: z.boolean().nullable().optional(),
});

export const DepotDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  previousCode: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string(),
  canTrade: z.boolean().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
  creditLimit: z.number().nullable().optional(),
  creditTermDays: z.number().nullable().optional(),
  creditLimitDate: z.string().nullable().optional(),
  assignedSalesRepId: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  documentsComplete: z.boolean().nullable().optional(),
  missingRequiredDocuments: z.array(z.string()).default([]),
  address: DepotAddressSchema.nullable().optional(),
  contacts: z.array(DepotContactSchema).default([]),
  documents: z.array(DepotDocumentSchema).default([]),
  sap: DepotSapSchema.nullable().optional(),
  sapRegistration: DepotSapRegistrationSchema.nullable().optional(),
  businessPartner: DepotBusinessPartnerSchema.nullable().optional(),
});

export type DepotDetailDto = z.infer<typeof DepotDetailSchema>;
export type DepotDocumentDto = z.infer<typeof DepotDocumentSchema>;
export type DepotContactDto = z.infer<typeof DepotContactSchema>;

export const approvalsApi = {
  /**
   * Quotations sitting at the approval gate.
   *
   * `PendingApproval` is the single status, not the `Waiting` tab group — the group also
   * carries documents sitting with SAP, which nobody here can action.
   */
  pendingQuotations: async (pageSize = 50, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${API_V1}/admin/quotations`, {
      query: { status: 'PendingApproval', pageSize } as ApiQuery,
      signal,
    });

    return QuotationPageSchema.parse(unwrapPage(body));
  },

  /** One depot registration, in full. */
  depotDetail: async (id: string, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${API_V1}/customers/${id}`, { signal });

    return DepotDetailSchema.parse(unwrapData(body));
  },

  /**
   * Approves a depot registration.
   *
   * Not a local state change: this queues the depot for SAP and pushes it, and on success
   * SAP's customer number replaces the `BP-` placeholder as the depot's code. So the
   * caller must re-read the depot afterwards rather than patching what it already has —
   * the code it knew the depot by may no longer exist.
   */
  approveDepot: (id: string, signal?: AbortSignal) =>
    apiClient.post<unknown>(`${API_V1}/admin/depots/${id}/approve`, { signal }),

  /** Refuses a depot registration. The reason is required and is stored on the record. */
  rejectDepot: (id: string, reason: string, signal?: AbortSignal) =>
    apiClient.post<unknown>(`${API_V1}/admin/depots/${id}/reject`, { body: { reason }, signal }),

  /** Depot registrations awaiting credit approval. */
  pendingDepots: async (pageSize = 50, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${API_V1}/admin/depots/pending-approval`, {
      query: { pageSize } as ApiQuery,
      signal,
    });

    return DepotPageSchema.parse(unwrapPage(body));
  },
};

/**
 * The four request states that mean "somebody still has to sign".
 *
 * Kept as a list rather than a `status` filter because the endpoint takes one status at
 * a time, and asking four times to build one badge is four round trips for a number.
 */
export const IN_CHAIN_STATUSES = [
  'AwaitingPrepare',
  'AwaitingVerify',
  'AwaitingConsultant',
  'AwaitingFinal',
] as const;

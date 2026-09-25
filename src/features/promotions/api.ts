/**
 * The promotions module's HTTP boundary — `AgreementsController`.
 *
 * ## What this feature actually is
 *
 * It is **not** a promotions builder. There are no campaigns, no free-goods ladders and
 * no invoice schemes in this platform. What exists is a *depot agreement* pipeline:
 *
 * 1. A request is raised against a depot carrying discount lines per category.
 * 2. Four people sign it in order — Sales Support, Regional Sales Manager, Consultant,
 *    Commercial Director — each with their own permission and their own allowed
 *    outcomes. The requester never signs, and one person holding two of those
 *    permissions still signs at most once per revision.
 * 3. The fourth approval snapshots the lines into immutable **terms** and queues **SAP
 *    condition work**.
 * 4. A term only becomes chargeable once somebody closes that SAP task with the
 *    condition record number SAP actually holds.
 *
 * **Approval does not make a rate chargeable** — step 4 and step 3 of that list are
 * different events, often days apart, and conflating them on screen is how a depot ends
 * up not receiving a discount four people signed.
 */
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData, unwrapList, unwrapPage } from '@/infrastructure/api/envelope';
import type { ApiQuery } from '@/infrastructure/api/types';

const API_V1 = '/api/v1';
const ADMIN = `${API_V1}/admin`;

/**
 * Where a request sits in the chain.
 *
 * `catch` on every enum: a backend that adds a state should grey one row, not blank the
 * whole inbox.
 */
export const AgreementStatus = z
  .enum([
    'Draft',
    'AwaitingPrepare',
    'AwaitingVerify',
    'AwaitingConsultant',
    'AwaitingFinal',
    'Approved',
    'Returned',
    'Rejected',
    'Withdrawn',
  ])
  .catch('Draft');

/** A term's lifecycle. `Approved` is signed but **not yet chargeable**. */
export const TermState = z
  .enum(['Approved', 'Effective', 'SapMismatch', 'Superseded', 'Expired', 'Terminated'])
  .catch('Approved');

export const RebateTierSchema = z.object({
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  percent: z.number().nullable().optional(),
});

export const AgreementLineSchema = z.object({
  id: z.string(),
  categoryCode: z.string(),
  categoryName: z.string(),
  entryMode: z.string(),
  nature: z.string(),
  percent: z.number().nullable().optional(),
  currency: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable().optional(),
  tiers: z.array(RebateTierSchema).default([]),
});

export const TimelineEntrySchema = z.object({
  stepOrder: z.number(),
  label: z.string(),
  status: z.string(),
  actorName: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  actedAt: z.string().nullable().optional(),
  slaDueAt: z.string().nullable().optional(),
});

export const AgreementSummarySchema = z.object({
  id: z.string(),
  requestNumber: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
  status: AgreementStatus,
  currentStep: z.number().nullable().optional(),
  revision: z.number().default(1),
  linesCount: z.number().default(0),
  slaDueAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const AgreementDetailSchema = AgreementSummarySchema.extend({
  clientRequestId: z.string(),
  remarks: z.string().nullable().optional(),
  isEditable: z.boolean().default(false),
  lines: z.array(AgreementLineSchema).default([]),
  timeline: z.array(TimelineEntrySchema).default([]),
  terms: z.array(z.string()).default([]),
});

export const AgreementTermSchema = z.object({
  id: z.string(),
  termNumber: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
  categoryCode: z.string(),
  nature: z.string(),
  percent: z.number().nullable().optional(),
  currency: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable().optional(),
  state: TermState,
  sapConditionRecord: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  sourceRequestNumber: z.string().nullable().optional(),
  terminationReason: z.string().nullable().optional(),
  tiers: z.array(RebateTierSchema).default([]),
});

export const SapTaskSchema = z.object({
  id: z.string(),
  termNumber: z.string(),
  customerName: z.string().nullable().optional(),
  categoryCode: z.string(),
  percent: z.number().nullable().optional(),
  validFrom: z.string(),
  validTo: z.string().nullable().optional(),
  taskType: z.string(),
  status: z.string(),
  dueAt: z.string(),
  completedAt: z.string().nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
});

export const CategoryMappingSchema = z.object({
  id: z.string(),
  categoryCode: z.string(),
  sapMaterialPriceGroup: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const PickupRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  regionCode: z.string().nullable().optional(),
  categoryCode: z.string().nullable().optional(),
  percent: z.number().nullable().optional(),
  validFrom: z.string(),
  validTo: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sapConditionType: z.string().nullable().optional(),
});

const AgreementPageSchema = z.object({
  items: z.array(AgreementSummarySchema).default([]),
  totalCount: z.number().default(0),
});

const TermPageSchema = z.object({
  items: z.array(AgreementTermSchema).default([]),
  totalCount: z.number().default(0),
});

export type AgreementSummaryDto = z.infer<typeof AgreementSummarySchema>;
export type AgreementDetailDto = z.infer<typeof AgreementDetailSchema>;
export type AgreementTermDto = z.infer<typeof AgreementTermSchema>;
export type SapTaskDto = z.infer<typeof SapTaskSchema>;
export type CategoryMappingDto = z.infer<typeof CategoryMappingSchema>;
export type PickupRuleDto = z.infer<typeof PickupRuleSchema>;
export type TimelineEntryDto = z.infer<typeof TimelineEntrySchema>;

/**
 * What an approver may do, per step.
 *
 * **Configuration on the server, mirrored here only to disable buttons.** The handler
 * enforces it regardless, and it also enforces the four-eyes rule this cannot see — so
 * a button being enabled is not a promise the action will be accepted.
 *
 * Step 1 cannot reject: it checks a request is *complete*, not whether it is a good
 * idea. Steps 3 and 4 cannot return, because two people have already signed and sending
 * it back would discard both signatures.
 */
export const STEP_OUTCOMES: Record<number, readonly AgreementOutcome[]> = {
  1: ['forward', 'return'],
  2: ['forward', 'return', 'reject'],
  3: ['approve', 'reject'],
  4: ['approve', 'reject'],
};

export type AgreementOutcome = 'forward' | 'approve' | 'return' | 'reject';

/** Outcomes that require a comment. Refused server-side without one. */
export const OUTCOMES_NEEDING_COMMENT: readonly AgreementOutcome[] = ['return', 'reject'];

export const STEP_LABELS: Record<number, string> = {
  1: 'Sales Support',
  2: 'Regional Sales Manager',
  3: 'Consultant',
  4: 'Commercial Director',
};

export const promotionsApi = {
  /** The approvals inbox. `step` narrows to what is waiting at one stage. */
  listRequests: async (
    query: { status?: string; step?: number; customerId?: string; page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ) => {
    const body = await apiClient.get<unknown>(`${ADMIN}/agreement-requests`, {
      query: query as ApiQuery,
      signal,
    });

    return AgreementPageSchema.parse(unwrapPage(body));
  },

  /** One request with its lines and its four-step timeline. */
  getRequest: async (requestId: string, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${ADMIN}/agreement-requests/${requestId}`, { signal });

    return AgreementDetailSchema.parse(unwrapData(body));
  },

  /**
   * Records one approver's decision.
   *
   * A comment is mandatory for `return` and `reject`. Returning reopens the request as a
   * new revision and the next submission collects four fresh signatures.
   */
  actOnStep: async (
    requestId: string,
    stepOrder: number,
    outcome: AgreementOutcome,
    comment: string | undefined,
    signal?: AbortSignal
  ) => {
    const body = await apiClient.post<unknown>(
      `${ADMIN}/agreement-requests/${requestId}/steps/${stepOrder}/${outcome}`,
      { body: { comment }, signal }
    );

    return AgreementDetailSchema.parse(unwrapData(body));
  },

  /** The terms matrix: every approved rate and its state. */
  listTerms: async (
    query: { customerId?: string; categoryCode?: string; state?: string; page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ) => {
    const body = await apiClient.get<unknown>(`${ADMIN}/agreement-terms`, {
      query: query as ApiQuery,
      signal,
    });

    return TermPageSchema.parse(unwrapPage(body));
  },

  /** Ends a term early. The reason is recorded against it. */
  terminateTerm: async (termId: string, reason: string, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${ADMIN}/agreement-terms/${termId}/terminate`, {
      body: { reason },
      signal,
    });

    return unwrapData(body);
  },

  /** The SAP condition queue. Defaults server-side to outstanding work. */
  listSapTasks: async (status?: string, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${ADMIN}/sap-tasks`, {
      query: (status ? { status } : {}) as ApiQuery,
      signal,
    });

    return z.array(SapTaskSchema).parse(unwrapList(body));
  },

  /**
   * Records that SAP now holds the condition record — which is what makes a term
   * chargeable. The record number is required, because it is the evidence.
   */
  completeSapTask: async (
    taskId: string,
    conditionRecord: string,
    notes: string | undefined,
    signal?: AbortSignal
  ) => {
    const body = await apiClient.post<unknown>(`${ADMIN}/sap-tasks/${taskId}/done`, {
      body: { conditionRecord, notes },
      signal,
    });

    return unwrapData(body);
  },

  /** Category-to-SAP price-group mappings. Ships empty; nothing works until filled. */
  listCategoryMappings: async (signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${ADMIN}/settings/category-mappings`, { signal });

    return z.array(CategoryMappingSchema).parse(unwrapList(body));
  },

  /** The standing pickup rules. */
  listPickupRules: async (signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${ADMIN}/settings/pickup-rules`, { signal });

    return z.array(PickupRuleSchema).parse(unwrapList(body));
  },
};

// --- Raising a request -------------------------------------------------------

/**
 * How a line's rate is expressed.
 *
 * `FlatPercent` is a single percentage. `Tiered` is a volume ladder and carries tiers
 * instead of a percent. `NoTarget` records an agreed arrangement with no rate attached.
 */
export const ENTRY_MODES = ['FlatPercent', 'Tiered', 'NoTarget'] as const;
export type EntryMode = (typeof ENTRY_MODES)[number];

/** What the discount is, commercially. */
export const NATURES = ['OnInvoice', 'VolumeRebate', 'ImmediatePayment'] as const;
export type Nature = (typeof NATURES)[number];

export interface AgreementTierInput {
  tierOrder: number;
  minAmount: number;
  maxAmount?: number | null;
  percent: number;
}

export interface AgreementLineInput {
  categoryCode: string;
  entryMode: EntryMode;
  nature: Nature;
  percent?: number | null;
  currency?: string;
  validFrom: string;
  validTo?: string | null;
  tiers?: AgreementTierInput[];
}

export interface CreateAgreementInput {
  /**
   * Makes creation idempotent — a retry returns the original request rather than
   * raising a second. The form generates one per draft so a double submit, or a click
   * on a flaky connection, cannot produce two proposals for the same depot.
   */
  clientRequestId?: string;
  customerId: string;
  scopeType?: string;
  remarks?: string;
  lines: AgreementLineInput[];
}

export const agreementWriteApi = {
  /** Raises a request as a **draft**. It collects no signatures until submitted. */
  create: async (input: CreateAgreementInput, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${ADMIN}/agreement-requests`, { body: input, signal });

    return AgreementDetailSchema.parse(unwrapData(body));
  },

  /**
   * Replaces a draft's content.
   *
   * Send every line the form shows — this replaces rather than merges, so an omitted
   * category is deleted.
   */
  update: async (
    requestId: string,
    input: { remarks?: string; lines: AgreementLineInput[] },
    signal?: AbortSignal
  ) => {
    const body = await apiClient.put<unknown>(`${ADMIN}/agreement-requests/${requestId}`, {
      body: input,
      signal,
    });

    return AgreementDetailSchema.parse(unwrapData(body));
  },

  /** Sends a draft to step 1 and opens all four signature slots. */
  submit: async (requestId: string, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${ADMIN}/agreement-requests/${requestId}/submit`, { signal });

    return AgreementDetailSchema.parse(unwrapData(body));
  },

  /** The author's own retraction. Terminal, and not the same as an approver's reject. */
  withdraw: async (requestId: string, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${ADMIN}/agreement-requests/${requestId}/withdraw`, { signal });

    return AgreementDetailSchema.parse(unwrapData(body));
  },
};

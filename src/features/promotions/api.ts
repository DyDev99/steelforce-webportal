/**
 * Promotions and discounts — the HTTP boundary for `PromotionsController`.
 *
 * ## What this feature is
 *
 * A **rule engine**. Every discount the business gives is a promotion row rather than
 * code: conditions, a reward, validity, priority, stacking and a SAP mapping. Commercial
 * and Finance author them and take them through a two-stage approval before they go live.
 *
 * This replaced the depot-agreement pipeline — request, four signatures, immutable term,
 * SAP condition task. Those endpoints no longer exist.
 *
 * ## The lifecycle, and why the screen has to show two things at once
 *
 * A promotion is a container; its content lives on **versions**. Editing a live discount
 * creates a new version rather than changing what was approved, so a promotion can have a
 * live version and an open one being worked on at the same time. That is why the list
 * carries both `status` (the open version's) and `liveVersionNumber` — showing only one
 * tells somebody a promotion is Draft when customers are being charged under it today.
 *
 * `Draft → UnderCommercialReview → UnderFinanceReview → Approved → Live`, with
 * `Rejected`, `Cancelled` and `Withdrawn` as exits.
 *
 * ## Approval is not activation
 *
 * Finance approving a version does not price anything. `activate` does, and it is a
 * separate call and a separate permission. Conflating them on screen is how a discount
 * nobody switched on is reported as being given.
 */
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData, unwrapList, unwrapPage } from '@/infrastructure/api/envelope';
import type { ApiQuery } from '@/infrastructure/api/types';

const API_V1 = '/api/v1';
const PROMOTIONS = `${API_V1}/promotions`;

/** The seven ways a discount can be shaped. Mirrors the server's `businessType`. */
export const PROMOTION_BUSINESS_TYPES = [
  'TransportationPickupDiscount',
  'ProductSkuDiscount',
  'PaymentMethodDiscount',
  'CustomerProductDiscount',
  'QuantityTierDiscount',
  'BuyXGetY',
  'GeneralDiscount',
] as const;

export type PromotionBusinessType = (typeof PROMOTION_BUSINESS_TYPES)[number];

/** Readable labels. The server sends the enum name; these are for people. */
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  TransportationPickupDiscount: 'Pickup / transport',
  ProductSkuDiscount: 'Product (SKU)',
  PaymentMethodDiscount: 'Payment method',
  CustomerProductDiscount: 'Customer + product',
  QuantityTierDiscount: 'Quantity tier',
  BuyXGetY: 'Buy X get Y',
  GeneralDiscount: 'General',
};

/** Every state a version can be in, in lifecycle order. */
export const PROMOTION_STATUSES = [
  'Draft',
  'UnderCommercialReview',
  'UnderFinanceReview',
  'Approved',
  'Live',
  'Rejected',
  'Cancelled',
  'Withdrawn',
  'Expired',
] as const;

/** The states that mean somebody still has to sign. Drives the approval queue. */
export const AWAITING_SIGNATURE = ['UnderCommercialReview', 'UnderFinanceReview'] as const;

export const PromotionListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  businessType: z.string(),
  rewardType: z.string().nullable().optional(),
  versionNumber: z.number().nullable().optional(),
  status: z.string(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
  stacking: z.string().nullable().optional(),
  sapConditionType: z.string().nullable().optional(),
  sapStatus: z.string().nullable().optional(),
  liveVersionNumber: z.number().nullable().optional(),
  openVersionNumber: z.number().nullable().optional(),
  openVersionStatus: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const PromotionConditionSchema = z.object({
  dimension: z.string(),
  operator: z.string(),
  values: z.array(z.string()).default([]),
  group: z.number().nullable().optional(),
});

export const PromotionTierSchema = z.object({
  fromQuantity: z.number().nullable().optional(),
  toQuantity: z.number().nullable().optional(),
  rewardValue: z.number().nullable().optional(),
  freeQuantity: z.number().nullable().optional(),
});

export const PromotionApprovalSchema = z.object({
  stage: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
  decidedBy: z.string().nullable().optional(),
  decidedAt: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
});

export const PromotionVersionSchema = z.object({
  id: z.string(),
  versionNumber: z.number(),
  status: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
  stacking: z.string().nullable().optional(),
  rewardType: z.string().nullable().optional(),
  rewardValue: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  freeMaterialNumber: z.string().nullable().optional(),
  requiresSapSync: z.boolean().nullable().optional(),
  sapConditionType: z.string().nullable().optional(),
  sapStatus: z.string().nullable().optional(),
  sapConditionRecord: z.string().nullable().optional(),
  conditions: z.array(PromotionConditionSchema).default([]),
  tiers: z.array(PromotionTierSchema).default([]),
  approvals: z.array(PromotionApprovalSchema).default([]),
});

export const PromotionDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  businessType: z.string(),
  liveVersionNumber: z.number().nullable().optional(),
  openVersionNumber: z.number().nullable().optional(),
  versions: z.array(PromotionVersionSchema).default([]),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

export const CategoryMappingSchema = z.object({
  categoryCode: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  sapPriceGroup: z.string().nullable().optional(),
});

const PromotionPageSchema = z.object({
  items: z.array(PromotionListItemSchema).default([]),
  totalCount: z.number().default(0),
});

export type PromotionListItemDto = z.infer<typeof PromotionListItemSchema>;
export type PromotionDetailDto = z.infer<typeof PromotionDetailSchema>;
export type PromotionVersionDto = z.infer<typeof PromotionVersionSchema>;
export type PromotionConditionDto = z.infer<typeof PromotionConditionSchema>;
export type CategoryMappingDto = z.infer<typeof CategoryMappingSchema>;

/** What the create form sends. Mirrors `CreatePromotionRequest`. */
export interface CreatePromotionInput {
  code: string;
  businessType: string;
  name: string;
  description: string;
  validFrom: string;
  validTo: string;
  priority?: number;
  stacking?: string;
  rewardType: string;
  rewardValue?: number | null;
  currency?: string | null;
  unit?: string | null;
  requiresSapSync?: boolean;
  conditions?: { dimension: string; operator: string; values: string[] }[];
}

export const promotionsApi = {
  /** The catalogue, filtered. */
  list: async (
    query: {
      status?: string;
      businessType?: string;
      sapStatus?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    signal?: AbortSignal
  ) => {
    const body = await apiClient.get<unknown>(PROMOTIONS, {
      query: { pageSize: 50, ...query } as ApiQuery,
      signal,
    });

    return PromotionPageSchema.parse(unwrapPage(body));
  },

  /** One promotion with every version, condition, tier and signature. */
  get: async (id: string, signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${PROMOTIONS}/${id}`, { signal });

    return PromotionDetailSchema.parse(unwrapData(body));
  },

  create: async (input: CreatePromotionInput, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(PROMOTIONS, { body: input, signal });

    return PromotionDetailSchema.parse(unwrapData(body));
  },

  /**
   * Moves a promotion along its lifecycle.
   *
   * One function rather than seven, because the calls differ only in the segment and
   * whether they carry a reason. `reject`, `deactivate` and `cancel` require one; the
   * server refuses them without it, so the caller must supply it rather than sending an
   * empty body and getting a 400 the user cannot act on.
   */
  transition: async (
    id: string,
    action: 'submit' | 'approve' | 'reject' | 'activate' | 'deactivate' | 'cancel',
    payload?: { comment?: string; reason?: string },
    signal?: AbortSignal
  ) => {
    const body = await apiClient.post<unknown>(`${PROMOTIONS}/${id}/${action}`, {
      body: payload ?? {},
      signal,
    });

    return PromotionDetailSchema.parse(unwrapData(body));
  },

  /** Queues the promotion's condition for the SAP SD team. */
  syncToSap: async (id: string, signal?: AbortSignal) => {
    const body = await apiClient.post<unknown>(`${PROMOTIONS}/${id}/sync-sap`, { signal });

    return PromotionDetailSchema.parse(unwrapData(body));
  },

  /** The category → SAP price group join every promotion is keyed on. */
  listCategoryMappings: async (signal?: AbortSignal) => {
    const body = await apiClient.get<unknown>(`${API_V1}/settings/category-mappings`, { signal });

    return z.array(CategoryMappingSchema).parse(unwrapList(body));
  },
};

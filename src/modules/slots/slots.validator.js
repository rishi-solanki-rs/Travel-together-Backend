import { z } from 'zod';
import {
  objectIdSchema,
  slotScopeSchema,
  paginationSchema,
  slotStatusSchema,
  slotTypeSchema,
} from '../../shared/validators/commonSchemas.js';
import { SUBSCRIPTION_PLANS } from '../../shared/constants/index.js';

const planTierSchema = z.enum(Object.values(SUBSCRIPTION_PLANS));

const createInventorySchema = z.object({
  slotType: slotScopeSchema.shape.slotType,
  planTier: planTierSchema,
  cityId: objectIdSchema.optional().nullable(),
  categoryId: objectIdSchema.optional().nullable(),
  subtypeId: objectIdSchema.optional().nullable(),
  totalSlots: z.coerce.number().int().min(1),
  priority: z.coerce.number().int().min(0).optional().default(0),
}).refine((value) => {
  const hasCategoryScope = Boolean(value.categoryId || value.subtypeId);
  if (hasCategoryScope && !value.cityId) return false;
  if (value.subtypeId && !value.categoryId) return false;
  return true;
}, {
  message: 'slot scope integrity requires city for category/subtype and category for subtype',
});

const assignSlotSchema = z.object({
  vendorId: objectIdSchema,
  subscriptionId: objectIdSchema,
  inventoryId: objectIdSchema,
  listingId: objectIdSchema.optional().nullable(),
  endDate: z.coerce.date().optional(),
  campaignBoost: z.coerce.boolean().optional(),
  campaignBoostExpiry: z.coerce.date().optional().nullable(),
  idempotencyKey: z.string().trim().min(6).max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

const assignmentIdParamsSchema = z.object({
  assignmentId: objectIdSchema,
});

const assignmentQuerySchema = paginationSchema.extend({
  status: slotStatusSchema.optional(),
  vendorId: objectIdSchema.optional(),
  slotType: slotTypeSchema.optional(),
});

const slotAnalyticsQuerySchema = z.object({
  vendorId: objectIdSchema.optional(),
  slotType: slotTypeSchema.optional(),
  cityId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  subtypeId: objectIdSchema.optional(),
});

export { createInventorySchema, assignSlotSchema, assignmentIdParamsSchema, assignmentQuerySchema, slotAnalyticsQuerySchema };
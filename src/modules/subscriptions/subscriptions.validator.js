import { z } from 'zod';
import {
  objectIdSchema,
  paginationSchema,
  billingCycleSchema,
  subscriptionStatusSchema,
  moneySchema,
  dateSchema,
} from '../../shared/validators/commonSchemas.js';

const createSubscriptionSchema = z.object({
  planId: objectIdSchema,
  billingCycle: billingCycleSchema,
});

const activateSubscriptionSchema = z.object({
  reference: z.string().trim().min(1),
  gateway: z.string().trim().min(1),
  amount: moneySchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
}).refine((value) => {
  if (!value.startDate || !value.endDate) return true;
  return value.startDate <= value.endDate;
}, {
  message: 'startDate must be before endDate',
});

const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().min(2).max(500),
  effectiveFrom: dateSchema.optional(),
});

const renewSubscriptionSchema = z.object({
  amount: moneySchema.optional(),
  validFrom: dateSchema.optional(),
  validTo: dateSchema.optional(),
  note: z.string().trim().max(500).optional(),
}).refine((value) => {
  if (!value.validFrom || !value.validTo) return true;
  return value.validFrom <= value.validTo;
}, { message: 'validFrom must be before validTo' });

const retrySubscriptionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

const changePlanSchema = z.object({
  planId: objectIdSchema,
  billingCycle: billingCycleSchema.optional(),
  note: z.string().trim().max(500).optional(),
});

const subscriptionIdParamsSchema = z.object({
  id: objectIdSchema,
});

const subscriptionQuerySchema = paginationSchema.extend({
  status: subscriptionStatusSchema.optional(),
  planKey: z.string().trim().optional(),
  vendorId: objectIdSchema.optional(),
});

export {
  createSubscriptionSchema,
  activateSubscriptionSchema,
  cancelSubscriptionSchema,
  renewSubscriptionSchema,
  retrySubscriptionSchema,
  changePlanSchema,
  subscriptionQuerySchema,
  subscriptionIdParamsSchema,
};
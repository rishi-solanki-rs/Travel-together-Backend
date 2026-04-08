import { z } from 'zod';
import { objectIdSchema, paginationSchema, moneySchema, dateSchema, bookingStatusSchema } from '../../shared/validators/commonSchemas.js';

const myBookingsQuerySchema = paginationSchema.extend({
  status: z.string().trim().optional(),
  type: z.enum(['hotel', 'shop', 'kids', 'tour']).optional(),
  upcoming: z.coerce.boolean().optional(),
  completed: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const adminBookingsQuerySchema = paginationSchema.extend({
  status: bookingStatusSchema.optional().or(z.string().trim().optional()),
  type: z.enum(['hotel', 'shop', 'kids', 'tour']).optional(),
  vendorId: objectIdSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  upcoming: z.coerce.boolean().optional(),
  completed: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const adminBookingTimelineQuerySchema = paginationSchema.extend({
  type: z.enum(['hotel', 'shop', 'kids', 'tour']).optional(),
  vendorId: objectIdSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const bookingIdParamsSchema = z.object({ id: objectIdSchema });
const txnIdParamsSchema = z.object({ txnId: objectIdSchema });
const mediaIdParamsSchema = z.object({ id: objectIdSchema });
const orderIdParamsSchema = z.object({ id: objectIdSchema });

const cancelBookingSchema = z.object({
  reason: z.string().trim().min(2).max(300).optional(),
  refundAmount: moneySchema.optional(),
});

const rescheduleBookingSchema = z.object({
  newDate: dateSchema,
  checkOutDate: dateSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

const payBookingSchema = z.object({
  provider: z.string().trim().min(1).default('manual'),
  gatewayReference: z.string().trim().optional(),
  amount: moneySchema.optional(),
  currency: z.string().trim().default('INR'),
  correlationId: z.string().trim().optional(),
});

const verifyPaymentSchema = z.object({
  status: z.enum(['captured', 'failed', 'processing']).optional(),
});

const refundBookingSchema = z.object({
  reason: z.string().trim().min(2).max(300),
  amount: moneySchema.optional(),
});

const adminTransitionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

const manualRefundSchema = z.object({
  reason: z.string().trim().min(2).max(300),
  amount: moneySchema,
  note: z.string().trim().max(500).optional(),
});

const cartItemUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(1),
});

const checkoutAddressSchema = z.object({
  vendorId: objectIdSchema,
  name: z.string().trim().min(1),
  phone: z.string().trim().min(6),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().trim().min(3),
  country: z.string().trim().default('India'),
});

const orderReturnSchema = z.object({
  reason: z.string().trim().min(2).max(300),
});

const mediaReplaceSchema = z.object({
  publicId: z.string().trim().min(1),
  url: z.string().trim().min(1),
  checksum: z.string().trim().optional(),
  altText: z.string().trim().max(200).optional(),
});

const mediaReorderSchema = z.object({
  listingId: objectIdSchema,
  orderedMediaIds: z.array(objectIdSchema).min(1),
});

const mediaPrimarySchema = z.object({
  listingId: objectIdSchema.optional(),
});

export {
  myBookingsQuerySchema,
  adminBookingsQuerySchema,
  adminBookingTimelineQuerySchema,
  bookingIdParamsSchema,
  txnIdParamsSchema,
  mediaIdParamsSchema,
  orderIdParamsSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  payBookingSchema,
  verifyPaymentSchema,
  refundBookingSchema,
  adminTransitionSchema,
  manualRefundSchema,
  cartItemUpdateSchema,
  checkoutAddressSchema,
  orderReturnSchema,
  mediaReplaceSchema,
  mediaReorderSchema,
  mediaPrimarySchema,
};

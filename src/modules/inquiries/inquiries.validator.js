import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const inquiryBodySchema = z.object({
  vendorId: objectIdSchema,
  listingId: objectIdSchema.optional().nullable(),
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10).max(2000),
  preferredDate: z.coerce.date().optional(),
  preferredTime: z.string().trim().optional(),
  groupSize: z.coerce.number().int().min(1).optional(),
  budget: z.string().trim().optional(),
});

const inquiryResponseParamsSchema = z.object({
  id: objectIdSchema,
});

const inquiryResponseBodySchema = z.object({
  response: z.string().trim().min(2).max(2000),
});

export { inquiryBodySchema, inquiryResponseParamsSchema, inquiryResponseBodySchema };
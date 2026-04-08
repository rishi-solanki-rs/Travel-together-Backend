import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const vendorCreateSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  shortDescription: z.string().trim().max(300).optional(),
  category: z.string().trim().min(1),
  cityId: objectIdSchema.optional().nullable(),
  contactInfo: z.record(z.any()).optional(),
  address: z.record(z.any()).optional(),
  socialLinks: z.record(z.any()).optional(),
  tags: z.array(z.string().trim()).optional(),
  languages: z.array(z.string().trim()).optional(),
});

const vendorUpdateSchema = vendorCreateSchema.partial();

const vendorIdParamsSchema = z.object({
  id: objectIdSchema,
});

const vendorRejectSchema = z.object({
  reason: z.string().trim().min(2).max(500),
});

export { vendorCreateSchema, vendorUpdateSchema, vendorIdParamsSchema, vendorRejectSchema };
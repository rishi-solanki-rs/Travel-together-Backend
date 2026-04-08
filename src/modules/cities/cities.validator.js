import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const cityBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().optional(),
  isFeatured: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
  geoLocation: z.record(z.any()).optional(),
});

const cityIdParamsSchema = z.object({
  id: objectIdSchema,
});

const citySlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export { cityBodySchema, cityIdParamsSchema, citySlugParamsSchema };
import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../shared/validators/commonSchemas.js';

const countryBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200).optional(),
  status: z.enum(['draft', 'published', 'unpublished']).optional(),
});

const countryIdParamsSchema = z.object({
  id: objectIdSchema,
});

const countrySectionParamsSchema = z.object({
  id: objectIdSchema,
  section: z.string().trim().min(1),
});

const countryQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'published', 'unpublished']).optional(),
  search: z.string().trim().optional(),
});

export { countryBodySchema, countryIdParamsSchema, countrySectionParamsSchema, countryQuerySchema };

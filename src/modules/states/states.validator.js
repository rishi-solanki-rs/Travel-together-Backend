import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../shared/validators/commonSchemas.js';

const stateBodySchema = z.object({
  countryId: objectIdSchema.optional(),
  country: objectIdSchema.optional(),
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200).optional(),
  status: z.enum(['draft', 'published', 'unpublished']).optional(),
});

const stateIdParamsSchema = z.object({
  id: objectIdSchema,
});

const stateSectionParamsSchema = z.object({
  id: objectIdSchema,
  section: z.string().trim().min(1),
});

const stateQuerySchema = paginationSchema.extend({
  countryId: objectIdSchema.optional(),
  status: z.enum(['draft', 'published', 'unpublished']).optional(),
  search: z.string().trim().optional(),
});

export { stateBodySchema, stateIdParamsSchema, stateSectionParamsSchema, stateQuerySchema };

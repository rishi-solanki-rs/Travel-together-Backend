import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../shared/validators/commonSchemas.js';

const attractionBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200).optional(),
  category: z.enum(['temple', 'heritage', 'museum', 'nature', 'experience']),
  summary: z.string().trim().max(1000).optional(),
  cityId: objectIdSchema.optional(),
  stateId: objectIdSchema.optional(),
  countryId: objectIdSchema.optional(),
  media: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string().trim().optional(),
        type: z.enum(['image', 'video']).default('image'),
      })
    )
    .optional(),
  status: z.enum(['draft', 'published', 'unpublished']).optional(),
});

const attractionIdParamsSchema = z.object({
  id: objectIdSchema,
});

const attractionQuerySchema = paginationSchema.extend({
  cityId: objectIdSchema.optional(),
  stateId: objectIdSchema.optional(),
  countryId: objectIdSchema.optional(),
  category: z.enum(['temple', 'heritage', 'museum', 'nature', 'experience']).optional(),
  status: z.enum(['draft', 'published', 'unpublished']).optional(),
  search: z.string().trim().optional(),
});

export { attractionBodySchema, attractionIdParamsSchema, attractionQuerySchema };

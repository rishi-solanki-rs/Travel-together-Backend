import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../shared/validators/commonSchemas.js';
import { PAGE_TYPES } from '../../shared/constants/index.js';

const pageTypeSchema = z.enum(Object.values(PAGE_TYPES));

const pageBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(120),
  type: pageTypeSchema,
  description: z.string().trim().max(500).optional(),
  cityId: objectIdSchema.optional().nullable(),
  categoryId: objectIdSchema.optional().nullable(),
  subtypeId: objectIdSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const pagesQuerySchema = paginationSchema.extend({
  type: pageTypeSchema.optional(),
  isPublished: z.enum(['true', 'false']).optional(),
  cityId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  subtypeId: objectIdSchema.optional(),
});

const publishParamsSchema = z.object({
  id: objectIdSchema,
});

const pageSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export { pageBodySchema, publishParamsSchema, pageSlugParamsSchema, pagesQuerySchema };
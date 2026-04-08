import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const categoryBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200),
  key: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  icon: z.string().trim().optional(),
  image: z.record(z.any()).optional(),
  coverImage: z.record(z.any()).optional(),
  order: z.coerce.number().int().min(0).optional(),
  sidebarPriority: z.coerce.number().int().min(0).optional(),
  filterOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  labels: z
    .object({
      chain: z.boolean().optional(),
      sponsored: z.boolean().optional(),
      superSaver: z.boolean().optional(),
      popularChoice: z.boolean().optional(),
      featured: z.boolean().optional(),
    })
    .optional(),
  color: z.string().trim().optional(),
  parentId: objectIdSchema.optional().nullable(),
});

const categoryIdParamsSchema = z.object({
  id: objectIdSchema,
});

const categorySlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export { categoryBodySchema, categoryIdParamsSchema, categorySlugParamsSchema };
import { z } from 'zod';
import { objectIdSchema, cmsSectionTypeSchema } from '../../shared/validators/commonSchemas.js';

const ctaSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z.string().trim().url(),
  target: z.enum(['_self', '_blank']).optional(),
  style: z.enum(['primary', 'secondary', 'outline', 'ghost']).optional(),
}).partial();

const cmsSectionBodyBaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  identifier: z.string().trim().min(2).max(120),
  type: cmsSectionTypeSchema,
  description: z.string().trim().max(500).optional(),
  cityId: objectIdSchema.optional().nullable(),
  pageId: objectIdSchema.optional().nullable(),
  categoryId: objectIdSchema.optional().nullable(),
  subtypeId: objectIdSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
  scheduledFrom: z.coerce.date().optional().nullable(),
  scheduledTo: z.coerce.date().optional().nullable(),
  cta: ctaSchema.optional(),
  secondaryCta: ctaSchema.optional(),
  listingIds: z.array(objectIdSchema).optional(),
  vendorIds: z.array(objectIdSchema).optional(),
});

const cmsSectionBodySchema = cmsSectionBodyBaseSchema.refine((value) => {
  if (!value.scheduledFrom || !value.scheduledTo) return true;
  return value.scheduledFrom <= value.scheduledTo;
}, {
  message: 'scheduledFrom must be before scheduledTo',
});

const cmsSectionUpdateSchema = cmsSectionBodyBaseSchema.partial().refine((value) => {
  if (!value.scheduledFrom || !value.scheduledTo) return true;
  return value.scheduledFrom <= value.scheduledTo;
}, {
  message: 'scheduledFrom must be before scheduledTo',
});

const reorderSchema = z.object({
  pageId: objectIdSchema.optional(),
  orderedIds: z.array(objectIdSchema).min(1),
});

const cmsIdParamsSchema = z.object({
  id: objectIdSchema,
});

const cmsPageParamsSchema = z.object({
  pageId: objectIdSchema,
});

const cmsIdentifierParamsSchema = z.object({
  identifier: z.string().trim().min(1),
});

export { cmsSectionBodySchema, cmsSectionUpdateSchema, reorderSchema, cmsIdParamsSchema, cmsPageParamsSchema, cmsIdentifierParamsSchema };
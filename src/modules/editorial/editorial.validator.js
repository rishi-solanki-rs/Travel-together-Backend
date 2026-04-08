import { z } from 'zod';
import { objectIdSchema, paginationSchema, dateSchema } from '../../shared/validators/commonSchemas.js';

const editorialBaseSchema = z.object({
  title: z.string().trim().min(2).max(220),
  subtitle: z.string().trim().max(260).optional(),
  story: z.string().trim().max(6000).optional(),
  widgetType: z.string().trim().max(120).optional(),
  cityId: objectIdSchema.optional().nullable(),
  areaId: objectIdSchema.optional().nullable(),
  listingIds: z.array(objectIdSchema).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).optional(),
  season: z.string().trim().max(80).optional(),
  startsAt: dateSchema.optional(),
  endsAt: dateSchema.optional(),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaPath: z.string().trim().max(200).optional(),
  coverImage: z.object({ publicId: z.string().trim().optional(), url: z.string().trim().optional(), altText: z.string().trim().optional() }).optional(),
  isActive: z.boolean().optional(),
});

const editorialBodySchema = editorialBaseSchema.refine((value) => {
  if (!value.startsAt || !value.endsAt) return true;
  return value.startsAt <= value.endsAt;
}, { message: 'startsAt must be before endsAt' });

const editorialUpdateBodySchema = editorialBaseSchema.partial().refine((value) => {
  if (!value.startsAt || !value.endsAt) return true;
  return value.startsAt <= value.endsAt;
}, { message: 'startsAt must be before endsAt' });

const editorialQuerySchema = paginationSchema.extend({
  cityId: objectIdSchema.optional(),
  areaId: objectIdSchema.optional(),
  season: z.string().trim().optional(),
  widgetType: z.string().trim().optional(),
  tag: z.string().trim().optional(),
});

const editorialIdParamSchema = z.object({ id: objectIdSchema });

export { editorialBodySchema, editorialUpdateBodySchema, editorialQuerySchema, editorialIdParamSchema };

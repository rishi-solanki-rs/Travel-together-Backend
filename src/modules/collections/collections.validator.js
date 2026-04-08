import { z } from 'zod';
import { objectIdSchema, paginationSchema, dateSchema } from '../../shared/validators/commonSchemas.js';

const collectionBodySchema = z.object({
  title: z.string().trim().min(2).max(180),
  coverImage: z.object({ publicId: z.string().trim().optional(), url: z.string().trim().optional(), altText: z.string().trim().optional() }).optional(),
  gallery: z.array(z.object({ publicId: z.string().trim().optional(), url: z.string().trim().optional(), altText: z.string().trim().optional(), order: z.coerce.number().int().min(0).optional() })).optional(),
  season: z.string().trim().max(80).optional(),
  cityId: objectIdSchema.optional().nullable(),
  areaId: objectIdSchema.optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(80)).optional(),
  listingIds: z.array(objectIdSchema).optional(),
  offerText: z.string().trim().max(500).optional(),
  validTill: dateSchema.optional(),
  isFeatured: z.boolean().optional(),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  inquiryShortcut: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional(),
});

const reorderCollectionSchema = z.object({
  listingIds: z.array(objectIdSchema).min(1),
});

const collectionIdParamSchema = z.object({ id: objectIdSchema });

const collectionQuerySchema = paginationSchema.extend({
  cityId: objectIdSchema.optional(),
  areaId: objectIdSchema.optional(),
  season: z.string().trim().optional(),
  vendorId: objectIdSchema.optional(),
  featuredOnly: z.coerce.boolean().optional(),
  tag: z.string().trim().optional(),
});

export { collectionBodySchema, reorderCollectionSchema, collectionIdParamSchema, collectionQuerySchema };

import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const listingBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  categoryId: objectIdSchema.optional(),
  categoryIds: z.array(objectIdSchema).optional(),
  subtypeId: objectIdSchema.optional().nullable(),
  subCategoryId: objectIdSchema.optional().nullable(),
  subCategoryIds: z.array(objectIdSchema).optional(),
  templateId: objectIdSchema.optional().nullable(),
  cityId: objectIdSchema.optional().nullable(),
  areaId: objectIdSchema.optional().nullable(),
  address: z.record(z.any()).optional(),
  pricing: z.record(z.any()).optional(),
  contactInfo: z.record(z.any()).optional(),
  dynamicFields: z.record(z.any()).optional(),
  tags: z.array(z.string().trim()).optional(),
  nearbyLandmarks: z.array(z.string().trim().min(1)).optional(),
  vendorType: z.string().trim().optional(),
  discoveryType: z.string().trim().optional(),
  areaCluster: z.string().trim().optional(),
  labels: z
    .object({
      chain: z.boolean().optional(),
      sponsored: z.boolean().optional(),
      superSaver: z.boolean().optional(),
      popularChoice: z.boolean().optional(),
      featured: z.boolean().optional(),
      openNow: z.boolean().optional(),
    })
    .optional(),
  highlights: z.array(z.string().trim()).optional(),
  inclusions: z.array(z.string().trim()).optional(),
  exclusions: z.array(z.string().trim()).optional(),
  seoConfig: z.record(z.any()).optional(),
  status: z.string().trim().optional(),
});

const listingParamsSchema = z.object({
  id: objectIdSchema,
});

const listingSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

const listingUnpublishSchema = z.object({
  notes: z.string().trim().min(2).max(1000),
});

export { listingBodySchema, listingParamsSchema, listingSlugParamsSchema, listingUnpublishSchema };
import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const areaBodySchema = z.object({
  cityId: objectIdSchema,
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140),
  zoneType: z.enum(['tourist_zone', 'market_zone', 'food_zone', 'residential_zone', 'mixed']).optional(),
  nearbyLandmarks: z.array(z.string().trim().min(1).max(120)).optional(),
  popularRoutes: z.array(z.string().trim().min(1).max(120)).optional(),
  clusterKey: z.string().trim().max(120).optional(),
  geoLocation: z
    .object({
      type: z.literal('Point').default('Point'),
      coordinates: z.array(z.number()).length(2),
    })
    .optional(),
  order: z.coerce.number().int().min(0).optional(),
  seoConfig: z
    .object({
      metaTitle: z.string().trim().max(180).optional(),
      metaDescription: z.string().trim().max(320).optional(),
      keywords: z.array(z.string().trim().min(1)).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

const areaIdParamsSchema = z.object({ id: objectIdSchema });

export { areaBodySchema, areaIdParamsSchema };

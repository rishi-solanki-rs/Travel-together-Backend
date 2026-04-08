import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const nearbyQuerySchema = z.object({
  cityId: objectIdSchema.optional(),
  areaId: objectIdSchema.optional(),
  domain: z.string().trim().optional().default('nearby'),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().min(1).max(50).optional().default(8),
  limit: z.coerce.number().int().min(1).max(40).optional().default(16),
  nearbyLandmark: z.string().trim().optional(),
});

const relatedParamsSchema = z.object({ listingId: objectIdSchema });

const sidebarQuerySchema = z.object({
  domain: z.enum(['eatDrink', 'shops', 'fashion', 'nearby']).default('nearby'),
  cityId: objectIdSchema.optional(),
});

export { nearbyQuerySchema, relatedParamsSchema, sidebarQuerySchema };

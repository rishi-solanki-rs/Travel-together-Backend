import { z } from 'zod';
import { objectIdSchema, trimmedString, mediaVariantSchema, mediaRoleSchema } from './commonSchemas.js';

const uploadContextSchema = z.enum(['users', 'vendors', 'listings', 'hotels', 'restaurants', 'shops', 'tribes', 'kidsWorld', 'destinations', 'cms', 'cities', 'categories', 'luckyDraw']);

const mediaUploadBodySchema = z.object({
  context: uploadContextSchema,
  listingId: objectIdSchema.optional(),
  role: mediaRoleSchema.optional(),
  altText: trimmedString.max(200).optional(),
  order: z.coerce.number().int().min(0).optional(),
});

const mediaDeleteParamsSchema = z.object({
  id: objectIdSchema,
});

export { uploadContextSchema, mediaUploadBodySchema, mediaDeleteParamsSchema, mediaVariantSchema };
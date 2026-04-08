import { z } from 'zod';
import { mediaUploadBodySchema, mediaDeleteParamsSchema } from '../../shared/validators/mediaSchemas.js';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const uploadSingleSchema = mediaUploadBodySchema;
const uploadMultipleSchema = mediaUploadBodySchema.extend({
  filesCount: z.coerce.number().int().min(1).max(20).optional(),
});

const uploadAssetsQuerySchema = z.object({
  listingId: objectIdSchema.optional(),
});

export { uploadSingleSchema, uploadMultipleSchema, mediaDeleteParamsSchema, uploadAssetsQuerySchema };
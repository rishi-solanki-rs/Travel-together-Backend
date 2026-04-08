import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const wishlistToggleSchema = z.object({
  listingId: objectIdSchema,
});

const wishlistListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

export { wishlistToggleSchema, wishlistListingParamsSchema };
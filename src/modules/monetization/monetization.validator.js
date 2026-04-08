import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const monetizationQuerySchema = z.object({
  vendorId: objectIdSchema.optional(),
});

export { monetizationQuerySchema };
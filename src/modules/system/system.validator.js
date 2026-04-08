import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const featureFlagParamsSchema = z.object({
  key: z.string().trim().min(1).max(120),
});

const featureFlagUpdateSchema = z.object({
  enabled: z.coerce.boolean(),
  note: z.string().trim().max(300).optional(),
});

const maintenanceUpdateSchema = z.object({
  enabled: z.coerce.boolean(),
  note: z.string().trim().max(300).optional(),
});

const systemActionSchema = z.object({
  requestedBy: objectIdSchema.optional(),
  reason: z.string().trim().max(300).optional(),
});

export {
  featureFlagParamsSchema,
  featureFlagUpdateSchema,
  maintenanceUpdateSchema,
  systemActionSchema,
};

import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const luckyDrawBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().optional(),
  isDrawManual: z.boolean().optional(),
  prizes: z.array(z.record(z.any())).optional(),
  entryRules: z.record(z.any()).optional(),
});

const luckyDrawIdParamsSchema = z.object({
  id: objectIdSchema,
});

const luckyDrawSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export { luckyDrawBodySchema, luckyDrawIdParamsSchema, luckyDrawSlugParamsSchema };
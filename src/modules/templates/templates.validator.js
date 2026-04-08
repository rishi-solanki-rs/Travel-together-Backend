import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const templateFieldSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.string().trim().min(1),
}).passthrough();

const templateBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  key: z.string().trim().min(2).max(100),
  categoryId: objectIdSchema,
  subtypeId: objectIdSchema.optional().nullable(),
  description: z.string().trim().max(1000).optional(),
  fields: z.array(templateFieldSchema).optional(),
  priceRules: z.record(z.any()).optional(),
  mediaRules: z.record(z.any()).optional(),
  cardRules: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const templateIdParamsSchema = z.object({
  id: objectIdSchema,
});

const templateSubtypeParamsSchema = z.object({
  subtypeId: objectIdSchema,
});

export { templateBodySchema, templateIdParamsSchema, templateSubtypeParamsSchema };
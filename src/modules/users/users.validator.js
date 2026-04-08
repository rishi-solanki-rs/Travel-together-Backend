import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().optional(),
  profile: z.record(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
  avatar: z.string().trim().optional().nullable(),
  avatarPublicId: z.string().trim().optional().nullable(),
});

const userStatusSchema = z.object({
  isActive: z.boolean(),
});

const userIdParamsSchema = z.object({
  id: objectIdSchema,
});

export { profileUpdateSchema, userStatusSchema, userIdParamsSchema };
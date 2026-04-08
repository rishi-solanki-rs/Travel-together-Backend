import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const webhookSchema = z.object({
  provider: z.string().min(2),
  eventId: z.string().optional(),
  nonce: z.string().min(8),
  payload: z.record(z.any()),
});

const privacyRequestSchema = z.object({
  requestType: z.enum(['access', 'forget', 'delete', 'consent_export']),
});

const consentSchema = z.object({
  consentType: z.string().min(2),
  granted: z.boolean(),
  scope: z.string().optional(),
});

const payoutExportSchema = z.object({
  vendorId: objectIdSchema.optional().nullable(),
  rows: z.array(z.record(z.any())).default([]),
  filters: z.record(z.any()).optional(),
});

export { webhookSchema, privacyRequestSchema, consentSchema, payoutExportSchema };

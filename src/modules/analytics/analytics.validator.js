import { z } from 'zod';

const analyticsTrackSchema = z.object({
  eventType: z.string().trim().min(1),
  vendorId: z.string().trim().optional().nullable(),
  listingId: z.string().trim().optional().nullable(),
  cityId: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  subtypeId: z.string().trim().optional().nullable(),
  slotId: z.string().trim().optional().nullable(),
  campaignId: z.string().trim().optional().nullable(),
  sessionId: z.string().trim().optional(),
  metadata: z.record(z.any()).optional(),
});

export { analyticsTrackSchema };
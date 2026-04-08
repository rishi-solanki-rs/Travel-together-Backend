import { z } from 'zod';
import { objectIdSchema, paginationSchema, dateSchema } from '../../shared/validators/commonSchemas.js';
import { INQUIRY_STATUS } from '../../shared/constants/index.js';

const inquiryLifecycleStatuses = z.enum(Object.values(INQUIRY_STATUS));

const inquiryLifecycleQuerySchema = paginationSchema.extend({
  status: inquiryLifecycleStatuses.optional(),
  cityId: objectIdSchema.optional(),
  areaId: objectIdSchema.optional(),
  vendorId: objectIdSchema.optional(),
  domain: z.string().trim().optional(),
  assignedTo: objectIdSchema.optional(),
  assignedVendorUser: objectIdSchema.optional(),
  callbackOverdue: z.coerce.boolean().optional(),
  followupOverdue: z.coerce.boolean().optional(),
  minLeadScore: z.coerce.number().min(0).max(100).optional(),
  tag: z.string().trim().optional(),
  seasonalInterest: z.string().trim().optional(),
});

const inquiryIdParamSchema = z.object({
  id: objectIdSchema,
});

const updateInquiryStatusSchema = z.object({
  status: inquiryLifecycleStatuses,
  conversionValue: z.coerce.number().min(0).optional(),
  lostReason: z.string().trim().max(500).optional(),
  preferredVisitTime: z.string().trim().max(120).optional(),
  nextFollowupAt: dateSchema.optional(),
  seasonalInterest: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).optional(),
});

const assignInquirySchema = z.object({
  assignedTo: objectIdSchema.optional().nullable(),
  assignedVendorUser: objectIdSchema.optional().nullable(),
  nextFollowupAt: dateSchema.optional(),
});

const followupSchema = z.object({
  note: z.string().trim().min(2).max(1500),
  nextFollowupAt: dateSchema.optional(),
  status: inquiryLifecycleStatuses.optional(),
  leadScore: z.coerce.number().min(0).max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).optional(),
});

export {
  inquiryLifecycleQuerySchema,
  inquiryIdParamSchema,
  updateInquiryStatusSchema,
  assignInquirySchema,
  followupSchema,
};

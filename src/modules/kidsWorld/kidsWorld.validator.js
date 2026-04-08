import { z } from 'zod';
import { objectIdSchema, moneySchema, listingStatusSchema, bookingStatusSchema } from '../../shared/validators/commonSchemas.js';

const activityTypeSchema = z.enum([
  'workshop',
  'camp',
  'educational',
  'sports',
  'arts_crafts',
  'music',
  'dance',
  'science',
  'cooking',
  'outdoor',
  'indoor',
  'other',
]);

const environmentSchema = z.enum(['indoor', 'outdoor', 'both']);

const kidsListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

const kidsParamsSchema = z.object({
  listingId: objectIdSchema,
});

const sessionParamsSchema = z.object({
  sessionId: objectIdSchema,
});

const activityBodyBaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  activityType: activityTypeSchema,
  description: z.string().trim().max(5000).optional(),
  minAge: z.coerce.number().int().min(0).optional(),
  maxAge: z.coerce.number().int().min(0).optional(),
  minGroupSize: z.coerce.number().int().min(1).optional(),
  maxGroupSize: z.coerce.number().int().min(1).optional(),
  basePrice: moneySchema.optional(),
  indoorOutdoor: environmentSchema.optional(),
  status: listingStatusSchema.optional(),
});

const activityBodySchema = activityBodyBaseSchema.refine((value) => {
  if (value.minAge === undefined || value.maxAge === undefined) return true;
  return value.maxAge >= value.minAge;
}, {
  message: 'maxAge must be greater than or equal to minAge',
}).refine((value) => {
  if (value.minGroupSize === undefined || value.maxGroupSize === undefined) return true;
  return value.maxGroupSize >= value.minGroupSize;
}, {
  message: 'maxGroupSize must be greater than or equal to minGroupSize',
});

const createActivitySchema = activityBodySchema;
const updateActivitySchema = activityBodyBaseSchema.partial().refine((value) => {
  if (value.minAge === undefined || value.maxAge === undefined) return true;
  return value.maxAge >= value.minAge;
}, {
  message: 'maxAge must be greater than or equal to minAge',
}).refine((value) => {
  if (value.minGroupSize === undefined || value.maxGroupSize === undefined) return true;
  return value.maxGroupSize >= value.minGroupSize;
}, {
  message: 'maxGroupSize must be greater than or equal to minGroupSize',
});

const addSessionSchema = z.object({
  sessionDate: z.coerce.date(),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  seatsTotal: z.coerce.number().int().min(0),
  seatsAvailable: z.coerce.number().int().min(0),
  status: bookingStatusSchema.optional(),
}).refine((value) => value.endTime > value.startTime, {
  message: 'endTime must be after startTime',
}).refine((value) => value.seatsAvailable <= value.seatsTotal, {
  message: 'seatsAvailable must be less than or equal to seatsTotal',
});

export {
  kidsListingParamsSchema,
  kidsParamsSchema,
  sessionParamsSchema,
  createActivitySchema,
  updateActivitySchema,
  addSessionSchema,
};
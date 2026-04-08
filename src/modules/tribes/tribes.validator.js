import { z } from 'zod';
import { objectIdSchema, moneySchema, listingStatusSchema, bookingStatusSchema } from '../../shared/validators/commonSchemas.js';

const tribeExperienceTypeSchema = z.enum([
  'workshop',
  'local_stay',
  'cultural_tour',
  'festival',
  'storytelling',
  'cooking_class',
  'craft_session',
  'tribal_walk',
  'heritage_session',
  'other',
]);

const difficultySchema = z.enum(['easy', 'moderate', 'challenging']);

const tribeListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

const tribeParamsSchema = z.object({
  listingId: objectIdSchema,
});

const tribeEntryParamsSchema = z.object({
  entryId: objectIdSchema,
});

const experienceBaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  experienceType: tribeExperienceTypeSchema,
  description: z.string().trim().max(5000).optional(),
  minParticipants: z.coerce.number().int().min(1),
  maxParticipants: z.coerce.number().int().min(1),
  basePrice: moneySchema,
  difficulty: difficultySchema.optional(),
  status: listingStatusSchema.optional(),
});

const createExperienceSchema = experienceBaseSchema.refine((value) => value.maxParticipants >= value.minParticipants, {
  message: 'maxParticipants must be greater than or equal to minParticipants',
});

const updateExperienceSchema = experienceBaseSchema.partial().refine((value) => {
  if (value.minParticipants === undefined || value.maxParticipants === undefined) return true;
  return value.maxParticipants >= value.minParticipants;
}, {
  message: 'maxParticipants must be greater than or equal to minParticipants',
});

const addScheduleSchema = z.object({
  eventDate: z.coerce.date(),
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
  tribeListingParamsSchema,
  tribeParamsSchema,
  tribeEntryParamsSchema,
  createExperienceSchema,
  updateExperienceSchema,
  addScheduleSchema,
};
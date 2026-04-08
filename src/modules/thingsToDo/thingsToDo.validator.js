import { z } from 'zod';
import { objectIdSchema, moneySchema } from '../../shared/validators/commonSchemas.js';

const tourTypeSchema = z.enum(['same_day', 'customized', 'fixed_departure', 'private', 'group']);
const difficultySchema = z.enum(['easy', 'moderate', 'difficult', 'extreme']);
const mealSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snacks']);
const departureStatusSchema = z.enum(['scheduled', 'confirmed', 'cancelled', 'completed', 'full']);

const itineraryListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

const itineraryParamsSchema = z.object({
  id: objectIdSchema,
});

const departureParamsSchema = z.object({
  listingId: objectIdSchema,
  itineraryId: objectIdSchema,
});

const itineraryBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  durationDays: z.coerce.number().int().min(1).optional(),
  durationNights: z.coerce.number().int().min(0).optional(),
  tourType: tourTypeSchema,
  difficulty: difficultySchema.optional(),
  overview: z.string().trim().max(4000).optional(),
  highlights: z.array(z.string().trim().min(1).max(200)).optional(),
  days: z.array(z.object({
    dayNumber: z.coerce.number().int().min(1),
    description: z.string().trim().min(1),
    meals: z.array(mealSchema).optional(),
    activities: z.array(z.string().trim().min(1).max(200)).optional(),
  })).optional(),
  inclusions: z.array(z.string().trim().min(1).max(200)).optional(),
  exclusions: z.array(z.string().trim().min(1).max(200)).optional(),
});

const createItinerarySchema = itineraryBodySchema;
const updateItinerarySchema = itineraryBodySchema.partial();

const departureBodyBaseSchema = z.object({
  departureDate: z.coerce.date(),
  returnDate: z.coerce.date(),
  status: departureStatusSchema.optional(),
  totalCapacity: z.coerce.number().int().min(0),
  availableCapacity: z.coerce.number().int().min(0),
  adultPrice: moneySchema,
  childPrice: moneySchema.optional(),
  infantPrice: moneySchema.optional(),
  meetingPoint: z.string().trim().max(300).optional(),
  guide: z.string().trim().max(200).optional(),
});

const departureBodySchema = departureBodyBaseSchema.refine((value) => value.departureDate <= value.returnDate, {
  message: 'departureDate must be before returnDate',
}).refine((value) => value.availableCapacity <= value.totalCapacity, {
  message: 'availableCapacity must be less than or equal to totalCapacity',
});

const addDepartureSchema = departureBodySchema;
const updateDepartureSchema = departureBodyBaseSchema.partial().refine((value) => {
  if (!value.departureDate || !value.returnDate) return true;
  return value.departureDate <= value.returnDate;
}, {
  message: 'departureDate must be before returnDate',
}).refine((value) => {
  if (value.availableCapacity === undefined || value.totalCapacity === undefined) return true;
  return value.availableCapacity <= value.totalCapacity;
}, {
  message: 'availableCapacity must be less than or equal to totalCapacity',
});

const cancelDepartureSchema = z.object({
  reason: z.string().trim().min(2).max(500),
});

export {
  itineraryListingParamsSchema,
  itineraryParamsSchema,
  departureParamsSchema,
  createItinerarySchema,
  updateItinerarySchema,
  addDepartureSchema,
  updateDepartureSchema,
  cancelDepartureSchema,
};
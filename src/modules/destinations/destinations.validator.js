import { z } from 'zod';
import { objectIdSchema, moneySchema, listingStatusSchema, bookingStatusSchema } from '../../shared/validators/commonSchemas.js';

const difficultySchema = z.enum(['easy', 'moderate', 'difficult', 'extreme']);
const transportTypeSchema = z.enum(['private_car', 'shared_bus', 'train', 'flight', 'self', 'mixed', 'none']);

const destinationListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

const destinationTypeParamsSchema = z.object({
  type: z.string().trim().min(1),
});

const packageBodyBaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  overview: z.string().trim().max(5000).optional(),
  highlights: z.array(z.string().trim().min(1).max(200)).optional(),
  durationDays: z.coerce.number().int().min(1).optional(),
  durationNights: z.coerce.number().int().min(0).optional(),
  difficulty: difficultySchema.optional(),
  transportType: transportTypeSchema.optional(),
  minGroupSize: z.coerce.number().int().min(1).optional(),
  maxGroupSize: z.coerce.number().int().min(1).optional(),
  status: listingStatusSchema.optional(),
});

const packageBodySchema = packageBodyBaseSchema.refine((value) => {
  if (value.minGroupSize === undefined || value.maxGroupSize === undefined) return true;
  return value.maxGroupSize >= value.minGroupSize;
}, {
  message: 'maxGroupSize must be greater than or equal to minGroupSize',
});

const createPackageSchema = packageBodySchema;
const updatePackageSchema = packageBodyBaseSchema.partial().refine((value) => {
  if (value.minGroupSize === undefined || value.maxGroupSize === undefined) return true;
  return value.maxGroupSize >= value.minGroupSize;
}, {
  message: 'maxGroupSize must be greater than or equal to minGroupSize',
});

const addDepartureDateSchema = z.object({
  departureDate: z.coerce.date(),
  returnDate: z.coerce.date(),
  departureTime: z.string().trim().min(1).optional(),
  status: bookingStatusSchema.optional(),
  adultPrice: moneySchema,
  childPrice: moneySchema.optional(),
  infantPrice: moneySchema.optional(),
  discountedAdultPrice: moneySchema.optional(),
  totalCapacity: z.coerce.number().int().min(1),
  availableCapacity: z.coerce.number().int().min(0),
}).refine((value) => value.departureDate <= value.returnDate, {
  message: 'departureDate must be before returnDate',
}).refine((value) => value.availableCapacity <= value.totalCapacity, {
  message: 'availableCapacity must be less than or equal to totalCapacity',
}).refine((value) => {
  if (value.discountedAdultPrice === undefined) return true;
  return value.discountedAdultPrice <= value.adultPrice;
}, {
  message: 'discountedAdultPrice must be less than or equal to adultPrice',
});

export {
  destinationListingParamsSchema,
  destinationTypeParamsSchema,
  createPackageSchema,
  updatePackageSchema,
  addDepartureDateSchema,
};
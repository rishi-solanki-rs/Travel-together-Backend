import { z } from 'zod';
import {
  objectIdSchema,
  moneySchema,
  dateSchema,
  mediaRoleSchema,
  listingStatusSchema,
} from '../../shared/validators/commonSchemas.js';

const roomTypeSchema = z.enum([
  'standard',
  'deluxe',
  'superior',
  'suite',
  'executive',
  'family',
  'connecting',
  'presidential',
  'villa',
  'cottage',
  'dormitory',
]);

const hotelListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

const hotelIdParamsSchema = z.object({
  hotelId: objectIdSchema,
});

const roomIdParamsSchema = z.object({
  roomId: objectIdSchema,
});

const hotelRoomPricingParamsSchema = z.object({
  hotelId: objectIdSchema,
  roomId: objectIdSchema,
});

const hotelProfileSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  propertyType: z.string().trim().min(2).max(100).optional(),
  basePrice: moneySchema.optional(),
  currency: z.string().trim().min(3).max(8).optional(),
  status: listingStatusSchema.optional(),
  images: z.array(z.object({
    publicId: z.string().trim().min(1),
    role: mediaRoleSchema.optional(),
    url: z.string().trim().min(1).optional(),
  })).optional(),
});

const roomBaseSchema = z.object({
  name: z.string().trim().min(2).max(140),
  roomType: roomTypeSchema,
  basePrice: moneySchema,
  maxOccupancy: z.coerce.number().int().min(1),
  amenities: z.array(z.string().trim().min(1).max(80)).optional(),
  bedConfiguration: z.array(z.string().trim().min(1).max(80)).optional(),
  images: z.array(z.string().trim().min(1)).optional(),
});

const createRoomSchema = roomBaseSchema;
const updateRoomSchema = roomBaseSchema.partial();

const pricingEntrySchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  price: moneySchema,
  inventory: z.coerce.number().int().min(0).optional(),
}).refine((value) => value.startDate <= value.endDate, {
  message: 'startDate must be before endDate',
});

const setPricingSchema = z.object({
  entries: z.array(pricingEntrySchema).min(1),
});

const blackoutRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  inventory: z.coerce.number().int().min(0).optional(),
  reason: z.string().trim().max(300).optional(),
}).refine((value) => value.startDate <= value.endDate, {
  message: 'startDate must be before endDate',
});

const setBlackoutSchema = z.object({
  ranges: z.array(blackoutRangeSchema).min(1),
});

export {
  hotelListingParamsSchema,
  hotelIdParamsSchema,
  roomIdParamsSchema,
  hotelRoomPricingParamsSchema,
  hotelProfileSchema,
  createRoomSchema,
  updateRoomSchema,
  setPricingSchema,
  setBlackoutSchema,
};
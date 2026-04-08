import { z } from 'zod';
import {
  LISTING_STATUS,
  SLOT_TYPES,
  SLOT_STATUS,
  SUBSCRIPTION_STATUS,
  CMS_SECTION_TYPES,
  MEDIA_ROLES,
  BOOKING_STATUS,
} from '../constants/index.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z.string().trim().regex(objectIdRegex, 'Invalid ObjectId');

const trimmedString = z.string().trim();

const enumFromObjectValues = (source) => z.enum(Object.values(source));

const moneySchema = z.number().finite().nonnegative();

const dateSchema = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return value;
}, z.date());

const dateRangeSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
}).refine((value) => {
  if (!value.startDate || !value.endDate) return true;
  return value.startDate <= value.endDate;
}, { message: 'startDate must be before endDate' });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

const slotScopeSchema = z.object({
  slotType: enumFromObjectValues(SLOT_TYPES),
  cityId: objectIdSchema.nullable().optional(),
  categoryId: objectIdSchema.nullable().optional(),
  subtypeId: objectIdSchema.nullable().optional(),
});

const listingStatusSchema = enumFromObjectValues(LISTING_STATUS);
const slotTypeSchema = enumFromObjectValues(SLOT_TYPES);
const slotStatusSchema = enumFromObjectValues(SLOT_STATUS);
const subscriptionStatusSchema = enumFromObjectValues(SUBSCRIPTION_STATUS);
const cmsSectionTypeSchema = enumFromObjectValues(CMS_SECTION_TYPES);
const mediaRoleSchema = enumFromObjectValues(MEDIA_ROLES);
const bookingStatusSchema = enumFromObjectValues(BOOKING_STATUS);

const billingCycleSchema = z.enum(['monthly', 'quarterly', 'halfYearly', 'annual']);

const mediaVariantSchema = z.object({
  publicId: trimmedString,
  url: trimmedString.url().optional().or(trimmedString),
  altText: trimmedString.max(200).optional().default(''),
  order: z.coerce.number().int().min(0).default(0),
  role: mediaRoleSchema.optional(),
});

export {
  objectIdRegex,
  objectIdSchema,
  trimmedString,
  moneySchema,
  dateSchema,
  dateRangeSchema,
  paginationSchema,
  slotScopeSchema,
  mediaVariantSchema,
  enumFromObjectValues,
  listingStatusSchema,
  slotTypeSchema,
  slotStatusSchema,
  subscriptionStatusSchema,
  cmsSectionTypeSchema,
  mediaRoleSchema,
  bookingStatusSchema,
  billingCycleSchema,
};
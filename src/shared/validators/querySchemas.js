import { z } from 'zod';
import { paginationSchema, objectIdSchema } from './commonSchemas.js';

const objectIdOrNull = z.union([objectIdSchema, z.literal(''), z.null()]).optional();

const listingQuerySchema = paginationSchema.extend({
  q: z.string().trim().optional(),
  category: objectIdOrNull,
  cityId: objectIdOrNull,
  subtypeId: objectIdOrNull,
  isFeatured: z.enum(['true', 'false']).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

const dateRangeQuerySchema = paginationSchema.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine((value) => {
  if (!value.startDate || !value.endDate) return true;
  return value.startDate <= value.endDate;
}, { message: 'startDate must be before endDate' });

export { listingQuerySchema, dateRangeQuerySchema };
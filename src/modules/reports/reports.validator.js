import { z } from 'zod';
import { dateRangeSchema } from '../../shared/validators/commonSchemas.js';

const reportsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine((value) => {
  if (!value.startDate || !value.endDate) return true;
  return value.startDate <= value.endDate;
}, { message: 'startDate must be before endDate' });

export { reportsQuerySchema };
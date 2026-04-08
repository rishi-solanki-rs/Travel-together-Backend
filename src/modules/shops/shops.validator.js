import { z } from 'zod';
import { objectIdSchema, moneySchema, listingStatusSchema } from '../../shared/validators/commonSchemas.js';

const catalogListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

const catalogParamsSchema = z.object({
  catalogId: objectIdSchema,
});

const productParamsSchema = z.object({
  id: objectIdSchema,
});

const catalogBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  status: listingStatusSchema.optional(),
  images: z.array(z.string().trim().min(1)).optional(),
});

const productBodyBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(3000).optional(),
  sku: z.string().trim().min(1).max(120).optional(),
  price: moneySchema,
  discountedPrice: moneySchema.optional(),
  stock: z.coerce.number().int().min(0).optional(),
  isUnlimited: z.coerce.boolean().optional(),
  images: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).optional(),
  isActive: z.coerce.boolean().optional(),
});

const productBodySchema = productBodyBaseSchema.refine((value) => {
  if (value.discountedPrice === undefined) return true;
  return value.discountedPrice <= value.price;
}, {
  message: 'discountedPrice must be less than or equal to price',
});

const productUpdateBodySchema = productBodyBaseSchema.partial().refine((value) => {
  if (value.discountedPrice === undefined || value.price === undefined) return true;
  return value.discountedPrice <= value.price;
}, {
  message: 'discountedPrice must be less than or equal to price',
});

const stockUpdateSchema = z.object({
  stock: z.coerce.number().int().min(0),
  isInStock: z.coerce.boolean().optional(),
});

export {
  catalogListingParamsSchema,
  catalogParamsSchema,
  productParamsSchema,
  catalogBodySchema,
  productBodySchema,
  productUpdateBodySchema,
  stockUpdateSchema,
};
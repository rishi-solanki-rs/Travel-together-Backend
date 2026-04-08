import { z } from 'zod';
import { objectIdSchema, moneySchema, mediaRoleSchema, listingStatusSchema } from '../../shared/validators/commonSchemas.js';

const serviceSessionSchema = z.enum(['breakfast', 'lunch', 'dinner', 'all_day']);

const restaurantListingParamsSchema = z.object({
  listingId: objectIdSchema,
});

const restaurantIdParamsSchema = z.object({
  restaurantId: objectIdSchema,
});

const menuCategoryParamsSchema = z.object({
  id: objectIdSchema,
});

const menuItemParamsSchema = z.object({
  id: objectIdSchema,
  categoryId: objectIdSchema.optional(),
});

const restaurantMenuCreateParamsSchema = z.object({
  restaurantId: objectIdSchema,
});

const restaurantMenuItemCreateParamsSchema = z.object({
  restaurantId: objectIdSchema,
  categoryId: objectIdSchema,
});

const restaurantProfileBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  cuisines: z.array(z.string().trim().min(1).max(80)).optional(),
  averageCost: moneySchema.optional(),
  serviceSessions: z.array(serviceSessionSchema).optional(),
  status: listingStatusSchema.optional(),
  images: z.array(z.object({
    publicId: z.string().trim().min(1),
    role: mediaRoleSchema.optional(),
  })).optional(),
});

const menuCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  order: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().optional(),
});

const menuItemBodyBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  price: moneySchema,
  discountedPrice: moneySchema.optional(),
  order: z.coerce.number().int().min(0).optional(),
  isVeg: z.coerce.boolean().optional(),
  isJain: z.coerce.boolean().optional(),
  isGlutenFree: z.coerce.boolean().optional(),
  isSpicy: z.coerce.boolean().optional(),
  spicyLevel: z.coerce.number().int().min(0).max(5).optional(),
  allergens: z.array(z.string().trim().min(1).max(80)).optional(),
  ingredients: z.array(z.string().trim().min(1).max(80)).optional(),
  availableSessions: z.array(serviceSessionSchema).optional(),
});

const menuItemBodySchema = menuItemBodyBaseSchema.refine((value) => {
  if (value.discountedPrice === undefined) return true;
  return value.discountedPrice <= value.price;
}, {
  message: 'discountedPrice must be less than or equal to price',
});

const menuItemUpdateBodySchema = menuItemBodyBaseSchema.partial().refine((value) => {
  if (value.discountedPrice === undefined || value.price === undefined) return true;
  return value.discountedPrice <= value.price;
}, {
  message: 'discountedPrice must be less than or equal to price',
});

export {
  restaurantListingParamsSchema,
  restaurantIdParamsSchema,
  menuCategoryParamsSchema,
  menuItemParamsSchema,
  restaurantMenuCreateParamsSchema,
  restaurantMenuItemCreateParamsSchema,
  restaurantProfileBodySchema,
  menuCategoryBodySchema,
  menuItemBodySchema,
  menuItemUpdateBodySchema,
};
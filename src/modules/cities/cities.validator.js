import { z } from 'zod';
import { objectIdSchema } from '../../shared/validators/commonSchemas.js';

const sectionAliasValues = [
  'banner',
  'cityBanner',
  'story',
  'introduction',
  'fraud',
  'attractions',
  'experiences',
  'gallery',
  'throughTheLenses',
  'faqs',
  'modules',
];

const mediaItemSchema = z.object({
  type: z.enum(['image', 'video', 'youtube', 'vimeo']).optional().default('image'),
  url: z.string().trim().min(1),
  seoMetadata: z.string().trim().optional(),
  publicId: z.string().trim().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

const bannerSectionSchema = z.object({
  cityName: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  tier: z.string().trim().optional(),
  stateId: objectIdSchema.optional(),
  countryId: objectIdSchema.optional(),
  continent: z.string().trim().optional(),
  famousFor: z.string().trim().optional(),
  popularName: z.string().trim().optional(),
  direction: z.string().trim().optional(),
  modules: z.record(z.any()).optional(),
  banners: z.array(mediaItemSchema).optional(),
});

const storySectionSchema = z.object({
  storyBlocks: z.array(
    z.object({
      year: z.union([z.string().trim().min(1), z.coerce.number().int()]).optional(),
      title: z.string().trim().min(1),
      content: z.string().trim().min(1),
      media: z.array(mediaItemSchema).optional(),
      order: z.coerce.number().int().min(0).optional(),
    })
  ).optional(),
});

const introductionSectionSchema = z.object({
  mainContent: z.string().trim().optional().default(''),
  extraDescriptions: z.array(z.string().trim()).optional(),
});

const fraudSectionSchema = z.object({
  fraudAlerts: z.array(z.string().trim()).optional(),
});

const attractionsSectionSchema = z.object({
  attractionIds: z.array(objectIdSchema).optional(),
  featuredAttractions: z.array(objectIdSchema).optional(),
});

const experiencesSectionSchema = z.object({
  experiences: z.array(
    z.object({
      title: z.string().trim().min(1),
      subtitle: z.string().trim().optional(),
      userName: z.string().trim().optional(),
      rating: z.coerce.number().min(0).max(5).optional(),
      media: z.array(mediaItemSchema).optional(),
      designation: z.string().trim().optional(),
      order: z.coerce.number().int().min(0).optional(),
    })
  ).optional(),
});

const gallerySectionSchema = z.object({
  featuredImages: z.array(mediaItemSchema).optional(),
  extraImages: z.array(mediaItemSchema).optional(),
  featuredVideo: mediaItemSchema.nullable().optional(),
  extraVideos: z.array(mediaItemSchema).optional(),
});

const faqSectionSchema = z.object({
  faqs: z.array(
    z.object({
      question: z.string().trim().min(1),
      answer: z.string().trim().min(1),
      order: z.coerce.number().int().min(0).optional(),
    })
  ).optional(),
});

const moduleBlockSchema = z.object({
  status: z.boolean().optional().default(false),
  title: z.string().trim().optional(),
  famousFor: z.string().trim().optional(),
  display: z.string().trim().optional(),
  bannerMedia: z.array(mediaItemSchema).optional(),
});

const modulesSectionSchema = z.object({
  hotels: moduleBlockSchema.optional(),
  tours: moduleBlockSchema.optional(),
  restaurants: moduleBlockSchema.optional(),
  shopping: moduleBlockSchema.optional(),
  shops: moduleBlockSchema.optional(),
});

const cityBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200).optional(),
  countryId: objectIdSchema.optional(),
  stateId: objectIdSchema.optional(),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().optional(),
  isFeatured: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
  geoLocation: z.record(z.any()).optional(),
});

const cityIdParamsSchema = z.object({
  id: objectIdSchema,
});

const citySlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

const cityIdentifierParamsSchema = z.object({
  identifier: z.string().trim().min(1),
});

const citySectionParamsSchema = z.object({
  id: objectIdSchema,
  section: z.enum(sectionAliasValues),
});

const citySectionBodySchema = z.union([
  bannerSectionSchema,
  storySectionSchema,
  introductionSectionSchema,
  fraudSectionSchema,
  attractionsSectionSchema,
  experiencesSectionSchema,
  gallerySectionSchema,
  faqSectionSchema,
  modulesSectionSchema,
]);

export {
  cityBodySchema,
  cityIdParamsSchema,
  citySlugParamsSchema,
  cityIdentifierParamsSchema,
  citySectionParamsSchema,
  citySectionBodySchema,
  sectionAliasValues,
  bannerSectionSchema,
  storySectionSchema,
  introductionSectionSchema,
  fraudSectionSchema,
  attractionsSectionSchema,
  experiencesSectionSchema,
  gallerySectionSchema,
  faqSectionSchema,
  modulesSectionSchema,
};
import mongoose from 'mongoose';

const seoConfigSchema = new mongoose.Schema(
  {
    pageType: { type: String, required: true },
    slug: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityType: { type: String },

    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    canonicalUrl: String,

    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    ogType: { type: String, default: 'website' },

    twitterCard: { type: String, default: 'summary_large_image' },
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,

    structuredData: String,
    robotsMeta: { type: String, default: 'index,follow' },
    hreflangTags: [{ lang: String, href: String }],

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

seoConfigSchema.index({ slug: 1 });
seoConfigSchema.index({ entityId: 1, entityType: 1 });
seoConfigSchema.index({ pageType: 1 });

export default mongoose.model('SEOConfig', seoConfigSchema);

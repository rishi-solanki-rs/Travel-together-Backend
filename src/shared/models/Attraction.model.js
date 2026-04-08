import mongoose from 'mongoose';

const attractionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    category: {
      type: String,
      enum: ['temple', 'heritage', 'museum', 'nature', 'experience'],
      default: 'experience',
    },
    summary: String,
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
    media: [
      {
        publicId: String,
        url: String,
        type: { type: String, enum: ['image', 'video'], default: 'image' },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'unpublished'],
      default: 'draft',
    },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attractionSchema.index({ slug: 1 }, { unique: true });
attractionSchema.index({ category: 1, status: 1, isDeleted: 1 });
attractionSchema.index({ cityId: 1, category: 1, isDeleted: 1 });

export default mongoose.model('Attraction', attractionSchema);

import mongoose from 'mongoose';

const tourItinerarySchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    title: { type: String, required: true },
    duration: {
      days: { type: Number, default: 1 },
      nights: { type: Number, default: 0 },
      hours: Number,
    },

    tourType: {
      type: String,
      enum: ['same_day', 'customized', 'fixed_departure', 'private', 'group'],
      required: true,
    },

    overview: String,
    highlights: [String],

    days: [{
      dayNumber: Number,
      title: String,
      description: String,
      meals: [{ type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'] }],
      activities: [String],
      accommodation: String,
      pickupPoints: [{ name: String, time: String, address: String }],
      images: [{ publicId: String, url: String, altText: String }],
    }],

    inclusions: [String],
    exclusions: [String],
    importantNotes: [String],

    transport: {
      type: { type: String, enum: ['private_car', 'shared_bus', 'train', 'flight', 'self', 'mixed', 'none'] },
      details: String,
      acAvailable: Boolean,
    },

    guideInfo: {
      included: Boolean,
      languages: [String],
      certified: Boolean,
    },

    groupSize: {
      min: Number,
      max: Number,
      isPrivateAvailable: Boolean,
    },

    routeMap: { publicId: String, url: String },
    difficulty: { type: String, enum: ['easy', 'moderate', 'difficult', 'extreme'] },
    physicalFitness: String,
    ageRestriction: { minAge: Number, maxAge: Number },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tourItinerarySchema.index({ listingId: 1 });
tourItinerarySchema.index({ vendorId: 1 });

export default mongoose.model('TourItinerary', tourItinerarySchema);

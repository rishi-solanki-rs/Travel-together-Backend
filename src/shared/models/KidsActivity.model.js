import mongoose from 'mongoose';

const kidsActivitySchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true, unique: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    activityType: {
      type: String,
      enum: ['workshop', 'camp', 'educational', 'sports', 'arts_crafts', 'music', 'dance', 'science', 'cooking', 'outdoor', 'indoor', 'other'],
    },

    ageGroups: [{
      label: String,
      minAge: Number,
      maxAge: Number,
      price: Number,
    }],

    duration: { hours: Number, days: Number },

    sessions: [{
      sessionDate: Date,
      startTime: String,
      endTime: String,
      seatsTotal: Number,
      seatsAvailable: Number,
      status: { type: String, enum: ['open', 'full', 'confirmed', 'cancelled', 'completed'], default: 'open' },
    }],

    instructors: [{
      name: String,
      qualification: String,
      experience: String,
      photo: { publicId: String, url: String },
    }],

    safetyMeasures: [String],
    parentGuidelines: [String],
    healthRequirements: [String],
    whatToWear: String,
    whatToBring: [String],

    indoorOutdoor: { type: String, enum: ['indoor', 'outdoor', 'both'] },
    facilityFeatures: [String],
    maxGroupSize: Number,
    minGroupSize: Number,

    pricing: {
      perSession: Number,
      perDay: Number,
      fullCamp: Number,
      currency: { type: String, default: 'INR' },
      earlyBirdDiscount: Number,
      siblingDiscount: Number,
    },

    certificationOffered: Boolean,
    certificateDescription: String,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

kidsActivitySchema.index({ listingId: 1 });
kidsActivitySchema.index({ vendorId: 1 });
kidsActivitySchema.index({ activityType: 1 });

export default mongoose.model('KidsActivity', kidsActivitySchema);

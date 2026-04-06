import mongoose from 'mongoose';

const tribeExperienceSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true, unique: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    experienceType: {
      type: String,
      enum: ['workshop', 'local_stay', 'cultural_tour', 'festival', 'storytelling', 'cooking_class', 'craft_session', 'tribal_walk', 'heritage_session', 'other'],
    },

    tribe: { name: String, region: String, language: String, about: String },
    host: { name: String, bio: String, photo: { publicId: String, url: String } },

    duration: { hours: Number, days: Number, nights: Number },

    schedule: [{
      eventDate: Date,
      startTime: String,
      endTime: String,
      status: { type: String, enum: ['scheduled', 'confirmed', 'cancelled', 'completed'], default: 'scheduled' },
      seatsAvailable: Number,
      seatsTotal: Number,
    }],

    maxParticipants: Number,
    minParticipants: Number,
    ageRequirement: { minAge: Number, maxAge: Number },

    pricing: {
      adultPrice: Number,
      childPrice: Number,
      groupPrice: Number,
      currency: { type: String, default: 'INR' },
    },

    artisanProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductItem' }],
    inclusions: [String],
    exclusions: [String],
    whatToBring: [String],
    languages: [String],
    difficulty: { type: String, enum: ['easy', 'moderate', 'challenging'] },
    isOutdoor: Boolean,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tribeExperienceSchema.index({ listingId: 1 });
tribeExperienceSchema.index({ vendorId: 1 });
tribeExperienceSchema.index({ experienceType: 1 });

export default mongoose.model('TribeExperience', tribeExperienceSchema);

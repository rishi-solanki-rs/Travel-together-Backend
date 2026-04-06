import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true, unique: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    starRating: { type: Number, min: 1, max: 5 },
    propertyType: {
      type: String,
      enum: ['hotel', 'resort', 'boutique_hotel', 'heritage_hotel', 'homestay', 'villa', 'hostel', 'camp', 'other'],
    },

    checkInTime: { type: String, default: '14:00' },
    checkOutTime: { type: String, default: '11:00' },
    totalRooms: Number,
    totalFloors: Number,
    yearBuilt: Number,

    amenities: [{ key: String, label: String, icon: String, category: String }],

    mealPlans: [{
      type: { type: String, enum: ['EP', 'CP', 'MAP', 'AP', 'MAPI'] },
      name: String,
      description: String,
      additionalCharge: Number,
      isDefault: Boolean,
    }],

    cancellationPolicy: {
      type: { type: String, enum: ['free', 'partial', 'non_refundable', 'custom'] },
      description: String,
      freeCancellationHours: Number,
      penaltyPercentage: Number,
    },

    petPolicy: { allowed: Boolean, description: String },
    smokingPolicy: { type: String, enum: ['allowed', 'not_allowed', 'designated_areas'] },
    childPolicy: {
      allowed: Boolean,
      maxChildAge: Number,
      extraBedAvailable: Boolean,
      extraBedCharge: Number,
    },

    taxes: [{
      name: String,
      type: { type: String, enum: ['percentage', 'fixed'] },
      value: Number,
      applicableOn: String,
    }],

    nearbyPlaces: [{ name: String, distance: String, type: String }],
    languages: [String],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

hotelSchema.index({ listingId: 1 });
hotelSchema.index({ vendorId: 1 });
hotelSchema.index({ starRating: 1 });

export default mongoose.model('Hotel', hotelSchema);

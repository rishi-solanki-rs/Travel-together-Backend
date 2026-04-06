import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true, unique: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    cuisines: [String],
    mealTypes: [{ type: String, enum: ['breakfast', 'brunch', 'lunch', 'dinner', 'all_day', 'late_night'] }],
    diningOptions: [{ type: String, enum: ['dine_in', 'takeaway', 'delivery', 'catering'] }],
    priceRange: { type: String, enum: ['budget', 'moderate', 'expensive', 'luxury'] },
    avgCostForTwo: Number,

    seatingCapacity: Number,
    indoorSeats: Number,
    outdoorSeats: Number,
    privateRoomAvailable: Boolean,
    privateRoomCapacity: Number,

    tableReservation: {
      available: { type: Boolean, default: false },
      advanceBookingDays: Number,
      minPartySize: Number,
      maxPartySize: Number,
    },

    amenities: [{ key: String, label: String }],
    features: [{ key: String, label: String }],

    timings: [{
      day: String,
      isOpen: Boolean,
      sessions: [{ name: String, openTime: String, closeTime: String }],
    }],

    happyHours: [{
      days: [String],
      startTime: String,
      endTime: String,
      description: String,
    }],

    chefSpecials: [String],
    awards: [{ name: String, year: Number, organization: String }],

    isVeg: Boolean,
    isJain: Boolean,
    isHalal: Boolean,
    alcoholServed: Boolean,
    shishaAvailable: Boolean,
    liveMusic: Boolean,
    parkingAvailable: Boolean,
    wheelchairAccessible: Boolean,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

restaurantSchema.index({ listingId: 1 });
restaurantSchema.index({ vendorId: 1 });
restaurantSchema.index({ cuisines: 1 });

export default mongoose.model('Restaurant', restaurantSchema);

import mongoose from 'mongoose';

const destinationPackageSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true, unique: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    packageType: {
      type: String,
      enum: ['honeymoon', 'family', 'luxury', 'budget', 'adventure', 'pilgrimage', 'corporate', 'solo', 'group', 'weekend', 'custom'],
    },

    duration: { days: Number, nights: Number },

    destinations: [{
      city: String,
      state: String,
      daysSpent: Number,
      order: Number,
      highlights: [String],
    }],

    routeMap: { publicId: String, url: String, altText: String },

    hotelCombos: [{
      cityName: String,
      hotelListingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase' },
      hotelName: String,
      starRating: Number,
      roomType: String,
      nights: Number,
    }],

    itinerary: [{
      dayNumber: Number,
      title: String,
      description: String,
      city: String,
      meals: [{ type: String, enum: ['breakfast', 'lunch', 'dinner'] }],
      activities: [String],
      accommodation: String,
      image: { publicId: String, url: String },
    }],

    transportation: {
      modes: [{ type: String, enum: ['flight', 'train', 'bus', 'private_car', 'cruise', 'ferry'] }],
      details: String,
      flightIncluded: Boolean,
      transfersIncluded: Boolean,
    },

    pricing: {
      perPersonDouble: Number,
      perPersonSingle: Number,
      perPersonTriple: Number,
      childWithBed: Number,
      childWithoutBed: Number,
      infantPrice: Number,
      currency: { type: String, default: 'INR' },
      tcsApplicable: Boolean,
    },

    groupSize: { min: Number, max: Number },

    addOns: [{
      name: String,
      description: String,
      price: Number,
      isOptional: Boolean,
    }],

    inclusions: [String],
    exclusions: [String],
    importantNotes: [String],
    visaInfo: String,
    travelInsurance: { available: Boolean, price: Number },

    departureDates: [{
      date: Date,
      seatsAvailable: Number,
      status: { type: String, enum: ['open', 'limited', 'full', 'closed'] },
    }],

    isCustomizable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

destinationPackageSchema.index({ vendorId: 1 });
destinationPackageSchema.index({ packageType: 1 });
destinationPackageSchema.index({ 'pricing.perPersonDouble': 1 });

export default mongoose.model('DestinationPackage', destinationPackageSchema);

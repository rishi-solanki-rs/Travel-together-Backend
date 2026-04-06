import mongoose from 'mongoose';

const tourDepartureSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
    itineraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourItinerary', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    departureDate: { type: Date, required: true },
    returnDate: Date,
    departureTime: String,

    pricing: {
      adultPrice: Number,
      childPrice: Number,
      infantPrice: Number,
      currency: { type: String, default: 'INR' },
      discountedAdultPrice: Number,
    },

    seats: {
      total: { type: Number, required: true },
      available: { type: Number, required: true },
      booked: { type: Number, default: 0 },
    },

    pickupPoint: { name: String, time: String, address: String },
    meetingPoint: { name: String, address: String },

    status: { type: String, enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'full'], default: 'scheduled' },
    cancellationReason: String,
    isActive: { type: Boolean, default: true },
    guide: { name: String, phone: String },
    notes: String,
  },
  { timestamps: true }
);

tourDepartureSchema.index({ listingId: 1, departureDate: 1 });
tourDepartureSchema.index({ itineraryId: 1 });
tourDepartureSchema.index({ departureDate: 1, status: 1 });

export default mongoose.model('TourDeparture', tourDepartureSchema);

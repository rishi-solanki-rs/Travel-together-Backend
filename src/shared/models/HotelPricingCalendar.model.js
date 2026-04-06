import mongoose from 'mongoose';

const hotelPricingCalendarSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelRoom', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    date: { type: Date, required: true },
    dayOfWeek: { type: Number, min: 0, max: 6 },

    basePrice: { type: Number, required: true },
    discountedPrice: Number,
    currency: { type: String, default: 'INR' },

    availability: { type: Number, default: 0 },
    isBlackout: { type: Boolean, default: false },
    blackoutReason: String,

    minimumStay: { type: Number, default: 1 },
    maximumStay: Number,

    seasonTag: { type: String, enum: ['peak', 'off_peak', 'shoulder', 'festival', 'weekend', 'regular'] },
    priceRuleId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

hotelPricingCalendarSchema.index({ roomId: 1, date: 1 }, { unique: true });
hotelPricingCalendarSchema.index({ hotelId: 1, date: 1 });
hotelPricingCalendarSchema.index({ date: 1, isBlackout: 1 });

export default mongoose.model('HotelPricingCalendar', hotelPricingCalendarSchema);

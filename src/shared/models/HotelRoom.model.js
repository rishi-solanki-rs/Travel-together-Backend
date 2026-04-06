import mongoose from 'mongoose';

const hotelRoomSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },

    name: { type: String, required: true },
    code: String,
    roomType: {
      type: String,
      enum: ['standard', 'deluxe', 'superior', 'suite', 'executive', 'family', 'connecting', 'presidential', 'villa', 'cottage', 'dormitory'],
    },
    description: String,
    area: Number,
    areaUnit: { type: String, default: 'sqft' },
    maxOccupancy: Number,
    maxAdults: Number,
    maxChildren: Number,

    bedConfiguration: [{
      type: { type: String, enum: ['single', 'double', 'queen', 'king', 'twin', 'sofa_bed', 'bunk'] },
      count: Number,
    }],

    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    extraPersonCharge: Number,
    extraChildCharge: Number,

    amenities: [{ key: String, label: String, icon: String }],

    images: [{ publicId: String, url: String, altText: String, order: Number }],

    totalInventory: { type: Number, default: 1 },
    availableInventory: { type: Number, default: 1 },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },

    view: { type: String, enum: ['sea', 'pool', 'garden', 'city', 'mountain', 'courtyard', 'none'] },
    floor: String,
  },
  { timestamps: true }
);

hotelRoomSchema.index({ hotelId: 1, isActive: 1 });
hotelRoomSchema.index({ listingId: 1 });
hotelRoomSchema.index({ basePrice: 1 });

export default mongoose.model('HotelRoom', hotelRoomSchema);

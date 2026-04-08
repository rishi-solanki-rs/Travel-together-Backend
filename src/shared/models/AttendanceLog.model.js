import mongoose from 'mongoose';

const attendanceLogSchema = new mongoose.Schema({
  sessionBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SessionBooking', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  childProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChildProfile', required: true },
  checkInAt: { type: Date, default: null },
  checkOutAt: { type: Date, default: null },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  notes: { type: String, default: null },
}, { timestamps: true });

attendanceLogSchema.index({ listingId: 1, sessionId: 1, createdAt: -1 });

export default mongoose.model('AttendanceLog', attendanceLogSchema);

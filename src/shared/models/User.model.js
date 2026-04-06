import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../../shared/constants/index.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, sparse: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.USER },
    avatar: { type: String, default: null },
    avatarPublicId: { type: String, default: null },

    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    emailVerificationOtp: { type: String, select: false },
    emailVerificationOtpExpiry: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    refreshToken: { type: String, select: false },

    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    permissions: [{ type: String }],

    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    profile: {
      bio: { type: String, maxlength: 500 },
      location: { type: String },
      website: { type: String },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    },

    preferences: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'INR' },
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },

    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_, ret) => { delete ret.password; delete ret.__v; return ret; } },
    toObject: { virtuals: true },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1, sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ vendorId: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.virtual('displayName').get(function () {
  return this.name || this.email;
});

userSchema.statics.findActiveById = function (id) {
  return this.findOne({ _id: id, isActive: true, isDeleted: false });
};

export default mongoose.model('User', userSchema);

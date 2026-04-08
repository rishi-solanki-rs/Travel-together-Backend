import User from '../../shared/models/User.model.js';
import ApiError from '../../utils/ApiError.js';

const findByEmail = (email) => User.findOne({ email, isDeleted: false }).select('+password +refreshToken +refreshTokenHash +refreshTokenFamilyId +refreshTokenVersion');
const findById = (id) => User.findOne({ _id: id, isDeleted: false });
const findByIdWithPassword = (id) => User.findOne({ _id: id, isDeleted: false }).select('+password');

const create = (data) => User.create(data);

const update = (id, data) => User.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true, runValidators: true });

const setRefreshToken = (id, token) => User.findByIdAndUpdate(id, { refreshToken: token, lastLoginAt: new Date(), $inc: { loginCount: 1 } });

const setRefreshTokenState = (id, tokenState) => User.findByIdAndUpdate(id, {
  refreshToken: tokenState.refreshToken,
  refreshTokenHash: tokenState.refreshTokenHash,
  refreshTokenFamilyId: tokenState.refreshTokenFamilyId,
  refreshTokenVersion: tokenState.refreshTokenVersion,
  lastLoginAt: new Date(),
  $inc: { loginCount: 1 },
});

const clearRefreshToken = (id) => User.findByIdAndUpdate(id, { $unset: { refreshToken: 1 } });

const clearRefreshTokenState = (id) => User.findByIdAndUpdate(id, { $unset: { refreshToken: 1, refreshTokenHash: 1, refreshTokenFamilyId: 1, refreshTokenVersion: 1 } });

const setResetToken = (id, token, expiry) => User.findByIdAndUpdate(id, { passwordResetToken: token, passwordResetExpiry: expiry });

const setResetTokenState = (id, tokenState, expiry) => User.findByIdAndUpdate(id, {
  passwordResetToken: tokenState.passwordResetToken,
  passwordResetTokenHash: tokenState.passwordResetTokenHash,
  passwordResetNonceHash: tokenState.passwordResetNonceHash,
  passwordResetExpiry: expiry,
});

const setEmailOtp = (id, otp, expiry) => User.findByIdAndUpdate(id, { emailVerificationOtp: otp, emailVerificationOtpExpiry: expiry });

const verifyEmail = (id) => User.findByIdAndUpdate(id, { isEmailVerified: true, $unset: { emailVerificationOtp: 1, emailVerificationOtpExpiry: 1 } }, { new: true });

const findByResetToken = (token) => User.findOne({ passwordResetToken: token, passwordResetExpiry: { $gt: Date.now() } }).select('+passwordResetToken +passwordResetExpiry');

const findByResetTokenHash = (tokenHash) => User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiry: { $gt: Date.now() } }).select('+passwordResetTokenHash +passwordResetExpiry');

const resetPassword = (id, hashedPassword) =>
  User.findByIdAndUpdate(id, { password: hashedPassword, $unset: { passwordResetToken: 1, passwordResetTokenHash: 1, passwordResetNonceHash: 1, passwordResetExpiry: 1 } }, { new: true });

const setTemporaryElevation = (id, until) => User.findByIdAndUpdate(id, { temporaryElevationUntil: until }, { new: true });

const incrementFailedAttempts = (id) => User.findByIdAndUpdate(id, { $inc: { failedLoginAttempts: 1 } });

const lockAccount = (id, until) => User.findByIdAndUpdate(id, { lockUntil: until });

const resetFailedAttempts = (id) => User.findByIdAndUpdate(id, { failedLoginAttempts: 0, $unset: { lockUntil: 1 } });

export default {
  findByEmail, findById, findByIdWithPassword, create, update,
  setRefreshToken, setRefreshTokenState, clearRefreshToken, clearRefreshTokenState, setResetToken, setResetTokenState, setEmailOtp,
  verifyEmail, findByResetToken, findByResetTokenHash, resetPassword,
  incrementFailedAttempts, lockAccount, resetFailedAttempts, setTemporaryElevation,
};

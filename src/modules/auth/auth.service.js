import authRepo from './auth.repository.js';
import ApiError from '../../utils/ApiError.js';
import { generateTokenPair, verifyRefreshToken, signPasswordResetToken, verifyPasswordResetToken } from '../../utils/tokenHelper.js';
import { sendEmail, emailTemplates } from '../../utils/emailHelper.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../../shared/models/User.model.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const register = async (data) => {
  const existing = await authRepo.findByEmail(data.email);
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await authRepo.create(data);

  const otp = generateOtp();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  await authRepo.setEmailOtp(user._id, otp, expiry);

  const { subject, html } = emailTemplates.verifyEmail(user.name, otp);
  await sendEmail({ to: user.email, subject, html }).catch(() => {});

  const tokens = generateTokenPair({ id: user._id, role: user.role, email: user.email });
  await authRepo.setRefreshToken(user._id, tokens.refreshToken);

  return { user, tokens };
};

const login = async ({ email, password: candidatePassword }) => {
  const user = await authRepo.findByEmail(email);
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive || user.isDeleted) throw ApiError.forbidden('Account is inactive or deleted');

  if (user.isLocked()) {
    const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.unauthorized(`Account temporarily locked. Try again in ${remaining} minutes.`);
  }

  const isValid = await user.comparePassword(candidatePassword);
  if (!isValid) {
    await authRepo.incrementFailedAttempts(user._id);
    if (user.failedLoginAttempts + 1 >= MAX_FAILED_ATTEMPTS) {
      await authRepo.lockAccount(user._id, new Date(Date.now() + LOCK_DURATION_MS));
      throw ApiError.unauthorized('Too many failed attempts. Account locked for 30 minutes.');
    }
    throw ApiError.unauthorized('Invalid email or password');
  }

  await authRepo.resetFailedAttempts(user._id);
  const tokens = generateTokenPair({ id: user._id, role: user.role, email: user.email, vendorId: user.vendorId?.toString() });
  await authRepo.setRefreshToken(user._id, tokens.refreshToken);

  return { user, tokens };
};

const refreshTokens = async (token) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await authRepo.findById(decoded.id);
  if (!user || !user.isActive) throw ApiError.unauthorized('User not found or inactive');

  const storedToken = await User.findById(decoded.id).select('+refreshToken');
  if (!storedToken?.refreshToken || storedToken.refreshToken !== token) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  const tokens = generateTokenPair({ id: user._id, role: user.role, email: user.email, vendorId: user.vendorId?.toString() });
  await authRepo.setRefreshToken(user._id, tokens.refreshToken);

  return { tokens };
};

const logout = async (userId) => {
  await authRepo.clearRefreshToken(userId);
};

const forgotPassword = async (email) => {
  const user = await authRepo.findByEmail(email);
  if (!user) return;

  const resetToken = signPasswordResetToken({ id: user._id });
  const expiry = new Date(Date.now() + 60 * 60 * 1000);
  const { passwordResetToken: hashedToken } = await User.findById(user._id);

  await authRepo.setResetToken(user._id, resetToken, expiry);

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const { subject, html } = emailTemplates.passwordReset(user.name, resetUrl);
  await sendEmail({ to: user.email, subject, html }).catch(() => {});
};

const resetPassword = async ({ token, password }) => {
  let decoded;
  try {
    decoded = verifyPasswordResetToken(token);
  } catch {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const user = await authRepo.findByResetToken(token);
  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  const hashedPassword = await bcrypt.hash(password, 12);
  await authRepo.resetPassword(user._id, hashedPassword);
};

const verifyEmail = async (userId, otp) => {
  const user = await User.findById(userId).select('+emailVerificationOtp +emailVerificationOtpExpiry');
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) throw ApiError.badRequest('Email already verified');
  if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) throw ApiError.badRequest('Invalid OTP');
  if (user.emailVerificationOtpExpiry < new Date()) throw ApiError.badRequest('OTP has expired. Please request a new one.');
  await authRepo.verifyEmail(userId);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await authRepo.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound('User not found');
  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect');
  const hashed = await bcrypt.hash(newPassword, 12);
  await authRepo.resetPassword(userId, hashed);
};

export { register, login, refreshTokens, logout, forgotPassword, resetPassword, verifyEmail, changePassword };

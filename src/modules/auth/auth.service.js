import authRepo from './auth.repository.js';
import ApiError from '../../utils/ApiError.js';
import { generateTokenPair, verifyRefreshToken, signPasswordResetToken, verifyPasswordResetToken } from '../../utils/tokenHelper.js';
import { sendEmail, emailTemplates } from '../../utils/emailHelper.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../../shared/models/User.model.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import {
  createAuthSession,
  detectRefreshReplay,
  rotateSessionRefresh,
  revokeSessionByDevice,
  emergencyRevokeAll,
  detectSessionAnomaly,
  hashToken,
  verifyStepUp,
  consumePasswordResetNonce,
  generateSessionId,
  isTokenRevoked,
} from '../../operations/security/zeroTrustAuth.service.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const buildRefreshTokenPayload = (user, refreshTokenVersion, sessionId) => ({
  id: user._id,
  role: user.role,
  email: user.email,
  vendorId: user.vendorId?.toString(),
  cityId: user.cityId?.toString(),
  tokenVersion: refreshTokenVersion,
  sessionId,
  tokenId: crypto.randomUUID(),
});

const buildRefreshTokenState = (user, refreshToken, refreshTokenVersion) => ({
  refreshToken,
  refreshTokenHash: hashToken(refreshToken),
  refreshTokenFamilyId: user.refreshTokenFamilyId || crypto.randomUUID(),
  refreshTokenVersion,
});

const register = async (data, req) => {
  return withTransaction(async () => {
    const existing = await authRepo.findByEmail(data.email);
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const user = await authRepo.create(data);

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await authRepo.setEmailOtp(user._id, otp, expiry);

    const { subject, html } = emailTemplates.verifyEmail(user.name, otp);
    await sendEmail({ to: user.email, subject, html }).catch(() => { });

    const refreshTokenVersion = 1;
    const sessionId = generateSessionId();
    const tokens = generateTokenPair(buildRefreshTokenPayload(user, refreshTokenVersion, sessionId));
    await authRepo.setRefreshTokenState(user._id, buildRefreshTokenState(user, tokens.refreshToken, refreshTokenVersion));
    await createAuthSession({
      user,
      refreshToken: tokens.refreshToken,
      refreshTokenVersion,
      req,
      sessionFamilyId: user.refreshTokenFamilyId || crypto.randomUUID(),
      sessionId,
    });

    return { user, tokens };
  });
};

const login = async ({ email, password: candidatePassword }, req) => {
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
  const refreshTokenVersion = Number(user.refreshTokenVersion || 0) + 1;
  const sessionId = generateSessionId();
  const tokens = generateTokenPair(buildRefreshTokenPayload(user, refreshTokenVersion, sessionId));
  await authRepo.setRefreshTokenState(user._id, buildRefreshTokenState(user, tokens.refreshToken, refreshTokenVersion));
  await createAuthSession({ user, refreshToken: tokens.refreshToken, refreshTokenVersion, req, sessionFamilyId: user.refreshTokenFamilyId || crypto.randomUUID(), sessionId });

  return { user, tokens };
};

const refreshTokens = async (token, req) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await authRepo.findById(decoded.id);
  if (!user || !user.isActive) throw ApiError.unauthorized('User not found or inactive');

  const storedToken = await User.findById(decoded.id).select('+refreshToken +refreshTokenHash +refreshTokenVersion +refreshTokenFamilyId');
  if (!storedToken) throw ApiError.unauthorized('Refresh token has been revoked');

  const versionMatch = typeof decoded.tokenVersion === 'number'
    ? storedToken.refreshTokenVersion === decoded.tokenVersion
    : true;

  const revoked = await isTokenRevoked({
    tokenType: 'refresh',
    tokenId: decoded.tokenId || null,
    tokenHash: hashToken(token),
    userId: decoded.id,
    sessionId: decoded.sessionId || null,
  });

  if (revoked || !versionMatch) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  const replayState = await detectRefreshReplay({
    userId: decoded.id,
    sessionId: decoded.sessionId,
    incomingRefreshTokenHash: hashToken(token),
    req,
  });

  if (replayState.replay) {
    throw ApiError.unauthorized('Refresh token replay detected. All sessions revoked.');
  }

  const refreshTokenVersion = Number(storedToken.refreshTokenVersion || 0) + 1;
  const tokens = generateTokenPair(buildRefreshTokenPayload(user, refreshTokenVersion, decoded.sessionId));
  await authRepo.setRefreshTokenState(user._id, buildRefreshTokenState(storedToken, tokens.refreshToken, refreshTokenVersion));
  await rotateSessionRefresh({
    userId: user._id,
    sessionId: decoded.sessionId,
    nextRefreshToken: tokens.refreshToken,
    nextVersion: refreshTokenVersion,
    req,
  });
  await detectSessionAnomaly({ userId: user._id, session: replayState.session, req });

  return { tokens };
};

const logout = async (userId) => {
  await authRepo.clearRefreshTokenState(userId);
};

const logoutDevice = async ({ userId, deviceId }) => {
  if (!deviceId) throw ApiError.badRequest('deviceId is required');
  return revokeSessionByDevice({ userId, deviceId, reason: 'forced_logout_device' });
};

const revokeAllSessions = async ({ userId, actorId }) => {
  return emergencyRevokeAll({ userId, actorId, reason: 'admin_emergency_revoke_all' });
};

const forgotPassword = async (email) => {
  const user = await authRepo.findByEmail(email);
  if (!user) return;

  const nonce = crypto.randomUUID();
  const resetToken = signPasswordResetToken({ id: user._id, nonce });
  const expiry = new Date(Date.now() + 60 * 60 * 1000);
  await authRepo.setResetTokenState(user._id, {
    passwordResetToken: resetToken,
    passwordResetTokenHash: hashToken(resetToken),
    passwordResetNonceHash: hashToken(nonce),
  }, expiry);

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const { subject, html } = emailTemplates.passwordReset(user.name, resetUrl);
  await sendEmail({ to: user.email, subject, html }).catch(() => { });
};

const resetPassword = async ({ token, password }) => {
  let decoded;
  try {
    decoded = verifyPasswordResetToken(token);
  } catch {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const tokenHash = hashToken(token);
  const user = (await authRepo.findByResetTokenHash(tokenHash)) || (await authRepo.findByResetToken(token));
  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  const consumed = await consumePasswordResetNonce({ userId: decoded.id, nonce: decoded.nonce || '' });
  if (!consumed) throw ApiError.badRequest('Password reset nonce already used or invalid');

  const hashedPassword = await bcrypt.hash(password, 12);
  await authRepo.resetPassword(user._id, hashedPassword);
};

const verifyEmail = async (email, otp) => {
  const user = await User.findOne({ email }).select('+emailVerificationOtp +emailVerificationOtpExpiry');

  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) throw ApiError.badRequest('Email already verified');
  if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) throw ApiError.badRequest('Invalid OTP');
  if (user.emailVerificationOtpExpiry < new Date()) throw ApiError.badRequest('OTP has expired. Please request a new one.');
  await authRepo.verifyEmail(user._id);
};

const resendOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) throw ApiError.badRequest('Email already verified');

  const otp = generateOtp();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  await authRepo.setEmailOtp(user._id, otp, expiry);

  const { subject, html } = emailTemplates.verifyEmail(user.name, otp);
  await sendEmail({ to: user.email, subject, html }).catch(() => {});
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await authRepo.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound('User not found');
  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect');
  const hashed = await bcrypt.hash(newPassword, 12);
  await authRepo.resetPassword(userId, hashed);
};

const performStepUp = async ({ userId, sessionId, password }) => {
  const user = await authRepo.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound('User not found');
  const isValid = await user.comparePassword(password);
  const ok = await verifyStepUp({ userId, sessionId, passwordValid: isValid });
  if (!ok) throw ApiError.unauthorized('Step-up authentication failed');

  const elevationUntil = new Date(Date.now() + Number(process.env.STEP_UP_MAX_AGE_MS || 10 * 60 * 1000));
  await authRepo.setTemporaryElevation(userId, elevationUntil);
  return { elevationUntil };
};

export {
  register,
  login,
  refreshTokens,
  logout,
  logoutDevice,
  revokeAllSessions,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendOtp,
  changePassword,
  performStepUp,
};

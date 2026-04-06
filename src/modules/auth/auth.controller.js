import * as authService from './auth.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import User from '../../shared/models/User.model.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user or vendor
 */
const register = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.register(req.body);
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  ApiResponse.created(res, 'Registration successful. Please check your email to verify your account.', {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken: tokens.accessToken,
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 */
const login = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.login(req.body);
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  ApiResponse.success(res, 'Login successful', {
    user: { id: user._id, name: user.name, email: user.email, role: user.role, vendorId: user.vendorId },
    accessToken: tokens.accessToken,
  });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  const { tokens } = await authService.refreshTokens(token);
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  ApiResponse.success(res, 'Token refreshed', { accessToken: tokens.accessToken });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate refresh token
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie('refreshToken');
  ApiResponse.success(res, 'Logged out successfully');
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send password reset email
 */
const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  ApiResponse.success(res, 'If an account exists with this email, a reset link has been sent.');
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 */
const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  ApiResponse.success(res, 'Password reset successful. Please login with your new password.');
});

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with OTP
 */
const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.email, req.body.otp);
  ApiResponse.success(res, 'Email verified successfully');
});

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP for email verification
 */
const resendOtp = asyncHandler(async (req, res) => {
  await authService.resendOtp(req.body.email);
  ApiResponse.success(res, 'A new OTP has been sent to your email.');
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (authenticated)
 */
const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  ApiResponse.success(res, 'Password changed successfully');
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 */
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('vendorId', 'businessName slug currentPlan');
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.success(res, 'Profile fetched', user);
});


export { register, login, refresh, logout, forgotPassword, resetPassword, verifyEmail,resendOtp, changePassword, me };



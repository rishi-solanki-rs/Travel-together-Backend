import express from 'express';
import * as authController from './auth.controller.js';
import { validateBody } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authLimiter } from '../../config/rateLimiter.js';
import {
  registerSchema, loginSchema, refreshTokenSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, verifyOtpSchema, resendOtpSchema,
  logoutDeviceSchema, revokeAllSchema, stepUpSchema
} from './auth.validator.js';

const router = express.Router();

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-device', authenticate, validateBody(logoutDeviceSchema), authController.logoutDevice);
router.post('/revoke-all', authenticate, validateBody(revokeAllSchema), authController.revokeAllSessions);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/verify-otp', validateBody(verifyOtpSchema), authController.verifyEmail);
router.post('/resend-otp', validateBody(resendOtpSchema), authController.resendOtp);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);
router.post('/step-up', authenticate, validateBody(stepUpSchema), authController.stepUp);
router.get('/me', authenticate, authController.me);

export default router;

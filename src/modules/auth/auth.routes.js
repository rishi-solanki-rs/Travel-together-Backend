import express from 'express';
import * as authController from './auth.controller.js';
import { validateBody } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authLimiter } from '../../config/rateLimiter.js';
import {
  registerSchema, loginSchema, refreshTokenSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, verifyOtpSchema, resendOtpSchema
} from './auth.validator.js';

const router = express.Router();

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/verify-otp', validateBody(verifyOtpSchema), authController.verifyEmail);
router.post('/resend-otp', validateBody(resendOtpSchema), authController.resendOtp);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);
router.get('/me', authenticate, authController.me);

export default router;

import express from 'express';
import * as vendorsController from './vendors.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';

const router = express.Router();

router.post('/register', authenticate, vendorsController.register);
router.get('/me', authenticate, isVendorAdmin, vendorsController.getMyVendor);
router.put('/me', authenticate, isVendorAdmin, vendorsController.updateMyVendor);
router.post('/me/kyc', authenticate, isVendorAdmin, vendorsController.submitKYC);

router.get('/public/:slug', vendorsController.getVendorBySlug);

router.get('/', authenticate, isAdmin, vendorsController.getAllVendors);
router.get('/:id', authenticate, isAdmin, vendorsController.getVendorById);
router.patch('/:id/approve', authenticate, isAdmin, auditLog('approve_vendor', 'vendors'), vendorsController.approveVendor);
router.patch('/:id/reject', authenticate, isAdmin, auditLog('reject_vendor', 'vendors'), vendorsController.rejectVendor);

export default router;

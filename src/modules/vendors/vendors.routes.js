import express from 'express';
import * as vendorsController from './vendors.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { vendorCreateSchema, vendorUpdateSchema, vendorIdParamsSchema, vendorRejectSchema } from './vendors.validator.js';

const router = express.Router();

router.post('/register', authenticate, validateRequest({ body: vendorCreateSchema }), vendorsController.register);
router.get('/me', authenticate, isVendorAdmin, vendorsController.getMyVendor);
router.put('/me', authenticate, isVendorAdmin, validateRequest({ body: vendorUpdateSchema }), vendorsController.updateMyVendor);
router.post('/me/kyc', authenticate, isVendorAdmin, vendorsController.submitKYC);

router.get('/public/:slug', vendorsController.getVendorBySlug);

router.get('/', authenticate, isAdmin, vendorsController.getAllVendors);
router.get('/:id', authenticate, isAdmin, validateRequest({ params: vendorIdParamsSchema }), vendorsController.getVendorById);
router.patch('/:id/approve', authenticate, isAdmin, validateRequest({ params: vendorIdParamsSchema }), auditLog('approve_vendor', 'vendors'), vendorsController.approveVendor);
router.patch('/:id/reject', authenticate, isAdmin, validateRequest({ params: vendorIdParamsSchema, body: vendorRejectSchema }), auditLog('reject_vendor', 'vendors'), vendorsController.rejectVendor);

export default router;

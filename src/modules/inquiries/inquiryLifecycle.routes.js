import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendor, isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
  inquiryLifecycleQuerySchema,
  inquiryIdParamSchema,
  updateInquiryStatusSchema,
  assignInquirySchema,
  followupSchema,
} from './inquiryLifecycle.validator.js';
import {
  listInquiries,
  getInquiry,
  setInquiryStatus,
  setInquiryAssignment,
  appendFollowup,
  summaryAnalytics,
} from './inquiryLifecycle.controller.js';

const router = express.Router();

router.get('/analytics/summary', authenticate, isVendor, validateRequest({ query: inquiryLifecycleQuerySchema }), summaryAnalytics);
router.get('/', authenticate, isVendor, validateRequest({ query: inquiryLifecycleQuerySchema }), listInquiries);
router.get('/:id', authenticate, isVendor, validateRequest({ params: inquiryIdParamSchema }), getInquiry);
router.put('/:id/status', authenticate, isVendor, validateRequest({ params: inquiryIdParamSchema, body: updateInquiryStatusSchema }), setInquiryStatus);
router.put('/:id/assign', authenticate, isVendor, validateRequest({ params: inquiryIdParamSchema, body: assignInquirySchema }), setInquiryAssignment);
router.post('/:id/followup', authenticate, isVendor, validateRequest({ params: inquiryIdParamSchema, body: followupSchema }), appendFollowup);

// optional admin-only alias for stricter command-center actioning
router.put('/:id/reopen', authenticate, isAdmin, validateRequest({ params: inquiryIdParamSchema }), (req, res, next) => {
  req.body = { status: 'followup_pending' };
  return next();
}, setInquiryStatus);

export default router;

import express from 'express';
import Inquiry from '../../shared/models/Inquiry.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import Notification from '../../shared/models/Notification.model.js';
import { optionalAuthenticate, authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { INQUIRY_STATUS, NOTIFICATION_TYPES } from '../../shared/constants/index.js';
import { sendEmail, emailTemplates } from '../../utils/emailHelper.js';
import { inquiryBodySchema, inquiryResponseParamsSchema, inquiryResponseBodySchema } from './inquiries.validator.js';
import inquiryLifecycleRoutes from './inquiryLifecycle.routes.js';

const router = express.Router();

const submitInquiry = asyncHandler(async (req, res) => {
  const listing = req.body.listingId
    ? await ListingBase.findById(req.body.listingId).select('title cityId areaId category')
    : null;

  const inquiry = await Inquiry.create({
    ...req.body,
    userId: req.user?.id || null,
    cityId: req.body.cityId || listing?.cityId || null,
    areaId: req.body.areaId || listing?.areaId || null,
    domain: req.body.domain || listing?.category || '',
    sourceWidget: req.body.sourceWidget || '',
    sourcePage: req.body.sourcePage || '',
    preferredVisitTime: req.body.preferredVisitTime || '',
    seasonalInterest: req.body.seasonalInterest || '',
    tags: Array.isArray(req.body.tags) ? req.body.tags.map((tag) => String(tag).toLowerCase()) : [],
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  if (req.body.listingId) {
    await ListingBase.findByIdAndUpdate(req.body.listingId, { $inc: { 'stats.inquiryCount': 1 } });
  }

  const vendor = await Vendor.findById(req.body.vendorId).populate('ownerId', 'email name');
  if (vendor?.ownerId?.email) {
    const listingName = req.body.listingId
      ? (listing?.title || (await ListingBase.findById(req.body.listingId).select('title'))?.title)
      : vendor.businessName;
    const { subject, html } = emailTemplates.inquiryReceived(vendor.businessName, listingName || 'your listing');
    await sendEmail({ to: vendor.ownerId.email, subject, html }).catch(() => {});

    await Notification.create({
      userId: vendor.ownerId._id,
      type: NOTIFICATION_TYPES.INQUIRY_RECEIVED,
      title: 'New Inquiry Received',
      message: `You have a new inquiry from ${req.body.name}`,
      link: `/vendor/inquiries/${inquiry._id}`,
    });
  }

  ApiResponse.created(res, 'Inquiry submitted successfully', { inquiryId: inquiry._id });
});

const getMyInquiries = asyncHandler(async (req, res) => {
  const { page, perPage, skip } = parsePaginationQuery(req.query);
  const filter = { vendorId: req.user.vendorId };
  if (req.query.status) filter.status = req.query.status;

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage)
      .populate('listingId', 'title slug').populate('userId', 'name email'),
    Inquiry.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Inquiries fetched', inquiries, buildPaginationMeta(page, perPage, total));
});

const respondToInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findOneAndUpdate(
    { _id: req.params.id, vendorId: req.user.vendorId },
    { vendorResponse: req.body.response, status: INQUIRY_STATUS.REPLIED, respondedAt: new Date() },
    { new: true }
  );
  if (!inquiry) throw ApiError.notFound('Inquiry not found');
  ApiResponse.success(res, 'Response sent', inquiry);
});

router.post('/', optionalAuthenticate, validateRequest({ body: inquiryBodySchema }), submitInquiry);
router.get('/my', authenticate, isVendorAdmin, getMyInquiries);
router.patch('/:id/respond', authenticate, isVendorAdmin, validateRequest({ params: inquiryResponseParamsSchema, body: inquiryResponseBodySchema }), respondToInquiry);
router.use('/', inquiryLifecycleRoutes);

export default router;

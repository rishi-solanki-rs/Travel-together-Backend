import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  assignInquiry,
  addFollowup,
  getInquiryAnalyticsSummary,
} from './inquiryLifecycle.service.js';

const listInquiries = asyncHandler(async (req, res) => {
  const result = await getInquiries({ user: req.user, query: req.query });
  ApiResponse.paginated(res, 'Inquiry lifecycle list fetched', result.items, result.pagination);
});

const getInquiry = asyncHandler(async (req, res) => {
  const inquiry = await getInquiryById({ id: req.params.id, user: req.user });
  ApiResponse.success(res, 'Inquiry fetched', inquiry);
});

const setInquiryStatus = asyncHandler(async (req, res) => {
  const inquiry = await updateInquiryStatus({ id: req.params.id, user: req.user, payload: req.body });
  ApiResponse.success(res, 'Inquiry status updated', inquiry);
});

const setInquiryAssignment = asyncHandler(async (req, res) => {
  const inquiry = await assignInquiry({ id: req.params.id, user: req.user, payload: req.body });
  ApiResponse.success(res, 'Inquiry assignment updated', inquiry);
});

const appendFollowup = asyncHandler(async (req, res) => {
  const inquiry = await addFollowup({ id: req.params.id, user: req.user, payload: req.body });
  ApiResponse.success(res, 'Follow-up note added', inquiry);
});

const summaryAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getInquiryAnalyticsSummary({ user: req.user, query: req.query });
  ApiResponse.success(res, 'Inquiry analytics summary fetched', analytics);
});

export {
  listInquiries,
  getInquiry,
  setInquiryStatus,
  setInquiryAssignment,
  appendFollowup,
  summaryAnalytics,
};

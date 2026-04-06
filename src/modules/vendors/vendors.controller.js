import * as vendorsService from './vendors.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const register = asyncHandler(async (req, res) => {
  const vendor = await vendorsService.createVendor(req.user.id, req.body);
  ApiResponse.created(res, 'Vendor account created. Pending review.', vendor);
});

const getMyVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorsService.getVendorProfile(req.user.vendorId);
  ApiResponse.success(res, 'Vendor profile fetched', vendor);
});

const updateMyVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorsService.updateVendorProfile(req.user.vendorId, req.user.id, req.body);
  ApiResponse.success(res, 'Vendor profile updated', vendor);
});

const getVendorBySlug = asyncHandler(async (req, res) => {
  const vendor = await vendorsService.getVendorBySlug(req.params.slug);
  ApiResponse.success(res, 'Vendor fetched', vendor);
});

const getAllVendors = asyncHandler(async (req, res) => {
  const { vendors, pagination } = await vendorsService.getAllVendors(req.query);
  ApiResponse.paginated(res, 'Vendors fetched', vendors, pagination);
});

const getVendorById = asyncHandler(async (req, res) => {
  const vendor = await vendorsService.getVendorProfile(req.params.id);
  ApiResponse.success(res, 'Vendor fetched', vendor);
});

const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorsService.approveVendor(req.params.id, req.user.id);
  ApiResponse.success(res, 'Vendor approved', vendor);
});

const rejectVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorsService.rejectVendor(req.params.id, req.user.id, req.body.reason);
  ApiResponse.success(res, 'Vendor rejected', vendor);
});

const submitKYC = asyncHandler(async (req, res) => {
  const kyc = await vendorsService.submitKYC(req.user.vendorId, req.body);
  ApiResponse.success(res, 'KYC submitted for review', kyc);
});

export { register, getMyVendor, updateMyVendor, getVendorBySlug, getAllVendors, getVendorById, approveVendor, rejectVendor, submitKYC };

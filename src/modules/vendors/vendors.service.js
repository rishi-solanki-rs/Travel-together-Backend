import Vendor from '../../shared/models/Vendor.model.js';
import VendorKYC from '../../shared/models/VendorKYC.model.js';
import User from '../../shared/models/User.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta, buildSortQuery } from '../../utils/pagination.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { VENDOR_STATUS, KYC_STATUS } from '../../shared/constants/index.js';
import { sendEmail, emailTemplates } from '../../utils/emailHelper.js';

const createVendor = async (userId, data) => {
  const existingVendor = await Vendor.findOne({ ownerId: userId, isDeleted: false });
  if (existingVendor) throw ApiError.conflict('You already have a vendor account');

  const slug = await generateUniqueSlug(data.businessName, Vendor);
  const vendor = await Vendor.create({ ...data, ownerId: userId, slug });

  await User.findByIdAndUpdate(userId, { vendorId: vendor._id, role: 'vendorAdmin' });

  return vendor;
};

const getVendorProfile = async (vendorId) => {
  const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false })
    .populate('ownerId', 'name email phone')
    .populate('cityId', 'name slug state')
    .populate('activeSubscriptionId', 'planKey status endDate');
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return vendor;
};

const updateVendorProfile = async (vendorId, userId, data) => {
  const vendor = await Vendor.findOne({ _id: vendorId, ownerId: userId, isDeleted: false });
  if (!vendor) throw ApiError.notFound('Vendor not found or unauthorized');

  const allowedFields = ['businessName', 'description', 'shortDescription', 'contactInfo', 'address', 'socialLinks', 'businessHours', 'tags', 'languages', 'yearEstablished'];
  const updates = {};
  allowedFields.forEach(k => { if (data[k] !== undefined) updates[k] = data[k]; });

  if (data.businessName && data.businessName !== vendor.businessName) {
    updates.slug = await generateUniqueSlug(data.businessName, Vendor, 'slug', vendorId);
  }

  return Vendor.findByIdAndUpdate(vendorId, updates, { new: true, runValidators: true });
};

const getAllVendors = async (query) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const sort = buildSortQuery(query.sortBy || 'createdAt', query.sortOrder || 'desc');

  const filter = { isDeleted: false };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.cityId) filter.cityId = query.cityId;
  if (query.currentPlan) filter.currentPlan = query.currentPlan;
  if (query.search) filter.$or = [
    { businessName: { $regex: query.search, $options: 'i' } },
    { 'contactInfo.email': { $regex: query.search, $options: 'i' } },
  ];

  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort(sort).skip(skip).limit(perPage)
      .populate('ownerId', 'name email').populate('cityId', 'name state'),
    Vendor.countDocuments(filter),
  ]);

  return { vendors, pagination: buildPaginationMeta(page, perPage, total) };
};

const approveVendor = async (vendorId, adminId) => {
  const vendor = await Vendor.findOne({ _id: vendorId });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  if (vendor.status === VENDOR_STATUS.APPROVED) throw ApiError.badRequest('Vendor already approved');

  vendor.status = VENDOR_STATUS.APPROVED;
  vendor.isActive = true;
  vendor.approvedBy = adminId;
  vendor.approvedAt = new Date();
  await vendor.save();

  const owner = await User.findById(vendor.ownerId);
  if (owner) {
    const { subject, html } = emailTemplates.vendorApproved(vendor.businessName);
    await sendEmail({ to: owner.email, subject, html }).catch(() => {});
  }

  return vendor;
};

const rejectVendor = async (vendorId, adminId, reason) => {
  const vendor = await Vendor.findOne({ _id: vendorId });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  vendor.status = VENDOR_STATUS.REJECTED;
  vendor.isActive = false;
  vendor.rejectionReason = reason;
  vendor.reviewedBy = adminId;
  vendor.reviewedAt = new Date();
  await vendor.save();

  const owner = await User.findById(vendor.ownerId);
  if (owner) {
    const { subject, html } = emailTemplates.vendorRejected(vendor.businessName, reason);
    await sendEmail({ to: owner.email, subject, html }).catch(() => {});
  }

  return vendor;
};

const getVendorBySlug = async (slug) => {
  const vendor = await Vendor.findOne({ slug, isDeleted: false, isActive: true, status: VENDOR_STATUS.APPROVED })
    .populate('cityId', 'name slug state')
    .populate('activeSubscriptionId', 'planKey');
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return vendor;
};

const submitKYC = async (vendorId, data) => {
  const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  let kyc = await VendorKYC.findOne({ vendorId });
  if (!kyc) {
    kyc = await VendorKYC.create({ vendorId, ownerId: vendor.ownerId, ...data, status: KYC_STATUS.SUBMITTED, submittedAt: new Date(), isComplete: true });
  } else {
    Object.assign(kyc, { ...data, status: KYC_STATUS.SUBMITTED, submittedAt: new Date() });
    await kyc.save();
  }

  await Vendor.findByIdAndUpdate(vendorId, { kycId: kyc._id, status: VENDOR_STATUS.UNDER_REVIEW });
  return kyc;
};

export { createVendor, getVendorProfile, updateVendorProfile, getAllVendors, approveVendor, rejectVendor, getVendorBySlug, submitKYC };

import User from '../../shared/models/User.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta, buildSortQuery } from '../../utils/pagination.js';

const getProfile = async (userId) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).populate('vendorId', 'businessName slug currentPlan status');
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

const updateProfile = async (userId, data) => {
  const allowed = ['name', 'phone', 'profile', 'preferences', 'avatar', 'avatarPublicId'];
  const updates = {};
  allowed.forEach(k => { if (data[k] !== undefined) updates[k] = data[k]; });

  const user = await User.findOneAndUpdate({ _id: userId, isDeleted: false }, updates, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

const getAllUsers = async (query) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const sort = buildSortQuery(query.sortBy || 'createdAt', query.sortOrder || 'desc');
  const filter = { isDeleted: false };
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.search) filter.$or = [{ name: { $regex: query.search, $options: 'i' } }, { email: { $regex: query.search, $options: 'i' } }];

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(perPage).select('-password'),
    User.countDocuments(filter),
  ]);

  return { users, pagination: buildPaginationMeta(page, perPage, total) };
};

const getUserById = async (id) => {
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

const updateUserStatus = async (id, { isActive }) => {
  const user = await User.findOneAndUpdate({ _id: id, isDeleted: false }, { isActive }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

const softDeleteUser = async (id) => {
  const user = await User.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
};

export { getProfile, updateProfile, getAllUsers, getUserById, updateUserStatus, softDeleteUser };

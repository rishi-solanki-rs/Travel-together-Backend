import * as usersService from './users.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getProfile = asyncHandler(async (req, res) => {
  const user = await usersService.getProfile(req.user.id);
  ApiResponse.success(res, 'Profile fetched', user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  ApiResponse.success(res, 'Profile updated', user);
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { users, pagination } = await usersService.getAllUsers(req.query);
  ApiResponse.paginated(res, 'Users fetched', users, pagination);
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  ApiResponse.success(res, 'User fetched', user);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await usersService.updateUserStatus(req.params.id, req.body);
  ApiResponse.success(res, 'User status updated', user);
});

const deleteUser = asyncHandler(async (req, res) => {
  await usersService.softDeleteUser(req.params.id);
  ApiResponse.noContent(res);
});

export { getProfile, updateProfile, getAllUsers, getUserById, updateUserStatus, deleteUser };

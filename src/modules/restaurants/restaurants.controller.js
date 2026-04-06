import * as restaurantsService from './restaurants.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createProfile = asyncHandler(async (req, res) => {
  const r = await restaurantsService.createProfile(req.params.listingId, req.user.vendorId, req.body);
  ApiResponse.created(res, 'Restaurant profile created', r);
});
const getProfile = asyncHandler(async (req, res) => {
  const r = await restaurantsService.getProfile(req.params.listingId);
  ApiResponse.success(res, 'Restaurant profile fetched', r);
});
const updateProfile = asyncHandler(async (req, res) => {
  const r = await restaurantsService.updateProfile(req.params.listingId, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Restaurant profile updated', r);
});
const getFullMenu = asyncHandler(async (req, res) => {
  const menu = await restaurantsService.getFullMenu(req.params.restaurantId);
  ApiResponse.success(res, 'Full menu fetched', menu);
});
const addMenuCategory = asyncHandler(async (req, res) => {
  const cat = await restaurantsService.addMenuCategory(req.params.restaurantId, req.user.vendorId, req.body);
  ApiResponse.created(res, 'Menu category added', cat);
});
const updateMenuCategory = asyncHandler(async (req, res) => {
  const cat = await restaurantsService.updateMenuCategory(req.params.id, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Menu category updated', cat);
});
const deleteMenuCategory = asyncHandler(async (req, res) => {
  await restaurantsService.deleteMenuCategory(req.params.id, req.user.vendorId);
  ApiResponse.noContent(res);
});
const addMenuItem = asyncHandler(async (req, res) => {
  const item = await restaurantsService.addMenuItem(req.params.categoryId, req.params.restaurantId, req.user.vendorId, req.body);
  ApiResponse.created(res, 'Menu item added', item);
});
const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await restaurantsService.updateMenuItem(req.params.id, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Menu item updated', item);
});
const deleteMenuItem = asyncHandler(async (req, res) => {
  await restaurantsService.deleteMenuItem(req.params.id, req.user.vendorId);
  ApiResponse.noContent(res);
});

export { createProfile, getProfile, updateProfile, getFullMenu, addMenuCategory, updateMenuCategory, deleteMenuCategory, addMenuItem, updateMenuItem, deleteMenuItem };

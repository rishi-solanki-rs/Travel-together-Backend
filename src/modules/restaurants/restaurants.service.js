import Restaurant from '../../shared/models/Restaurant.model.js';
import MenuCategory from '../../shared/models/MenuCategory.model.js';
import MenuItem from '../../shared/models/MenuItem.model.js';
import ApiError from '../../utils/ApiError.js';

const createProfile = async (listingId, vendorId, data) => {
  const existing = await Restaurant.findOne({ listingId });
  if (existing) throw ApiError.conflict('Restaurant profile already exists');
  return Restaurant.create({ ...data, listingId, vendorId });
};

const getProfile = async (listingId) => {
  const restaurant = await Restaurant.findOne({ listingId }).lean();
  if (!restaurant) throw ApiError.notFound('Restaurant profile not found');
  return restaurant;
};

const updateProfile = async (listingId, vendorId, data) => {
  const restaurant = await Restaurant.findOneAndUpdate({ listingId, vendorId }, data, { new: true });
  if (!restaurant) throw ApiError.notFound('Restaurant not found');
  return restaurant;
};

const addMenuCategory = async (restaurantId, vendorId, data) => {
  return MenuCategory.create({ ...data, restaurantId, vendorId });
};

const getMenuCategories = async (restaurantId) => {
  return MenuCategory.find({ restaurantId, isActive: true }).sort({ order: 1 });
};

const updateMenuCategory = async (id, vendorId, data) => {
  const cat = await MenuCategory.findOneAndUpdate({ _id: id, vendorId }, data, { new: true });
  if (!cat) throw ApiError.notFound('Menu category not found');
  return cat;
};

const deleteMenuCategory = async (id, vendorId) => {
  await MenuCategory.findOneAndUpdate({ _id: id, vendorId }, { isActive: false });
  await MenuItem.updateMany({ menuCategoryId: id }, { isActive: false });
};

const addMenuItem = async (menuCategoryId, restaurantId, vendorId, data) => {
  return MenuItem.create({ ...data, menuCategoryId, restaurantId, vendorId });
};

const getMenuItems = async (menuCategoryId) => {
  return MenuItem.find({ menuCategoryId, isActive: true }).sort({ order: 1 });
};

const getFullMenu = async (restaurantId) => {
  const categories = await MenuCategory.find({ restaurantId, isActive: true }).sort({ order: 1 }).lean();
  const items = await MenuItem.find({ restaurantId, isActive: true }).lean();

  return categories.map(cat => ({
    ...cat,
    items: items.filter(item => item.menuCategoryId.toString() === cat._id.toString()),
  }));
};

const updateMenuItem = async (id, vendorId, data) => {
  const item = await MenuItem.findOneAndUpdate({ _id: id, vendorId }, data, { new: true });
  if (!item) throw ApiError.notFound('Menu item not found');
  return item;
};

const deleteMenuItem = async (id, vendorId) => {
  await MenuItem.findOneAndUpdate({ _id: id, vendorId }, { isActive: false, isAvailable: false });
};

export { createProfile, getProfile, updateProfile, addMenuCategory, getMenuCategories, updateMenuCategory, deleteMenuCategory, addMenuItem, getMenuItems, getFullMenu, updateMenuItem, deleteMenuItem };

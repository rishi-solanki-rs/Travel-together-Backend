import ShopCatalog from '../../shared/models/ShopCatalog.model.js';
import ProductItem from '../../shared/models/ProductItem.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const createCatalog = async (listingId, vendorId, data) => {
  const existing = await ShopCatalog.findOne({ listingId });
  if (existing) throw ApiError.conflict('Shop catalog already exists');
  return ShopCatalog.create({ ...data, listingId, vendorId });
};

const getCatalog = async (listingId) => {
  const catalog = await ShopCatalog.findOne({ listingId }).lean();
  if (!catalog) throw ApiError.notFound('Shop catalog not found');
  return catalog;
};

const updateCatalog = async (listingId, vendorId, data) => {
  const catalog = await ShopCatalog.findOneAndUpdate({ listingId, vendorId }, data, { new: true });
  if (!catalog) throw ApiError.notFound('Catalog not found');
  return catalog;
};

const addProduct = async (shopCatalogId, vendorId, data) => {
  return ProductItem.create({ ...data, shopCatalogId, vendorId });
};

const getProducts = async (shopCatalogId, query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { shopCatalogId, isActive: true, isDeleted: false };
  if (query.collection) filter.collectionName = query.collection;
  if (query.isFeatured) filter.isFeatured = true;
  if (query.inStock) filter.isInStock = true;

  const [products, total] = await Promise.all([
    ProductItem.find(filter).sort({ isFeatured: -1, createdAt: -1 }).skip(skip).limit(perPage),
    ProductItem.countDocuments(filter),
  ]);
  return { products, pagination: buildPaginationMeta(page, perPage, total) };
};

const updateProduct = async (id, vendorId, data) => {
  const product = await ProductItem.findOneAndUpdate({ _id: id, vendorId }, data, { new: true });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
};

const updateStock = async (id, vendorId, stock) => {
  const product = await ProductItem.findOneAndUpdate({ _id: id, vendorId }, { stock, isInStock: stock > 0 }, { new: true });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
};

const deleteProduct = async (id, vendorId) => {
  await ProductItem.findOneAndUpdate({ _id: id, vendorId }, { isDeleted: true, isActive: false });
};

export { createCatalog, getCatalog, updateCatalog, addProduct, getProducts, updateProduct, updateStock, deleteProduct };

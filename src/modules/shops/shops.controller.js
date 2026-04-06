import * as shopsService from './shops.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createCatalog = asyncHandler(async (req, res) => { const c = await shopsService.createCatalog(req.params.listingId, req.user.vendorId, req.body); ApiResponse.created(res, 'Catalog created', c); });
const getCatalog = asyncHandler(async (req, res) => { const c = await shopsService.getCatalog(req.params.listingId); ApiResponse.success(res, 'Catalog fetched', c); });
const updateCatalog = asyncHandler(async (req, res) => { const c = await shopsService.updateCatalog(req.params.listingId, req.user.vendorId, req.body); ApiResponse.success(res, 'Catalog updated', c); });
const addProduct = asyncHandler(async (req, res) => { const p = await shopsService.addProduct(req.params.catalogId, req.user.vendorId, req.body); ApiResponse.created(res, 'Product added', p); });
const getProducts = asyncHandler(async (req, res) => { const { products, pagination } = await shopsService.getProducts(req.params.catalogId, req.query); ApiResponse.paginated(res, 'Products fetched', products, pagination); });
const updateProduct = asyncHandler(async (req, res) => { const p = await shopsService.updateProduct(req.params.id, req.user.vendorId, req.body); ApiResponse.success(res, 'Product updated', p); });
const updateStock = asyncHandler(async (req, res) => { const p = await shopsService.updateStock(req.params.id, req.user.vendorId, req.body.stock); ApiResponse.success(res, 'Stock updated', p); });
const deleteProduct = asyncHandler(async (req, res) => { await shopsService.deleteProduct(req.params.id, req.user.vendorId); ApiResponse.noContent(res); });

export { createCatalog, getCatalog, updateCatalog, addProduct, getProducts, updateProduct, updateStock, deleteProduct };

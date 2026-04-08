import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  createCollection,
  updateCollection,
  reorderCollectionItems,
  removeCollection,
  getCollections,
  getCollectionById,
} from './collections.service.js';

const listPublicCollections = asyncHandler(async (req, res) => {
  const result = await getCollections({ query: req.query });
  ApiResponse.paginated(res, 'Public collections fetched', result.items, result.pagination);
});

const getPublicCollection = asyncHandler(async (req, res) => {
  const row = await getCollectionById({ id: req.params.id });
  ApiResponse.success(res, 'Public collection fetched', row);
});

const listVendorCollections = asyncHandler(async (req, res) => {
  const result = await getCollections({ query: req.query, vendorScope: req.user.vendorId });
  ApiResponse.paginated(res, 'Vendor collections fetched', result.items, result.pagination);
});

const createVendorCollection = asyncHandler(async (req, res) => {
  const row = await createCollection({ payload: req.body, user: req.user });
  ApiResponse.created(res, 'Collection created', row);
});

const updateVendorCollection = asyncHandler(async (req, res) => {
  const row = await updateCollection({ id: req.params.id, payload: req.body, user: req.user });
  ApiResponse.success(res, 'Collection updated', row);
});

const reorderVendorCollection = asyncHandler(async (req, res) => {
  const row = await reorderCollectionItems({ id: req.params.id, listingIds: req.body.listingIds, user: req.user });
  ApiResponse.success(res, 'Collection reordered', row);
});

const deleteVendorCollection = asyncHandler(async (req, res) => {
  await removeCollection({ id: req.params.id, user: req.user });
  ApiResponse.success(res, 'Collection removed');
});

export {
  listPublicCollections,
  getPublicCollection,
  listVendorCollections,
  createVendorCollection,
  updateVendorCollection,
  reorderVendorCollection,
  deleteVendorCollection,
};

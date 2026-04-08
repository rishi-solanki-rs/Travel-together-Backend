import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendor } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
  collectionBodySchema,
  reorderCollectionSchema,
  collectionIdParamSchema,
  collectionQuerySchema,
} from './collections.validator.js';
import {
  listPublicCollections,
  getPublicCollection,
  listVendorCollections,
  createVendorCollection,
  updateVendorCollection,
  reorderVendorCollection,
  deleteVendorCollection,
} from './collections.controller.js';

const router = express.Router();

router.get('/public', validateRequest({ query: collectionQuerySchema }), listPublicCollections);
router.get('/public/:id', validateRequest({ params: collectionIdParamSchema }), getPublicCollection);

router.get('/my', authenticate, isVendor, validateRequest({ query: collectionQuerySchema }), listVendorCollections);
router.post('/', authenticate, isVendor, validateRequest({ body: collectionBodySchema }), createVendorCollection);
router.put('/:id', authenticate, isVendor, validateRequest({ params: collectionIdParamSchema, body: collectionBodySchema.partial() }), updateVendorCollection);
router.put('/:id/reorder', authenticate, isVendor, validateRequest({ params: collectionIdParamSchema, body: reorderCollectionSchema }), reorderVendorCollection);
router.delete('/:id', authenticate, isVendor, validateRequest({ params: collectionIdParamSchema }), deleteVendorCollection);

export default router;

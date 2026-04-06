import express from 'express';
import SEOConfig from '../../shared/models/SEOConfig.model.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = express.Router();

const getBySlugor = asyncHandler(async (req, res) => {
  const config = await SEOConfig.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!config) throw ApiError.notFound('SEO config not found');
  ApiResponse.success(res, 'SEO config fetched', config);
});

const getByEntity = asyncHandler(async (req, res) => {
  const config = await SEOConfig.findOne({ entityId: req.params.entityId, entityType: req.params.entityType, isActive: true }).lean();
  ApiResponse.success(res, 'SEO config fetched', config || null);
});

const upsertConfig = asyncHandler(async (req, res) => {
  const filter = req.body.slug ? { slug: req.body.slug } : { entityId: req.body.entityId, entityType: req.body.entityType };
  const config = await SEOConfig.findOneAndUpdate(filter, { ...req.body, updatedBy: req.user.id }, { new: true, upsert: true, setDefaultsOnInsert: true });
  ApiResponse.success(res, 'SEO config saved', config);
});

router.get('/slug/:slug', getBySlugor);
router.get('/entity/:entityType/:entityId', getByEntity);
router.post('/', authenticate, isAdmin, upsertConfig);

export default router;

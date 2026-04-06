import multer from 'multer';
import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import { uploadLimiter } from '../../config/rateLimiter.js';
import { uploadImage, deleteImage, UPLOAD_FOLDERS } from '../../utils/cloudinaryHelper.js';
import MediaAsset from '../../shared/models/MediaAsset.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(ApiError.badRequest('Only image files are allowed'));
    cb(null, true);
  },
});

const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const folder = UPLOAD_FOLDERS[req.body.context] || 'together-in-india/general';
  const tempPath = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const result = await uploadImage(tempPath, folder);

  const asset = await MediaAsset.create({
    ...result,
    uploadedBy: req.user.id,
    vendorId: req.user.vendorId || null,
    listingId: req.body.listingId || null,
    role: req.body.role || 'gallery',
    altText: req.body.altText || '',
    order: parseInt(req.body.order) || 0,
  });

  ApiResponse.created(res, 'Image uploaded successfully', asset);
});

const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw ApiError.badRequest('No files uploaded');

  const folder = UPLOAD_FOLDERS[req.body.context] || 'together-in-india/general';
  const results = [];

  for (const file of req.files) {
    const tempPath = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await uploadImage(tempPath, folder);

    const asset = await MediaAsset.create({
      ...result,
      uploadedBy: req.user.id,
      vendorId: req.user.vendorId || null,
      listingId: req.body.listingId || null,
      role: req.body.role || 'gallery',
      altText: '',
      order: results.length,
    });

    results.push(asset);
  }

  ApiResponse.created(res, `${results.length} images uploaded`, results);
});

const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findOne({ _id: req.params.id, uploadedBy: req.user.id });
  if (!asset) throw ApiError.notFound('Asset not found');

  await deleteImage(asset.publicId);
  await MediaAsset.findByIdAndUpdate(req.params.id, { isDeleted: true });

  ApiResponse.noContent(res);
});

const getMyAssets = asyncHandler(async (req, res) => {
  const filter = { uploadedBy: req.user.id, isDeleted: false };
  if (req.query.listingId) filter.listingId = req.query.listingId;
  const assets = await MediaAsset.find(filter).sort({ createdAt: -1 });
  ApiResponse.success(res, 'Assets fetched', assets);
});

router.use(uploadLimiter);
router.post('/single', authenticate, upload.single('image'), uploadSingle);
router.post('/multiple', authenticate, upload.array('images', 20), uploadMultiple);
router.delete('/:id', authenticate, deleteAsset);
router.get('/my', authenticate, getMyAssets);

export default router;

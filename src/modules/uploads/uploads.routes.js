import multer from 'multer';
import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import { uploadLimiter } from '../../config/rateLimiter.js';
import { uploadBuffer, uploadFileStream, deleteImageWithRetry, validateFileWhitelist, captureMemoryTelemetry, DEFAULT_DIMENSION_LIMITS, UPLOAD_FOLDERS } from '../../utils/cloudinaryHelper.js';
import MediaAsset from '../../shared/models/MediaAsset.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { uploadSingleSchema, uploadMultipleSchema, mediaDeleteParamsSchema, uploadAssetsQuerySchema } from './uploads.validator.js';
import crypto from 'crypto';
import env from '../../config/env.js';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import os from 'os';
import path from 'path';
import { recordAuditEvent } from '../../operations/audit/audit.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';
import { malwareScanHook, verifyMimeMagic } from '../../operations/security/runtimeSecurity.service.js';

const router = express.Router();

const STREAM_CONCURRENCY = 5;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `tii-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      validateFileWhitelist(file);
    } catch (error) {
      return cb(error);
    }
    cb(null, true);
  },
});

const deleteTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // temp cleanup is best-effort
  }
};

const checksumFromFilePath = async (filePath) => {
  const hash = crypto.createHash('sha256');
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

const resolveDedupeFilter = ({ checksum, req }) => {
  const dedupeScope = (req.body?.dedupeScope || 'vendor').toLowerCase();
  if (dedupeScope === 'vendor' && req.user?.vendorId) {
    return { checksum, vendorId: req.user.vendorId, isDeleted: false };
  }
  return { checksum, isDeleted: false };
};

const buildUploadOptionsForContext = (req) => ({
  context: req.body.context,
  stripExif: req.body.stripExif !== 'false',
  dimensionLimits: DEFAULT_DIMENSION_LIMITS,
  maxRetries: 2,
  baseDelayMs: 200,
});

const buildMediaAssetPayload = ({ uploadResult, checksum, req, order = 0 }) => ({
  ...uploadResult,
  checksum,
  uploadedBy: req.user.id,
  vendorId: req.user.vendorId || null,
  listingId: req.body.listingId || null,
  role: req.body.role || 'gallery',
  altText: req.body.altText || '',
  order,
  lifecycleStatus: 'active',
  orphanCandidate: false,
  metadata: {
    upload: {
      mode: env.FF_UPLOAD_STREAM_MODE ? 'stream' : 'buffer',
      context: req.body.context,
      uploadedAt: new Date().toISOString(),
    },
  },
});

const runWithConcurrencyLimit = async (items, limit, worker) => {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (next !== undefined) {
        await worker(next);
      }
    }
  });
  await Promise.all(workers);
};

const streamUploadFromDisk = async ({ file, folder, req }) => {
  const malwareSafe = await malwareScanHook({ filePath: file.path, originalname: file.originalname });
  if (!malwareSafe) {
    throw ApiError.unprocessable('Malware scanning policy rejected uploaded file');
  }

  const sniffBuffer = await fs.readFile(file.path);
  if (!verifyMimeMagic(sniffBuffer, file.mimetype)) {
    throw ApiError.unprocessable('Mime sniffing mismatch detected for uploaded file');
  }

  const options = buildUploadOptionsForContext(req);
  if (env.FF_UPLOAD_STREAM_MODE) {
    return uploadFileStream(file.path, folder, options);
  }
  return uploadBuffer(sniffBuffer, folder, options);
};

const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const memoryBefore = captureMemoryTelemetry();
  const folder = UPLOAD_FOLDERS[req.body.context] || 'together-in-india/general';
  const checksum = await checksumFromFilePath(req.file.path);

  const existingAsset = await MediaAsset.findOne(resolveDedupeFilter({ checksum, req }));
  if (existingAsset) {
    await MediaAsset.findByIdAndUpdate(existingAsset._id, {
      lastAccessedAt: new Date(),
      lifecycleStatus: 'active',
      orphanCandidate: false,
    });
    await deleteTempFile(req.file.path);
    return ApiResponse.created(res, 'Image uploaded successfully', existingAsset);
  }

  const result = await streamUploadFromDisk({ file: req.file, folder, req });
  const memoryAfter = captureMemoryTelemetry();

  const asset = await MediaAsset.create({
    ...buildMediaAssetPayload({
      uploadResult: result,
      checksum,
      req,
      order: parseInt(req.body.order, 10) || 0,
    }),
    metadata: {
      upload: {
        mode: env.FF_UPLOAD_STREAM_MODE ? 'stream' : 'buffer',
        context: req.body.context,
        memoryBefore,
        memoryAfter,
      },
    },
  });

  await deleteTempFile(req.file.path);

  ApiResponse.created(res, 'Image uploaded successfully', asset);
});

const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw ApiError.badRequest('No files uploaded');

  const memoryBefore = captureMemoryTelemetry();
  const folder = UPLOAD_FOLDERS[req.body.context] || 'together-in-india/general';
  const results = [];
  const errors = [];

  await runWithConcurrencyLimit(req.files.map((file, idx) => ({ file, idx })), STREAM_CONCURRENCY, async ({ file, idx }) => {
    try {
      const checksum = await checksumFromFilePath(file.path);
      const existingAsset = await MediaAsset.findOne(resolveDedupeFilter({ checksum, req }));
      if (existingAsset) {
        await MediaAsset.findByIdAndUpdate(existingAsset._id, {
          lastAccessedAt: new Date(),
          lifecycleStatus: 'active',
          orphanCandidate: false,
        });
        results.push(existingAsset);
        await deleteTempFile(file.path);
        return;
      }

      const result = await streamUploadFromDisk({ file, folder, req });

      const asset = await MediaAsset.create(buildMediaAssetPayload({
        uploadResult: result,
        checksum,
        req,
        order: idx,
      }));

      results.push(asset);
      await deleteTempFile(file.path);
    } catch (error) {
      errors.push({ file: file.originalname, message: error.message });
      await deleteTempFile(file.path);
    }
  });

  if (!results.length && errors.length) {
    throw ApiError.unprocessable('All uploads failed', errors);
  }

  const memoryAfter = captureMemoryTelemetry();
  await MediaAsset.updateMany(
    { _id: { $in: results.map((asset) => asset._id).filter(Boolean) } },
    {
      $set: {
        'metadata.uploadBatch': {
          mode: env.FF_UPLOAD_STREAM_MODE ? 'stream' : 'buffer',
          memoryBefore,
          memoryAfter,
          fileCount: req.files.length,
          failedCount: errors.length,
        },
      },
    }
  );

  const message = errors.length
    ? `${results.length} images uploaded, ${errors.length} failed`
    : `${results.length} images uploaded`;
  ApiResponse.created(res, message, results);
});

const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findOne({ _id: req.params.id, uploadedBy: req.user.id });
  if (!asset) throw ApiError.notFound('Asset not found');

  const beforeSnapshot = {
    id: asset._id,
    publicId: asset.publicId,
    lifecycleStatus: asset.lifecycleStatus,
    isDeleted: asset.isDeleted,
  };

  const now = new Date();
  try {
    await deleteImageWithRetry(asset.publicId, { maxRetries: 2, baseDelayMs: 300 });
    await MediaAsset.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      isActive: false,
      deletedAt: now,
      lifecycleStatus: 'deleted',
      cleanupEligibleAt: now,
    });
    await recordAuditEvent({
      eventType: 'uploads.asset.delete',
      module: 'uploads',
      entityType: 'MediaAsset',
      entityId: asset._id,
      action: 'delete-asset',
      actor: { actorType: 'user', actorId: req.user.id, vendorId: req.user.vendorId || null },
      context: { correlationId: req.correlationId, module: 'uploads' },
      beforeSnapshot,
      afterSnapshot: { lifecycleStatus: 'deleted', isDeleted: true },
    });
  } catch {
    await MediaAsset.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      isActive: false,
      lifecycleStatus: 'delete_failed',
      cleanupEligibleAt: now,
      $inc: { deleteRetryCount: 1 },
    });
    await enqueueJob('media-cleanup-retries', 'retry-cloudinary-delete', {
      mediaAssetId: String(asset._id),
      publicId: asset.publicId,
    }, { correlationId: req.correlationId, maxAttempts: 5, poisonThreshold: 7 });
    await recordAuditEvent({
      eventType: 'uploads.asset.delete_failed',
      module: 'uploads',
      entityType: 'MediaAsset',
      entityId: asset._id,
      action: 'delete-asset-failed',
      actor: { actorType: 'user', actorId: req.user.id, vendorId: req.user.vendorId || null },
      context: { correlationId: req.correlationId, module: 'uploads' },
      beforeSnapshot,
      afterSnapshot: { lifecycleStatus: 'delete_failed', isDeleted: true },
    });
  }

  ApiResponse.noContent(res);
});

const getMyAssets = asyncHandler(async (req, res) => {
  const filter = { uploadedBy: req.user.id, isDeleted: false };
  if (req.query.listingId) filter.listingId = req.query.listingId;
  const assets = await MediaAsset.find(filter).sort({ createdAt: -1 });
  await MediaAsset.updateMany({ _id: { $in: assets.map((asset) => asset._id) } }, { $set: { lastAccessedAt: new Date() } });
  ApiResponse.success(res, 'Assets fetched', assets);
});

router.use(uploadLimiter);
router.post('/single', authenticate, upload.single('image'), validateRequest({ body: uploadSingleSchema }), uploadSingle);
router.post('/multiple', authenticate, upload.array('images', 20), validateRequest({ body: uploadMultipleSchema }), uploadMultiple);
router.delete('/:id', authenticate, validateRequest({ params: mediaDeleteParamsSchema }), deleteAsset);
router.get('/my', authenticate, validateRequest({ query: uploadAssetsQuerySchema }), getMyAssets);

export { checksumFromFilePath, resolveDedupeFilter, runWithConcurrencyLimit, buildMediaAssetPayload };
export default router;

import cloudinary from '../config/cloudinary.js';
import ApiError from './ApiError.js';
import { Readable } from 'stream';
import { createReadStream } from 'fs';
import path from 'path';
import { incrementCounter, startTimer } from '../operations/metrics/metrics.service.js';

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

const DEFAULT_DIMENSION_LIMITS = {
  minWidth: 200,
  minHeight: 200,
  maxWidth: 6000,
  maxHeight: 6000,
};

const UPLOAD_FOLDERS = {
  users: 'together-in-india/users',
  vendors: 'together-in-india/vendors',
  listings: 'together-in-india/listings',
  hotels: 'together-in-india/hotels',
  restaurants: 'together-in-india/restaurants',
  shops: 'together-in-india/shops',
  tribes: 'together-in-india/tribes',
  kidsWorld: 'together-in-india/kids-world',
  destinations: 'together-in-india/destinations',
  cms: 'together-in-india/cms',
  cities: 'together-in-india/cities',
  categories: 'together-in-india/categories',
  luckyDraw: 'together-in-india/lucky-draw',
};

const IMAGE_TRANSFORMATIONS = {
  desktop: { width: 1920, height: 1080, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
  mobile: { width: 768, height: 432, crop: 'fill', quality: 'auto:eco', fetch_format: 'auto', dpr: 'auto' },
  card: { width: 400, height: 300, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
  thumbnail: { width: 150, height: 150, crop: 'thumb', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
  seo: { width: 1200, height: 630, crop: 'fill', quality: 85, fetch_format: 'jpg' },
};

const CONTEXT_TRANSFORMATION_PRESETS = {
  users: { eager: [IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.thumbnail] },
  vendors: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card] },
  listings: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card, IMAGE_TRANSFORMATIONS.thumbnail] },
  hotels: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card] },
  restaurants: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card] },
  shops: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card] },
  tribes: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card] },
  kidsWorld: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card] },
  destinations: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile] },
  cms: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.seo] },
  cities: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.seo] },
  categories: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.card] },
  luckyDraw: { eager: [IMAGE_TRANSFORMATIONS.desktop, IMAGE_TRANSFORMATIONS.mobile, IMAGE_TRANSFORMATIONS.seo] },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createCloudinaryVariants = (publicId) => {
  const variants = {};
  for (const [key, transform] of Object.entries(IMAGE_TRANSFORMATIONS)) {
    variants[key] = cloudinary.url(publicId, transform);
  }
  return variants;
};

const normalizeCloudinaryResult = (result) => ({
  publicId: result.public_id,
  url: result.secure_url,
  format: result.format,
  width: result.width,
  height: result.height,
  bytes: result.bytes,
  variants: createCloudinaryVariants(result.public_id),
});

const validateFileWhitelist = (file) => {
  const ext = path.extname(file?.originalname || '').toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(file?.mimetype)) {
    throw ApiError.badRequest('Invalid mimetype. Allowed types: jpeg, png, webp, gif, avif');
  }
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw ApiError.badRequest('Invalid extension. Allowed extensions: .jpg, .jpeg, .png, .webp, .gif, .avif');
  }
};

const validateImageDimensions = (result, limits = DEFAULT_DIMENSION_LIMITS) => {
  if (!result?.width || !result?.height) return;
  const {
    minWidth = DEFAULT_DIMENSION_LIMITS.minWidth,
    minHeight = DEFAULT_DIMENSION_LIMITS.minHeight,
    maxWidth = DEFAULT_DIMENSION_LIMITS.maxWidth,
    maxHeight = DEFAULT_DIMENSION_LIMITS.maxHeight,
  } = limits;
  if (result.width < minWidth || result.height < minHeight) {
    throw ApiError.unprocessable(`Image dimensions too small. Minimum supported size is ${minWidth}x${minHeight}`);
  }
  if (result.width > maxWidth || result.height > maxHeight) {
    throw ApiError.unprocessable(`Image dimensions too large. Maximum supported size is ${maxWidth}x${maxHeight}`);
  }
};

const extractCloudinaryPublicId = (url = '') => {
  if (!url || !url.includes('/upload/')) return null;
  const withoutQuery = url.split('?')[0];
  const uploadIndex = withoutQuery.indexOf('/upload/');
  if (uploadIndex === -1) return null;
  const pathAfterUpload = withoutQuery.slice(uploadIndex + '/upload/'.length);
  const parts = pathAfterUpload.split('/').filter(Boolean);
  if (!parts.length) return null;
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
  const relevantParts = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts;
  if (!relevantParts.length) return null;
  const last = relevantParts[relevantParts.length - 1];
  relevantParts[relevantParts.length - 1] = last.replace(/\.[^/.]+$/, '');
  return relevantParts.join('/');
};

const buildUploadOptions = ({ folder = 'together-in-india', context = null, stripExif = true, compressionHook = null, options = {} } = {}) => {
  const preset = context ? (CONTEXT_TRANSFORMATION_PRESETS[context] || {}) : {};
  const metadataStripping = stripExif ? { flags: 'strip_profile' } : {};
  const {
    dimensionLimits,
    maxRetries,
    baseDelayMs,
    context: _context,
    stripExif: _stripExif,
    compressionHook: _compressionHook,
    ...cloudinaryOptions
  } = options;

  const computed = {
    folder,
    resource_type: 'image',
    use_filename: false,
    unique_filename: true,
    overwrite: false,
    eager_async: false,
    ...preset,
    transformation: [{ quality: 'auto', fetch_format: 'auto', ...metadataStripping }],
    ...cloudinaryOptions,
  };

  if (typeof compressionHook === 'function') {
    return compressionHook(computed) || computed;
  }
  return computed;
};

const uploadThroughStream = async (sourceStream, uploadOptions) => new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, response) => {
    if (error) return reject(error);
    return resolve(response);
  });

  sourceStream.on('error', reject);
  sourceStream.pipe(uploadStream);
});

const uploadStreamWithRetry = async (streamFactory, uploadOptions, retryOptions = {}) => {
  const maxRetries = Number.isInteger(retryOptions.maxRetries) ? retryOptions.maxRetries : 2;
  const baseDelayMs = Number.isInteger(retryOptions.baseDelayMs) ? retryOptions.baseDelayMs : 200;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const sourceStream = streamFactory();
      return await uploadThroughStream(sourceStream, uploadOptions);
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) break;
      await sleep(baseDelayMs * (2 ** attempt));
    }
  }

  throw lastError;
};

const captureMemoryTelemetry = () => {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
  };
};

const uploadImage = async (filePath, folder = 'together-in-india', options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, buildUploadOptions({ folder, options }));
    validateImageDimensions(result, options.dimensionLimits);
    return normalizeCloudinaryResult(result);
  } catch (err) {
    throw ApiError.internal(`Cloudinary upload failed: ${err.message}`);
  }
};

const uploadBuffer = async (buffer, folder = 'together-in-india', options = {}) => {
  const stop = startTimer('tii_cloudinary_duration_ms', { op: 'upload_buffer' });
  try {
    const stream = Readable.from(buffer);
    const result = await uploadThroughStream(stream, buildUploadOptions({ folder, options }));
    validateImageDimensions(result, options.dimensionLimits);
    incrementCounter('tii_cloudinary_ops_total', 1, { op: 'upload_buffer' });
    incrementCounter('tii_upload_throughput_bytes_total', Number(result?.bytes || 0), { op: 'upload_buffer' });
    return normalizeCloudinaryResult(result);
  } catch (err) {
    throw ApiError.internal(`Cloudinary upload failed: ${err.message}`);
  } finally {
    stop();
  }
};

const uploadFileStream = async (filePath, folder = 'together-in-india', options = {}) => {
  const stop = startTimer('tii_cloudinary_duration_ms', { op: 'upload_stream' });
  try {
    const uploadOptions = buildUploadOptions({
      folder,
      context: options.context,
      stripExif: options.stripExif !== false,
      compressionHook: options.compressionHook,
      options,
    });
    const result = await uploadStreamWithRetry(() => createReadStream(filePath), uploadOptions, {
      maxRetries: Number.isInteger(options.maxRetries) ? options.maxRetries : 2,
      baseDelayMs: Number.isInteger(options.baseDelayMs) ? options.baseDelayMs : 200,
    });
    validateImageDimensions(result, options.dimensionLimits);
    incrementCounter('tii_cloudinary_ops_total', 1, { op: 'upload_stream' });
    incrementCounter('tii_upload_throughput_bytes_total', Number(result?.bytes || 0), { op: 'upload_stream' });
    return normalizeCloudinaryResult(result);
  } catch (err) {
    throw ApiError.internal(`Cloudinary stream upload failed: ${err.message}`);
  } finally {
    stop();
  }
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    throw ApiError.internal(`Cloudinary delete failed: ${err.message}`);
  }
};

const deleteMultiple = async (publicIds) => {
  try {
    if (!publicIds.length) return;
    await cloudinary.api.delete_resources(publicIds);
  } catch (err) {
    throw ApiError.internal(`Cloudinary bulk delete failed: ${err.message}`);
  }
};

const deleteImageWithRetry = async (publicId, options = {}) => {
  const stop = startTimer('tii_cloudinary_duration_ms', { op: 'delete' });
  const maxRetries = Number.isInteger(options.maxRetries) ? options.maxRetries : 3;
  const baseDelayMs = Number.isInteger(options.baseDelayMs) ? options.baseDelayMs : 300;
  let lastError = null;

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        incrementCounter('tii_cloudinary_ops_total', 1, { op: 'delete' });
        return result;
      } catch (err) {
        lastError = err;
        if (attempt >= maxRetries) break;
        await sleep(baseDelayMs * (2 ** attempt));
      }
    }
  } finally {
    stop();
  }

  throw ApiError.internal(`Cloudinary delete failed: ${lastError?.message || 'unknown error'}`);
};

const getVariantUrl = (publicId, variant = 'card') => {
  const transform = IMAGE_TRANSFORMATIONS[variant] || IMAGE_TRANSFORMATIONS.card;
  return cloudinary.url(publicId, transform);
};

export {
  uploadImage,
  uploadBuffer,
  uploadFileStream,
  deleteImage,
  deleteImageWithRetry,
  deleteMultiple,
  getVariantUrl,
  buildUploadOptions,
  validateFileWhitelist,
  validateImageDimensions,
  captureMemoryTelemetry,
  extractCloudinaryPublicId,
  IMAGE_TRANSFORMATIONS,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_EXTENSIONS,
  DEFAULT_DIMENSION_LIMITS,
  UPLOAD_FOLDERS,
};

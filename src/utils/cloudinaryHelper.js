import cloudinary from '../config/cloudinary.js';
import ApiError from './ApiError.js';

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
  mobile: { width: 768, height: 432, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
  card: { width: 400, height: 300, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
  thumbnail: { width: 150, height: 150, crop: 'thumb', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
  seo: { width: 1200, height: 630, crop: 'fill', quality: 85, fetch_format: 'jpg' },
};

const uploadImage = async (filePath, folder = 'together-in-india', options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      ...options,
    });

    const variants = {};
    for (const [key, transform] of Object.entries(IMAGE_TRANSFORMATIONS)) {
      variants[key] = cloudinary.url(result.public_id, transform);
    }

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      variants,
    };
  } catch (err) {
    throw ApiError.internal(`Cloudinary upload failed: ${err.message}`);
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

const getVariantUrl = (publicId, variant = 'card') => {
  const transform = IMAGE_TRANSFORMATIONS[variant] || IMAGE_TRANSFORMATIONS.card;
  return cloudinary.url(publicId, transform);
};

export { uploadImage, deleteImage, deleteMultiple, getVariantUrl, UPLOAD_FOLDERS };

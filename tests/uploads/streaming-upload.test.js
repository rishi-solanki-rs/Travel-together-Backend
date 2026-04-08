import {
  runWithConcurrencyLimit,
  resolveDedupeFilter,
  buildMediaAssetPayload,
} from '../../src/modules/uploads/uploads.routes.js';
import {
  validateFileWhitelist,
  validateImageDimensions,
  IMAGE_TRANSFORMATIONS,
  buildUploadOptions,
} from '../../src/utils/cloudinaryHelper.js';

describe('Phase 5 upload streaming primitives', () => {
  test('1) single image upload payload keeps compatibility shape', () => {
    const uploadResult = {
      publicId: 'together/media/one',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/together/media/one.jpg',
      format: 'jpg',
      width: 1280,
      height: 720,
      bytes: 123456,
      variants: {
        desktop: 'desktop-url',
        mobile: 'mobile-url',
        card: 'card-url',
        thumbnail: 'thumb-url',
        seo: 'seo-url',
      },
    };

    const payload = buildMediaAssetPayload({
      uploadResult,
      checksum: 'abc123',
      req: {
        user: { id: 'u1', vendorId: 'v1' },
        body: { context: 'listings', role: 'gallery', listingId: 'l1', altText: 'banner alt' },
      },
      order: 0,
    });

    expect(payload).toEqual(expect.objectContaining({
      publicId: uploadResult.publicId,
      url: uploadResult.url,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      variants: uploadResult.variants,
      checksum: 'abc123',
    }));
  });

  test('2) concurrency limiter supports 20 parallel files safely', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;
    const done = [];

    await runWithConcurrencyLimit(items, 5, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      done.push(item);
      inFlight -= 1;
    });

    expect(done).toHaveLength(20);
    expect(maxInFlight).toBeLessThanOrEqual(5);
  });

  test('3) invalid mimetype is rejected by whitelist', () => {
    expect(() => validateFileWhitelist({
      mimetype: 'application/pdf',
      originalname: 'file.pdf',
    })).toThrow('Invalid mimetype');
  });

  test('4) oversized image fails dimension validation', () => {
    expect(() => validateImageDimensions({ width: 7000, height: 7000 })).toThrow('Image dimensions too large');
  });

  test('5) duplicate checksum dedupe filter resolves vendor scope', () => {
    const filter = resolveDedupeFilter({
      checksum: 'dup-checksum',
      req: {
        user: { vendorId: 'vendor-1' },
        body: { dedupeScope: 'vendor' },
      },
    });

    expect(filter).toEqual({ checksum: 'dup-checksum', vendorId: 'vendor-1', isDeleted: false });
  });

  test('9) mobile variant configuration remains mobile-first optimized', () => {
    expect(IMAGE_TRANSFORMATIONS.mobile).toEqual(expect.objectContaining({
      quality: 'auto:eco',
      fetch_format: 'auto',
      dpr: 'auto',
    }));
  });

  test('10) upload options keep EXIF stripping configurable', () => {
    const options = buildUploadOptions({ folder: 'x/y', context: 'cms', stripExif: true });
    expect(options.folder).toBe('x/y');
    expect(options.transformation[0].flags).toBe('strip_profile');
    expect(Array.isArray(options.eager)).toBe(true);
  });
});

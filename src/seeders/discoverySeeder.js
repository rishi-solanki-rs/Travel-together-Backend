import User from '../shared/models/User.model.js';
import Vendor from '../shared/models/Vendor.model.js';
import City from '../shared/models/City.model.js';
import Area from '../shared/models/Area.model.js';
import Category from '../shared/models/Category.model.js';
import SubType from '../shared/models/SubType.model.js';
import ListingBase from '../shared/models/ListingBase.model.js';
import { LISTING_STATUS, USER_ROLES, VENDOR_STATUS } from '../shared/constants/index.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { seededAreas, seededDiscoveryListings } from './productionSeedData.js';

const buildLookup = async (Model, field = 'slug') => {
  const rows = await Model.find({ isDeleted: { $ne: true } }).lean();
  return rows.reduce((acc, row) => {
    acc[row[field]] = row;
    return acc;
  }, {});
};

const ensureVendorOwner = async ({ name, email, password, cityId }) => {
  const existing = await User.findOne({ email });
  if (existing) return existing;

  return User.create({
    name,
    email,
    password,
    role: USER_ROLES.VENDOR_ADMIN,
    isEmailVerified: true,
    isActive: true,
    cityId,
  });
};

const normalizeAreaGeoLocation = async () => {
  await Area.updateMany(
    {
      'geoLocation.coordinates': { $exists: true },
      $or: [
        { 'geoLocation.type': { $exists: false } },
        { 'geoLocation.type': null },
        { 'geoLocation.type': '' },
      ],
    },
    {
      $set: { 'geoLocation.type': 'Point' },
    }
  );
};

const seedAreas = async (cityLookup) => {
  await normalizeAreaGeoLocation();

  for (const area of seededAreas) {
    const city = cityLookup[area.citySlug];
    if (!city) continue;

    const geoLocation = {
      type: 'Point',
      coordinates: area.geoLocation?.coordinates || [0, 0],
    };

    await Area.findOneAndUpdate(
      { cityId: city._id, slug: area.slug },
      {
        cityId: city._id,
        name: area.name,
        slug: area.slug,
        zoneType: area.zoneType,
        nearbyLandmarks: area.nearbyLandmarks,
        popularRoutes: area.popularRoutes,
        clusterKey: area.clusterKey,
        geoLocation,
        isActive: true,
        isDeleted: false,
        order: area.order,
        seoConfig: area.seoConfig,
      },
      { upsert: true, new: true }
    );
  }
};

const seedDiscoveryContent = async () => {
  logger.info('Seeding production discovery content...');

  // This compound index cannot be maintained when both keys are arrays.
  // Keep seeding resilient in environments where the stale index already exists.
  await ListingBase.collection.dropIndex('categoryIds_1_subCategoryIds_1').catch(() => null);

  const [cityLookup, categoryLookup, subtypeLookup] = await Promise.all([
    buildLookup(City),
    buildLookup(Category, 'key'),
    buildLookup(SubType, 'key'),
  ]);

  await seedAreas(cityLookup);
  const areaLookup = await buildLookup(Area, 'slug');

  const admin = await User.findOne({ email: env.ADMIN_EMAIL }).select('_id');
  const publishedBy = admin?._id || null;

  for (const entry of seededDiscoveryListings) {
    const city = cityLookup[entry.citySlug];
    const area = areaLookup[entry.areaSlug];
    const category = categoryLookup[entry.categoryKey];
    const subtype = subtypeLookup[entry.subtypeKey];

    if (!city || !area || !category) continue;

    const owner = await ensureVendorOwner({
      name: entry.vendor.ownerName,
      email: entry.vendor.ownerEmail,
      password: entry.vendor.ownerPassword,
      cityId: city._id,
    });

    const vendor = await Vendor.findOneAndUpdate(
      { slug: entry.vendor.slug },
      {
        businessName: entry.vendor.businessName,
        slug: entry.vendor.slug,
        description: entry.vendor.description,
        shortDescription: entry.vendor.shortDescription,
        category: entry.categoryKey,
        subCategoryIds: subtype ? [subtype._id] : [],
        ownerId: owner._id,
        cityId: city._id,
        status: VENDOR_STATUS.APPROVED,
        isActive: true,
        isDeleted: false,
        isFeatured: true,
        contactInfo: {
          primaryPhone: '9999999999',
          email: entry.vendor.ownerEmail,
          whatsapp: '9999999999',
        },
        address: {
          street: entry.location.street,
          area: entry.location.area,
          city: entry.location.city,
          state: entry.location.state,
          pincode: entry.location.pincode,
          country: 'India',
          geoLocation: { type: 'Point', coordinates: entry.location.coordinates },
        },
        tags: entry.vendor.tags,
        languages: entry.vendor.languages,
        yearEstablished: entry.vendor.yearEstablished,
        approvedBy: publishedBy,
        approvedAt: new Date(),
        reviewedBy: publishedBy,
        reviewedAt: new Date(),
        seoConfig: entry.seoConfig,
      },
      { upsert: true, new: true }
    );

    await ListingBase.findOneAndUpdate(
      { slug: entry.slug },
      {
        title: entry.title,
        slug: entry.slug,
        description: entry.vendor.description,
        shortDescription: entry.vendor.shortDescription,
        vendorId: vendor._id,
        categoryId: category._id,
        subtypeId: subtype?._id || null,
        cityId: city._id,
        areaId: area._id,
        category: entry.categoryKey,
        status: LISTING_STATUS.PUBLISHED,
        isActive: true,
        isDeleted: false,
        isFeatured: true,
        isPremium: Boolean(entry.labels?.sponsored),
        address: {
          street: entry.location.street,
          area: entry.location.area,
          city: entry.location.city,
          state: entry.location.state,
          pincode: entry.location.pincode,
          country: 'India',
        },
        geoLocation: { type: 'Point', coordinates: entry.location.coordinates },
        tags: entry.tags,
        categoryIds: [category._id],
        nearbyLandmarks: entry.nearbyLandmarks,
        vendorType: entry.vendorType,
        discoveryType: entry.discoveryType,
        areaCluster: entry.areaCluster,
        labels: entry.labels,
        pricing: entry.pricing,
        seoConfig: entry.seoConfig,
        publishedAt: new Date(),
        publishedBy,
        reviewedBy: publishedBy,
        reviewedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  logger.info(`✅ Areas (${seededAreas.length}), vendors (${seededDiscoveryListings.length}), and listings (${seededDiscoveryListings.length}) seeded`);
};

export { seedDiscoveryContent };
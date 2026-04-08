import ListingBase from '../../shared/models/ListingBase.model.js';

const EARTH_RADIUS_KM = 6371;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const haversineDistanceKm = ({ lat1, lng1, lat2, lng2 }) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(3));
};

const domainToCategoryMap = {
  hotels: ['hotels'],
  eatDrink: ['restaurants'],
  restaurants: ['restaurants'],
  shops: ['shops'],
  fashion: ['shops'],
  markets: ['shops'],
  thingsToDo: ['thingsToDo'],
  experiences: ['thingsToDo', 'tribes'],
  artisan: ['tribes', 'shops'],
  nearby: ['hotels', 'restaurants', 'shops', 'thingsToDo', 'tribes', 'destinations'],
};

const getCategoryKeysByDomain = (domain) => domainToCategoryMap[domain] || domainToCategoryMap.nearby;

const buildNearbyFilter = ({ cityId, areaId, domain, nearbyLandmark, includeLabels = [] }) => {
  const filter = { isDeleted: false, isActive: true, status: 'published' };

  if (cityId) filter.cityId = cityId;
  if (areaId) filter.areaId = areaId;

  const categories = getCategoryKeysByDomain(domain);
  if (categories?.length) filter.category = { $in: categories };

  if (nearbyLandmark) {
    filter.nearbyLandmarks = { $in: [String(nearbyLandmark).toLowerCase()] };
  }

  includeLabels.forEach((label) => {
    filter[`labels.${label}`] = true;
  });

  return filter;
};

const findNearbyByCityAndArea = async ({
  cityId,
  areaId,
  domain = 'nearby',
  lat,
  lng,
  radius = 8,
  limit = 16,
  nearbyLandmark = '',
}) => {
  const filter = buildNearbyFilter({ cityId, areaId, domain, nearbyLandmark });
  let query = ListingBase.find(filter)
    .select('title slug coverImage cityId areaId category vendorId pricing address geoLocation labels vendorType discoveryType tags nearbyLandmarks')
    .sort({ planPriority: -1, isFeatured: -1, 'stats.views': -1 })
    .limit(Number(limit));

  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  if (hasCoords) {
    query = ListingBase.find({
      ...filter,
      geoLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius) * 1000,
        },
      },
    })
      .select('title slug coverImage cityId areaId category vendorId pricing address geoLocation labels vendorType discoveryType tags nearbyLandmarks')
      .limit(Number(limit));
  }

  const items = await query.lean();

  if (!hasCoords) return items;

  return items.map((item) => ({
    ...item,
    distanceKm: haversineDistanceKm({
      lat1: Number(lat),
      lng1: Number(lng),
      lat2: Number(item?.geoLocation?.coordinates?.[1] || 0),
      lng2: Number(item?.geoLocation?.coordinates?.[0] || 0),
    }),
  }));
};

const scoreCrossDomainRecommendation = ({ current, candidate }) => {
  let score = 0;

  if (String(current.cityId) === String(candidate.cityId)) score += 20;
  if (current.areaId && String(current.areaId) === String(candidate.areaId)) score += 20;
  if (current.vendorId && String(current.vendorId) === String(candidate.vendorId)) score += 12;
  if (current.vendorCluster && current.vendorCluster === candidate.vendorCluster) score += 10;
  if (current.category !== candidate.category) score += 8;

  const currentTags = new Set(current.tags || []);
  const sharedTags = (candidate.tags || []).filter((tag) => currentTags.has(tag)).length;
  score += sharedTags * 4;

  if (candidate.labels?.sponsored) score += 2;
  if (candidate.labels?.popularChoice) score += 3;
  if (candidate.labels?.superSaver) score += 2;

  return score;
};

const buildCrossDomainRecommendations = ({ currentListing, candidates = [], limit = 10 }) => {
  const current = {
    cityId: currentListing.cityId,
    areaId: currentListing.areaId,
    category: currentListing.category,
    vendorId: currentListing.vendorId,
    vendorCluster: currentListing.areaCluster,
    tags: currentListing.tags || [],
  };

  return candidates
    .filter((candidate) => String(candidate._id) !== String(currentListing._id))
    .map((candidate) => ({
      ...candidate,
      recommendationScore: scoreCrossDomainRecommendation({ current, candidate }),
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, Number(limit));
};

const getRelatedPlaces = async ({ listingId, limit = 12 }) => {
  const current = await ListingBase.findOne({ _id: listingId, isDeleted: false, isActive: true })
    .select('cityId areaId category vendorId tags areaCluster')
    .lean();
  if (!current) return [];

  const candidates = await ListingBase.find({
    _id: { $ne: listingId },
    isDeleted: false,
    isActive: true,
    status: 'published',
    cityId: current.cityId,
    category: { $ne: current.category },
  })
    .select('title slug coverImage cityId areaId category labels vendorId tags areaCluster pricing')
    .limit(120)
    .lean();

  return buildCrossDomainRecommendations({ currentListing: current, candidates, limit });
};

const getSmartDiscoveryBlocks = async ({ cityId, areaId, lat, lng }) => {
  const [eatDrink, shops, experiences, hotels] = await Promise.all([
    findNearbyByCityAndArea({ cityId, areaId, lat, lng, domain: 'eatDrink', limit: 8 }),
    findNearbyByCityAndArea({ cityId, areaId, lat, lng, domain: 'shops', limit: 8 }),
    findNearbyByCityAndArea({ cityId, areaId, lat, lng, domain: 'experiences', limit: 8 }),
    findNearbyByCityAndArea({ cityId, areaId, lat, lng, domain: 'hotels', limit: 8 }),
  ]);

  return {
    nearbyEatDrink: eatDrink,
    nearbyShopsFashion: shops,
    nearbyExperiences: experiences,
    nearbyHotels: hotels,
  };
};

const buildStorytellingWidgets = ({ listing = {}, area = {} } = {}) => {
  const title = listing.title || 'This place';
  const landmarks = (listing.nearbyLandmarks || area.nearbyLandmarks || []).slice(0, 3);
  return [
    { key: 'why_people_love', title: 'Why people love this place', text: `${title} is known for reliable local discovery and inquiry support.` },
    { key: 'best_time', title: 'Best time to visit', text: listing.seasonalInterest || 'Evening windows and festival periods are generally preferred.' },
    { key: 'famous_for', title: 'Famous for', text: (listing.tags || []).slice(0, 3).join(' • ') || 'Local relevance and curated nearby context.' },
    { key: 'insider_tip', title: 'Local insider tip', text: 'Call ahead and align your route with nearby cards before you visit.' },
    { key: 'hidden_gems', title: 'Nearby hidden gems', text: landmarks.join(' • ') || 'Check nearby recommendations for hidden gems.' },
    { key: 'combo_trail', title: 'Best combo trail', text: 'Combine nearby market, food, and local story points in one trail.' },
    { key: 'festival_special', title: 'Festival special', text: 'Seasonal collections and editorial blocks surface limited-time highlights.' },
  ];
};

export {
  toRadians,
  haversineDistanceKm,
  getCategoryKeysByDomain,
  buildNearbyFilter,
  findNearbyByCityAndArea,
  scoreCrossDomainRecommendation,
  buildCrossDomainRecommendations,
  getRelatedPlaces,
  getSmartDiscoveryBlocks,
  buildStorytellingWidgets,
};

import {
  buildFilterFingerprint,
  buildSectionFilterPlan,
  buildCityOverrideMeta,
  dedupeListingsById,
  serializeListingCard,
  getPreferredImageUrl,
} from '../../src/modules/pages/pages.service.js';

describe('Pages batch render performance primitives', () => {
  const subtypeMap = new Map([
    ['adventure', '507f1f77bcf86cd799439031'],
    ['culture', '507f1f77bcf86cd799439032'],
  ]);

  test('1) 12 section homepage cold render plan batches to <= 3 listing queries', () => {
    const sections = Array.from({ length: 12 }, (_, idx) => ({
      _id: `section-${idx}`,
      filters: idx < 4
        ? { categoryKey: 'hotels', cityId: '507f1f77bcf86cd799439041', limit: 8 }
        : idx < 8
          ? { categoryKey: 'restaurants', cityId: '507f1f77bcf86cd799439041', limit: 8 }
          : { categoryKey: 'thingsToDo', subtypeKey: 'adventure', cityId: '507f1f77bcf86cd799439041', limit: 8 },
    }));

    const plans = sections.map((section) => buildSectionFilterPlan(section, null, subtypeMap, 'detailed'));
    const uniqueHashes = new Set(plans.map((plan) => plan.filterHash).filter(Boolean));

    expect(uniqueHashes.size).toBeLessThanOrEqual(3);
  });

  test('2) duplicate section filters produce identical filter fingerprint', () => {
    const sectionA = {
      _id: 'section-a',
      filters: { categoryKey: 'hotels', cityId: '507f1f77bcf86cd799439041', limit: 10 },
    };
    const sectionB = {
      _id: 'section-b',
      filters: { categoryKey: 'hotels', cityId: '507f1f77bcf86cd799439041', limit: 10 },
    };

    const planA = buildSectionFilterPlan(sectionA, null, subtypeMap, 'detailed');
    const planB = buildSectionFilterPlan(sectionB, null, subtypeMap, 'detailed');

    expect(planA.filterHash).toBe(planB.filterHash);
  });

  test('3) mixed city override metadata reflects request precedence', () => {
    const section = { cityId: '507f1f77bcf86cd799439051', filters: { cityId: '507f1f77bcf86cd799439052' } };

    const requestCityMeta = buildCityOverrideMeta('507f1f77bcf86cd799439053', section);
    const sectionCityMeta = buildCityOverrideMeta(null, section);

    expect(requestCityMeta).toEqual({ appliedCityId: '507f1f77bcf86cd799439053', source: 'request' });
    expect(sectionCityMeta).toEqual({ appliedCityId: '507f1f77bcf86cd799439052', source: 'section' });
  });

  test('4) scheduled section window query behavior covered in cms visibility tests', () => {
    const fingerprint = buildFilterFingerprint({ status: 'published' }, { planPriority: -1 }, 10, 'detailed');
    expect(typeof fingerprint).toBe('string');
  });

  test('5) compact mode payload serializer reduces listing card shape', () => {
    const listing = {
      _id: '507f1f77bcf86cd799439061',
      slug: 'listing-a',
      title: 'Listing A',
      coverImage: { url: 'https://example.com/cover.jpg' },
      pricing: { currency: 'INR', basePrice: 1200 },
      isFeatured: true,
      cityId: { name: 'Jaipur' },
      subtypeId: { name: 'Heritage' },
    };

    const compact = serializeListingCard(listing, 'compact');
    expect(compact).toEqual(expect.objectContaining({
      _id: listing._id,
      slug: listing.slug,
      title: listing.title,
      imageUrl: 'https://example.com/cover.jpg',
    }));
    expect(compact.coverImage).toBeUndefined();
  });

  test('6) detailed mode compatibility retains detailed fields', () => {
    const listing = {
      _id: '507f1f77bcf86cd799439062',
      slug: 'listing-b',
      title: 'Listing B',
      coverImage: { url: 'https://example.com/cover.jpg' },
      pricing: { currency: 'INR', basePrice: 1500 },
      category: 'hotels',
      subtypeId: { name: 'Boutique' },
      cityId: { name: 'Delhi' },
      stats: { views: 100 },
    };

    const detailed = serializeListingCard(listing, 'detailed');
    expect(detailed).toEqual(expect.objectContaining({
      _id: listing._id,
      coverImage: listing.coverImage,
      stats: listing.stats,
    }));
  });

  test('7) subtype landing page normalizes subtypeKey to subtypeId', () => {
    const section = {
      _id: 'section-subtype',
      filters: {
        categoryKey: 'thingsToDo',
        subtypeKey: 'adventure',
        cityId: '507f1f77bcf86cd799439041',
      },
    };

    const plan = buildSectionFilterPlan(section, null, subtypeMap, 'detailed');
    expect(plan.querySpec.filter.subtypeId).toBe('507f1f77bcf86cd799439031');
  });

  test('8) mobile image fallback chooses mobile-first variant when available', () => {
    const listingMobile = {
      coverImage: { variants: { mobile: 'https://example.com/mobile.jpg' }, url: 'https://example.com/default.jpg' },
    };
    const listingDefault = { coverImage: { url: 'https://example.com/default.jpg' } };

    expect(getPreferredImageUrl(listingMobile)).toBe('https://example.com/mobile.jpg');
    expect(getPreferredImageUrl(listingDefault)).toBe('https://example.com/default.jpg');
  });

  test('dedupes duplicate listing hydration results by id', () => {
    const listings = [
      { _id: '507f1f77bcf86cd799439071', title: 'A' },
      { _id: '507f1f77bcf86cd799439071', title: 'A duplicate' },
      { _id: '507f1f77bcf86cd799439072', title: 'B' },
    ];

    const deduped = dedupeListingsById(listings);
    expect(deduped).toHaveLength(2);
  });
});

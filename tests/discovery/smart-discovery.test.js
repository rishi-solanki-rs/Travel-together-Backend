import {
  toRadians,
  haversineDistanceKm,
  getCategoryKeysByDomain,
  buildNearbyFilter,
  scoreCrossDomainRecommendation,
  buildCrossDomainRecommendations,
} from '../../src/operations/discovery/nearby.service.js';

describe('Smart discovery helper coverage', () => {
  test('1) toRadians converts 180 to PI', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 8);
  });

  test('2) haversine distance is zero for same point', () => {
    expect(haversineDistanceKm({ lat1: 28.6, lng1: 77.2, lat2: 28.6, lng2: 77.2 })).toBe(0);
  });

  test('3) haversine distance for nearby points is positive', () => {
    const distance = haversineDistanceKm({ lat1: 28.6139, lng1: 77.209, lat2: 28.7041, lng2: 77.1025 });
    expect(distance).toBeGreaterThan(0);
  });

  test('4) maps eatDrink domain to restaurants', () => {
    expect(getCategoryKeysByDomain('eatDrink')).toEqual(['restaurants']);
  });

  test('5) maps fashion domain to shops', () => {
    expect(getCategoryKeysByDomain('fashion')).toEqual(['shops']);
  });

  test('6) maps unknown domain to nearby fallback set', () => {
    expect(getCategoryKeysByDomain('unknown')).toContain('hotels');
  });

  test('7) nearby filter includes city and area ids', () => {
    const filter = buildNearbyFilter({ cityId: 'city-1', areaId: 'area-1', domain: 'shops' });
    expect(filter.cityId).toBe('city-1');
    expect(filter.areaId).toBe('area-1');
  });

  test('8) nearby filter lowercases landmark', () => {
    const filter = buildNearbyFilter({ cityId: 'city-1', domain: 'nearby', nearbyLandmark: 'Clock Tower' });
    expect(filter.nearbyLandmarks.$in[0]).toBe('clock tower');
  });

  test('9) nearby filter supports sponsored include label', () => {
    const filter = buildNearbyFilter({ cityId: 'city-1', domain: 'nearby', includeLabels: ['sponsored'] });
    expect(filter['labels.sponsored']).toBe(true);
  });

  test('10) nearby filter sets published + active base constraints', () => {
    const filter = buildNearbyFilter({ cityId: 'city-1', domain: 'nearby' });
    expect(filter.status).toBe('published');
    expect(filter.isActive).toBe(true);
  });

  test('11) cross-domain score increases on same city and area', () => {
    const score = scoreCrossDomainRecommendation({
      current: { cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', vendorCluster: 'khan', tags: ['breakfast'] },
      candidate: { cityId: 'c1', areaId: 'a1', category: 'restaurants', vendorId: 'v2', vendorCluster: 'khan', tags: ['breakfast'] },
    });
    expect(score).toBeGreaterThan(40);
  });

  test('12) cross-domain score rewards shared vendor', () => {
    const score = scoreCrossDomainRecommendation({
      current: { cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', vendorCluster: '', tags: [] },
      candidate: { cityId: 'c2', areaId: 'a2', category: 'restaurants', vendorId: 'v1', tags: [] },
    });
    expect(score).toBeGreaterThanOrEqual(20);
  });

  test('13) cross-domain score rewards label flags', () => {
    const score = scoreCrossDomainRecommendation({
      current: { cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: [] },
      candidate: {
        cityId: 'c1',
        areaId: 'a2',
        category: 'restaurants',
        vendorId: 'v2',
        tags: [],
        labels: { sponsored: true, popularChoice: true, superSaver: true },
      },
    });
    expect(score).toBeGreaterThanOrEqual(35);
  });

  test('14) buildCrossDomainRecommendations excludes current listing', () => {
    const results = buildCrossDomainRecommendations({
      currentListing: { _id: 'l1', cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: [] },
      candidates: [{ _id: 'l1', cityId: 'c1', areaId: 'a1', category: 'shops', vendorId: 'v2', tags: [] }],
      limit: 10,
    });
    expect(results).toHaveLength(0);
  });

  test('15) buildCrossDomainRecommendations sorts by score desc', () => {
    const results = buildCrossDomainRecommendations({
      currentListing: { _id: 'l1', cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: ['veg'] },
      candidates: [
        { _id: 'l2', cityId: 'c2', areaId: 'a2', category: 'shops', vendorId: 'v2', tags: [] },
        { _id: 'l3', cityId: 'c1', areaId: 'a1', category: 'restaurants', vendorId: 'v3', tags: ['veg'] },
      ],
      limit: 10,
    });
    expect(results[0]._id).toBe('l3');
    expect(results[0].recommendationScore).toBeGreaterThan(results[1].recommendationScore);
  });

  test('16) buildCrossDomainRecommendations respects limit', () => {
    const candidates = Array.from({ length: 6 }).map((_, idx) => ({
      _id: `l${idx + 2}`,
      cityId: 'c1',
      areaId: 'a1',
      category: idx % 2 ? 'shops' : 'restaurants',
      vendorId: `v${idx + 2}`,
      tags: [],
    }));

    const results = buildCrossDomainRecommendations({
      currentListing: { _id: 'l1', cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: [] },
      candidates,
      limit: 3,
    });

    expect(results).toHaveLength(3);
  });

  test('17) recommendation score includes tag overlap multiplier', () => {
    const score = scoreCrossDomainRecommendation({
      current: { cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: ['saree', 'jewellery'] },
      candidate: { cityId: 'c1', areaId: 'a1', category: 'shops', vendorId: 'v2', tags: ['saree', 'jewellery'] },
    });
    expect(score).toBeGreaterThanOrEqual(56);
  });

  test('18) nearby filter for experiences includes thingsToDo and tribes', () => {
    const filter = buildNearbyFilter({ cityId: 'c1', domain: 'experiences' });
    expect(filter.category.$in).toEqual(expect.arrayContaining(['thingsToDo', 'tribes']));
  });

  test('19) nearby filter for shops includes only shops category key', () => {
    const filter = buildNearbyFilter({ cityId: 'c1', domain: 'shops' });
    expect(filter.category.$in).toEqual(['shops']);
  });

  test('20) recommendation score keeps cross-domain boost when category differs', () => {
    const score = scoreCrossDomainRecommendation({
      current: { cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: [] },
      candidate: { cityId: 'c1', areaId: 'a1', category: 'restaurants', vendorId: 'v2', tags: [] },
    });
    expect(score).toBeGreaterThanOrEqual(48);
  });

  test('21) recommendation score does not crash without labels', () => {
    const score = scoreCrossDomainRecommendation({
      current: { cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: [] },
      candidate: { cityId: 'c1', areaId: 'a1', category: 'shops', vendorId: 'v2', tags: [] },
    });
    expect(typeof score).toBe('number');
  });

  test('22) buildCrossDomainRecommendations returns empty for empty candidates', () => {
    const results = buildCrossDomainRecommendations({
      currentListing: { _id: 'l1', cityId: 'c1', areaId: 'a1', category: 'hotels', vendorId: 'v1', tags: [] },
      candidates: [],
      limit: 5,
    });
    expect(results).toEqual([]);
  });
});

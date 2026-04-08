import { categoriesData, citiesData, seededAreas, seededDiscoveryListings, subtypesData } from '../../src/seeders/productionSeedData.js';

describe('Production seed data coverage', () => {
  test('1) includes the core discovery categories', () => {
    const keys = categoriesData.map((category) => category.key);
    expect(keys).toEqual(expect.arrayContaining(['hotels', 'thingsToDo', 'restaurants', 'shops', 'tribes', 'kidsWorld', 'destinations']));
  });

  test('2) includes production subtypes for restaurants and shops', () => {
    const keys = subtypesData.map((subtype) => subtype.key);
    expect(keys).toEqual(expect.arrayContaining(['street_food', 'heritage_dining', 'handloom_bazaar', 'market_stall', 'heritage_walk']));
  });

  test('3) includes the seeded discovery cities', () => {
    const slugs = citiesData.map((city) => city.slug);
    expect(slugs).toEqual(expect.arrayContaining(['jaipur', 'delhi', 'udaipur', 'varanasi', 'goa']));
  });

  test('4) every seeded area has nearby landmarks and a city reference', () => {
    expect(seededAreas.length).toBeGreaterThan(0);
    for (const area of seededAreas) {
      expect(area.citySlug).toBeTruthy();
      expect(Array.isArray(area.nearbyLandmarks)).toBe(true);
      expect(area.nearbyLandmarks.length).toBeGreaterThan(0);
    }
  });

  test('5) seeded listings span public discovery categories and landmarks', () => {
    expect(seededDiscoveryListings.length).toBeGreaterThan(0);

    const categoryKeys = seededDiscoveryListings.map((listing) => listing.categoryKey);
    expect(categoryKeys).toEqual(expect.arrayContaining(['restaurants', 'shops', 'thingsToDo', 'hotels']));

    for (const listing of seededDiscoveryListings) {
      expect(listing.citySlug).toBeTruthy();
      expect(listing.areaSlug).toBeTruthy();
      expect(Array.isArray(listing.nearbyLandmarks)).toBe(true);
      expect(listing.nearbyLandmarks.length).toBeGreaterThan(0);
      expect(listing.vendor?.ownerEmail).toContain('@');
    }
  });
});
import { jest } from '@jest/globals';
import City from '../../src/shared/models/City.model.js';
import { parseFlags, buildPatchForCity } from '../../scripts/migrate-city-geo-cms-v2.js';

describe('City Geo CMS v2 migration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parses dry-run and apply flags safely', () => {
    const dry = parseFlags(['--dry-run']);
    const apply = parseFlags(['--apply']);

    expect(dry.dryRun).toBe(true);
    expect(dry.apply).toBe(false);
    expect(apply.dryRun).toBe(false);
    expect(apply.apply).toBe(true);
  });

  test('builds normalized patch from legacy city document', async () => {
    jest.spyOn(City, 'findOne').mockReturnValue({
      lean: async () => null,
    });

    const city = {
      _id: '507f1f77bcf86cd799439055',
      name: 'Udaipur',
      state: 'Rajasthan',
      country: 'India',
      slug: '',
      bannerMedia: [{ url: 'https://example.com/udaipur.jpg' }],
      stats: { totalViews: 5 },
      content: {},
    };

    const patch = await buildPatchForCity(city, {
      countryBySlug: new Map(),
      stateByCountryAndSlug: new Map(),
    });

    expect(patch.slug).toContain('udaipur');
    expect(patch.content.banner.banners).toHaveLength(1);
    expect(patch.content.story.storyBlocks).toEqual([]);
    expect(patch.content.gallery).toBeDefined();
    expect(patch.content.modules).toBeDefined();
  });
});

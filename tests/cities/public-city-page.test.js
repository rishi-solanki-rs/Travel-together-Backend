import { jest } from '@jest/globals';
import City from '../../src/shared/models/City.model.js';
import Attraction from '../../src/shared/models/Attraction.model.js';
import { cache } from '../../src/config/redis.js';
import { buildPublicCityResponse, getPublicCityBySlug } from '../../src/modules/cities/cities.service.js';

describe('Public city landing response', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns frontend-ready render blocks in required sequence', async () => {
    jest.spyOn(Attraction, 'find').mockReturnValue({
      sort: () => ({
        lean: async () => [
          { _id: '507f1f77bcf86cd799439011', title: 'Amber Fort', media: [{ url: 'https://example.com/a.jpg' }] },
        ],
      }),
    });

    const city = {
      _id: '507f1f77bcf86cd799439099',
      name: 'Jaipur',
      slug: 'jaipur',
      state: 'Rajasthan',
      country: 'India',
      isActive: true,
      content: {
        banner: { cityName: 'Jaipur', banners: [{ url: 'https://example.com/banner.jpg' }] },
        story: { storyBlocks: [{ title: 'Now', content: 'Pink city', order: 1 }] },
        introduction: { mainContent: 'Welcome to Jaipur' },
        fraud: { fraudAlerts: ['Use licensed guides'] },
        attractions: { attractionIds: ['507f1f77bcf86cd799439011'] },
        experiences: { experiences: [{ title: 'Bazaar walk', order: 1 }] },
        gallery: { featuredImages: [{ url: 'https://example.com/g1.jpg' }] },
        faqs: { faqs: [{ question: 'Best time?', answer: 'Oct-Feb', order: 1 }] },
        modules: { hotels: { status: true }, tours: { status: true }, restaurants: { status: false }, shopping: { status: true } },
      },
      seoConfig: {},
    };

    const response = await buildPublicCityResponse(city);

    expect(response.basicInfo.cityName).toBe('Jaipur');
    expect(response.storyTimeline.storyBlocks).toHaveLength(1);
    expect(response.renderBlocks).toBeDefined();
    expect(Object.keys(response.renderBlocks)).toEqual([
      'hero',
      'story',
      'intro',
      'fraud',
      'attractions',
      'experiences',
      'gallery',
      'faq',
      'modules',
    ]);
    expect(response.seo.ogImage).toBe('https://example.com/banner.jpg');
  });

  test('hides deleted or missing city slug results', async () => {
    jest.spyOn(cache, 'get').mockResolvedValue(null);
    jest.spyOn(cache, 'set').mockResolvedValue(undefined);

    jest.spyOn(City, 'findOne').mockReturnValue({
      populate: () => ({
        populate: () => ({
          lean: async () => null,
        }),
      }),
    });

    await expect(getPublicCityBySlug('missing-city')).rejects.toThrow('City not found');
  });
});

import { normalizeSectionPayload } from '../../src/modules/cities/cities.service.js';

describe('City section patch normalization', () => {
  test('normalizes all 9 sections with alias compatibility', () => {
    const samples = [
      ['cityBanner', { cityName: 'Jaipur', banners: [{ url: 'https://example.com/banner.jpg' }] }],
      ['story', { storyBlocks: [{ title: 'Founding', content: 'Historic city', order: 2 }, { title: 'Now', content: 'Modern city', order: 1 }] }],
      ['introduction', { mainContent: 'Intro', extraDescriptions: ['A', 'B'] }],
      ['fraud', { fraudAlerts: ['Avoid fake guides'] }],
      ['attractions', { attractionIds: ['507f1f77bcf86cd799439011'] }],
      ['experiences', { experiences: [{ title: 'Walk', order: 2 }, { title: 'Food', order: 1 }] }],
      ['throughTheLenses', { featuredImages: [{ url: 'https://example.com/f1.jpg' }] }],
      ['faqs', { faqs: [{ question: 'Q2', answer: 'A2', order: 2 }, { question: 'Q1', answer: 'A1', order: 1 }] }],
      ['modules', { hotels: { status: true }, shopping: { status: false } }],
    ];

    const results = samples.map(([section, payload]) => normalizeSectionPayload(section, payload, {}));

    expect(results).toHaveLength(9);
    expect(results[0].key).toBe('banner');
    expect(results[6].key).toBe('gallery');
    expect(results[1].data.storyBlocks[0].title).toBe('Now');
    expect(results[5].data.experiences[0].title).toBe('Food');
    expect(results[7].data.faqs[0].question).toBe('Q1');
  });

  test('rejects invalid section', () => {
    expect(() => normalizeSectionPayload('invalidSection', {}, {})).toThrow('Invalid city section');
  });

  test('keeps empty arrays safe and normalized', () => {
    const result = normalizeSectionPayload('faqs', { faqs: [] }, {});
    expect(result.key).toBe('faqs');
    expect(Array.isArray(result.data.faqs)).toBe(true);
    expect(result.data.faqs).toHaveLength(0);
  });
});

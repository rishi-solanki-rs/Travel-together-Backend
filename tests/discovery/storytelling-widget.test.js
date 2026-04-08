import { buildStorytellingWidgets } from '../../src/operations/discovery/nearby.service.js';

describe('Discovery storytelling widgets', () => {
  test('builds stable storytelling widget list', () => {
    const widgets = buildStorytellingWidgets({
      listing: {
        title: 'Royal Bazaar',
        tags: ['handloom', 'festival'],
        nearbyLandmarks: ['clock tower', 'city palace'],
        seasonalInterest: 'festival',
      },
    });

    expect(Array.isArray(widgets)).toBe(true);
    expect(widgets.length).toBeGreaterThanOrEqual(7);
    expect(widgets[0].title).toBe('Why people love this place');
  });

  test('falls back for empty listing payload', () => {
    const widgets = buildStorytellingWidgets({});
    expect(widgets[2].title).toBe('Famous for');
    expect(typeof widgets[2].text).toBe('string');
  });
});

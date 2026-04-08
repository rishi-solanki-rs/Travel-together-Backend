import {
  summarizeCollectionsBySeason,
  buildCollectionFilter,
} from '../../src/modules/collections/collections.service.js';

describe('Collection manager helpers', () => {
  test('summarizes collections by season', () => {
    const summary = summarizeCollectionsBySeason([
      { season: 'summer' },
      { season: 'summer' },
      { season: 'wedding' },
      {},
    ]);

    expect(summary.summer).toBe(2);
    expect(summary.wedding).toBe(1);
    expect(summary.all).toBe(1);
  });

  test('builds vendor-scoped filter', () => {
    const filter = buildCollectionFilter({ query: { cityId: 'c-1', featuredOnly: true, tag: 'festival' }, vendorScope: 'v-1' });
    expect(filter.vendorId).toBe('v-1');
    expect(filter.cityId).toBe('c-1');
    expect(filter.isFeatured).toBe(true);
    expect(filter.tags.$in[0]).toBe('festival');
  });
});

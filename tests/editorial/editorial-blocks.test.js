import {
  isEditorialLive,
  buildEditorialFilter,
  countSeasonalEditorialBlocks,
} from '../../src/modules/editorial/editorial.service.js';

describe('Editorial blocks helpers', () => {
  test('is live when date is inside active window', () => {
    const now = new Date('2026-04-07T10:00:00.000Z');
    expect(isEditorialLive({ startsAt: '2026-04-01T00:00:00.000Z', endsAt: '2026-04-30T00:00:00.000Z', now })).toBe(true);
  });

  test('is not live before start', () => {
    const now = new Date('2026-03-20T10:00:00.000Z');
    expect(isEditorialLive({ startsAt: '2026-04-01T00:00:00.000Z', endsAt: '2026-04-30T00:00:00.000Z', now })).toBe(false);
  });

  test('builds public filter with seasonal tag', () => {
    const filter = buildEditorialFilter({ query: { season: 'summer', tag: 'festival' }, publicOnly: true });
    expect(filter.season).toBe('summer');
    expect(filter.tags.$in[0]).toBe('festival');
    expect(filter.isActive).toBe(true);
  });

  test('counts seasonal block rows', () => {
    const count = countSeasonalEditorialBlocks([{ season: 'all' }, { season: 'summer' }, { season: 'wedding' }]);
    expect(count).toBe(2);
  });
});

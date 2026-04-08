import { normalizeOrderedMediaIds } from '../../src/modules/bookingHub/bookingHub.service.js';

describe('Phase 7 - media management', () => {
  test('deduplicates and preserves media order', () => {
    const ids = normalizeOrderedMediaIds(['a', 'b', 'a', 'c']);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

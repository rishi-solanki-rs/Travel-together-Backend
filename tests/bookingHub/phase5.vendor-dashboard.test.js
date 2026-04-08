import { computeOccupancyPercent } from '../../src/modules/bookingHub/bookingHub.service.js';

describe('Phase 5 - vendor dashboard', () => {
  test('computes occupancy percentage correctly', () => {
    expect(computeOccupancyPercent(25, 50)).toBe(50);
  });

  test('handles zero total safely', () => {
    expect(computeOccupancyPercent(10, 0)).toBe(0);
  });
});

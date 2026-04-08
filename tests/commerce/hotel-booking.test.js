import {
  enumerateStayDates,
  validateAvailabilitySnapshot,
  computeOccupancyMetrics,
} from '../../src/modules/hotels/hotels.commerce.service.js';

describe('Phase 6 hotel booking engine primitives', () => {
  test('1) enumerates nights across date range', () => {
    const dates = enumerateStayDates('2026-06-01T00:00:00.000Z', '2026-06-04T00:00:00.000Z');
    expect(dates).toHaveLength(3);
  });

  test('2) availability snapshot accepts valid stay window', () => {
    const stayDates = enumerateStayDates('2026-06-01T00:00:00.000Z', '2026-06-03T00:00:00.000Z');
    const rows = [
      { date: new Date('2026-06-01T00:00:00.000Z'), isBlackout: false, availability: 2 },
      { date: new Date('2026-06-02T00:00:00.000Z'), isBlackout: false, availability: 2 },
    ];

    expect(validateAvailabilitySnapshot({ calendarRows: rows, stayDates, roomsBooked: 1 })).toBe(true);
  });

  test('3) occupancy metrics compute percentage safely', () => {
    const metrics = computeOccupancyMetrics({
      bookings: [{ nights: 2, roomsBooked: 1 }, { nights: 1, roomsBooked: 2 }],
      fromDate: '2026-06-01T00:00:00.000Z',
      toDate: '2026-06-05T00:00:00.000Z',
      roomInventory: 3,
    });

    expect(metrics.totalNights).toBe(12);
    expect(metrics.bookedNights).toBe(4);
    expect(metrics.occupancyRate).toBeCloseTo(33.33, 2);
  });
});

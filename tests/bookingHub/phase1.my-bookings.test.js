import { normalizeBookingRecord, filterBookingRows } from '../../src/modules/bookingHub/bookingHub.service.js';

describe('Phase 1 - my bookings', () => {
  test('normalizes booking row shape', () => {
    const row = normalizeBookingRecord('hotel', {
      _id: '507f191e810c19729de860ea',
      status: 'confirmed',
      checkInDate: new Date('2030-01-10T00:00:00.000Z'),
      amount: { total: 1200 },
      createdAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    expect(row).toMatchObject({
      type: 'hotel',
      status: 'confirmed',
      totalAmount: 1200,
      invoiceAvailable: false,
    });
  });

  test('filters upcoming bookings by date and status', () => {
    const rows = [
      { id: '1', type: 'hotel', status: 'confirmed', bookingDate: '2099-01-01', createdAt: '2099-01-01' },
      { id: '2', type: 'hotel', status: 'cancelled', bookingDate: '2099-01-02', createdAt: '2099-01-02' },
    ];

    const filtered = filterBookingRows(rows, { upcoming: true });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });
});

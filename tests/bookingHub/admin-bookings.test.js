import { jest } from '@jest/globals';

const hotelFindMock = jest.fn();
const sessionFindMock = jest.fn();
const orderFindMock = jest.fn();
const tourFindMock = jest.fn();

jest.unstable_mockModule('../../src/shared/models/HotelBooking.model.js', () => ({ default: { find: hotelFindMock } }));
jest.unstable_mockModule('../../src/shared/models/SessionBooking.model.js', () => ({ default: { find: sessionFindMock } }));
jest.unstable_mockModule('../../src/shared/models/Order.model.js', () => ({ default: { find: orderFindMock } }));
jest.unstable_mockModule('../../src/shared/models/TourReservation.model.js', () => ({ default: { find: tourFindMock } }));

let getAdminBookings;
let getAdminBookingTimeline;

beforeAll(async () => {
  ({ getAdminBookings, getAdminBookingTimeline } = await import('../../src/modules/bookingHub/bookingHub.service.js'));
});

describe('Admin booking endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('merges booking sources and paginates results', async () => {
    hotelFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([
      { _id: 'h1', vendorId: 'v1', status: 'confirmed', checkInDate: new Date('2030-01-05T00:00:00.000Z'), amount: { total: 1500 }, createdAt: new Date('2030-01-01T00:00:00.000Z') },
    ]) });
    sessionFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([
      { _id: 'k1', vendorId: 'v2', status: 'hold', sessionDate: new Date('2030-01-06T00:00:00.000Z'), amount: 200, createdAt: new Date('2030-01-02T00:00:00.000Z') },
    ]) });
    orderFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([
      { _id: 'o1', vendorId: 'v3', status: 'delivered', totals: { total: 400 }, createdAt: new Date('2030-01-03T00:00:00.000Z') },
    ]) });
    tourFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([
      { _id: 't1', vendorId: 'v4', status: 'confirmed', amount: { total: 800 }, createdAt: new Date('2030-01-04T00:00:00.000Z') },
    ]) });

    const result = await getAdminBookings({ page: 1, perPage: 2 });

    expect(result.pagination.total).toBe(4);
    expect(result.bookings).toHaveLength(2);
    expect(result.bookings[0].id).toBe('t1');
    expect(result.bookings[0].vendorId).toBe('v4');
    expect(result.bookings[1].id).toBe('o1');
  });

  test('builds a booking timeline from transition history', async () => {
    hotelFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    sessionFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    orderFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    tourFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([
      {
        _id: 't9',
        vendorId: 'v9',
        status: 'confirmed',
        amount: { total: 999 },
        createdAt: new Date('2030-01-01T00:00:00.000Z'),
        transitionHistory: [
          { fromStatus: 'hold', toStatus: 'confirmed', changedAt: new Date('2030-01-02T00:00:00.000Z'), note: 'approved' },
        ],
        adminNotes: [
          { note: 'manual review complete', status: 'confirmed', at: new Date('2030-01-03T00:00:00.000Z') },
        ],
      },
    ]) });

    const result = await getAdminBookingTimeline({ page: 1, perPage: 10, vendorId: 'v9' });

    expect(result.summary.totalBookings).toBe(1);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].action).toBe('admin_note');
    expect(result.items[1].action).toBe('state_transition');
    expect(result.items[2].action).toBe('created');
  });
});

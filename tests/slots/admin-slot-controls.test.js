import { jest } from '@jest/globals';
import { SLOT_STATUS } from '../../src/shared/constants/index.js';

const withTransactionMock = jest.fn(async (handler) => handler({ session: {} }));
const recordAuditEventMock = jest.fn().mockResolvedValue(null);
const assignmentFindByIdMock = jest.fn();
const assignmentFindOneMock = jest.fn();
const inventoryFindOneAndUpdateMock = jest.fn().mockResolvedValue({ _id: 'inv-1' });
const listingFindByIdAndUpdateMock = jest.fn().mockResolvedValue({ _id: 'list-1' });
const assignmentFindMock = jest.fn();
const inventoryFindMock = jest.fn();

jest.unstable_mockModule('../../src/shared/utils/withTransaction.js', () => ({ default: withTransactionMock }));
jest.unstable_mockModule('../../src/operations/audit/audit.service.js', () => ({ recordAuditEvent: recordAuditEventMock, recordFinancialLedgerEvent: jest.fn() }));
jest.unstable_mockModule('../../src/shared/models/SlotAssignment.model.js', () => ({ default: { findById: assignmentFindByIdMock, find: assignmentFindMock, findOne: assignmentFindOneMock } }));
jest.unstable_mockModule('../../src/shared/models/SlotInventory.model.js', () => ({ default: { find: inventoryFindMock, findOneAndUpdate: inventoryFindOneAndUpdateMock } }));
jest.unstable_mockModule('../../src/shared/models/ListingBase.model.js', () => ({ default: { findByIdAndUpdate: listingFindByIdAndUpdateMock } }));
jest.unstable_mockModule('../../src/shared/models/Vendor.model.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../../src/shared/models/VendorSubscription.model.js', () => ({ default: { findOne: jest.fn() } }));

const { releaseSlotAssignment, getSlotAnalytics } = await import('../../src/modules/slots/slots.service.js');

describe('Admin slot controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('releases an active assignment and frees inventory', async () => {
    const assignment = {
      _id: 'a1',
      status: SLOT_STATUS.ASSIGNED,
      vendorId: 'v1',
      inventoryId: 'inv-1',
      listingId: 'list-1',
      slotType: 'city_featured',
      toObject: () => ({ _id: 'a1', status: SLOT_STATUS.ASSIGNED }),
      save: jest.fn().mockResolvedValue(true),
    };

    assignmentFindByIdMock.mockReturnValue({ session: jest.fn().mockResolvedValue(assignment) });
    assignmentFindOneMock.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const result = await releaseSlotAssignment('a1');

    expect(result.status).toBe(SLOT_STATUS.EXPIRED);
    expect(assignment.save).toHaveBeenCalled();
    expect(inventoryFindOneAndUpdateMock).toHaveBeenCalled();
    expect(listingFindByIdAndUpdateMock).toHaveBeenCalled();
    expect(recordAuditEventMock).toHaveBeenCalled();
  });

  test('summarizes slot analytics and mismatch counts', async () => {
    assignmentFindMock.mockImplementation((query) => {
      if (query?.status === SLOT_STATUS.ASSIGNED) {
        return {
          populate: jest.fn().mockReturnValue({
            session: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                { _id: 'm1', vendorId: 'vendor-1', subscriptionId: null },
              ]),
            }),
          }),
        };
      }

      return {
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: 'a1', vendorId: 'vendor-1', status: SLOT_STATUS.ASSIGNED, slotType: 'city_featured' },
            { _id: 'a2', vendorId: 'vendor-1', status: SLOT_STATUS.EXPIRED, slotType: 'city_featured' },
          ]),
        }),
      };
    });

    inventoryFindMock.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: 'i1', totalSlots: 10, assignedSlots: 2, availableSlots: 8 },
        ]),
      }),
    });

    const result = await getSlotAnalytics({ vendorId: 'vendor-1', slotType: 'city_featured' });

    expect(result.summary.totalAssignments).toBe(2);
    expect(result.summary.activeAssignments).toBe(1);
    expect(result.summary.expiredAssignments).toBe(1);
    expect(result.summary.mismatchCount).toBe(1);
    expect(result.summary.totalInventorySlots).toBe(10);
    expect(result.mismatches).toHaveLength(1);
  });
});

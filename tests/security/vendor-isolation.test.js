import { jest } from '@jest/globals';

const createRiskEventMock = jest.fn();
const roleFindOneMock = jest.fn();

jest.unstable_mockModule('../../src/shared/models/SessionRiskEvent.model.js', () => ({
  default: { create: createRiskEventMock },
}));

jest.unstable_mockModule('../../src/shared/models/Role.model.js', () => ({
  default: { findOne: roleFindOneMock },
}));

jest.unstable_mockModule('../../src/shared/models/User.model.js', () => ({
  default: {},
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  getRedisClient: () => ({ get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(1) }),
}));

const { enforceVendorOwnership, canWriteFinanceLedger, validateBreakGlass } = await import('../../src/operations/security/accessGovernance.service.js');

describe('Phase 8 vendor isolation and governance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BREAK_GLASS_TOKEN = 'bg-secret';
  });

  test('5) vendor cross-access is denied for mismatched vendor id', () => {
    const allowed = enforceVendorOwnership({
      user: { role: 'vendorAdmin', vendorId: 'vendor-1' },
      vendorId: 'vendor-2',
    });
    expect(allowed).toBe(false);
  });

  test('6) finance ledger unauthorized write is denied for api source', async () => {
    roleFindOneMock.mockReturnValue({ populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
    const allowed = await canWriteFinanceLedger({ user: null, source: 'api' });
    expect(allowed).toBe(false);
  });

  test('10) admin break-glass override writes mandatory audit risk event', async () => {
    const allowed = await validateBreakGlass({
      req: {
        headers: {
          'x-break-glass-token': 'bg-secret',
          'x-break-glass-reason': 'incident',
          'user-agent': 'jest',
        },
        ip: '127.0.0.1',
      },
      user: { id: 'u-admin', role: 'superAdmin', sessionId: 's1' },
      permission: 'finance.ledger.write',
    });

    expect(allowed).toBe(true);
    expect(createRiskEventMock).toHaveBeenCalled();
  });
});

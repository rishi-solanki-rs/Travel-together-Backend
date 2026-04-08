import { jest } from '@jest/globals';

const findOneSessionMock = jest.fn();
const updateManySessionMock = jest.fn();
const createRiskMock = jest.fn();
const createRevocationMock = jest.fn();
const findOneRevocationMock = jest.fn();

jest.unstable_mockModule('../../src/shared/models/AuthSession.model.js', () => ({
  default: {
    findOne: findOneSessionMock,
    updateMany: updateManySessionMock,
  },
}));

jest.unstable_mockModule('../../src/shared/models/SessionRiskEvent.model.js', () => ({
  default: {
    create: createRiskMock,
  },
}));

jest.unstable_mockModule('../../src/shared/models/TokenRevocation.model.js', () => ({
  default: {
    create: createRevocationMock,
    findOne: findOneRevocationMock,
  },
}));

jest.unstable_mockModule('../../src/shared/models/DeviceFingerprint.model.js', () => ({
  default: { findOneAndUpdate: jest.fn() },
}));

jest.unstable_mockModule('../../src/shared/models/User.model.js', () => ({
  default: { findOne: jest.fn(), save: jest.fn() },
}));

jest.unstable_mockModule('../../src/operations/alerts/alerting.service.js', () => ({
  emitAlert: jest.fn(),
}));

const { detectRefreshReplay, isTokenRevoked, hashToken } = await import('../../src/operations/security/zeroTrustAuth.service.js');

describe('Phase 8 security token replay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1) token replay attack revokes session family', async () => {
    findOneSessionMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        status: 'active',
        refreshTokenHash: 'hash-old',
        sessionFamilyId: 'fam-1',
      }),
    });

    const result = await detectRefreshReplay({
      userId: 'u1',
      sessionId: 's1',
      incomingRefreshTokenHash: 'hash-new',
      req: { ip: '1.2.3.4', headers: { 'user-agent': 'jest-agent' } },
    });

    expect(result.replay).toBe(true);
    expect(updateManySessionMock).toHaveBeenCalled();
    expect(createRevocationMock).toHaveBeenCalled();
  });

  test('2) revoked session replay is blocked by revocation registry check', async () => {
    findOneRevocationMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'rev-1' }),
    });

    const revoked = await isTokenRevoked({
      tokenType: 'refresh',
      tokenHash: hashToken('refresh-token-1'),
      userId: 'u1',
      sessionId: 's1',
    });

    expect(revoked).toBe(true);
  });
});

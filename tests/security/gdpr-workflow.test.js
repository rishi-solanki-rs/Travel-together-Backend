import { jest } from '@jest/globals';

const userFindByIdMock = jest.fn();
const mediaUpdateManyMock = jest.fn();
const privacyCreateMock = jest.fn();
const consentCreateMock = jest.fn();
const mediaFindMock = jest.fn();
const consentFindMock = jest.fn();

jest.unstable_mockModule('../../src/shared/models/User.model.js', () => ({
  default: {
    findById: userFindByIdMock,
  },
}));

jest.unstable_mockModule('../../src/shared/models/MediaAsset.model.js', () => ({
  default: {
    updateMany: mediaUpdateManyMock,
    find: mediaFindMock,
  },
}));

jest.unstable_mockModule('../../src/shared/models/PrivacyRequest.model.js', () => ({
  default: {
    create: privacyCreateMock,
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  },
}));

jest.unstable_mockModule('../../src/shared/models/ConsentEvent.model.js', () => ({
  default: {
    create: consentCreateMock,
    find: consentFindMock,
  },
}));

jest.unstable_mockModule('../../src/shared/models/SessionRiskEvent.model.js', () => ({
  default: {
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    create: jest.fn(),
  },
}));

const { exportUserData, executeRightToForget } = await import('../../src/operations/security/privacyCompliance.service.js');
const { maskPII } = await import('../../src/operations/security/runtimeSecurity.service.js');

describe('Phase 8 GDPR and privacy workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('8) PII masking validation masks sensitive fields', () => {
    const masked = maskPII({
      email: 'alice@example.com',
      phone: '9876543210',
      profile: { address: 'Street 1', passportNumber: 'P12345' },
    });

    expect(masked.email).toContain('***');
    expect(masked.phone).toContain('*');
    expect(masked.profile.address).toBe('[MASKED]');
    expect(masked.profile.passportNumber).toBe('[MASKED]');
  });

  test('9) GDPR delete verification anonymizes user and schedules media delete', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    userFindByIdMock.mockResolvedValue({
      _id: 'u1',
      save: saveMock,
      name: 'Name',
      email: 'name@example.com',
    });
    mediaUpdateManyMock.mockResolvedValue({ modifiedCount: 2 });

    const result = await executeRightToForget({ userId: 'u1' });
    expect(result.deleted).toBe(true);
    expect(saveMock).toHaveBeenCalled();
    expect(mediaUpdateManyMock).toHaveBeenCalled();
  });

  test('access export returns masked payload contract', async () => {
    userFindByIdMock.mockReturnValue({ lean: jest.fn().mockResolvedValue({ email: 'bob@example.com', phone: '9998887777' }) });
    mediaFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    consentFindMock.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });

    const out = await exportUserData({ userId: 'u2' });
    expect(out.user.email).toContain('***');
    expect(out.exportedAt).toBeDefined();
  });
});

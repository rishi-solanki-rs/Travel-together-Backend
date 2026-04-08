import { jest } from '@jest/globals';

const findOneNonceMock = jest.fn();
const createNonceMock = jest.fn();

jest.unstable_mockModule('../../src/shared/models/WebhookReplayNonce.model.js', () => ({
  default: {
    findOne: findOneNonceMock,
    create: createNonceMock,
  },
}));

jest.unstable_mockModule('../../src/shared/models/PayoutExportLog.model.js', () => ({
  default: {
    create: jest.fn(),
  },
}));

const {
  computeHmac,
  verifySignedWebhook,
  registerWebhookNonce,
  protectSettlementIdempotency,
} = await import('../../src/operations/security/webhookSecurity.service.js');

describe('Phase 8 webhook signature security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('3) webhook spoof with invalid signature is rejected', () => {
    const payload = JSON.stringify({ amount: 1000, event: 'payment.succeeded' });
    const valid = verifySignedWebhook({
      rawPayload: payload,
      signature: 'spoofed-signature',
      secret: 'secret-1',
    });

    expect(valid).toBe(false);
  });

  test('4) duplicate callback nonce is detected and ignored', async () => {
    findOneNonceMock
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ _id: 'n1' }) });
    createNonceMock.mockResolvedValue({ _id: 'n1' });

    const payload = JSON.stringify({ event: 'settlement.completed' });
    const signature = computeHmac({ payload, secret: 'secret-2' });

    const first = await registerWebhookNonce({
      provider: 'gateway-a',
      nonce: 'nonce-123',
      signature,
      eventId: 'evt-1',
      rawPayload: payload,
    });
    const second = await protectSettlementIdempotency({
      provider: 'gateway-a:settlement',
      callbackId: 'nonce-123',
      signature,
      rawPayload: payload,
    });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(false);
  });
});

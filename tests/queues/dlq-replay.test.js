import { jest } from '@jest/globals';

const createMock = jest.fn();
const findByIdMock = jest.fn();
const saveMock = jest.fn();
const lpushMock = jest.fn();

jest.unstable_mockModule('../../src/shared/models/QueueDeadLetter.model.js', () => ({
  default: {
    create: createMock,
    findById: findByIdMock,
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  getRedisClient: () => ({ lpush: lpushMock }),
}));

const { calculateBackoffDelay, executeWithRetry, replayDeadLetter } = await import('../../src/operations/queue/queue.service.js');

describe('Phase 7 queue DLQ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('4) DLQ poison retry stores failed jobs and marks quarantine when attempts are high', async () => {
    createMock.mockImplementation(async (doc) => ({ ...doc, _id: 'dlq-1' }));

    const job = {
      queueName: 'refunds',
      jobName: 'refund-worker',
      payload: { id: 1 },
      attempts: 0,
      maxAttempts: 2,
      poisonThreshold: 1,
      correlationId: 'corr-dlq',
    };

    const out = await executeWithRetry(job, async () => {
      throw new Error('poison payload');
    }, { maxAttempts: 2, poisonThreshold: 1 });

    expect(out.ok).toBe(false);
    expect(createMock).toHaveBeenCalled();
    expect(createMock.mock.calls[0][0].quarantined).toBe(true);
  });

  test('13) replay support reprocesses dead letter payload', async () => {
    findByIdMock.mockResolvedValue({
      _id: 'dlq-2',
      queueName: 'emails',
      jobName: 'send',
      payload: { to: 'x@example.com' },
      correlationId: 'corr-replay',
      save: saveMock,
    });

    const out = await replayDeadLetter('dlq-2', async () => true);
    expect(out.ok).toBe(true);
    expect(saveMock).toHaveBeenCalled();
  });

  test('14) retry policy uses exponential backoff', () => {
    expect(calculateBackoffDelay(1, 200)).toBe(200);
    expect(calculateBackoffDelay(2, 200)).toBe(400);
    expect(calculateBackoffDelay(3, 200)).toBe(800);
  });
});

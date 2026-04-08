import { jest } from '@jest/globals';
import { redactForAudit, buildDiffFields } from '../../src/operations/audit/auditRedaction.js';
import AuditEvent from '../../src/shared/models/AuditEvent.model.js';
import correlationIdMiddleware from '../../src/middlewares/correlationId.js';
import { getCorrelationId } from '../../src/shared/context/requestContext.js';

describe('Phase 7 audit engine', () => {
  test('6) immutable audit event default is true', () => {
    const immutablePath = AuditEvent.schema.path('immutable');
    expect(immutablePath.defaultValue).toBe(true);
  });

  test('7) correlationId propagation through middleware and request context', (done) => {
    const req = {
      headers: { 'x-correlation-id': 'corr-123' },
      method: 'GET',
      originalUrl: '/api/v1/test',
      ip: '127.0.0.1',
    };
    const res = { setHeader: jest.fn() };

    correlationIdMiddleware(req, res, () => {
      expect(req.correlationId).toBe('corr-123');
      expect(getCorrelationId()).toBe('corr-123');
      done();
    });
  });

  test('11) redaction layer removes sensitive values from snapshots', () => {
    const { output, redactedFields } = redactForAudit({
      email: 'user@example.com',
      password: 'secret',
      payment: { cardNumber: '4111111111111111', cvv: '123' },
    });

    expect(output.password).toBe('[REDACTED]');
    expect(output.payment.cardNumber).toBe('[REDACTED]');
    expect(output.payment.cvv).toBe('[REDACTED]');
    expect(redactedFields.length).toBeGreaterThan(0);
  });

  test('12) audit diff computes before/after field changes', () => {
    const fields = buildDiffFields({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
    expect(fields).toEqual(expect.arrayContaining(['b', 'c']));
  });
});

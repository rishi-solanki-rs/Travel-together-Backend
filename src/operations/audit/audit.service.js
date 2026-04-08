import AuditActor from '../../shared/models/AuditActor.model.js';
import AuditContext from '../../shared/models/AuditContext.model.js';
import AuditDiff from '../../shared/models/AuditDiff.model.js';
import AuditEvent from '../../shared/models/AuditEvent.model.js';
import FinancialLedgerEvent from '../../shared/models/FinancialLedgerEvent.model.js';
import logger from '../../utils/logger.js';
import { getRequestContext, getCorrelationId } from '../../shared/context/requestContext.js';
import { redactForAudit, buildDiffFields } from './auditRedaction.js';

const buildActorPayload = (actor = {}, requestContext = {}) => ({
  actorType: actor.actorType || (actor.actorId ? 'user' : 'system'),
  actorId: actor.actorId || null,
  vendorId: actor.vendorId || null,
  email: actor.email || null,
  ipAddress: actor.ipAddress || requestContext.ipAddress || null,
  userAgent: actor.userAgent || requestContext.userAgent || null,
});

const buildContextPayload = (context = {}, requestContext = {}) => ({
  correlationId: context.correlationId || requestContext.correlationId || getCorrelationId() || 'missing-correlation-id',
  requestId: context.requestId || requestContext.requestId || null,
  source: context.source || requestContext.source || 'api',
  routePath: context.routePath || requestContext.routePath || null,
  method: context.method || requestContext.method || null,
  module: context.module || null,
  traceId: context.traceId || null,
  spanId: context.spanId || null,
  tags: context.tags || {},
});

const recordAuditEvent = async ({
  eventType,
  module,
  entityType,
  entityId,
  action,
  severity = 'info',
  actor = {},
  context = {},
  beforeSnapshot = null,
  afterSnapshot = null,
  metadata = {},
}) => {
  try {
    const requestContext = getRequestContext();
    const actorDoc = await AuditActor.create(buildActorPayload(actor, requestContext));
    const contextDoc = await AuditContext.create(buildContextPayload(context, requestContext));

    const redactedBefore = redactForAudit(beforeSnapshot || {});
    const redactedAfter = redactForAudit(afterSnapshot || {});
    const diffDoc = await AuditDiff.create({
      fieldsChanged: buildDiffFields(redactedBefore.output, redactedAfter.output),
      beforeSnapshot: redactedBefore.output,
      afterSnapshot: redactedAfter.output,
      redactedFields: [...new Set([...(redactedBefore.redactedFields || []), ...(redactedAfter.redactedFields || [])])],
    });

    return AuditEvent.create({
      eventType,
      module,
      entityType,
      entityId,
      action,
      severity,
      correlationId: contextDoc.correlationId,
      actorRef: actorDoc._id,
      contextRef: contextDoc._id,
      diffRef: diffDoc._id,
      metadata,
      immutable: true,
    });
  } catch (error) {
    logger.warn({ err: error?.message, eventType, module }, 'Failed to persist audit event');
    return null;
  }
};

const recordFinancialLedgerEvent = async ({
  domain,
  entityType,
  entityId,
  eventType,
  amount = 0,
  currency = 'INR',
  status = 'recorded',
  metadata = {},
  correlationId = null,
}) => {
  try {
    return FinancialLedgerEvent.create({
      correlationId: correlationId || getCorrelationId() || 'missing-correlation-id',
      domain,
      entityType,
      entityId,
      eventType,
      amount,
      currency,
      status,
      metadata,
    });
  } catch (error) {
    logger.warn({ err: error?.message, eventType, domain }, 'Failed to persist financial ledger event');
    return null;
  }
};

export { recordAuditEvent, recordFinancialLedgerEvent };

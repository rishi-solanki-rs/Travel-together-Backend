import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, hasPermission, requireTemporaryElevation } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import env from '../../config/env.js';
import {
  verifySignedWebhook,
  registerWebhookNonce,
  protectSettlementIdempotency,
  signPayoutExport,
  logPayoutExportAccess,
} from '../../operations/security/webhookSecurity.service.js';
import {
  createPrivacyRequest,
  exportUserData,
  executeRightToForget,
  recordConsentEvent,
  raiseSensitiveReadAlert,
} from '../../operations/security/privacyCompliance.service.js';
import { maskPII } from '../../operations/security/runtimeSecurity.service.js';
import { webhookSchema, privacyRequestSchema, consentSchema, payoutExportSchema } from './security.validator.js';
import { computeInvoiceTamperHash } from '../../operations/security/webhookSecurity.service.js';

const router = express.Router();

router.post('/webhooks/finance', validateRequest({ body: webhookSchema }), asyncHandler(async (req, res) => {
  const rawPayload = JSON.stringify(req.body.payload || {});
  const signature = req.headers['x-webhook-signature'] || '';
  const timestamp = req.headers['x-webhook-timestamp'] || null;
  const valid = verifySignedWebhook({
    rawPayload,
    signature,
    secret: env.WEBHOOK_PRIMARY_SECRET || env.JWT_REFRESH_SECRET,
    timestamp,
  });

  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
  }

  const nonceResult = await registerWebhookNonce({
    provider: req.body.provider,
    nonce: req.body.nonce,
    signature,
    eventId: req.body.eventId || null,
    rawPayload,
    ttlSeconds: 3600,
  });

  if (!nonceResult.accepted) {
    return res.status(202).json({ success: true, duplicate: true, message: 'Duplicate callback ignored' });
  }

  const callback = await protectSettlementIdempotency({
    provider: `${req.body.provider}:settlement`,
    callbackId: req.body.eventId || req.body.nonce,
    signature,
    rawPayload,
  });

  return res.status(200).json({ success: true, duplicate: !callback.accepted, message: 'Webhook accepted' });
}));

router.post('/privacy/request', authenticate, validateRequest({ body: privacyRequestSchema }), asyncHandler(async (req, res) => {
  const requestDoc = await createPrivacyRequest({
    userId: req.user.id,
    requestType: req.body.requestType,
    requestedBy: req.user.id,
    payload: { ipAddress: req.ip },
  });
  ApiResponse.created(res, 'Privacy request queued', requestDoc);
}));

router.post('/privacy/consent', authenticate, validateRequest({ body: consentSchema }), asyncHandler(async (req, res) => {
  const event = await recordConsentEvent({
    userId: req.user.id,
    consentType: req.body.consentType,
    granted: req.body.granted,
    scope: req.body.scope || 'global',
    req,
  });
  ApiResponse.created(res, 'Consent event recorded', event);
}));

router.get('/privacy/export/me', authenticate, asyncHandler(async (req, res) => {
  const payload = await exportUserData({ userId: req.user.id });
  ApiResponse.success(res, 'User data export generated', payload);
}));

router.post('/privacy/forget/me', authenticate, requireTemporaryElevation, asyncHandler(async (req, res) => {
  const result = await executeRightToForget({ userId: req.user.id });
  ApiResponse.success(res, 'Right-to-forget workflow executed', result);
}));

router.post('/finance/payout-export', authenticate, hasPermission('finance.export.payout'), validateRequest({ body: payoutExportSchema }), asyncHandler(async (req, res) => {
  const rows = req.body.rows || [];
  const csv = rows.map((row) => JSON.stringify(maskPII(row))).join('\n');
  const watermark = `EXPORT-${Date.now()}-UID-${req.user.id}`;
  const signed = signPayoutExport({
    csvContent: csv,
    signerKey: env.WEBHOOK_PAYOUT_SECRET || env.JWT_ACCESS_SECRET,
    watermark,
  });

  const log = await logPayoutExportAccess({
    requestedBy: req.user.id,
    vendorId: req.body.vendorId || null,
    filters: req.body.filters || {},
    rowCount: rows.length,
    watermark: signed.watermark,
    signature: signed.signature,
  });

  ApiResponse.success(res, 'Payout export signed', {
    watermark: signed.watermark,
    signature: signed.signature,
    rowCount: rows.length,
    exportLogId: log._id,
  });
}));

router.post('/finance/invoice/hash', authenticate, hasPermission('finance.invoice.hash'), asyncHandler(async (req, res) => {
  const digest = computeInvoiceTamperHash({
    invoiceNumber: req.body.invoiceNumber,
    amount: req.body.amount,
    issuedAt: req.body.issuedAt,
    salt: String(env.WEBHOOK_PAYOUT_SECRET || env.JWT_REFRESH_SECRET),
  });
  ApiResponse.success(res, 'Invoice tamper hash generated', { hash: digest });
}));

router.get('/admin/sensitive-read/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  await raiseSensitiveReadAlert({ adminUserId: req.user.id, targetUserId: req.params.userId, resource: 'user-sensitive-read' });
  ApiResponse.success(res, 'Sensitive read alert recorded');
}));

export default router;

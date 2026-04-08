import crypto from 'node:crypto';
import WebhookReplayNonce from '../../shared/models/WebhookReplayNonce.model.js';
import PayoutExportLog from '../../shared/models/PayoutExportLog.model.js';
import { sha256 } from './runtimeSecurity.service.js';

const computeHmac = ({ payload, secret }) => crypto.createHmac('sha256', String(secret)).update(String(payload)).digest('hex');

const verifySignedWebhook = ({ rawPayload, signature, secret, toleranceSeconds = 300, timestamp = null }) => {
  const expected = computeHmac({ payload: rawPayload, secret });
  const safeA = Buffer.from(String(expected));
  const safeB = Buffer.from(String(signature || ''));
  if (safeA.length !== safeB.length) return false;
  const validSignature = crypto.timingSafeEqual(safeA, safeB);

  if (!validSignature) return false;
  if (!timestamp) return true;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const delta = Math.abs(nowSeconds - Number(timestamp));
  return delta <= toleranceSeconds;
};

const registerWebhookNonce = async ({ provider, nonce, signature, eventId = null, rawPayload, ttlSeconds = 3600 }) => {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const payloadHash = sha256(rawPayload || '');

  const existing = await WebhookReplayNonce.findOne({ provider, nonce }).lean();
  if (existing) {
    return { accepted: false, duplicate: true };
  }

  await WebhookReplayNonce.create({
    provider,
    nonce,
    signature,
    eventId,
    expiresAt,
    payloadHash,
  });

  return { accepted: true, duplicate: false };
};

const computeInvoiceTamperHash = ({ invoiceNumber, amount, issuedAt, salt }) => {
  return sha256(`${invoiceNumber}|${amount}|${issuedAt}|${salt}`);
};

const signPayoutExport = ({ csvContent, signerKey, watermark }) => {
  const signature = computeHmac({ payload: `${watermark}\n${csvContent}`, secret: signerKey });
  return { watermark, signature };
};

const logPayoutExportAccess = async ({ requestedBy, vendorId = null, filters = {}, rowCount = 0, watermark, signature }) => {
  return PayoutExportLog.create({
    requestedBy,
    vendorId,
    filters,
    rowCount,
    watermark,
    signature,
    piiMasked: true,
  });
};

const protectSettlementIdempotency = async ({ provider = 'settlement', callbackId, signature, rawPayload }) => {
  return registerWebhookNonce({ provider, nonce: callbackId, signature, rawPayload, ttlSeconds: 24 * 3600 });
};

export {
  computeHmac,
  verifySignedWebhook,
  registerWebhookNonce,
  computeInvoiceTamperHash,
  signPayoutExport,
  logPayoutExportAccess,
  protectSettlementIdempotency,
};

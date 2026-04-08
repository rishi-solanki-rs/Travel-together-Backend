import crypto from 'node:crypto';
import AuthSession from '../../shared/models/AuthSession.model.js';
import TokenRevocation from '../../shared/models/TokenRevocation.model.js';
import DeviceFingerprint from '../../shared/models/DeviceFingerprint.model.js';
import SessionRiskEvent from '../../shared/models/SessionRiskEvent.model.js';
import User from '../../shared/models/User.model.js';
import { buildDeviceFingerprint, sha256 } from './runtimeSecurity.service.js';
import { emitAlert } from '../alerts/alerting.service.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const generateSessionId = () => crypto.randomUUID();

const getGeoHint = (ipAddress = '') => {
  if (!ipAddress) return 'unknown';
  const normalized = String(ipAddress).replace('::ffff:', '');
  const chunks = normalized.split('.');
  if (chunks.length >= 2) return `ASN-${chunks[0]}-${chunks[1]}`;
  return 'unknown';
};

const createAuthSession = async ({ user, refreshToken, refreshTokenVersion, req, sessionFamilyId = null, sessionId = null }) => {
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
  const userAgent = req.headers['user-agent'] || null;
  const acceptLanguage = req.headers['accept-language'] || null;
  const device = buildDeviceFingerprint({ userAgent, acceptLanguage, ipAddress: String(ipAddress || '') });

  await DeviceFingerprint.findOneAndUpdate(
    { userId: user._id, deviceId: device.deviceId },
    {
      $set: {
        fingerprintHash: device.fingerprintHash,
        lastSeenAt: new Date(),
        ipAddress,
        userAgent,
        geoHint: getGeoHint(String(ipAddress || '')),
      },
      $setOnInsert: {
        firstSeenAt: new Date(),
        trusted: false,
      },
    },
    { upsert: true, new: true }
  );

  const now = new Date();
  const authSession = await AuthSession.create({
    userId: user._id,
    vendorId: user.vendorId || null,
    sessionId: sessionId || generateSessionId(),
    sessionFamilyId: sessionFamilyId || crypto.randomUUID(),
    deviceId: device.deviceId,
    refreshTokenHash: sha256(refreshToken),
    refreshTokenVersion,
    ipAddress,
    userAgent,
    geoHint: getGeoHint(String(ipAddress || '')),
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
  });

  return authSession;
};

const markRiskEvent = async ({ userId = null, sessionId = null, eventType, severity = 'medium', req = null, details = {} }) => {
  const payload = {
    userId,
    sessionId,
    eventType,
    severity,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    userAgent: req?.headers?.['user-agent'] || null,
    geoHint: getGeoHint(String(req?.ip || req?.headers?.['x-forwarded-for'] || '')),
    details,
  };
  await SessionRiskEvent.create(payload);
  return payload;
};

const detectSessionAnomaly = async ({ userId, session, req }) => {
  const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '';
  const userAgent = req?.headers?.['user-agent'] || '';
  const geoHint = getGeoHint(String(ipAddress));
  let score = 0;

  if (session?.geoHint && session.geoHint !== geoHint) {
    score += 55;
    await markRiskEvent({ userId, sessionId: session?.sessionId, eventType: 'geo_switch', severity: 'high', req, details: { from: session.geoHint, to: geoHint } });
  }
  if (session?.userAgent && session.userAgent !== userAgent) {
    score += 35;
    await markRiskEvent({ userId, sessionId: session?.sessionId, eventType: 'device_switch', severity: 'medium', req, details: { from: session.userAgent, to: userAgent } });
  }

  if (score >= 70) {
    await emitAlert({
      policy: 'session-anomaly',
      value: score,
      threshold: 70,
      summary: `Suspicious geo/device switch detected for user ${userId}`,
      severity: 'critical',
      context: { userId, sessionId: session?.sessionId },
    });
  }

  return score;
};

const detectRefreshReplay = async ({ userId, sessionId, incomingRefreshTokenHash, req }) => {
  const session = await AuthSession.findOne({ userId, sessionId }).select('+refreshTokenHash');
  if (!session) return { replay: false, session: null };

  if (session.status !== 'active') {
    return { replay: true, session };
  }

  if (session.refreshTokenHash !== incomingRefreshTokenHash) {
    await AuthSession.updateMany(
      { userId, sessionFamilyId: session.sessionFamilyId, status: 'active' },
      { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: 'refresh_replay_detected' } }
    );

    await markRiskEvent({
      userId,
      sessionId,
      eventType: 'refresh_replay_detected',
      severity: 'critical',
      req,
      details: { sessionFamilyId: session.sessionFamilyId },
    });

    await TokenRevocation.create({
      userId,
      sessionId,
      tokenType: 'refresh',
      tokenHash: incomingRefreshTokenHash,
      reason: 'refresh_replay_detected',
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    return { replay: true, session };
  }

  return { replay: false, session };
};

const rotateSessionRefresh = async ({ userId, sessionId, nextRefreshToken, nextVersion, req }) => {
  const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;
  const userAgent = req?.headers?.['user-agent'] || null;
  const geoHint = getGeoHint(String(ipAddress || ''));

  return AuthSession.findOneAndUpdate(
    { userId, sessionId, status: 'active' },
    {
      $set: {
        refreshTokenHash: sha256(nextRefreshToken),
        refreshTokenVersion: nextVersion,
        ipAddress,
        userAgent,
        geoHint,
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    },
    { new: true }
  );
};

const revokeSessionByDevice = async ({ userId, deviceId, reason = 'forced_logout_device' }) => {
  const sessions = await AuthSession.find({ userId, deviceId, status: 'active' });
  const sessionIds = sessions.map((item) => item.sessionId);

  if (!sessionIds.length) return { revoked: 0 };

  await AuthSession.updateMany(
    { userId, sessionId: { $in: sessionIds } },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: reason } }
  );

  await TokenRevocation.insertMany(sessionIds.map((sessionId) => ({
    userId,
    sessionId,
    tokenType: 'refresh',
    reason,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  })));

  await markRiskEvent({ userId, eventType: 'forced_logout', severity: 'high', details: { deviceId, revokedSessions: sessionIds.length } });

  return { revoked: sessionIds.length };
};

const emergencyRevokeAll = async ({ userId, reason = 'admin_emergency_revoke_all', actorId = null }) => {
  const sessions = await AuthSession.find({ userId, status: 'active' }).lean();
  const sessionIds = sessions.map((item) => item.sessionId);

  await AuthSession.updateMany(
    { userId, status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: reason } }
  );

  await TokenRevocation.insertMany(sessionIds.map((sessionId) => ({
    userId,
    sessionId,
    tokenType: 'refresh',
    reason,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    metadata: { actorId },
  })));

  await markRiskEvent({ userId, eventType: 'revoke_all', severity: 'critical', details: { actorId, count: sessionIds.length } });
  return { revoked: sessionIds.length };
};

const isTokenRevoked = async ({ tokenType, tokenHash = null, tokenId = null, userId = null, sessionId = null }) => {
  const now = new Date();
  const doc = await TokenRevocation.findOne({
    tokenType,
    ...(tokenHash ? { tokenHash } : {}),
    ...(tokenId ? { tokenId } : {}),
    ...(userId ? { userId } : {}),
    ...(sessionId ? { sessionId } : {}),
    expiresAt: { $gt: now },
  }).lean();
  return Boolean(doc);
};

const verifyStepUp = async ({ userId, sessionId, passwordValid }) => {
  if (!passwordValid) return false;
  await AuthSession.findOneAndUpdate(
    { userId, sessionId, status: 'active' },
    { $set: { stepUpVerifiedAt: new Date(), elevationExpiresAt: new Date(Date.now() + ACCESS_TTL_MS) } }
  );
  await markRiskEvent({ userId, sessionId, eventType: 'step_up_passed', severity: 'low' });
  return true;
};

const hashToken = (token) => sha256(token);

const consumePasswordResetNonce = async ({ userId, nonce }) => {
  const nonceHash = sha256(nonce);
  const user = await User.findOne({ _id: userId, passwordResetNonceHash: nonceHash }).select('+passwordResetNonceHash');
  if (!user) return false;
  user.passwordResetNonceHash = undefined;
  await user.save();
  return true;
};

export {
  generateSessionId,
  hashToken,
  createAuthSession,
  markRiskEvent,
  detectSessionAnomaly,
  detectRefreshReplay,
  rotateSessionRefresh,
  revokeSessionByDevice,
  emergencyRevokeAll,
  isTokenRevoked,
  verifyStepUp,
  consumePasswordResetNonce,
};

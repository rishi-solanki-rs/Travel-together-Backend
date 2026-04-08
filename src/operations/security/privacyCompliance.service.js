import User from '../../shared/models/User.model.js';
import MediaAsset from '../../shared/models/MediaAsset.model.js';
import PrivacyRequest from '../../shared/models/PrivacyRequest.model.js';
import ConsentEvent from '../../shared/models/ConsentEvent.model.js';
import SessionRiskEvent from '../../shared/models/SessionRiskEvent.model.js';
import { maskPII } from './runtimeSecurity.service.js';

const CHILD_DATA_RETENTION_DAYS = Number(process.env.CHILD_DATA_RETENTION_DAYS || 365);

const createPrivacyRequest = async ({ userId, requestType, requestedBy = null, payload = {} }) => {
  return PrivacyRequest.create({ userId, requestType, requestedBy, payload, status: 'queued' });
};

const exportUserData = async ({ userId }) => {
  const [user, media, consentEvents] = await Promise.all([
    User.findById(userId).lean(),
    MediaAsset.find({ uploadedBy: userId, isDeleted: false }).lean(),
    ConsentEvent.find({ userId }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    user: maskPII(user || {}),
    media: (media || []).map((item) => maskPII(item)),
    consentEvents: consentEvents || [],
    exportedAt: new Date().toISOString(),
  };
};

const executeRightToForget = async ({ userId }) => {
  const user = await User.findById(userId);
  if (!user) return { deleted: false };

  user.name = 'Deleted User';
  user.email = `deleted+${String(user._id)}@example.invalid`;
  user.phone = null;
  user.avatar = null;
  user.avatarPublicId = null;
  user.profile = {};
  user.preferences = {};
  user.isDeleted = true;
  user.isActive = false;
  user.permissions = [];
  await user.save();

  await MediaAsset.updateMany(
    { uploadedBy: userId, isDeleted: false },
    { $set: { isDeleted: true, lifecycleStatus: 'pending_delete', cleanupEligibleAt: new Date() } }
  );

  return { deleted: true };
};

const applyRetentionPolicies = async () => {
  const now = new Date();
  const childThreshold = new Date(now.getTime() - CHILD_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [oldPrivacyRequests, oldRiskEvents] = await Promise.all([
    PrivacyRequest.deleteMany({
      status: { $in: ['completed', 'failed'] },
      updatedAt: { $lt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) },
    }),
    SessionRiskEvent.deleteMany({ createdAt: { $lt: childThreshold }, eventType: { $in: ['device_switch', 'geo_switch'] } }),
  ]);

  return {
    prunedPrivacyRequests: oldPrivacyRequests.deletedCount || 0,
    prunedRiskEvents: oldRiskEvents.deletedCount || 0,
  };
};

const recordConsentEvent = async ({ userId, consentType, granted, scope = 'global', source = 'api', req = null, metadata = {} }) => {
  return ConsentEvent.create({
    userId,
    consentType,
    granted,
    scope,
    source,
    ipAddress: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
    metadata,
  });
};

const raiseSensitiveReadAlert = async ({ adminUserId, targetUserId, resource }) => {
  return SessionRiskEvent.create({
    userId: adminUserId,
    eventType: 'admin_sensitive_read',
    severity: 'high',
    details: { targetUserId, resource },
  });
};

export {
  CHILD_DATA_RETENTION_DAYS,
  createPrivacyRequest,
  exportUserData,
  executeRightToForget,
  applyRetentionPolicies,
  recordConsentEvent,
  raiseSensitiveReadAlert,
};

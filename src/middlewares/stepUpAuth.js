import ApiError from '../utils/ApiError.js';
import AuthSession from '../shared/models/AuthSession.model.js';
import { markRiskEvent } from '../operations/security/zeroTrustAuth.service.js';

const STEP_UP_MAX_AGE_MS = Number(process.env.STEP_UP_MAX_AGE_MS || 10 * 60 * 1000);

const requireStepUp = (permissionLabel = 'privileged_action') => async (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  if (!req.user.sessionId) throw ApiError.unauthorized('Session context missing');

  const session = await AuthSession.findOne({ userId: req.user.id, sessionId: req.user.sessionId, status: 'active' }).lean();
  const verifiedAt = session?.stepUpVerifiedAt ? new Date(session.stepUpVerifiedAt).getTime() : 0;
  const stale = !verifiedAt || (Date.now() - verifiedAt) > STEP_UP_MAX_AGE_MS;

  if (stale) {
    await markRiskEvent({
      userId: req.user.id,
      sessionId: req.user.sessionId,
      eventType: 'step_up_required',
      severity: 'medium',
      req,
      details: { permissionLabel },
    });
    throw ApiError.forbidden('Step-up authentication required');
  }

  next();
};

export { requireStepUp };

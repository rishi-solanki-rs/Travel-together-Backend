import KidsActivity from '../../shared/models/KidsActivity.model.js';
import ChildProfile from '../../shared/models/ChildProfile.model.js';
import GuardianProfile from '../../shared/models/GuardianProfile.model.js';
import SessionBooking from '../../shared/models/SessionBooking.model.js';
import WaitlistEntry from '../../shared/models/WaitlistEntry.model.js';
import AttendanceLog from '../../shared/models/AttendanceLog.model.js';
import ApiError from '../../utils/ApiError.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import { recordAuditEvent } from '../../operations/audit/audit.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';

const HOLD_MINUTES = 10;

const calculateAgeYears = (dateOfBirth, now = new Date()) => {
  const dob = new Date(dateOfBirth);
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
};

const enforceAgeGroup = ({ childAge, minAge = 0, maxAge = 17 }) => childAge >= minAge && childAge <= maxAge;

const createGuardianProfile = async (payload) => GuardianProfile.create(payload);
const createChildProfile = async (payload) => ChildProfile.create(payload);

const findSessionFromActivity = (activity, sessionId) => {
  const session = (activity.sessions || []).find((entry) => String(entry._id) === String(sessionId));
  if (!session) throw ApiError.notFound('Session not found');
  return session;
};

const createSessionBooking = async ({ listingId, vendorId, sessionId, childProfileId, guardianProfileId, amount = 0 }) => withTransaction(async ({ session }) => {
  const [activity, child] = await Promise.all([
    KidsActivity.findOne({ listingId, vendorId }).session(session),
    ChildProfile.findById(childProfileId).session(session),
  ]);
  if (!activity) throw ApiError.notFound('Activity not found');
  if (!child) throw ApiError.notFound('Child profile not found');

  const targetSession = findSessionFromActivity(activity, sessionId);
  const childAge = calculateAgeYears(child.dateOfBirth);
  const minAge = Math.min(...(activity.ageGroups || []).map((group) => group.minAge ?? 0), 0);
  const maxAge = Math.max(...(activity.ageGroups || []).map((group) => group.maxAge ?? 17), 17);
  if (!enforceAgeGroup({ childAge, minAge, maxAge })) {
    throw ApiError.badRequest('Child age is outside allowed range for this activity');
  }

  const seatUpdated = await KidsActivity.findOneAndUpdate(
    {
      listingId,
      vendorId,
      'sessions._id': sessionId,
      'sessions.seatsAvailable': { $gt: 0 },
    },
    {
      $inc: { 'sessions.$.seatsAvailable': -1 },
    },
    { session, new: true }
  );

  if (!seatUpdated) {
    const waitlist = await WaitlistEntry.create([{
      listingId,
      sessionId,
      childProfileId,
      guardianProfileId,
      status: 'active',
    }], { session });
    return { waitlisted: true, waitlistEntry: waitlist[0] };
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const [booking] = await SessionBooking.create([{
    listingId,
    vendorId,
    sessionId,
    childProfileId,
    guardianProfileId,
    status: 'hold',
    holdExpiresAt,
    amount,
    currency: 'INR',
  }], { session });

  await recordAuditEvent({
    eventType: 'bookings.kids.hold',
    module: 'kidsWorld',
    entityType: 'SessionBooking',
    entityId: booking._id,
    action: 'create-session-booking-hold',
    afterSnapshot: { status: booking.status, holdExpiresAt, listingId, vendorId, sessionId },
  });

  return { waitlisted: false, booking };
});

const confirmSessionBooking = async (bookingId) => {
  const booking = await SessionBooking.findByIdAndUpdate(
    bookingId,
    { status: 'confirmed', holdExpiresAt: null },
    { new: true }
  );
  if (!booking) throw ApiError.notFound('Session booking not found');
  await recordAuditEvent({
    eventType: 'bookings.kids.confirmed',
    module: 'kidsWorld',
    entityType: 'SessionBooking',
    entityId: booking._id,
    action: 'confirm-session-booking',
    afterSnapshot: { status: booking.status },
  });
  await enqueueJob('booking-confirmations', 'kids-session-booking-confirmed', { bookingId: String(booking._id), vendorId: String(booking.vendorId) });
  return booking;
};

const promoteWaitlistIfPossible = async ({ listingId, sessionId, vendorId }) => withTransaction(async ({ session }) => {
  const candidate = await WaitlistEntry.findOne({ listingId, sessionId, status: 'active' }).sort({ createdAt: 1 }).session(session);
  if (!candidate) return null;

  const seatUpdated = await KidsActivity.findOneAndUpdate(
    {
      listingId,
      vendorId,
      'sessions._id': sessionId,
      'sessions.seatsAvailable': { $gt: 0 },
    },
    { $inc: { 'sessions.$.seatsAvailable': -1 } },
    { session, new: true }
  );
  if (!seatUpdated) return null;

  const [booking] = await SessionBooking.create([{
    listingId,
    vendorId,
    sessionId,
    childProfileId: candidate.childProfileId,
    guardianProfileId: candidate.guardianProfileId,
    status: 'confirmed',
    holdExpiresAt: null,
  }], { session });

  candidate.status = 'promoted';
  await candidate.save({ session });
  return booking;
});

const cancelSessionBooking = async ({ bookingId, reason = 'cancelled_by_guardian' }) => withTransaction(async ({ session }) => {
  const booking = await SessionBooking.findById(bookingId).session(session);
  if (!booking) throw ApiError.notFound('Session booking not found');
  if (booking.status === 'cancelled') return booking;

  booking.status = 'cancelled';
  await booking.save({ session });

  await KidsActivity.findOneAndUpdate(
    { listingId: booking.listingId, 'sessions._id': booking.sessionId },
    { $inc: { 'sessions.$.seatsAvailable': 1 } },
    { session }
  );

  await promoteWaitlistIfPossible({ listingId: booking.listingId, sessionId: booking.sessionId, vendorId: booking.vendorId });
  await recordAuditEvent({
    eventType: 'bookings.kids.cancelled',
    module: 'kidsWorld',
    entityType: 'SessionBooking',
    entityId: booking._id,
    action: 'cancel-session-booking',
    afterSnapshot: { status: booking.status, reason },
  });
  return booking;
});

const markAttendance = async ({ bookingId, status = 'present', notes = null }) => {
  const booking = await SessionBooking.findById(bookingId).lean();
  if (!booking) throw ApiError.notFound('Session booking not found');

  const attendance = await AttendanceLog.create({
    sessionBookingId: booking._id,
    listingId: booking.listingId,
    sessionId: booking.sessionId,
    childProfileId: booking.childProfileId,
    checkInAt: new Date(),
    status,
    notes,
  });

  await SessionBooking.findByIdAndUpdate(bookingId, { status: status === 'present' ? 'attended' : booking.status });
  return attendance;
};

const getVendorSessionCalendarDashboard = async ({ vendorId, listingId }) => {
  const activity = await KidsActivity.findOne({ listingId, vendorId }).lean();
  if (!activity) throw ApiError.notFound('Activity not found');

  const bookings = await SessionBooking.aggregate([
    { $match: { vendorId, listingId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const sessions = (activity.sessions || []).map((session) => ({
    sessionId: session._id,
    sessionDate: session.sessionDate,
    seatsTotal: session.seatsTotal,
    seatsAvailable: session.seatsAvailable,
  }));

  return { sessions, bookingStatus: bookings };
};

const computeWaitlistPromotion = ({ seatsAvailable, waitlistCount }) => {
  if (seatsAvailable <= 0 || waitlistCount <= 0) return 0;
  return Math.min(seatsAvailable, waitlistCount);
};

export {
  calculateAgeYears,
  enforceAgeGroup,
  computeWaitlistPromotion,
  createGuardianProfile,
  createChildProfile,
  createSessionBooking,
  confirmSessionBooking,
  cancelSessionBooking,
  promoteWaitlistIfPossible,
  markAttendance,
  getVendorSessionCalendarDashboard,
};

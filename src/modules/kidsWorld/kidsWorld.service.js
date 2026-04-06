import KidsActivity from '../../shared/models/KidsActivity.model.js';
import ApiError from '../../utils/ApiError.js';

const createActivity = async (listingId, vendorId, data) => {
  const existing = await KidsActivity.findOne({ listingId });
  if (existing) throw ApiError.conflict('Kids activity already exists for this listing');
  return KidsActivity.create({ ...data, listingId, vendorId });
};

const getActivity = async (listingId) => {
  const activity = await KidsActivity.findOne({ listingId }).lean();
  if (!activity) throw ApiError.notFound('Kids activity not found');
  return activity;
};

const updateActivity = async (listingId, vendorId, data) => {
  const activity = await KidsActivity.findOneAndUpdate({ listingId, vendorId }, data, { new: true });
  if (!activity) throw ApiError.notFound('Activity not found');
  return activity;
};

const addSession = async (listingId, vendorId, sessionData) => {
  return KidsActivity.findOneAndUpdate({ listingId, vendorId }, { $push: { sessions: sessionData } }, { new: true });
};

const updateSessionAvailability = async (listingId, sessionId, seatsChange) => {
  return KidsActivity.findOneAndUpdate(
    { listingId, 'sessions._id': sessionId },
    { $inc: { 'sessions.$.seatsAvailable': seatsChange } },
    { new: true }
  );
};

export { createActivity, getActivity, updateActivity, addSession, updateSessionAvailability };

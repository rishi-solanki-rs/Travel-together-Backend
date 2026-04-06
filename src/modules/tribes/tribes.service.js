import TribeExperience from '../../shared/models/TribeExperience.model.js';
import ApiError from '../../utils/ApiError.js';

const createExperience = async (listingId, vendorId, data) => {
  const existing = await TribeExperience.findOne({ listingId });
  if (existing) throw ApiError.conflict('Tribe experience already exists');
  return TribeExperience.create({ ...data, listingId, vendorId });
};

const getExperience = async (listingId) => {
  const exp = await TribeExperience.findOne({ listingId }).lean();
  if (!exp) throw ApiError.notFound('Tribe experience not found');
  return exp;
};

const updateExperience = async (listingId, vendorId, data) => {
  const exp = await TribeExperience.findOneAndUpdate({ listingId, vendorId }, data, { new: true });
  if (!exp) throw ApiError.notFound('Experience not found');
  return exp;
};

const addSchedule = async (listingId, vendorId, scheduleEntry) => {
  return TribeExperience.findOneAndUpdate({ listingId, vendorId }, { $push: { schedule: scheduleEntry } }, { new: true });
};

const updateScheduleEntry = async (listingId, vendorId, entryId, data) => {
  return TribeExperience.findOneAndUpdate(
    { listingId, vendorId, 'schedule._id': entryId },
    { $set: { 'schedule.$': { ...data, _id: entryId } } },
    { new: true }
  );
};

export { createExperience, getExperience, updateExperience, addSchedule, updateScheduleEntry };

import SubscriptionPlan from '../../shared/models/SubscriptionPlan.model.js';
import ApiError from '../../utils/ApiError.js';
import { cache } from '../../config/redis.js';

const getAll = async () => {
  const cached = await cache.get('plans:all');
  if (cached) return cached;
  const plans = await SubscriptionPlan.find({ isActive: true, isDeleted: false }).sort({ priority: 1 }).lean();
  await cache.set('plans:all', plans, 3600);
  return plans;
};

const getById = async (id) => {
  const plan = await SubscriptionPlan.findOne({ _id: id, isDeleted: false });
  if (!plan) throw ApiError.notFound('Plan not found');
  return plan;
};

const create = async (data, userId) => {
  const plan = await SubscriptionPlan.create({ ...data, createdBy: userId });
  await cache.del('plans:all');
  return plan;
};

const update = async (id, data) => {
  const plan = await SubscriptionPlan.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  await cache.del('plans:all');
  return plan;
};

export { getAll, getById, create, update };

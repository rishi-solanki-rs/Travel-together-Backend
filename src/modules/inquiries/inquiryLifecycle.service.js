import Inquiry from '../../shared/models/Inquiry.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { INQUIRY_STATUS, USER_ROLES } from '../../shared/constants/index.js';

const terminalStatuses = new Set([
  INQUIRY_STATUS.CONVERTED,
  INQUIRY_STATUS.CLOSED,
  INQUIRY_STATUS.CLOSED_LOST,
  INQUIRY_STATUS.SPAM,
]);

const statusFlow = {
  [INQUIRY_STATUS.NEW]: [INQUIRY_STATUS.CALLBACK_REQUESTED, INQUIRY_STATUS.CONTACTED, INQUIRY_STATUS.FOLLOWUP_PENDING, INQUIRY_STATUS.SPAM],
  [INQUIRY_STATUS.CALLBACK_REQUESTED]: [INQUIRY_STATUS.CONTACTED, INQUIRY_STATUS.FOLLOWUP_PENDING, INQUIRY_STATUS.CLOSED_LOST],
  [INQUIRY_STATUS.CONTACTED]: [INQUIRY_STATUS.FOLLOWUP_PENDING, INQUIRY_STATUS.OFFER_SHARED, INQUIRY_STATUS.VISIT_SCHEDULED, INQUIRY_STATUS.CONVERTED, INQUIRY_STATUS.CLOSED_LOST],
  [INQUIRY_STATUS.FOLLOWUP_PENDING]: [INQUIRY_STATUS.OFFER_SHARED, INQUIRY_STATUS.VISIT_SCHEDULED, INQUIRY_STATUS.CONVERTED, INQUIRY_STATUS.CLOSED_LOST],
  [INQUIRY_STATUS.OFFER_SHARED]: [INQUIRY_STATUS.VISIT_SCHEDULED, INQUIRY_STATUS.CONVERTED, INQUIRY_STATUS.CLOSED_LOST],
  [INQUIRY_STATUS.VISIT_SCHEDULED]: [INQUIRY_STATUS.CONVERTED, INQUIRY_STATUS.CLOSED_LOST],
  [INQUIRY_STATUS.REPLIED]: [INQUIRY_STATUS.CONTACTED, INQUIRY_STATUS.CONVERTED, INQUIRY_STATUS.CLOSED_LOST],
  [INQUIRY_STATUS.READ]: [INQUIRY_STATUS.CONTACTED, INQUIRY_STATUS.FOLLOWUP_PENDING, INQUIRY_STATUS.CLOSED_LOST],
};

const buildRoleScopedFilter = (user, query = {}) => {
  const filter = { isSpam: { $ne: true } };

  if (query.status) filter.status = query.status;
  if (query.cityId) filter.cityId = query.cityId;
  if (query.areaId) filter.areaId = query.areaId;
  if (query.vendorId) filter.vendorId = query.vendorId;
  if (query.domain) filter.domain = query.domain;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.assignedVendorUser) filter.assignedVendorUser = query.assignedVendorUser;
  if (query.seasonalInterest) filter.seasonalInterest = query.seasonalInterest;
  if (query.tag) filter.tags = { $in: [String(query.tag).toLowerCase()] };
  if (Number.isFinite(Number(query.minLeadScore))) filter.leadScore = { $gte: Number(query.minLeadScore) };

  if (query.callbackOverdue || query.followupOverdue) {
    filter.nextFollowupAt = { $lt: new Date() };
    filter.status = { $nin: Array.from(terminalStatuses) };
  }

  const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN];
  if (adminRoles.includes(user.role)) return filter;

  if (user.vendorId) {
    filter.vendorId = user.vendorId;
  }

  if (user.role === USER_ROLES.VENDOR_STAFF) {
    filter.$or = [
      { assignedVendorUser: user.id },
      { assignedVendorUser: null },
    ];
  }

  return filter;
};

const isValidTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  if (terminalStatuses.has(fromStatus)) return false;
  return (statusFlow[fromStatus] || []).includes(toStatus);
};

const computeLeadScore = ({ inquiry, status, nextFollowupAt, tags = [], seasonalInterest = '' }) => {
  let score = Number(inquiry?.leadScore || 35);
  const currentStatus = status || inquiry?.status || INQUIRY_STATUS.NEW;

  if (currentStatus === INQUIRY_STATUS.CALLBACK_REQUESTED) score += 8;
  if (currentStatus === INQUIRY_STATUS.CONTACTED) score += 12;
  if (currentStatus === INQUIRY_STATUS.OFFER_SHARED) score += 20;
  if (currentStatus === INQUIRY_STATUS.VISIT_SCHEDULED) score += 18;
  if (currentStatus === INQUIRY_STATUS.CONVERTED) score = 100;
  if (currentStatus === INQUIRY_STATUS.CLOSED_LOST || currentStatus === INQUIRY_STATUS.SPAM) score = 0;

  if (nextFollowupAt) {
    const hoursAway = (new Date(nextFollowupAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursAway <= 24) score += 6;
    if (hoursAway < 0) score -= 12;
  }

  const tagSet = new Set([...(inquiry?.tags || []), ...tags].map((x) => String(x).toLowerCase()));
  if (tagSet.has('hot_lead')) score += 12;
  if (tagSet.has('wedding')) score += 10;
  if (tagSet.has('festival')) score += 9;
  if (tagSet.has('family')) score += 4;

  const seasonal = seasonalInterest || inquiry?.seasonalInterest || '';
  if (seasonal) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
};

const getLeadAgingBucket = (createdAt) => {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 6) return '0-6h';
  if (ageHours < 24) return '6-24h';
  if (ageHours < 72) return '1-3d';
  if (ageHours < 168) return '3-7d';
  return '7d+';
};

const getInquiries = async ({ user, query }) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = buildRoleScopedFilter(user, query);

  const [rows, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ leadScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('vendorId', 'businessName slug')
      .populate('cityId', 'name slug')
      .populate('areaId', 'name slug')
      .populate('assignedTo', 'name email')
      .populate('assignedVendorUser', 'name email')
      .populate('listingId', 'title slug category')
      .lean(),
    Inquiry.countDocuments(filter),
  ]);

  return {
    items: rows,
    pagination: buildPaginationMeta(page, perPage, total),
  };
};

const getInquiryById = async ({ id, user }) => {
  const row = await Inquiry.findById(id)
    .populate('vendorId', 'businessName slug')
    .populate('cityId', 'name slug')
    .populate('areaId', 'name slug')
    .populate('assignedTo', 'name email')
    .populate('assignedVendorUser', 'name email')
    .populate('listingId', 'title slug category')
    .lean();

  if (!row) throw ApiError.notFound('Inquiry not found');
  const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN];
  if (!adminRoles.includes(user.role) && String(row.vendorId?._id || row.vendorId) !== String(user.vendorId)) {
    throw ApiError.forbidden('Inquiry not found in your scope');
  }

  return row;
};

const updateInquiryStatus = async ({ id, user, payload }) => {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) throw ApiError.notFound('Inquiry not found');

  const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN];
  if (!adminRoles.includes(user.role) && String(inquiry.vendorId) !== String(user.vendorId)) {
    throw ApiError.forbidden('Inquiry not found in your scope');
  }

  if (!isValidTransition(inquiry.status, payload.status)) {
    throw ApiError.badRequest(`Invalid lifecycle transition from ${inquiry.status} to ${payload.status}`);
  }

  inquiry.status = payload.status;
  inquiry.preferredVisitTime = payload.preferredVisitTime ?? inquiry.preferredVisitTime;
  inquiry.nextFollowupAt = payload.nextFollowupAt ?? inquiry.nextFollowupAt;
  inquiry.seasonalInterest = payload.seasonalInterest ?? inquiry.seasonalInterest;
  inquiry.tags = payload.tags ? payload.tags.map((x) => String(x).toLowerCase()) : inquiry.tags;

  if (payload.status === INQUIRY_STATUS.CONVERTED) {
    inquiry.convertedAt = new Date();
    inquiry.conversionValue = Number(payload.conversionValue || inquiry.conversionValue || 0);
  }

  if (payload.status === INQUIRY_STATUS.CLOSED_LOST || payload.status === INQUIRY_STATUS.CLOSED) {
    inquiry.closedAt = new Date();
    inquiry.lostReason = payload.lostReason || inquiry.lostReason || '';
  }

  inquiry.leadScore = computeLeadScore({
    inquiry,
    status: inquiry.status,
    nextFollowupAt: inquiry.nextFollowupAt,
    tags: inquiry.tags,
    seasonalInterest: inquiry.seasonalInterest,
  });

  await inquiry.save();
  return inquiry;
};

const assignInquiry = async ({ id, user, payload }) => {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) throw ApiError.notFound('Inquiry not found');

  const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN];
  if (!adminRoles.includes(user.role) && String(inquiry.vendorId) !== String(user.vendorId)) {
    throw ApiError.forbidden('Inquiry not found in your scope');
  }

  if (payload.assignedTo !== undefined) inquiry.assignedTo = payload.assignedTo;
  if (payload.assignedVendorUser !== undefined) inquiry.assignedVendorUser = payload.assignedVendorUser;
  if (payload.nextFollowupAt) inquiry.nextFollowupAt = payload.nextFollowupAt;

  inquiry.leadScore = computeLeadScore({ inquiry, nextFollowupAt: inquiry.nextFollowupAt });
  await inquiry.save();
  return inquiry;
};

const addFollowup = async ({ id, user, payload }) => {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) throw ApiError.notFound('Inquiry not found');

  const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN];
  if (!adminRoles.includes(user.role) && String(inquiry.vendorId) !== String(user.vendorId)) {
    throw ApiError.forbidden('Inquiry not found in your scope');
  }

  if (payload.status && !isValidTransition(inquiry.status, payload.status)) {
    throw ApiError.badRequest(`Invalid lifecycle transition from ${inquiry.status} to ${payload.status}`);
  }

  if (payload.status) inquiry.status = payload.status;
  if (payload.nextFollowupAt) inquiry.nextFollowupAt = payload.nextFollowupAt;
  if (payload.tags) inquiry.tags = Array.from(new Set([...(inquiry.tags || []), ...payload.tags.map((x) => String(x).toLowerCase())]));

  inquiry.followupNotes = [
    ...(inquiry.followupNotes || []),
    {
      note: payload.note,
      byUserId: user.id,
      byRole: user.role,
      at: new Date(),
      nextFollowupAt: payload.nextFollowupAt || null,
      statusAtTime: inquiry.status,
    },
  ];

  inquiry.leadScore = payload.leadScore ?? computeLeadScore({
    inquiry,
    status: inquiry.status,
    nextFollowupAt: inquiry.nextFollowupAt,
    tags: inquiry.tags,
    seasonalInterest: inquiry.seasonalInterest,
  });

  await inquiry.save();
  return inquiry;
};

const summarizeLifecycleAnalytics = (rows = []) => {
  const now = new Date();
  const summary = {
    totalLeads: rows.length,
    hotLeadsToday: 0,
    callbackOverdue: 0,
    followupOverdue: 0,
    conversionRate: 0,
    averageFollowupTimeHours: 0,
    vendorResponseSlaHours: 0,
    leadAgingBuckets: {},
    inquiryConversionByCity: [],
    vendorConversionLeaderboard: [],
    seasonalConversionTrends: [],
    cityWiseBestCategories: [],
    lostReasonInsights: [],
    areaWiseLeadHeatmap: [],
    topConvertingCollection: [],
  };

  if (!rows.length) return summary;

  let convertedCount = 0;
  let totalFollowupLagMs = 0;
  let followupLagCount = 0;

  const cityAgg = new Map();
  const vendorAgg = new Map();
  const seasonalAgg = new Map();
  const catAgg = new Map();
  const lostAgg = new Map();
  const areaAgg = new Map();
  const collectionAgg = new Map();

  rows.forEach((row) => {
    if (row.leadScore >= 75 && (now - new Date(row.createdAt)) <= 24 * 60 * 60 * 1000) summary.hotLeadsToday += 1;
    if (row.status === INQUIRY_STATUS.CALLBACK_REQUESTED && row.nextFollowupAt && new Date(row.nextFollowupAt) < now) summary.callbackOverdue += 1;
    if (row.nextFollowupAt && new Date(row.nextFollowupAt) < now && !terminalStatuses.has(row.status)) summary.followupOverdue += 1;
    if (row.status === INQUIRY_STATUS.CONVERTED) convertedCount += 1;

    const firstFollowup = (row.followupNotes || [])[0];
    if (firstFollowup?.at) {
      totalFollowupLagMs += (new Date(firstFollowup.at).getTime() - new Date(row.createdAt).getTime());
      followupLagCount += 1;
    }

    const agingBucket = getLeadAgingBucket(row.createdAt);
    summary.leadAgingBuckets[agingBucket] = (summary.leadAgingBuckets[agingBucket] || 0) + 1;

    const cityKey = row.cityId?.name || String(row.cityId || 'unknown');
    cityAgg.set(cityKey, {
      city: cityKey,
      total: (cityAgg.get(cityKey)?.total || 0) + 1,
      converted: (cityAgg.get(cityKey)?.converted || 0) + (row.status === INQUIRY_STATUS.CONVERTED ? 1 : 0),
    });

    const vendorKey = row.vendorId?.businessName || String(row.vendorId || 'unknown');
    vendorAgg.set(vendorKey, {
      vendor: vendorKey,
      total: (vendorAgg.get(vendorKey)?.total || 0) + 1,
      converted: (vendorAgg.get(vendorKey)?.converted || 0) + (row.status === INQUIRY_STATUS.CONVERTED ? 1 : 0),
    });

    const seasonalKey = row.seasonalInterest || 'general';
    seasonalAgg.set(seasonalKey, {
      season: seasonalKey,
      total: (seasonalAgg.get(seasonalKey)?.total || 0) + 1,
      converted: (seasonalAgg.get(seasonalKey)?.converted || 0) + (row.status === INQUIRY_STATUS.CONVERTED ? 1 : 0),
    });

    const catKey = row.domain || row.listingId?.category || 'general';
    catAgg.set(`${cityKey}::${catKey}`, {
      city: cityKey,
      category: catKey,
      total: (catAgg.get(`${cityKey}::${catKey}`)?.total || 0) + 1,
    });

    if (row.lostReason) lostAgg.set(row.lostReason, (lostAgg.get(row.lostReason) || 0) + 1);

    const areaKey = row.areaId?.name || String(row.areaId || 'unknown');
    areaAgg.set(areaKey, {
      area: areaKey,
      leadCount: (areaAgg.get(areaKey)?.leadCount || 0) + 1,
      avgLeadScore: ((areaAgg.get(areaKey)?.avgLeadScore || 0) + Number(row.leadScore || 0)),
    });

    const collectionTags = (row.tags || []).filter((tag) => String(tag).startsWith('collection:'));
    collectionTags.forEach((tag) => {
      const key = tag.replace('collection:', '');
      collectionAgg.set(key, {
        collection: key,
        total: (collectionAgg.get(key)?.total || 0) + 1,
        converted: (collectionAgg.get(key)?.converted || 0) + (row.status === INQUIRY_STATUS.CONVERTED ? 1 : 0),
      });
    });
  });

  summary.conversionRate = Number(((convertedCount / rows.length) * 100).toFixed(2));
  summary.averageFollowupTimeHours = followupLagCount ? Number(((totalFollowupLagMs / followupLagCount) / (1000 * 60 * 60)).toFixed(2)) : 0;
  summary.vendorResponseSlaHours = summary.averageFollowupTimeHours;

  summary.inquiryConversionByCity = Array.from(cityAgg.values()).map((x) => ({ ...x, conversionRate: x.total ? Number(((x.converted / x.total) * 100).toFixed(2)) : 0 }));
  summary.vendorConversionLeaderboard = Array.from(vendorAgg.values())
    .map((x) => ({ ...x, conversionRate: x.total ? Number(((x.converted / x.total) * 100).toFixed(2)) : 0 }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10);
  summary.seasonalConversionTrends = Array.from(seasonalAgg.values()).map((x) => ({ ...x, conversionRate: x.total ? Number(((x.converted / x.total) * 100).toFixed(2)) : 0 }));
  summary.cityWiseBestCategories = Array.from(catAgg.values()).sort((a, b) => b.total - a.total).slice(0, 20);
  summary.lostReasonInsights = Array.from(lostAgg.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  summary.areaWiseLeadHeatmap = Array.from(areaAgg.values()).map((x) => ({ ...x, avgLeadScore: Number((x.avgLeadScore / x.leadCount).toFixed(2)) })).sort((a, b) => b.leadCount - a.leadCount);
  summary.topConvertingCollection = Array.from(collectionAgg.values())
    .map((x) => ({ ...x, conversionRate: x.total ? Number(((x.converted / x.total) * 100).toFixed(2)) : 0 }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10);

  return summary;
};

const getInquiryAnalyticsSummary = async ({ user, query = {} }) => {
  const filter = buildRoleScopedFilter(user, query);
  const rows = await Inquiry.find(filter)
    .select('status leadScore nextFollowupAt createdAt followupNotes cityId areaId vendorId domain tags seasonalInterest lostReason listingId')
    .populate('cityId', 'name')
    .populate('areaId', 'name')
    .populate('vendorId', 'businessName')
    .populate('listingId', 'category')
    .lean();

  return summarizeLifecycleAnalytics(rows);
};

export {
  buildRoleScopedFilter,
  isValidTransition,
  computeLeadScore,
  getLeadAgingBucket,
  summarizeLifecycleAnalytics,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  assignInquiry,
  addFollowup,
  getInquiryAnalyticsSummary,
};

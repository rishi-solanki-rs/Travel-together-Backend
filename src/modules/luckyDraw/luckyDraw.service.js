import LuckyDrawCampaign from '../../shared/models/LuckyDrawCampaign.model.js';
import LuckyDrawEntry from '../../shared/models/LuckyDrawEntry.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { LUCKY_DRAW_STATUS } from '../../shared/constants/index.js';
import { sendEmail, emailTemplates } from '../../utils/emailHelper.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { v4 as uuidv4 } from 'uuid';

const createCampaign = async (data, userId) => {
  data.slug = await generateUniqueSlug(data.title, LuckyDrawCampaign);
  return LuckyDrawCampaign.create({ ...data, createdBy: userId });
};

const getCampaigns = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.status) filter.status = query.status;

  const [campaigns, total] = await Promise.all([
    LuckyDrawCampaign.find(filter).sort({ startDate: -1 }).skip(skip).limit(perPage),
    LuckyDrawCampaign.countDocuments(filter),
  ]);
  return { campaigns, pagination: buildPaginationMeta(page, perPage, total) };
};

const getActiveCampaigns = async () => {
  const now = new Date();
  return LuckyDrawCampaign.find({
    status: LUCKY_DRAW_STATUS.ACTIVE,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    isDeleted: false,
  }).lean();
};

const getCampaignBySlug = async (slug) => {
  const campaign = await LuckyDrawCampaign.findOne({ slug, isDeleted: false }).lean();
  if (!campaign) throw ApiError.notFound('Campaign not found');
  return campaign;
};

const enterCampaign = async (campaignId, userId) => {
  const campaign = await LuckyDrawCampaign.findById(campaignId);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (campaign.status !== LUCKY_DRAW_STATUS.ACTIVE) throw ApiError.badRequest('Campaign is not active');
  const now = new Date();
  if (now < campaign.startDate || now > campaign.endDate) throw ApiError.badRequest('Campaign entry period has ended');

  const existingEntry = await LuckyDrawEntry.findOne({ campaignId, userId });
  if (existingEntry) {
    if (existingEntry.entryCount >= campaign.entryRules.maxEntriesPerUser) {
      throw ApiError.conflict(`You have reached the maximum entries (${campaign.entryRules.maxEntriesPerUser}) for this campaign`);
    }
    existingEntry.entryCount += 1;
    await existingEntry.save();
    return existingEntry;
  }

  const entry = await LuckyDrawEntry.create({
    campaignId,
    userId,
    entryNumber: `TII-${uuidv4().split('-')[0].toUpperCase()}`,
    entryCount: 1,
  });

  await LuckyDrawCampaign.findByIdAndUpdate(campaignId, {
    $inc: { 'stats.totalEntries': 1, 'stats.uniqueParticipants': 1 },
  });

  return entry;
};

const pickWinners = async (campaignId, adminId) => {
  const campaign = await LuckyDrawCampaign.findById(campaignId);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (campaign.winners && campaign.winners.length > 0) throw ApiError.badRequest('Winners already picked');

  const entries = await LuckyDrawEntry.find({ campaignId, isDisqualified: false }).populate('userId', 'name email');
  if (!entries.length) throw ApiError.badRequest('No valid entries found');

  const shuffled = entries.sort(() => Math.random() - 0.5);
  const winners = [];

  for (let i = 0; i < Math.min(campaign.prizes.length, shuffled.length); i++) {
    const entry = shuffled[i];
    const prize = campaign.prizes[i];

    winners.push({ userId: entry.userId._id, rank: prize.rank, prizeTitle: prize.title, notifiedAt: new Date() });
    await LuckyDrawEntry.findByIdAndUpdate(entry._id, { isWinner: true, winnerRank: prize.rank });

    if (entry.userId.email) {
      const { subject, html } = emailTemplates.luckyDrawWinner(entry.userId.name, prize.title);
      await sendEmail({ to: entry.userId.email, subject, html }).catch(() => {});
    }
  }

  campaign.winners = winners;
  campaign.status = LUCKY_DRAW_STATUS.WINNER_PICKED;
  campaign.drawPickedAt = new Date();
  campaign.drawPickedBy = adminId;
  await campaign.save();

  return campaign;
};

const updateCampaign = async (id, data) => {
  const campaign = await LuckyDrawCampaign.findByIdAndUpdate(id, data, { new: true });
  if (!campaign) throw ApiError.notFound('Campaign not found');
  return campaign;
};

export { createCampaign, getCampaigns, getActiveCampaigns, getCampaignBySlug, enterCampaign, pickWinners, updateCampaign };

import LuckyDrawCampaign from '../shared/models/LuckyDrawCampaign.model.js';
import CMSSection from '../shared/models/CMSSection.model.js';
import logger from '../utils/logger.js';
import { LUCKY_DRAW_STATUS } from '../shared/constants/index.js';
import { cache } from '../config/redis.js';

const run = async () => {
  const now = new Date();

  const toActivate = await LuckyDrawCampaign.find({
    status: LUCKY_DRAW_STATUS.DRAFT,
    startDate: { $lte: now },
    endDate: { $gte: now },
    isDeleted: false,
  });

  for (const campaign of toActivate) {
    campaign.status = LUCKY_DRAW_STATUS.ACTIVE;
    campaign.isActive = true;
    await campaign.save();
    logger.info({ campaignId: campaign._id }, 'Campaign activated');
  }

  const toEnd = await LuckyDrawCampaign.find({
    status: LUCKY_DRAW_STATUS.ACTIVE,
    endDate: { $lt: now },
    isDeleted: false,
  });

  for (const campaign of toEnd) {
    campaign.status = LUCKY_DRAW_STATUS.ENDED;
    campaign.isActive = false;
    await campaign.save();
    logger.info({ campaignId: campaign._id }, 'Campaign ended');
  }

  const newSections = await CMSSection.find({
    isActive: false,
    isDeleted: false,
    scheduledFrom: { $lte: now },
    scheduledTo: { $gte: now },
  });

  for (const section of newSections) {
    section.isActive = true;
    await section.save();
    await cache.delPattern('cms:*');
    await cache.delPattern('page:render:*');
  }

  const expiredSections = await CMSSection.find({
    isActive: true,
    isDeleted: false,
    scheduledTo: { $lt: now },
  });

  for (const section of expiredSections) {
    section.isActive = false;
    await section.save();
    await cache.delPattern('cms:*');
    await cache.delPattern('page:render:*');
  }

  if (toActivate.length || toEnd.length || newSections.length || expiredSections.length) {
    logger.info(`campaignSchedulerJob: Activated ${toActivate.length} campaigns, ended ${toEnd.length}, activated ${newSections.length} CMS sections, expired ${expiredSections.length} sections`);
  }
};

export { run };

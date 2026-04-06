import LuckyDrawCampaign from '../shared/models/LuckyDrawCampaign.model.js';
import LuckyDrawEntry from '../shared/models/LuckyDrawEntry.model.js';
import User from '../shared/models/User.model.js';
import Notification from '../shared/models/Notification.model.js';
import { sendEmail, emailTemplates } from '../utils/emailHelper.js';
import logger from '../utils/logger.js';
import { LUCKY_DRAW_STATUS, NOTIFICATION_TYPES } from '../shared/constants/index.js';
import { v4 as uuidv4 } from 'uuid';

const run = async () => {
  const now = new Date();

  const endedCampaigns = await LuckyDrawCampaign.find({
    status: LUCKY_DRAW_STATUS.ACTIVE,
    endDate: { $lte: now },
    isDrawManual: false,
    'winners.0': { $exists: false },
  });

  logger.info(`luckyDrawPickerJob: Found ${endedCampaigns.length} campaigns to pick winners for`);

  for (const campaign of endedCampaigns) {
    try {
      const entries = await LuckyDrawEntry.find({ campaignId: campaign._id, isDisqualified: false }).populate('userId', 'name email');
      if (!entries.length) {
        campaign.status = LUCKY_DRAW_STATUS.ENDED;
        await campaign.save();
        continue;
      }

      const shuffled = entries.sort(() => Math.random() - 0.5);
      const winners = [];

      for (let i = 0; i < Math.min(campaign.prizes.length, shuffled.length); i++) {
        const entry = shuffled[i];
        const prize = campaign.prizes[i];
        winners.push({ userId: entry.userId._id, rank: prize.rank, prizeTitle: prize.title, notifiedAt: now });

        await LuckyDrawEntry.findByIdAndUpdate(entry._id, { isWinner: true, winnerRank: prize.rank });

        if (entry.userId?.email) {
          const { subject, html } = emailTemplates.luckyDrawWinner(entry.userId.name, prize.title);
          await sendEmail({ to: entry.userId.email, subject, html }).catch(() => {});
        }

        await Notification.create({
          userId: entry.userId._id,
          type: NOTIFICATION_TYPES.LUCKY_DRAW_WINNER,
          title: `🎉 You Won the ${campaign.title} Lucky Draw!`,
          message: `Congratulations! You have won: ${prize.title}`,
        });
      }

      campaign.winners = winners;
      campaign.status = LUCKY_DRAW_STATUS.WINNER_PICKED;
      campaign.drawPickedAt = now;
      await campaign.save();

      logger.info({ campaignId: campaign._id, winners: winners.length }, 'Winners picked for campaign');
    } catch (err) {
      logger.error({ err, campaignId: campaign._id }, 'Failed to pick winners for campaign');
    }
  }
};

export { run };

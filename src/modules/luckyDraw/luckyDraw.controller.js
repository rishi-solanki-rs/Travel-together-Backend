import * as luckyDrawService from './luckyDraw.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const create = asyncHandler(async (req, res) => { const c = await luckyDrawService.createCampaign(req.body, req.user.id); ApiResponse.created(res, 'Campaign created', c); });
const getAll = asyncHandler(async (req, res) => { const { campaigns, pagination } = await luckyDrawService.getCampaigns(req.query); ApiResponse.paginated(res, 'Campaigns fetched', campaigns, pagination); });
const getActive = asyncHandler(async (req, res) => { const campaigns = await luckyDrawService.getActiveCampaigns(); ApiResponse.success(res, 'Active campaigns fetched', campaigns); });
const getBySlug = asyncHandler(async (req, res) => { const campaign = await luckyDrawService.getCampaignBySlug(req.params.slug); ApiResponse.success(res, 'Campaign fetched', campaign); });
const enter = asyncHandler(async (req, res) => { const entry = await luckyDrawService.enterCampaign(req.params.id, req.user.id); ApiResponse.success(res, 'Entered campaign successfully', entry); });
const pickWinners = asyncHandler(async (req, res) => { const campaign = await luckyDrawService.pickWinners(req.params.id, req.user.id); ApiResponse.success(res, 'Winners picked', campaign); });
const update = asyncHandler(async (req, res) => { const c = await luckyDrawService.updateCampaign(req.params.id, req.body); ApiResponse.success(res, 'Campaign updated', c); });

export { create, getAll, getActive, getBySlug, enter, pickWinners, update };

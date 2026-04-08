import express from 'express';
import * as luckyDrawController from './luckyDraw.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { luckyDrawBodySchema, luckyDrawIdParamsSchema, luckyDrawSlugParamsSchema } from './luckyDraw.validator.js';

const router = express.Router();

router.get('/active', luckyDrawController.getActive);
router.get('/public/:slug', validateRequest({ params: luckyDrawSlugParamsSchema }), luckyDrawController.getBySlug);

router.post('/:id/enter', authenticate, validateRequest({ params: luckyDrawIdParamsSchema }), luckyDrawController.enter);

router.get('/', authenticate, isAdmin, luckyDrawController.getAll);
router.post('/', authenticate, isAdmin, validateRequest({ body: luckyDrawBodySchema }), luckyDrawController.create);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: luckyDrawIdParamsSchema, body: luckyDrawBodySchema.partial() }), luckyDrawController.update);
router.post('/:id/pick-winners', authenticate, isAdmin, validateRequest({ params: luckyDrawIdParamsSchema }), auditLog('pick_lucky_draw_winners', 'luckyDraw'), luckyDrawController.pickWinners);

export default router;

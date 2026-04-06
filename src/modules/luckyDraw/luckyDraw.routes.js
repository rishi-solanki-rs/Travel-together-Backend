import express from 'express';
import * as luckyDrawController from './luckyDraw.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';

const router = express.Router();

router.get('/active', luckyDrawController.getActive);
router.get('/public/:slug', luckyDrawController.getBySlug);

router.post('/:id/enter', authenticate, luckyDrawController.enter);

router.get('/', authenticate, isAdmin, luckyDrawController.getAll);
router.post('/', authenticate, isAdmin, luckyDrawController.create);
router.put('/:id', authenticate, isAdmin, luckyDrawController.update);
router.post('/:id/pick-winners', authenticate, isAdmin, auditLog('pick_lucky_draw_winners', 'luckyDraw'), luckyDrawController.pickWinners);

export default router;

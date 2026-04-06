import express from 'express';
import * as plansController from './plans.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/', plansController.getAll);
router.get('/:id', plansController.getById);
router.post('/', authenticate, isAdmin, plansController.create);
router.put('/:id', authenticate, isAdmin, plansController.update);

export default router;

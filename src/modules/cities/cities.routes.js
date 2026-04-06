import express from 'express';
import * as citiesController from './cities.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/', citiesController.getAll);
router.get('/featured', citiesController.getFeatured);
router.get('/:slug', citiesController.getBySlug);
router.post('/', authenticate, isAdmin, citiesController.create);
router.put('/:id', authenticate, isAdmin, citiesController.update);

export default router;

import express from 'express';
import * as citiesController from './cities.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { cityBodySchema, cityIdParamsSchema, citySlugParamsSchema } from './cities.validator.js';

const router = express.Router();

router.get('/', citiesController.getAll);
router.get('/featured', citiesController.getFeatured);
router.get('/:slug', validateRequest({ params: citySlugParamsSchema }), citiesController.getBySlug);
router.post('/', authenticate, isAdmin, validateRequest({ body: cityBodySchema }), citiesController.create);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: cityIdParamsSchema, body: cityBodySchema.partial() }), citiesController.update);

export default router;

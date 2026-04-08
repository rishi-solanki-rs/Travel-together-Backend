import express from 'express';
import * as citiesController from './cities.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	cityBodySchema,
	cityIdParamsSchema,
	citySlugParamsSchema,
	cityIdentifierParamsSchema,
	citySectionParamsSchema,
} from './cities.validator.js';

const router = express.Router();
const publicCitiesRouter = express.Router();

publicCitiesRouter.get('/:slug', validateRequest({ params: citySlugParamsSchema }), citiesController.getPublicBySlug);

router.get('/', citiesController.getAll);
router.get('/featured', citiesController.getFeatured);
router.get('/:identifier', validateRequest({ params: cityIdentifierParamsSchema }), citiesController.getByIdentifier);
router.post('/', authenticate, isAdmin, validateRequest({ body: cityBodySchema }), citiesController.create);
router.patch('/:id/:section', authenticate, isAdmin, validateRequest({ params: citySectionParamsSchema }), citiesController.updateSection);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: cityIdParamsSchema, body: cityBodySchema.partial() }), citiesController.update);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: cityIdParamsSchema }), citiesController.remove);

export default router;
export { publicCitiesRouter };

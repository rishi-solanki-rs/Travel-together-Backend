import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import * as controller from './countries.controller.js';
import {
	countryBodySchema,
	countryIdParamsSchema,
	countrySectionParamsSchema,
	countryQuerySchema,
} from './countries.validator.js';

const router = express.Router();

router.get('/', validateRequest({ query: countryQuerySchema }), controller.getAll);
router.post('/countryDetails', authenticate, isAdmin, validateRequest({ body: countryBodySchema }), controller.create);
router.get('/:id', validateRequest({ params: countryIdParamsSchema }), controller.getById);
router.post('/', authenticate, isAdmin, validateRequest({ body: countryBodySchema }), controller.create);
router.patch('/:id/:section', authenticate, isAdmin, validateRequest({ params: countrySectionParamsSchema }), controller.updateSection);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: countryIdParamsSchema, body: countryBodySchema.partial() }), controller.update);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: countryIdParamsSchema }), controller.remove);

export default router;

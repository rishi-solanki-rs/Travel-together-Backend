import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import * as controller from './states.controller.js';
import { stateBodySchema, stateIdParamsSchema, stateSectionParamsSchema, stateQuerySchema } from './states.validator.js';

const router = express.Router();

router.get('/', validateRequest({ query: stateQuerySchema }), controller.getAll);
router.post('/stateDetails', authenticate, isAdmin, validateRequest({ body: stateBodySchema }), controller.create);
router.get('/:id', validateRequest({ params: stateIdParamsSchema }), controller.getById);
router.post('/', authenticate, isAdmin, validateRequest({ body: stateBodySchema }), controller.create);
router.patch('/:id/:section', authenticate, isAdmin, validateRequest({ params: stateSectionParamsSchema }), controller.updateSection);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: stateIdParamsSchema, body: stateBodySchema.partial() }), controller.update);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: stateIdParamsSchema }), controller.remove);

export default router;

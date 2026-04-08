import express from 'express';
import * as templatesController from './templates.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { templateBodySchema, templateIdParamsSchema, templateSubtypeParamsSchema } from './templates.validator.js';

const router = express.Router();

router.get('/', authenticate, isAdmin, templatesController.getAll);
router.get('/subtype/:subtypeId', authenticate, validateRequest({ params: templateSubtypeParamsSchema }), templatesController.getForSubtype);
router.get('/:id', authenticate, isAdmin, validateRequest({ params: templateIdParamsSchema }), templatesController.getById);
router.post('/', authenticate, isAdmin, validateRequest({ body: templateBodySchema }), templatesController.create);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: templateIdParamsSchema, body: templateBodySchema.partial() }), templatesController.update);

export default router;

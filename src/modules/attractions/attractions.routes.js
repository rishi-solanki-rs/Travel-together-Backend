import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import * as controller from './attractions.controller.js';
import { attractionBodySchema, attractionIdParamsSchema, attractionQuerySchema } from './attractions.validator.js';

const router = express.Router();

router.get('/', validateRequest({ query: attractionQuerySchema }), controller.getAll);
router.get('/:id', validateRequest({ params: attractionIdParamsSchema }), controller.getById);
router.post('/', authenticate, isAdmin, validateRequest({ body: attractionBodySchema }), controller.create);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: attractionIdParamsSchema, body: attractionBodySchema.partial() }), controller.update);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: attractionIdParamsSchema }), controller.remove);

export default router;

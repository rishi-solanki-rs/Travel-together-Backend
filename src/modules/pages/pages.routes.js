import express from 'express';
import * as pagesController from './pages.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { pageBodySchema, publishParamsSchema, pageSlugParamsSchema, pagesQuerySchema } from './pages.validator.js';

const router = express.Router();

router.get('/render/:slug', pagesController.render);

router.get('/', authenticate, isAdmin, validateRequest({ query: pagesQuerySchema }), pagesController.getAll);
router.get('/:slug', authenticate, isAdmin, validateRequest({ params: pageSlugParamsSchema }), pagesController.getBySlug);
router.post('/', authenticate, isAdmin, validateRequest({ body: pageBodySchema }), pagesController.create);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: publishParamsSchema, body: pageBodySchema.partial() }), pagesController.update);
router.patch('/:id/publish', authenticate, isAdmin, validateRequest({ params: publishParamsSchema }), pagesController.publish);

export default router;

import express from 'express';
import * as categoriesController from './categories.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { categoryBodySchema, categoryIdParamsSchema, categorySlugParamsSchema } from './categories.validator.js';

const router = express.Router();

router.get('/', categoriesController.getAll);
router.get('/insights/admin', authenticate, isAdmin, categoriesController.insights);
router.get('/:slug', validateRequest({ params: categorySlugParamsSchema }), categoriesController.getBySlug);
router.post('/', authenticate, isAdmin, validateRequest({ body: categoryBodySchema }), auditLog('create_category', 'categories'), categoriesController.create);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: categoryIdParamsSchema, body: categoryBodySchema.partial() }), auditLog('update_category', 'categories'), categoriesController.update);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: categoryIdParamsSchema }), auditLog('delete_category', 'categories'), categoriesController.remove);

export default router;

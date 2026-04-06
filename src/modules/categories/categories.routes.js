import express from 'express';
import * as categoriesController from './categories.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';

const router = express.Router();

router.get('/', categoriesController.getAll);
router.get('/:slug', categoriesController.getBySlug);
router.post('/', authenticate, isAdmin, auditLog('create_category', 'categories'), categoriesController.create);
router.put('/:id', authenticate, isAdmin, auditLog('update_category', 'categories'), categoriesController.update);
router.delete('/:id', authenticate, isAdmin, auditLog('delete_category', 'categories'), categoriesController.remove);

export default router;

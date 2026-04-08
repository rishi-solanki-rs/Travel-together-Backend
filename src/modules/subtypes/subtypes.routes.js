import express from 'express';
import * as subtypesController from './subtypes.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/', subtypesController.getAll);
router.get('/category/:categoryId', subtypesController.getByCategory);
router.get('/:slug', subtypesController.getBySlug);
router.post('/', authenticate, isAdmin, subtypesController.create);
router.put('/:id/filter-config', authenticate, isAdmin, subtypesController.updateFilterConfig);
router.put('/:id', authenticate, isAdmin, subtypesController.update);
router.delete('/:id', authenticate, isAdmin, subtypesController.remove);

export default router;

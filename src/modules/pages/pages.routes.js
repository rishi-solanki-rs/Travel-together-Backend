import express from 'express';
import * as pagesController from './pages.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/render/:slug', pagesController.render);

router.get('/', authenticate, isAdmin, pagesController.getAll);
router.get('/:slug', authenticate, isAdmin, pagesController.getBySlug);
router.post('/', authenticate, isAdmin, pagesController.create);
router.put('/:id', authenticate, isAdmin, pagesController.update);
router.patch('/:id/publish', authenticate, isAdmin, pagesController.publish);

export default router;

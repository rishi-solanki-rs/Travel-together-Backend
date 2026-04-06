import express from 'express';
import * as templatesController from './templates.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/', authenticate, isAdmin, templatesController.getAll);
router.get('/subtype/:subtypeId', authenticate, templatesController.getForSubtype);
router.get('/:id', authenticate, isAdmin, templatesController.getById);
router.post('/', authenticate, isAdmin, templatesController.create);
router.put('/:id', authenticate, isAdmin, templatesController.update);

export default router;

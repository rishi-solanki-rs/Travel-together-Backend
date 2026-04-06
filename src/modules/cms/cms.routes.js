import express from 'express';
import * as cmsController from './cms.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';

const router = express.Router();

router.get('/', authenticate, isAdmin, cmsController.getAll);
router.get('/page/:pageId', cmsController.getByPage);
router.get('/identifier/:identifier', cmsController.getByIdentifier);
router.post('/', authenticate, isAdmin, auditLog('create_cms_section', 'cms'), cmsController.create);
router.put('/:id', authenticate, isAdmin, auditLog('update_cms_section', 'cms'), cmsController.update);
router.delete('/:id', authenticate, isAdmin, auditLog('delete_cms_section', 'cms'), cmsController.remove);
router.patch('/page/:pageId/reorder', authenticate, isAdmin, cmsController.reorder);

export default router;

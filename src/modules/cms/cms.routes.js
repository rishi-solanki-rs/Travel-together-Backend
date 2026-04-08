import express from 'express';
import * as cmsController from './cms.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { cmsSectionBodySchema, cmsSectionUpdateSchema, reorderSchema, cmsIdParamsSchema, cmsPageParamsSchema, cmsIdentifierParamsSchema } from './cms.validator.js';

const router = express.Router();

router.get('/', authenticate, isAdmin, cmsController.getAll);
router.get('/page/:pageId', validateRequest({ params: cmsPageParamsSchema }), cmsController.getByPage);
router.get('/identifier/:identifier', validateRequest({ params: cmsIdentifierParamsSchema }), cmsController.getByIdentifier);
router.post('/', authenticate, isAdmin, validateRequest({ body: cmsSectionBodySchema }), auditLog('create_cms_section', 'cms'), cmsController.create);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: cmsIdParamsSchema, body: cmsSectionUpdateSchema }), auditLog('update_cms_section', 'cms'), cmsController.update);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: cmsIdParamsSchema }), auditLog('delete_cms_section', 'cms'), cmsController.remove);
router.patch('/page/:pageId/reorder', authenticate, isAdmin, validateRequest({ params: cmsPageParamsSchema, body: reorderSchema }), cmsController.reorder);

export default router;

import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { editorialBodySchema, editorialUpdateBodySchema, editorialQuerySchema, editorialIdParamSchema } from './editorial.validator.js';
import {
  listPublicEditorial,
  getPublicEditorial,
  listAdminEditorial,
  createAdminEditorial,
  updateAdminEditorial,
  deleteAdminEditorial,
} from './editorial.controller.js';

const router = express.Router();

router.get('/public', validateRequest({ query: editorialQuerySchema }), listPublicEditorial);
router.get('/public/:id', validateRequest({ params: editorialIdParamSchema }), getPublicEditorial);

router.get('/', authenticate, isAdmin, validateRequest({ query: editorialQuerySchema }), listAdminEditorial);
router.post('/', authenticate, isAdmin, validateRequest({ body: editorialBodySchema }), createAdminEditorial);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: editorialIdParamSchema, body: editorialUpdateBodySchema }), updateAdminEditorial);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: editorialIdParamSchema }), deleteAdminEditorial);

export default router;

import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { areaBodySchema, areaIdParamsSchema } from './areas.validator.js';
import { listAreas, getArea, createArea, updateArea, removeArea } from './areas.controller.js';

const router = express.Router();

router.get('/', listAreas);
router.get('/:id', validateRequest({ params: areaIdParamsSchema }), getArea);
router.post('/', authenticate, isAdmin, validateRequest({ body: areaBodySchema }), createArea);
router.put('/:id', authenticate, isAdmin, validateRequest({ params: areaIdParamsSchema, body: areaBodySchema.partial() }), updateArea);
router.delete('/:id', authenticate, isAdmin, validateRequest({ params: areaIdParamsSchema }), removeArea);

export default router;

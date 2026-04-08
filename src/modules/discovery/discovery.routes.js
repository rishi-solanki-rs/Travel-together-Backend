import express from 'express';
import validateRequest from '../../middlewares/validateRequest.js';
import { nearbyQuerySchema, relatedParamsSchema, sidebarQuerySchema } from './discovery.validator.js';
import { getNearby, getRelated, getBlocks, getSidebarFilters } from './discovery.controller.js';

const router = express.Router();

router.get('/nearby', validateRequest({ query: nearbyQuerySchema }), getNearby);
router.get('/related/:listingId', validateRequest({ params: relatedParamsSchema }), getRelated);
router.get('/blocks', validateRequest({ query: nearbyQuerySchema }), getBlocks);
router.get('/sidebar-filters', validateRequest({ query: sidebarQuerySchema }), getSidebarFilters);

export default router;

import * as destinationsService from './destinations.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createPackage = asyncHandler(async (req, res) => { const p = await destinationsService.createPackage(req.params.listingId, req.user.vendorId, req.body); ApiResponse.created(res, 'Package created', p); });
const getPackage = asyncHandler(async (req, res) => { const p = await destinationsService.getPackage(req.params.listingId); ApiResponse.success(res, 'Package fetched', p); });
const updatePackage = asyncHandler(async (req, res) => { const p = await destinationsService.updatePackage(req.params.listingId, req.user.vendorId, req.body); ApiResponse.success(res, 'Package updated', p); });
const addDepartureDate = asyncHandler(async (req, res) => { const p = await destinationsService.addDepartureDate(req.params.listingId, req.user.vendorId, req.body); ApiResponse.success(res, 'Departure date added', p); });
const getByType = asyncHandler(async (req, res) => { const { packages, pagination } = await destinationsService.getPackagesByType(req.params.type, req.query); ApiResponse.paginated(res, 'Packages fetched', packages, pagination); });

export { createPackage, getPackage, updatePackage, addDepartureDate, getByType };

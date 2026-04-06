import * as thingsToDoService from './thingsToDo.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createItinerary = asyncHandler(async (req, res) => {
  const itinerary = await thingsToDoService.createItinerary(req.params.listingId, req.user.vendorId, req.body);
  ApiResponse.created(res, 'Itinerary created', itinerary);
});

const getItineraries = asyncHandler(async (req, res) => {
  const itineraries = await thingsToDoService.getItineraries(req.params.listingId);
  ApiResponse.success(res, 'Itineraries fetched', itineraries);
});

const updateItinerary = asyncHandler(async (req, res) => {
  const itinerary = await thingsToDoService.updateItinerary(req.params.id, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Itinerary updated', itinerary);
});

const addDeparture = asyncHandler(async (req, res) => {
  const departure = await thingsToDoService.addDeparture(req.params.listingId, req.params.itineraryId, req.user.vendorId, req.body);
  ApiResponse.created(res, 'Departure added', departure);
});

const getDepartures = asyncHandler(async (req, res) => {
  const { departures, pagination } = await thingsToDoService.getUpcomingDepartures(req.params.listingId, req.query);
  ApiResponse.paginated(res, 'Departures fetched', departures, pagination);
});

const updateDeparture = asyncHandler(async (req, res) => {
  const departure = await thingsToDoService.updateDeparture(req.params.id, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Departure updated', departure);
});

const cancelDeparture = asyncHandler(async (req, res) => {
  const departure = await thingsToDoService.cancelDeparture(req.params.id, req.user.vendorId, req.body.reason);
  ApiResponse.success(res, 'Departure cancelled', departure);
});

export { createItinerary, getItineraries, updateItinerary, addDeparture, getDepartures, updateDeparture, cancelDeparture };

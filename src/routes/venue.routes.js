const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venueController');
const venueAvailabilityController = require('../controllers/venueAvailabilityController');
const { auth } = require('../middleware/auth');

// Location search (public)
router.get('/search/location', venueController.searchVenuesByLocation);

// Venue availability (public)
router.get('/available', venueAvailabilityController.getAvailableVenues);

// Venue CRUD
router.post('/', auth, venueController.createVenue);
router.get('/', venueController.getAllVenues);
router.get('/:venueId/check-availability', venueAvailabilityController.checkVenueAvailability);
router.get('/:venueId', venueController.getVenue);
router.patch('/:venueId', auth, venueController.updateVenue);
router.delete('/:venueId', auth, venueController.deleteVenue);

// Venue statistics
router.get('/:venueId/statistics', venueController.getVenueStatistics);

// Venue courts
router.get('/:venueId/courts', venueController.getVenueCourts);
router.post('/:venueId/courts', auth, venueController.createCourt);
router.get('/:venueId/available-courts', venueController.getAvailableCourts);

// Court operations
router.get('/courts/:courtId', venueController.getCourt);
router.patch('/courts/:courtId', auth, venueController.updateCourt);
router.delete('/courts/:courtId', auth, venueController.deleteCourt);
router.get('/courts/:courtId/availability', venueController.checkCourtAvailability);

// Weather alerts
router.get('/:venueId/weather-alerts', venueController.getWeatherAlerts);
router.post('/:venueId/weather-alerts', auth, venueController.createWeatherAlert);
router.post('/weather-alerts/:alertId/resolve', auth, venueController.resolveWeatherAlert);

module.exports = router;

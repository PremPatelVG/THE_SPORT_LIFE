const venueService = require('../services/venueService');
const logger = require('../utils/logger');

/**
 * Create venue
 * POST /api/v1/venues
 */
const createVenue = async (req, res) => {
  try {
    const venueData = req.body;
    const userId = req.user.id;

    const venue = await venueService.createVenue(venueData, userId);

    res.status(201).json({
      success: true,
      data: venue,
      message: 'Venue created successfully'
    });
  } catch (error) {
    logger.error('Create venue error:', error);
    res.status(error.message.includes('Only admins') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get venue by ID
 * GET /api/v1/venues/:venueId
 */
const getVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    const venue = await venueService.getVenue(venueId);

    res.json({
      success: true,
      data: venue
    });
  } catch (error) {
    logger.error('Get venue error:', error);
    res.status(error.message === 'Venue not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all venues
 * GET /api/v1/venues
 */
const getAllVenues = async (req, res) => {
  try {
    const filters = {
      city: req.query.city,
      state: req.query.state,
      country: req.query.country,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      search: req.query.search,
      limit: req.query.limit
    };

    const venues = await venueService.getAllVenues(filters);

    res.json({
      success: true,
      data: venues,
      total: venues.length
    });
  } catch (error) {
    logger.error('Get all venues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update venue
 * PATCH /api/v1/venues/:venueId
 */
const updateVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const venue = await venueService.updateVenue(venueId, updateData, userId);

    res.json({
      success: true,
      data: venue,
      message: 'Venue updated successfully'
    });
  } catch (error) {
    logger.error('Update venue error:', error);
    res.status(error.message === 'Venue not found' ? 404 : 
               error.message.includes('Only admins') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete venue
 * DELETE /api/v1/venues/:venueId
 */
const deleteVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    const userId = req.user.id;

    const result = await venueService.deleteVenue(venueId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete venue error:', error);
    res.status(error.message === 'Venue not found' ? 404 : 
               error.message.includes('Only admins') ? 403 :
               error.message.includes('Cannot delete') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get venue courts
 * GET /api/v1/venues/:venueId/courts
 */
const getVenueCourts = async (req, res) => {
  try {
    const { venueId } = req.params;
    const filters = {
      is_available: req.query.is_available !== undefined ? req.query.is_available === 'true' : undefined,
      court_type: req.query.court_type
    };

    const courts = await venueService.getVenueCourts(venueId, filters);

    res.json({
      success: true,
      data: courts,
      total: courts.length
    });
  } catch (error) {
    logger.error('Get venue courts error:', error);
    res.status(error.message === 'Venue not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create court
 * POST /api/v1/venues/:venueId/courts
 */
const createCourt = async (req, res) => {
  try {
    const { venueId } = req.params;
    const courtData = req.body;
    const userId = req.user.id;

    const court = await venueService.createCourt(venueId, courtData, userId);

    res.status(201).json({
      success: true,
      data: court,
      message: 'Court created successfully'
    });
  } catch (error) {
    logger.error('Create court error:', error);
    res.status(error.message === 'Venue not found' ? 404 : 
               error.message.includes('Only admins') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get court by ID
 * GET /api/v1/venues/courts/:courtId
 */
const getCourt = async (req, res) => {
  try {
    const { courtId } = req.params;
    const court = await venueService.getCourt(courtId);

    res.json({
      success: true,
      data: court
    });
  } catch (error) {
    logger.error('Get court error:', error);
    res.status(error.message === 'Court not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update court
 * PATCH /api/v1/venues/courts/:courtId
 */
const updateCourt = async (req, res) => {
  try {
    const { courtId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const court = await venueService.updateCourt(courtId, updateData, userId);

    res.json({
      success: true,
      data: court,
      message: 'Court updated successfully'
    });
  } catch (error) {
    logger.error('Update court error:', error);
    res.status(error.message === 'Court not found' ? 404 : 
               error.message.includes('Only admins') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete court
 * DELETE /api/v1/venues/courts/:courtId
 */
const deleteCourt = async (req, res) => {
  try {
    const { courtId } = req.params;
    const userId = req.user.id;

    const result = await venueService.deleteCourt(courtId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete court error:', error);
    res.status(error.message === 'Court not found' ? 404 : 
               error.message.includes('Only admins') ? 403 :
               error.message.includes('Cannot delete') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check court availability
 * GET /api/v1/venues/courts/:courtId/availability
 */
const checkCourtAvailability = async (req, res) => {
  try {
    const { courtId } = req.params;
    const { date, start_time, end_time } = req.query;

    if (!date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'date, start_time, and end_time are required'
      });
    }

    const result = await venueService.checkCourtAvailability(courtId, date, start_time, end_time);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Check court availability error:', error);
    res.status(error.message === 'Court not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get weather alerts
 * GET /api/v1/venues/:venueId/weather-alerts
 */
const getWeatherAlerts = async (req, res) => {
  try {
    const { venueId } = req.params;
    const filters = {
      date: req.query.date,
      severity: req.query.severity,
      unresolved: req.query.unresolved === 'true',
      limit: req.query.limit
    };

    const alerts = await venueService.getWeatherAlerts(venueId, filters);

    res.json({
      success: true,
      data: alerts,
      total: alerts.length
    });
  } catch (error) {
    logger.error('Get weather alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create weather alert
 * POST /api/v1/venues/:venueId/weather-alerts
 */
const createWeatherAlert = async (req, res) => {
  try {
    const { venueId } = req.params;
    const alertData = req.body;
    const userId = req.user.id;

    const result = await venueService.createWeatherAlert(venueId, alertData, userId);

    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Create weather alert error:', error);
    res.status(error.message === 'Venue not found' ? 404 : 
               error.message.includes('Only admins') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Resolve weather alert
 * POST /api/v1/venues/weather-alerts/:alertId/resolve
 */
const resolveWeatherAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user.id;

    const result = await venueService.resolveWeatherAlert(alertId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Resolve weather alert error:', error);
    res.status(error.message.includes('Only admins') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get venue statistics
 * GET /api/v1/venues/:venueId/statistics
 */
const getVenueStatistics = async (req, res) => {
  try {
    const { venueId } = req.params;
    const statistics = await venueService.getVenueStatistics(venueId);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get venue statistics error:', error);
    res.status(error.message === 'Venue not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Search venues by location
 * GET /api/v1/venues/search/location
 */
const searchVenuesByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'latitude and longitude are required'
      });
    }

    const radiusKm = radius ? parseFloat(radius) : 10;
    const venues = await venueService.searchVenuesByLocation(
      parseFloat(latitude),
      parseFloat(longitude),
      radiusKm
    );

    res.json({
      success: true,
      data: venues,
      total: venues.length
    });
  } catch (error) {
    logger.error('Search venues by location error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available courts for date/time
 * GET /api/v1/venues/:venueId/available-courts
 */
const getAvailableCourts = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { date, start_time, end_time } = req.query;

    if (!date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'date, start_time, and end_time are required'
      });
    }

    const courts = await venueService.getAvailableCourts(venueId, date, start_time, end_time);

    res.json({
      success: true,
      data: courts,
      total: courts.length
    });
  } catch (error) {
    logger.error('Get available courts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createVenue,
  getVenue,
  getAllVenues,
  updateVenue,
  deleteVenue,
  getVenueCourts,
  createCourt,
  getCourt,
  updateCourt,
  deleteCourt,
  checkCourtAvailability,
  getWeatherAlerts,
  createWeatherAlert,
  resolveWeatherAlert,
  getVenueStatistics,
  searchVenuesByLocation,
  getAvailableCourts
};

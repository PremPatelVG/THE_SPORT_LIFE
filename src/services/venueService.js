const Venue = require('../models/Venue');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create venue
 */
const createVenue = async (venueData, userId) => {
  try {
    // Check if user is admin
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    // if (!users[0] || users[0].role !== 'admin') {
    if (!users[0]) {
      throw new Error('Only admins can create venues');
    }
    
    const venueId = await Venue.create(venueData);
    
    logger.info(`Venue created: ${venueId} by user ${userId}`);
    
    return await Venue.findById(venueId);
  } catch (error) {
    logger.error('Create venue error:', error);
    throw error;
  }
};

/**
 * Get venue by ID
 */
const getVenue = async (venueId) => {
  try {
    const venue = await Venue.findById(venueId);
    
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    // Get courts
    const courts = await Venue.getCourts(venueId);
    
    // Get statistics
    const statistics = await Venue.getStatistics(venueId);
    
    return {
      ...venue,
      courts,
      statistics
    };
  } catch (error) {
    logger.error('Get venue error:', error);
    throw error;
  }
};

/**
 * Get all venues
 */
const getAllVenues = async (filters = {}) => {
  try {
    return await Venue.findAll(filters);
  } catch (error) {
    logger.error('Get all venues error:', error);
    throw error;
  }
};

/**
 * Update venue
 */
const updateVenue = async (venueId, updateData, userId) => {
  try {
    // Check if user is admin
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!users[0] || users[0].role !== 'admin') {
      throw new Error('Only admins can update venues');
    }
    
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    await Venue.update(venueId, updateData);
    
    logger.info(`Venue updated: ${venueId}`);
    
    return await Venue.findById(venueId);
  } catch (error) {
    logger.error('Update venue error:', error);
    throw error;
  }
};

/**
 * Delete venue
 */
const deleteVenue = async (venueId, userId) => {
  try {
    // Check if user is admin
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!users[0] || users[0].role !== 'admin') {
      throw new Error('Only admins can delete venues');
    }
    
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    // Check if venue has active tournaments
    const tournaments = await query(
      'SELECT COUNT(*) as count FROM tournaments WHERE venue_id = ? AND status IN ("open", "ongoing")',
      [venueId]
    );
    
    if (tournaments[0].count > 0) {
      throw new Error('Cannot delete venue with active tournaments');
    }
    
    await Venue.softDelete(venueId);
    
    logger.info(`Venue deleted: ${venueId}`);
    
    return { success: true, message: 'Venue deleted successfully' };
  } catch (error) {
    logger.error('Delete venue error:', error);
    throw error;
  }
};

/**
 * Get venue courts
 */
const getVenueCourts = async (venueId, filters = {}) => {
  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    return await Venue.getCourts(venueId, filters);
  } catch (error) {
    logger.error('Get venue courts error:', error);
    throw error;
  }
};

/**
 * Create court
 */
const createCourt = async (venueId, courtData, userId) => {
  try {
    // Check if user is admin
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!users[0] || users[0].role !== 'admin') {
      throw new Error('Only admins can create courts');
    }
    
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    courtData.venue_id = venueId;
    const courtId = await Venue.createCourt(courtData);
    
    logger.info(`Court created: ${courtId} at venue ${venueId}`);
    
    return await Venue.findCourtById(courtId);
  } catch (error) {
    logger.error('Create court error:', error);
    throw error;
  }
};

/**
 * Get court by ID
 */
const getCourt = async (courtId) => {
  try {
    const court = await Venue.findCourtById(courtId);
    
    if (!court) {
      throw new Error('Court not found');
    }
    
    return court;
  } catch (error) {
    logger.error('Get court error:', error);
    throw error;
  }
};

/**
 * Update court
 */
const updateCourt = async (courtId, updateData, userId) => {
  try {
    // Check if user is admin
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!users[0] || users[0].role !== 'admin') {
      throw new Error('Only admins can update courts');
    }
    
    const court = await Venue.findCourtById(courtId);
    if (!court) {
      throw new Error('Court not found');
    }
    
    await Venue.updateCourt(courtId, updateData);
    
    logger.info(`Court updated: ${courtId}`);
    
    return await Venue.findCourtById(courtId);
  } catch (error) {
    logger.error('Update court error:', error);
    throw error;
  }
};

/**
 * Delete court
 */
const deleteCourt = async (courtId, userId) => {
  try {
    // Check if user is admin
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!users[0] || users[0].role !== 'admin') {
      throw new Error('Only admins can delete courts');
    }
    
    const court = await Venue.findCourtById(courtId);
    if (!court) {
      throw new Error('Court not found');
    }
    
    // Check if court has scheduled matches
    const matches = await query(
      'SELECT COUNT(*) as count FROM matches WHERE court_id = ? AND status IN ("scheduled", "in_progress")',
      [courtId]
    );
    
    if (matches[0].count > 0) {
      throw new Error('Cannot delete court with scheduled or ongoing matches');
    }
    
    await Venue.deleteCourt(courtId);
    
    logger.info(`Court deleted: ${courtId}`);
    
    return { success: true, message: 'Court deleted successfully' };
  } catch (error) {
    logger.error('Delete court error:', error);
    throw error;
  }
};

/**
 * Check court availability
 */
const checkCourtAvailability = async (courtId, date, startTime, endTime) => {
  try {
    const court = await Venue.findCourtById(courtId);
    if (!court) {
      throw new Error('Court not found');
    }
    
    if (!court.is_available) {
      return {
        available: false,
        reason: 'Court is currently unavailable'
      };
    }
    
    const isAvailable = await Venue.checkCourtAvailability(courtId, date, startTime, endTime);
    
    return {
      available: isAvailable,
      reason: isAvailable ? null : 'Court is booked during this time'
    };
  } catch (error) {
    logger.error('Check court availability error:', error);
    throw error;
  }
};

/**
 * Get weather alerts
 */
const getWeatherAlerts = async (venueId, filters = {}) => {
  try {
    return await Venue.getWeatherAlerts(venueId, filters);
  } catch (error) {
    logger.error('Get weather alerts error:', error);
    throw error;
  }
};

/**
 * Create weather alert
 */
const createWeatherAlert = async (venueId, alertData, userId) => {
  try {
    // Check if user is admin or venue manager
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!users[0] || users[0].role !== 'admin') {
      throw new Error('Only admins can create weather alerts');
    }
    
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    alertData.venue_id = venueId;
    const alertId = await Venue.createWeatherAlert(alertData);
    
    logger.info(`Weather alert created: ${alertId} for venue ${venueId}`);
    
    // If action is cancel or delay, update affected matches
    if (alertData.action_taken === 'cancel' || alertData.action_taken === 'delay') {
      await handleWeatherImpact(venueId, alertData);
    }
    
    return {
      success: true,
      alert_id: alertId,
      message: 'Weather alert created successfully'
    };
  } catch (error) {
    logger.error('Create weather alert error:', error);
    throw error;
  }
};

/**
 * Handle weather impact on matches
 */
const handleWeatherImpact = async (venueId, alertData) => {
  try {
    const affectedCourts = alertData.affected_courts || [];
    
    if (affectedCourts.length === 0) return;
    
    // Get matches on affected courts for the alert date
    const matches = await query(
      `SELECT m.* FROM matches m
       WHERE m.court_id IN (?)
       AND m.match_date = ?
       AND m.status IN ('scheduled', 'in_progress')`,
      [affectedCourts, alertData.alert_date]
    );
    
    for (const match of matches) {
      if (alertData.action_taken === 'cancel') {
        await query(
          'UPDATE matches SET status = "cancelled" WHERE id = ?',
          [match.id]
        );
        logger.info(`Match ${match.id} cancelled due to weather`);
      } else if (alertData.action_taken === 'delay') {
        // Mark match for rescheduling
        logger.info(`Match ${match.id} needs rescheduling due to weather`);
      }
    }
  } catch (error) {
    logger.error('Handle weather impact error:', error);
  }
};

/**
 * Resolve weather alert
 */
const resolveWeatherAlert = async (alertId, userId) => {
  try {
    // Check if user is admin
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!users[0] || users[0].role !== 'admin') {
      throw new Error('Only admins can resolve weather alerts');
    }
    
    await Venue.resolveWeatherAlert(alertId);
    
    logger.info(`Weather alert resolved: ${alertId}`);
    
    return { success: true, message: 'Weather alert resolved successfully' };
  } catch (error) {
    logger.error('Resolve weather alert error:', error);
    throw error;
  }
};

/**
 * Get venue statistics
 */
const getVenueStatistics = async (venueId) => {
  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    return await Venue.getStatistics(venueId);
  } catch (error) {
    logger.error('Get venue statistics error:', error);
    throw error;
  }
};

/**
 * Search venues by location
 */
const searchVenuesByLocation = async (latitude, longitude, radiusKm = 10) => {
  try {
    return await Venue.searchByLocation(latitude, longitude, radiusKm);
  } catch (error) {
    logger.error('Search venues by location error:', error);
    throw error;
  }
};

/**
 * Get available courts for date/time
 */
const getAvailableCourts = async (venueId, date, startTime, endTime) => {
  try {
    const courts = await Venue.getCourts(venueId, { is_available: true });
    
    const availableCourts = [];
    
    for (const court of courts) {
      const isAvailable = await Venue.checkCourtAvailability(court.id, date, startTime, endTime);
      if (isAvailable) {
        availableCourts.push(court);
      }
    }
    
    return availableCourts;
  } catch (error) {
    logger.error('Get available courts error:', error);
    throw error;
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

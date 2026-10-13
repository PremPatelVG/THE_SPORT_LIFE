const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Check venue availability for a specific date range
 * GET /api/v1/venues/:venueId/check-availability
 */
const checkVenueAvailability = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }

    // Check if venue exists
    const venues = await db.query(
      'SELECT id, name, is_active FROM venues WHERE id = ?',
      [venueId]
    );

    if (!venues || venues.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }

    const venue = venues[0];

    if (!venue.is_active) {
      return res.json({
        success: true,
        data: {
          is_available: false,
          reason: 'Venue is not active',
          venue_name: venue.name
        }
      });
    }

    // Check for overlapping tournaments
    const tournaments = await db.query(`
      SELECT id, name, start_date, end_date, status
      FROM tournaments
      WHERE venue_id = ?
        AND status NOT IN ('cancelled', 'completed')
        AND (
          (start_date BETWEEN ? AND ?)
          OR (end_date BETWEEN ? AND ?)
          OR (start_date <= ? AND end_date >= ?)
        )
    `, [venueId, start_date, end_date, start_date, end_date, start_date, end_date]);

    // Check for weather alerts
    const weatherAlerts = await db.query(`
  SELECT 
    id,
    weather_condition,
    severity,
    alert_date,
    alert_time,
    notes
  FROM venue_weather_alerts
  WHERE venue_id = ?
    AND resolved_at IS NULL
    AND (
      alert_date BETWEEN ? AND ?
    )
`, [venueId, start_date, end_date]);


    const isAvailable = tournaments.length === 0 && weatherAlerts.length === 0;

    res.json({
      success: true,
      data: {
        is_available: isAvailable,
        venue_name: venue.name,
        conflicting_tournaments: tournaments,
        weather_alerts: weatherAlerts,
        message: isAvailable
          ? 'Venue is available for the selected dates'
          : tournaments.length > 0
            ? 'Venue has conflicting tournaments'
            : 'Venue has weather alerts'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check venue availability'
    });
  }
};


/**
 * Get available venues for date range
 * GET /api/v1/venues/available
 */
const getAvailableVenues = async (req, res) => {
  try {
    const { start_date, end_date, city, state } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }

    let query = `
      SELECT DISTINCT
        v.id,
        v.name,
        v.address,
        v.city,
        v.state,
        v.country,
        v.capacity,
        v.facilities
      FROM venues v
      WHERE v.is_active = TRUE
    `;

    const params = [];

    // Add location filters
    if (city) {
      query += ' AND v.city = ?';
      params.push(city);
    }

    if (state) {
      query += ' AND v.state = ?';
      params.push(state);
    }

    // Exclude venues with conflicting tournaments
    query += `
      AND v.id NOT IN (
        SELECT DISTINCT venue_id
        FROM tournaments
        WHERE venue_id IS NOT NULL
          AND status NOT IN ('cancelled', 'completed')
          AND (
            (start_date BETWEEN ? AND ?)
            OR (end_date BETWEEN ? AND ?)
            OR (start_date <= ? AND end_date >= ?)
          )
      )
    `;
    params.push(start_date, end_date, start_date, end_date, start_date, end_date);

    // Exclude venues with weather alerts
    query += `
      AND v.id NOT IN (
        SELECT DISTINCT venue_id
        FROM venue_weather_alerts
        WHERE is_resolved = FALSE
          AND (
            (DATE(start_time) BETWEEN ? AND ?)
            OR (DATE(end_time) BETWEEN ? AND ?)
          )
      )
    `;
    params.push(start_date, end_date, start_date, end_date);

    query += ' ORDER BY v.name ASC';

    const venueResult = await db.query(query, params);
    const venues = venueResult[0];


    res.json({
      success: true,
      data: venues,
      total: venues.length
    });
  } catch (error) {
    logger.error('Get available venues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available venues'
    });
  }
};

module.exports = {
  checkVenueAvailability,
  getAvailableVenues
};

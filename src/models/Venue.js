const { query } = require('../config/database');

/**
 * Create venue
 */
const create = async (venueData) => {
  const sql = `
    INSERT INTO venues 
    (name, description, address, city, state, country, postal_code, 
     latitude, longitude, contact_person, contact_phone, contact_email, 
     website, facilities, operating_hours, images, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    venueData.name,
    venueData.description || null,
    venueData.address,
    venueData.city,
    venueData.state,
    venueData.country,
    venueData.postal_code || null,
    venueData.latitude || null,
    venueData.longitude || null,
    venueData.contact_person || null,
    venueData.contact_phone || null,
    venueData.contact_email || null,
    venueData.website || null,
    venueData.facilities ? JSON.stringify(venueData.facilities) : null,
    venueData.operating_hours ? JSON.stringify(venueData.operating_hours) : null,
    venueData.images ? JSON.stringify(venueData.images) : null,
    venueData.is_active !== undefined ? venueData.is_active : true
  ]);
  
  return result.insertId;
};

/**
 * Find venue by ID
 */
const findById = async (venueId) => {
  const sql = `
    SELECT 
      v.*,
      COUNT(DISTINCT c.id) as total_courts,
      COUNT(DISTINCT CASE WHEN c.is_available = TRUE THEN c.id END) as available_courts
    FROM venues v
    LEFT JOIN courts c ON v.id = c.venue_id
    WHERE v.id = ?
    GROUP BY v.id
  `;
  
  const venues = await query(sql, [venueId]);
  return venues[0] || null;
};

/**
 * Find all venues with filters
 */
const findAll = async (filters = {}) => {
  let sql = `
    SELECT 
      v.*,
      COUNT(DISTINCT c.id) as total_courts,
      COUNT(DISTINCT CASE WHEN c.is_available = TRUE THEN c.id END) as available_courts
    FROM venues v
    LEFT JOIN courts c ON v.id = c.venue_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.city) {
    sql += ' AND v.city = ?';
    params.push(filters.city);
  }
  
  if (filters.state) {
    sql += ' AND v.state = ?';
    params.push(filters.state);
  }
  
  if (filters.country) {
    sql += ' AND v.country = ?';
    params.push(filters.country);
  }
  
  if (filters.is_active !== undefined) {
    sql += ' AND v.is_active = ?';
    params.push(filters.is_active);
  }
  
  if (filters.search) {
    sql += ' AND (v.name LIKE ? OR v.city LIKE ? OR v.address LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  sql += ' GROUP BY v.id';
  sql += ' ORDER BY v.name';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Update venue
 */
const update = async (venueId, updateData) => {
  const fields = [];
  const values = [];
  
  if (updateData.name) {
    fields.push('name = ?');
    values.push(updateData.name);
  }
  
  if (updateData.description !== undefined) {
    fields.push('description = ?');
    values.push(updateData.description);
  }
  
  if (updateData.address) {
    fields.push('address = ?');
    values.push(updateData.address);
  }
  
  if (updateData.city) {
    fields.push('city = ?');
    values.push(updateData.city);
  }
  
  if (updateData.state) {
    fields.push('state = ?');
    values.push(updateData.state);
  }
  
  if (updateData.country) {
    fields.push('country = ?');
    values.push(updateData.country);
  }
  
  if (updateData.postal_code !== undefined) {
    fields.push('postal_code = ?');
    values.push(updateData.postal_code);
  }
  
  if (updateData.latitude !== undefined) {
    fields.push('latitude = ?');
    values.push(updateData.latitude);
  }
  
  if (updateData.longitude !== undefined) {
    fields.push('longitude = ?');
    values.push(updateData.longitude);
  }
  
  if (updateData.contact_person !== undefined) {
    fields.push('contact_person = ?');
    values.push(updateData.contact_person);
  }
  
  if (updateData.contact_phone !== undefined) {
    fields.push('contact_phone = ?');
    values.push(updateData.contact_phone);
  }
  
  if (updateData.contact_email !== undefined) {
    fields.push('contact_email = ?');
    values.push(updateData.contact_email);
  }
  
  if (updateData.website !== undefined) {
    fields.push('website = ?');
    values.push(updateData.website);
  }
  
  if (updateData.facilities) {
    fields.push('facilities = ?');
    values.push(JSON.stringify(updateData.facilities));
  }
  
  if (updateData.operating_hours) {
    fields.push('operating_hours = ?');
    values.push(JSON.stringify(updateData.operating_hours));
  }
  
  if (updateData.images) {
    fields.push('images = ?');
    values.push(JSON.stringify(updateData.images));
  }
  
  if (updateData.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updateData.is_active);
  }
  
  if (fields.length === 0) return;
  
  values.push(venueId);
  const sql = `UPDATE venues SET ${fields.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
};

/**
 * Delete venue (soft delete by setting is_active = false)
 */
const softDelete = async (venueId) => {
  await query('UPDATE venues SET is_active = FALSE WHERE id = ?', [venueId]);
};

/**
 * Get venue courts
 */
const getCourts = async (venueId, filters = {}) => {
  let sql = `
    SELECT * FROM courts
    WHERE venue_id = ?
  `;
  
  const params = [venueId];
  
  if (filters.is_available !== undefined) {
    sql += ' AND is_available = ?';
    params.push(filters.is_available);
  }
  
  if (filters.court_type) {
    sql += ' AND court_type = ?';
    params.push(filters.court_type);
  }
  
  sql += ' ORDER BY name';
  
  return await query(sql, params);
};

/**
 * Create court
 */
const createCourt = async (courtData) => {
  const sql = `
    INSERT INTO courts 
    (venue_id, name, court_type, surface_type, dimensions, sport_ids, 
     features, hourly_rate, is_available, maintenance_schedule, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    courtData.venue_id,
    courtData.name,
    courtData.court_type,
    courtData.surface_type || null,
    courtData.dimensions || null,
    courtData.sport_ids ? JSON.stringify(courtData.sport_ids) : null,
    courtData.features ? JSON.stringify(courtData.features) : null,
    courtData.hourly_rate || 0,
    courtData.is_available !== undefined ? courtData.is_available : true,
    courtData.maintenance_schedule ? JSON.stringify(courtData.maintenance_schedule) : null,
    courtData.images ? JSON.stringify(courtData.images) : null
  ]);
  
  return result.insertId;
};

/**
 * Find court by ID
 */
const findCourtById = async (courtId) => {
  const sql = `
    SELECT 
      c.*,
      v.name as venue_name,
      v.city as venue_city
    FROM courts c
    JOIN venues v ON c.venue_id = v.id
    WHERE c.id = ?
  `;
  
  const courts = await query(sql, [courtId]);
  return courts[0] || null;
};

/**
 * Update court
 */
const updateCourt = async (courtId, updateData) => {
  const fields = [];
  const values = [];
  
  if (updateData.name) {
    fields.push('name = ?');
    values.push(updateData.name);
  }
  
  if (updateData.court_type) {
    fields.push('court_type = ?');
    values.push(updateData.court_type);
  }
  
  if (updateData.surface_type !== undefined) {
    fields.push('surface_type = ?');
    values.push(updateData.surface_type);
  }
  
  if (updateData.dimensions !== undefined) {
    fields.push('dimensions = ?');
    values.push(updateData.dimensions);
  }
  
  if (updateData.sport_ids) {
    fields.push('sport_ids = ?');
    values.push(JSON.stringify(updateData.sport_ids));
  }
  
  if (updateData.features) {
    fields.push('features = ?');
    values.push(JSON.stringify(updateData.features));
  }
  
  if (updateData.hourly_rate !== undefined) {
    fields.push('hourly_rate = ?');
    values.push(updateData.hourly_rate);
  }
  
  if (updateData.is_available !== undefined) {
    fields.push('is_available = ?');
    values.push(updateData.is_available);
  }
  
  if (updateData.maintenance_schedule) {
    fields.push('maintenance_schedule = ?');
    values.push(JSON.stringify(updateData.maintenance_schedule));
  }
  
  if (updateData.images) {
    fields.push('images = ?');
    values.push(JSON.stringify(updateData.images));
  }
  
  if (fields.length === 0) return;
  
  values.push(courtId);
  const sql = `UPDATE courts SET ${fields.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
};

/**
 * Delete court
 */
const deleteCourt = async (courtId) => {
  await query('DELETE FROM courts WHERE id = ?', [courtId]);
};

/**
 * Check court availability
 */
const checkCourtAvailability = async (courtId, date, startTime, endTime) => {
  const sql = `
    SELECT COUNT(*) as conflict_count
    FROM matches
    WHERE court_id = ?
      AND match_date = ?
      AND status NOT IN ('cancelled', 'completed')
      AND (
        (match_time >= ? AND match_time < ?) OR
        (DATE_ADD(match_time, INTERVAL scheduled_duration MINUTE) > ? AND match_time < ?)
      )
  `;
  
  const result = await query(sql, [courtId, date, startTime, endTime, startTime, endTime]);
  return result[0].conflict_count === 0;
};

/**
 * Get weather alerts for venue
 */
const getWeatherAlerts = async (venueId, filters = {}) => {
  let sql = `
    SELECT * FROM venue_weather_alerts
    WHERE venue_id = ?
  `;
  
  const params = [venueId];
  
  if (filters.date) {
    sql += ' AND alert_date = ?';
    params.push(filters.date);
  }
  
  if (filters.severity) {
    sql += ' AND severity = ?';
    params.push(filters.severity);
  }
  
  if (filters.unresolved) {
    sql += ' AND resolved_at IS NULL';
  }
  
  sql += ' ORDER BY alert_date DESC, alert_time DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Create weather alert
 */
const createWeatherAlert = async (alertData) => {
  const sql = `
    INSERT INTO venue_weather_alerts 
    (venue_id, alert_date, alert_time, weather_condition, severity, 
     affected_courts, action_taken, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    alertData.venue_id,
    alertData.alert_date,
    alertData.alert_time,
    alertData.weather_condition,
    alertData.severity,
    alertData.affected_courts ? JSON.stringify(alertData.affected_courts) : null,
    alertData.action_taken || 'monitor',
    alertData.notes || null
  ]);
  
  return result.insertId;
};

/**
 * Resolve weather alert
 */
const resolveWeatherAlert = async (alertId) => {
  await query('UPDATE venue_weather_alerts SET resolved_at = NOW() WHERE id = ?', [alertId]);
};

/**
 * Get venue statistics
 */
const getStatistics = async (venueId) => {
  const sql = `
    SELECT 
      v.id,
      v.name,
      COUNT(DISTINCT c.id) as total_courts,
      COUNT(DISTINCT CASE WHEN c.is_available = TRUE THEN c.id END) as available_courts,
      COUNT(DISTINCT m.id) as total_matches,
      COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END) as completed_matches,
      COUNT(DISTINCT t.id) as total_tournaments
    FROM venues v
    LEFT JOIN courts c ON v.id = c.venue_id
    LEFT JOIN matches m ON c.id = m.court_id
    LEFT JOIN tournaments t ON v.id = t.venue_id
    WHERE v.id = ?
    GROUP BY v.id
  `;
  
  const result = await query(sql, [venueId]);
  return result[0] || null;
};

/**
 * Search venues by location
 */
const searchByLocation = async (latitude, longitude, radiusKm = 10) => {
  const sql = `
    SELECT 
      v.*,
      (6371 * acos(cos(radians(?)) * cos(radians(v.latitude)) * 
       cos(radians(v.longitude) - radians(?)) + 
       sin(radians(?)) * sin(radians(v.latitude)))) AS distance_km,
      COUNT(DISTINCT c.id) as total_courts
    FROM venues v
    LEFT JOIN courts c ON v.id = c.venue_id
    WHERE v.latitude IS NOT NULL 
      AND v.longitude IS NOT NULL
      AND v.is_active = TRUE
    GROUP BY v.id
    HAVING distance_km <= ?
    ORDER BY distance_km
  `;
  
  return await query(sql, [latitude, longitude, latitude, radiusKm]);
};

module.exports = {
  create,
  findById,
  findAll,
  update,
  softDelete,
  getCourts,
  createCourt,
  findCourtById,
  updateCourt,
  deleteCourt,
  checkCourtAvailability,
  getWeatherAlerts,
  createWeatherAlert,
  resolveWeatherAlert,
  getStatistics,
  searchByLocation
};

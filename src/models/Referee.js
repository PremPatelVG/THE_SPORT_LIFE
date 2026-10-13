const { query } = require('../config/database');

/**
 * Get referee by ID
 */
const findById = async (refereeId) => {
  const sql = `
    SELECT 
      u.id,
      u.email,
      u.phone,
      u.first_name,
      u.last_name,
      u.gender,
      u.date_of_birth,
      u.profile_image,
      u.role,
      u.is_active,
      rp.total_matches_assigned,
      rp.matches_completed,
      rp.matches_missed,
      rp.reliability_score,
      rp.average_rating
    FROM users u
    LEFT JOIN referee_performance rp ON u.id = rp.referee_id
    WHERE u.id = ? AND u.role IN ('player', 'admin')
  `;
  
  const referees = await query(sql, [refereeId]);
  return referees[0] || null;
};

/**
 * Get all referees with filters
 */
const findAll = async (filters = {}) => {
  let sql = `
    SELECT 
      u.id,
      u.email,
      u.phone,
      u.first_name,
      u.last_name,
      u.profile_image,
      u.is_active,
      rp.total_matches_assigned,
      rp.matches_completed,
      rp.reliability_score,
      rp.average_rating,
      COUNT(DISTINCT rc.sport_id) as certified_sports_count
    FROM users u
    LEFT JOIN referee_performance rp ON u.id = rp.referee_id
    LEFT JOIN referee_certifications rc ON u.id = rc.referee_id AND rc.is_active = TRUE
    WHERE u.role IN ('player', 'admin')
  `;
  
  const params = [];
  
  if (filters.sport_id) {
    sql += ` AND EXISTS (
      SELECT 1 FROM referee_certifications 
      WHERE referee_id = u.id AND sport_id = ? AND is_active = TRUE
    )`;
    params.push(filters.sport_id);
  }
  
  if (filters.certification_level) {
    sql += ` AND EXISTS (
      SELECT 1 FROM referee_certifications 
      WHERE referee_id = u.id AND certification_level = ? AND is_active = TRUE
    )`;
    params.push(filters.certification_level);
  }
  
  if (filters.is_active !== undefined) {
    sql += ` AND u.is_active = ?`;
    params.push(filters.is_active);
  }
  
  if (filters.min_rating) {
    sql += ` AND rp.average_rating >= ?`;
    params.push(filters.min_rating);
  }
  
  sql += ` GROUP BY u.id`;
  sql += ` ORDER BY rp.reliability_score DESC, rp.average_rating DESC`;
  
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Get referee certifications
 */
const getCertifications = async (refereeId) => {
  const sql = `
    SELECT 
      rc.*,
      s.name as sport_name,
      s.icon as sport_icon
    FROM referee_certifications rc
    JOIN sports s ON rc.sport_id = s.id
    WHERE rc.referee_id = ?
    ORDER BY rc.is_active DESC, rc.certified_date DESC
  `;
  
  return await query(sql, [refereeId]);
};

/**
 * Add certification
 */
const addCertification = async (certificationData) => {
  const sql = `
    INSERT INTO referee_certifications 
    (referee_id, sport_id, certification_level, certified_date, expiry_date, 
     certificate_number, issuing_authority, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    certificationData.referee_id,
    certificationData.sport_id,
    certificationData.certification_level,
    certificationData.certified_date,
    certificationData.expiry_date,
    certificationData.certificate_number,
    certificationData.issuing_authority,
    certificationData.is_active !== undefined ? certificationData.is_active : true
  ]);
  
  return result.insertId;
};

/**
 * Update certification
 */
const updateCertification = async (certificationId, updateData) => {
  const fields = [];
  const values = [];
  
  if (updateData.certification_level) {
    fields.push('certification_level = ?');
    values.push(updateData.certification_level);
  }
  
  if (updateData.expiry_date) {
    fields.push('expiry_date = ?');
    values.push(updateData.expiry_date);
  }
  
  if (updateData.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updateData.is_active);
  }
  
  if (fields.length === 0) return;
  
  values.push(certificationId);
  const sql = `UPDATE referee_certifications SET ${fields.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
};

/**
 * Get referee availability
 */
const getAvailability = async (refereeId, filters = {}) => {
  let sql = `
    SELECT * FROM referee_availability
    WHERE referee_id = ?
  `;
  
  const params = [refereeId];
  
  if (filters.date) {
    sql += ` AND available_date = ?`;
    params.push(filters.date);
  }
  
  if (filters.start_date && filters.end_date) {
    sql += ` AND available_date BETWEEN ? AND ?`;
    params.push(filters.start_date, filters.end_date);
  }
  
  if (filters.is_available !== undefined) {
    sql += ` AND is_available = ?`;
    params.push(filters.is_available);
  }
  
  sql += ` ORDER BY available_date, start_time`;
  
  return await query(sql, params);
};

/**
 * Set availability
 */
const setAvailability = async (availabilityData) => {
  const sql = `
    INSERT INTO referee_availability 
    (referee_id, tournament_id, available_date, start_time, end_time, is_available, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      is_available = VALUES(is_available),
      reason = VALUES(reason)
  `;
  
  const result = await query(sql, [
    availabilityData.referee_id,
    availabilityData.tournament_id || null,
    availabilityData.available_date,
    availabilityData.start_time,
    availabilityData.end_time,
    availabilityData.is_available !== undefined ? availabilityData.is_available : true,
    availabilityData.reason || null
  ]);
  
  return result.insertId || result.affectedRows;
};

/**
 * Get referee performance stats
 */
const getPerformance = async (refereeId) => {
  const sql = `
    SELECT * FROM referee_performance
    WHERE referee_id = ?
  `;
  
  const performance = await query(sql, [refereeId]);
  return performance[0] || null;
};

/**
 * Get referee assignments
 */
const getAssignments = async (refereeId, filters = {}) => {
  let sql = `
    SELECT 
      m.*,
      t.name as tournament_name,
      s.name as sport_name,
      v.name as venue_name,
      c.name as court_name,
      rar.status as assignment_status,
      rar.assigned_at,
      rar.responded_at
    FROM matches m
    LEFT JOIN referee_assignment_requests rar ON m.id = rar.match_id AND rar.referee_id = ?
    JOIN tournaments t ON m.tournament_id = t.id
    JOIN sports s ON t.sport_id = s.id
    LEFT JOIN venues v ON m.venue_id = v.id
    LEFT JOIN courts c ON m.court_id = c.id
    WHERE m.referee_id = ?
  `;
  
  const params = [refereeId, refereeId];
  
  if (filters.status) {
    sql += ` AND m.status = ?`;
    params.push(filters.status);
  }
  
  if (filters.start_date && filters.end_date) {
    sql += ` AND m.match_date BETWEEN ? AND ?`;
    params.push(filters.start_date, filters.end_date);
  }
  
  sql += ` ORDER BY m.match_date DESC, m.match_time DESC`;
  
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Get assignment requests
 */
const getAssignmentRequests = async (refereeId, status = null) => {
  let sql = `
    SELECT 
      rar.*,
      m.match_date,
      m.match_time,
      m.status as match_status,
      m.tournament_id,
      m.participant1_id,
      m.participant2_id,
      t.name as tournament_name,
      t.category as tournament_category,
      s.name as sport_name,
      v.name as venue_name,
      c.name as court_name,
      u.first_name as assigned_by_first_name,
      u.last_name as assigned_by_last_name
    FROM referee_assignment_requests rar
    JOIN matches m ON rar.match_id = m.id
    JOIN tournaments t ON m.tournament_id = t.id
    JOIN sports s ON t.sport_id = s.id
    LEFT JOIN venues v ON m.venue_id = v.id
    LEFT JOIN courts c ON m.court_id = c.id
    LEFT JOIN users u ON rar.assigned_by = u.id
    WHERE rar.referee_id = ?
  `;
  
  const params = [refereeId];
  
  if (status) {
    sql += ` AND rar.status = ?`;
    params.push(status);
  }
  
  sql += ` ORDER BY rar.assigned_at DESC`;
  
  
  const requests = await query(sql, params);

  // Enrich each request with participant names based on tournament category
  for (const req of requests) {
    const category = req.tournament_category;

    if (category === 'singles') {
      // singles: participant IDs point to tournament_registrations.id -> users
      const p1 = req.participant1_id
        ? await query(
            `SELECT CONCAT(u.first_name, ' ', u.last_name) AS name
             FROM tournament_registrations tr
             JOIN users u ON tr.user_id = u.id
             WHERE tr.id = ?`,
            [req.participant1_id]
          )
        : [];
      const p2 = req.participant2_id
        ? await query(
            `SELECT CONCAT(u.first_name, ' ', u.last_name) AS name
             FROM tournament_registrations tr
             JOIN users u ON tr.user_id = u.id
             WHERE tr.id = ?`,
            [req.participant2_id]
          )
        : [];
      req.participant1_name = p1[0]?.name || null;
      req.participant2_name = p2[0]?.name || null;

    } else if (category === 'doubles') {
      // doubles: participant IDs point to pairs.id
      const p1 = req.participant1_id
        ? await query(`SELECT name FROM pairs WHERE id = ?`, [req.participant1_id])
        : [];
      const p2 = req.participant2_id
        ? await query(`SELECT name FROM pairs WHERE id = ?`, [req.participant2_id])
        : [];
      req.participant1_name = p1[0]?.name || null;
      req.participant2_name = p2[0]?.name || null;

    } else if (category === 'teams') {
      // teams: participant IDs point to teams.id
      const p1 = req.participant1_id
        ? await query(`SELECT name FROM teams WHERE id = ?`, [req.participant1_id])
        : [];
      const p2 = req.participant2_id
        ? await query(`SELECT name FROM teams WHERE id = ?`, [req.participant2_id])
        : [];
      req.participant1_name = p1[0]?.name || null;
      req.participant2_name = p2[0]?.name || null;

    } else {
      req.participant1_name = null;
      req.participant2_name = null;
    }
  }

  return requests;
};

/**
 * Respond to assignment request
 */
const respondToAssignment = async (requestId, response, reason = null) => {
  const sql = `
    UPDATE referee_assignment_requests
    SET status = ?, responded_at = NOW(), decline_reason = ?
    WHERE id = ?
  `;
  
  await query(sql, [response, reason, requestId]);
  
  // If accepted, update match referee_id
  if (response === 'accepted') {
    const request = await query('SELECT match_id, referee_id FROM referee_assignment_requests WHERE id = ?', [requestId]);
    if (request[0]) {
      await query('UPDATE matches SET referee_id = ? WHERE id = ?', [request[0].referee_id, request[0].match_id]);
    }
  }
};

/**
 * Get available referees for match
 */
const getAvailableForMatch = async (matchId) => {
  const sql = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.profile_image,
      rp.reliability_score,
      rp.average_rating,
      rp.total_matches_assigned,
      rp.matches_completed,
      rc.certification_level
    FROM users u
    JOIN matches m ON m.id = ?
    JOIN tournaments t ON m.tournament_id = t.id
    JOIN referee_certifications rc ON u.id = rc.referee_id AND rc.sport_id = t.sport_id AND rc.is_active = TRUE
    LEFT JOIN referee_performance rp ON u.id = rp.referee_id
    LEFT JOIN referee_availability ra ON u.id = ra.referee_id 
      AND ra.available_date = m.match_date 
      AND ra.start_time <= m.match_time 
      AND ra.end_time >= m.match_time
      AND ra.is_available = TRUE
    WHERE u.role IN ('player', 'admin')
      AND u.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM matches m2
        WHERE m2.referee_id = u.id
          AND m2.match_date = m.match_date
          AND m2.match_time = m.match_time
          AND m2.id != m.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM tournament_participants tp
        WHERE (m.participant1_id = tp.id OR m.participant2_id = tp.id)
          AND tp.user_id = u.id
      )
    GROUP BY u.id
    ORDER BY rp.reliability_score DESC, rp.average_rating DESC
  `;
  
  return await query(sql, [matchId]);
};

/**
 * Check if referee is available for match
 */
const isAvailableForMatch = async (refereeId, matchId) => {
  const sql = `
    SELECT 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM matches m2
          JOIN matches m1 ON m1.id = ?
          WHERE m2.referee_id = ?
            AND m2.match_date = m1.match_date
            AND m2.match_time = m1.match_time
            AND m2.id != m1.id
        ) THEN 'already_assigned'
        WHEN EXISTS (
          SELECT 1 FROM matches m
          JOIN tournament_participants tp ON (m.participant1_id = tp.id OR m.participant2_id = tp.id)
          WHERE m.id = ? AND tp.user_id = ?
        ) THEN 'conflict_of_interest'
        WHEN EXISTS (
          SELECT 1 FROM matches m
          LEFT JOIN referee_availability ra ON ra.referee_id = ?
            AND ra.available_date = m.match_date
            AND ra.start_time <= m.match_time
            AND ra.end_time >= m.match_time
          WHERE m.id = ? AND ra.is_available = FALSE
        ) THEN 'unavailable'
        ELSE 'available'
      END as availability_status
  `;
  
  const result = await query(sql, [matchId, refereeId, matchId, refereeId, refereeId, matchId]);
  return result[0]?.availability_status || 'available';
};

/**
 * Get assignment requests for a match (all statuses)
 */
const getPendingRequestsForMatch = async (matchId) => {
  const sql = `
    SELECT referee_id, status
    FROM referee_assignment_requests
    WHERE match_id = ? AND status IN ('pending', 'accepted', 'declined')
  `;
  
  return await query(sql, [matchId]);
};

/**
 * Get assignment requests for multiple matches (batch)
 * Returns a map of match_id -> status
 */
const getBatchPendingRequestsForMatches = async (matchIds) => {
  if (!matchIds || matchIds.length === 0) {
    return {};
  }

  // Create placeholders for IN clause
  const placeholders = matchIds.map(() => '?').join(',');
  
  const sql = `
    SELECT match_id, status
    FROM referee_assignment_requests
    WHERE match_id IN (${placeholders}) AND status IN ('pending', 'accepted', 'declined')
  `;
  
  const results = await query(sql, matchIds);
  
  // Convert to map: { matchId: status }
  const statusMap = {};
  results.forEach(row => {
    statusMap[row.match_id] = row.status;
  });
  
  return statusMap;
};

module.exports = {
  findById,
  findAll,
  getCertifications,
  addCertification,
  updateCertification,
  getAvailability,
  setAvailability,
  getPerformance,
  getAssignments,
  getAssignmentRequests,
  respondToAssignment,
  getAvailableForMatch,
  isAvailableForMatch,
  getPendingRequestsForMatch,
  getBatchPendingRequestsForMatches
};

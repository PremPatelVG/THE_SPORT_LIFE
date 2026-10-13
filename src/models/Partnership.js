const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Partnership Model
 * Handles doubles/partnership operations for tournaments
 */

/**
 * Create a new partnership
 */
const create = async (partnershipData) => {
  const { player1_id, player2_id, tournament_id, name, sport_id } = partnershipData;
  
  const sql = `
    INSERT INTO partnerships (player1_id, player2_id, tournament_id, name, sport_id, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `;
  
  const result = await query(sql, [player1_id, player2_id, tournament_id, name, sport_id]);
  return result.insertId;
};

/**
 * Find partnership by ID
 */
const findById = async (id) => {
  const sql = `
    SELECT 
      p.*,
      u1.first_name as player1_first_name,
      u1.last_name as player1_last_name,
      u1.email as player1_email,
      u2.first_name as player2_first_name,
      u2.last_name as player2_last_name,
      u2.email as player2_email,
      s.name as sport_name,
      t.name as tournament_name
    FROM partnerships p
    LEFT JOIN users u1 ON p.player1_id = u1.id
    LEFT JOIN users u2 ON p.player2_id = u2.id
    LEFT JOIN sports s ON p.sport_id = s.id
    LEFT JOIN tournaments t ON p.tournament_id = t.id
    WHERE p.id = ? AND p.deleted_at IS NULL
  `;
  
  const partnerships = await query(sql, [id]);
  return partnerships.length > 0 ? partnerships[0] : null;
};

/**
 * Get user's partnerships
 */
const getUserPartnerships = async (userId, filters = {}) => {
  let sql = `
    SELECT 
      p.*,
      u1.first_name as player1_first_name,
      u1.last_name as player1_last_name,
      u2.first_name as player2_first_name,
      u2.last_name as player2_last_name,
      s.name as sport_name,
      t.name as tournament_name,
      CASE 
        WHEN p.player1_id = ? THEN CONCAT(u2.first_name, ' ', u2.last_name)
        ELSE CONCAT(u1.first_name, ' ', u1.last_name)
      END as partner_name
    FROM partnerships p
    LEFT JOIN users u1 ON p.player1_id = u1.id
    LEFT JOIN users u2 ON p.player2_id = u2.id
    LEFT JOIN sports s ON p.sport_id = s.id
    LEFT JOIN tournaments t ON p.tournament_id = t.id
    WHERE (p.player1_id = ? OR p.player2_id = ?)
      AND p.deleted_at IS NULL
  `;
  
  const params = [userId, userId, userId];
  
  if (filters.sport_id) {
    sql += ' AND p.sport_id = ?';
    params.push(filters.sport_id);
  }
  
  if (filters.tournament_id) {
    sql += ' AND p.tournament_id = ?';
    params.push(filters.tournament_id);
  }
  
  if (filters.status) {
    sql += ' AND p.status = ?';
    params.push(filters.status);
  }
  
  sql += ' ORDER BY p.created_at DESC';
  
  return await query(sql, params);
};

/**
 * Get eligible partnerships for tournament
 */
const getEligibleForTournament = async (userId, tournamentId, sportId) => {
  const sql = `
    SELECT 
      p.*,
      u1.first_name as player1_first_name,
      u1.last_name as player1_last_name,
      u2.first_name as player2_first_name,
      u2.last_name as player2_last_name,
      CASE 
        WHEN p.player1_id = ? THEN CONCAT(u2.first_name, ' ', u2.last_name)
        ELSE CONCAT(u1.first_name, ' ', u1.last_name)
      END as partner_name,
      CASE WHEN tp.id IS NOT NULL THEN 1 ELSE 0 END as is_registered
    FROM partnerships p
    LEFT JOIN users u1 ON p.player1_id = u1.id
    LEFT JOIN users u2 ON p.player2_id = u2.id
    LEFT JOIN tournament_participants tp ON p.id = tp.partnership_id 
      AND tp.tournament_id = ?
      AND tp.status NOT IN ('withdrawn', 'disqualified')
    WHERE (p.player1_id = ? OR p.player2_id = ?)
      AND p.sport_id = ?
      AND p.status = 'active'
      AND p.deleted_at IS NULL
      AND (p.tournament_id IS NULL OR p.tournament_id = ?)
    ORDER BY p.created_at DESC
  `;
  
  return await query(sql, [userId, tournamentId, userId, userId, sportId, tournamentId]);
};

/**
 * Check if partnership exists between two users
 */
const existsBetweenUsers = async (player1Id, player2Id, tournamentId = null) => {
  let sql = `
    SELECT COUNT(*) as count 
    FROM partnerships 
    WHERE ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))
      AND status = 'active'
      AND deleted_at IS NULL
  `;
  
  const params = [player1Id, player2Id, player2Id, player1Id];
  
  if (tournamentId) {
    sql += ' AND (tournament_id IS NULL OR tournament_id = ?)';
    params.push(tournamentId);
  }
  
  const result = await query(sql, params);
  return result[0].count > 0;
};

/**
 * Check if user is part of partnership
 */
const isPartner = async (partnershipId, userId) => {
  const sql = `
    SELECT COUNT(*) as count 
    FROM partnerships 
    WHERE id = ? AND (player1_id = ? OR player2_id = ?)
      AND deleted_at IS NULL
  `;
  
  const result = await query(sql, [partnershipId, userId, userId]);
  return result[0].count > 0;
};

/**
 * Update partnership
 */
const update = async (id, updateData) => {
  const { name, status } = updateData;
  
  const sql = `
    UPDATE partnerships 
    SET name = COALESCE(?, name),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `;
  
  await query(sql, [name, status, id]);
  return await findById(id);
};

/**
 * Delete partnership (soft delete)
 */
const remove = async (id) => {
  const sql = `
    UPDATE partnerships 
    SET deleted_at = CURRENT_TIMESTAMP,
        status = 'inactive'
    WHERE id = ?
  `;
  
  await query(sql, [id]);
};

/**
 * Check if partnership is registered for tournament
 */
const isRegisteredForTournament = async (partnershipId, tournamentId) => {
  const sql = `
    SELECT COUNT(*) as count 
    FROM tournament_participants 
    WHERE partnership_id = ? 
      AND tournament_id = ? 
      AND status NOT IN ('withdrawn', 'disqualified')
  `;
  
  const result = await query(sql, [partnershipId, tournamentId]);
  return result[0].count > 0;
};

/**
 * Get partnership statistics
 */
const getStatistics = async (partnershipId) => {
  const sql = `
    SELECT 
      COUNT(DISTINCT tp.tournament_id) as tournaments_played,
      SUM(CASE WHEN tp.final_position = 1 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN tp.final_position <= 3 THEN 1 ELSE 0 END) as podium_finishes
    FROM tournament_participants tp
    WHERE tp.partnership_id = ?
      AND tp.status = 'confirmed'
  `;
  
  const result = await query(sql, [partnershipId]);
  return result[0] || { tournaments_played: 0, wins: 0, podium_finishes: 0 };
};

module.exports = {
  create,
  findById,
  getUserPartnerships,
  getEligibleForTournament,
  existsBetweenUsers,
  isPartner,
  update,
  remove,
  isRegisteredForTournament,
  getStatistics
};

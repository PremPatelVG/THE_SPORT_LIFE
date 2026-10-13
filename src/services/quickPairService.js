const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Quick create pair for standalone match
 * @param {Number} userId - User creating the pair
 * @param {Object} pairData - { sport_id, player1_id, player2_id, name, is_reusable }
 */
const quickCreatePair = async (userId, pairData) => {
  const { sport_id, player1_id, player2_id, name, is_reusable = false } = pairData;

  // Validate players exist
  const [player1] = await query('SELECT id, first_name, last_name FROM users WHERE id = ?', [player1_id]);
  const [player2] = await query('SELECT id, first_name, last_name FROM users WHERE id = ?', [player2_id]);

  if (!player1 || !player2) {
    throw new Error('One or both players not found');
  }

  if (player1_id === player2_id) {
    throw new Error('Cannot pair a player with themselves');
  }

  // Auto-generate name if not provided
  const pairName = (name && name.trim()) || `${player1.first_name} & ${player2.first_name}`;

  // Check if pair already exists (same players, same sport)
  const [existingPair] = await query(`
    SELECT id, name FROM pairs 
    WHERE sport_id = ? 
      AND ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))
      AND deleted_at IS NULL
  `, [sport_id, player1_id, player2_id, player2_id, player1_id]);

  if (existingPair) {
    // If a custom name is provided and it's different from the existing name, update it
    if (name && name.trim() && existingPair.name !== pairName) {
      await query('UPDATE pairs SET name = ? WHERE id = ?', [pairName, existingPair.id]);
      logger.info(`Pair ${existingPair.id} name updated to: ${pairName}`);
    } else {
      logger.info(`Pair already exists: ${existingPair.id}`);
    }
    return existingPair.id;
  }

  // Create pair (tournament_id = NULL for standalone pairs)
  // pair_type: 'tournament' (tournament-specific), 'reusable' (can be reused), 'temporary' (one-time use)
  const pairType = is_reusable ? 'reusable' : 'temporary';
  
  const sql = `
    INSERT INTO pairs (
      sport_id,
      tournament_id,
      player1_id, 
      player2_id, 
      name, 
      is_tournament_specific,
      pair_type,
      created_by,
      status
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'locked')
  `;

  const result = await query(sql, [
    sport_id,
    player1_id,
    player2_id,
    pairName,
    false, // is_tournament_specific = FALSE for standalone pairs
    pairType,
    userId
  ]);

  logger.info(`Quick pair created: ${result.insertId} (${pairName})`);
  return result.insertId;
};

/**
 * Get available pairs for a sport (only locked pairs with type tournament or reusable)
 * Includes tournament pairs by joining with tournaments table to get sport_id
 */
const getAvailablePairs = async (sportId, userId) => {
  const sql = `
    SELECT 
      p.id,
      p.name,
      p.player1_id,
      p.player2_id,
      p.pair_type,
      p.status,
      u1.first_name as player1_first_name,
      u1.last_name as player1_last_name,
      u1.profile_image as player1_profile_image,
      u2.first_name as player2_first_name,
      u2.last_name as player2_last_name,
      u2.profile_image as player2_profile_image,
      COALESCE(p.sport_id, tour.sport_id) as resolved_sport_id
    FROM pairs p
    JOIN users u1 ON p.player1_id = u1.id
    JOIN users u2 ON p.player2_id = u2.id
    LEFT JOIN tournaments tour ON p.tournament_id = tour.id
    WHERE COALESCE(p.sport_id, tour.sport_id) = ?
      AND p.created_by = ?
      AND p.deleted_at IS NULL
      AND p.status = 'locked'
      AND p.pair_type IN ('tournament', 'reusable')
    ORDER BY p.created_at DESC
  `;

  const pairs = await query(sql, [sportId, userId]);
  return pairs;
};

module.exports = {
  quickCreatePair,
  getAvailablePairs
};

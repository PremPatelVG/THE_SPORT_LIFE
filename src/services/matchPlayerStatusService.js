/**
 * Match Player Status Service
 * Manages real-time player status (playing vs substitute) during matches
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Initialize player status when match starts
 * Copies squad members to match_player_status table
 */
const initializePlayerStatus = async (matchId) => {
  try {
    // Check if already initialized
    const checkSql = 'SELECT COUNT(*) as count FROM match_player_status WHERE match_id = ?';
    const [existing] = await query(checkSql, [matchId]);
    
    if (existing.count > 0) {
      logger.info(`Player status already initialized for match ${matchId}`);
      return { success: true, message: 'Already initialized' };
    }
    
    // Copy from match_squads to match_player_status
    const initSql = `
      INSERT INTO match_player_status 
        (match_id, team_id, user_id, first_name, last_name, jersey_number, position_label, is_playing, is_starting)
      SELECT 
        ms.match_id,
        ms.team_id,
        ms.user_id,
        u.first_name,
        u.last_name,
        ms.jersey_number,
        ms.position_label,
        ms.is_starting AS is_playing,
        ms.is_starting
      FROM match_squads ms
      JOIN users u ON ms.user_id = u.id
      WHERE ms.match_id = ?
    `;
    
    await query(initSql, [matchId]);
    
    logger.info(`Player status initialized for match ${matchId}`);
    return { success: true, message: 'Player status initialized' };
  } catch (error) {
    logger.error('Initialize player status error:', error);
    throw error;
  }
};

/**
 * Get playing players for a team in a match
 * Includes red card status
 */
const getPlayingPlayers = async (matchId, teamId) => {
  try {
    const sql = `
      SELECT 
        mps.id,
        mps.user_id,
        mps.first_name,
        mps.last_name,
        mps.jersey_number,
        mps.position_label,
        mps.is_starting,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM match_events 
            WHERE match_id = ? 
            AND player_id = mps.user_id 
            AND event_type = 'red_card'
          ) THEN TRUE 
          ELSE FALSE 
        END as has_red_card
      FROM match_player_status mps
      WHERE mps.match_id = ? AND mps.team_id = ? AND mps.is_playing = TRUE
      ORDER BY mps.is_starting DESC, mps.position_label ASC, mps.first_name ASC
    `;
    
    const players = await query(sql, [matchId, matchId, teamId]);
    return players;
  } catch (error) {
    logger.error('Get playing players error:', error);
    throw error;
  }
};

/**
 * Get substitute players (on bench) for a team in a match
 */
const getSubstitutePlayers = async (matchId, teamId) => {
  try {
    const sql = `
      SELECT 
        id,
        user_id,
        first_name,
        last_name,
        jersey_number,
        position_label,
        is_starting
      FROM match_player_status
      WHERE match_id = ? AND team_id = ? AND is_playing = FALSE
      ORDER BY position_label ASC, first_name ASC
    `;
    
    const players = await query(sql, [matchId, teamId]);
    return players;
  } catch (error) {
    logger.error('Get substitute players error:', error);
    throw error;
  }
};

/**
 * Get all players for a team in a match (both playing and substitutes)
 */
const getAllPlayers = async (matchId, teamId) => {
  try {
    const sql = `
      SELECT 
        id,
        user_id,
        first_name,
        last_name,
        jersey_number,
        position_label,
        is_playing,
        is_starting
      FROM match_player_status
      WHERE match_id = ? AND team_id = ?
      ORDER BY is_playing DESC, is_starting DESC, position_label ASC, first_name ASC
    `;
    
    const players = await query(sql, [matchId, teamId]);
    return players;
  } catch (error) {
    logger.error('Get all players error:', error);
    throw error;
  }
};

/**
 * Perform substitution - swap player status
 */
const performSubstitution = async (matchId, teamId, playerOutId, playerInId) => {
  try {
    // Set player OUT to not playing
    const outSql = `
      UPDATE match_player_status 
      SET is_playing = FALSE, updated_at = NOW()
      WHERE match_id = ? AND team_id = ? AND user_id = ?
    `;
    await query(outSql, [matchId, teamId, playerOutId]);
    
    // Set player IN to playing
    const inSql = `
      UPDATE match_player_status 
      SET is_playing = TRUE, updated_at = NOW()
      WHERE match_id = ? AND team_id = ? AND user_id = ?
    `;
    await query(inSql, [matchId, teamId, playerInId]);
    
    logger.info(`Substitution completed: Player ${playerOutId} OUT, Player ${playerInId} IN`);
    
    return { 
      success: true, 
      message: 'Substitution completed',
      playerOutId,
      playerInId
    };
  } catch (error) {
    logger.error('Perform substitution error:', error);
    throw error;
  }
};

/**
 * Get player status by user_id
 */
const getPlayerStatus = async (matchId, userId) => {
  try {
    const sql = `
      SELECT * FROM match_player_status
      WHERE match_id = ? AND user_id = ?
    `;
    
    const [player] = await query(sql, [matchId, userId]);
    return player;
  } catch (error) {
    logger.error('Get player status error:', error);
    throw error;
  }
};

module.exports = {
  initializePlayerStatus,
  getPlayingPlayers,
  getSubstitutePlayers,
  getAllPlayers,
  performSubstitution,
  getPlayerStatus
};

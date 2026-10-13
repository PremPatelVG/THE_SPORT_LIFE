const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Quick create team for standalone match
 * @param {Number} userId - User creating the team
 * @param {Object} teamData - { sport_id, name, player_ids, captain_id, is_reusable }
 */
const quickCreateTeam = async (userId, teamData) => {
  const { sport_id, name, player_ids, captain_id, is_reusable = false } = teamData;

  // Validate team name
  if (!name || name.length < 3) {
    throw new Error('Team name must be at least 3 characters');
  }

  // Validate players
  if (!player_ids || player_ids.length < 2) {
    throw new Error('Team must have at least 2 players');
  }

  // Validate captain is in team
  if (!player_ids.includes(captain_id)) {
    throw new Error('Captain must be a team member');
  }

  return await transaction(async (conn) => {
    // Create team (tournament_id = NULL for standalone teams)
    // team_type: 'tournament' (tournament-specific), 'reusable' (can be reused), 'temporary' (one-time use)
    const teamType = is_reusable ? 'reusable' : 'temporary';
    
    const teamSql = `
      INSERT INTO teams (
        name,
        tournament_id,
        sport_id,
        creator_id,
        captain_id,
        max_players,
        is_tournament_specific,
        team_type,
        status
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'locked')
    `;

    const [teamResult] = await conn.query(teamSql, [
      name,
      sport_id,
      userId,
      captain_id,
      player_ids.length,
      false, // is_tournament_specific = FALSE for standalone teams
      teamType
    ]);

    const teamId = teamResult.insertId;
    
    if (!teamId) {
      throw new Error('Failed to create team - no team ID returned');
    }

    // Add team members
    for (const playerId of player_ids) {
      const memberSql = `
        INSERT INTO team_members (team_id, user_id, is_captain)
        VALUES (?, ?, ?)
      `;
      await conn.query(memberSql, [teamId, playerId, playerId === captain_id]);
    }

    logger.info(`Quick team created: ${teamId} (${name}) with ${player_ids.length} players`);
    return teamId;
  });
};

/**
 * Get available teams for a sport (only locked teams with type tournament or reusable)
 * Includes tournament teams by joining with tournaments table to get sport_id
 */
const getAvailableTeams = async (sportId, userId) => {
  const sql = `
    SELECT 
      t.id,
      t.name,
      t.max_players,
      t.team_type,
      t.status,
      COUNT(tm.id) as current_size,
      u.first_name as captain_first_name,
      u.last_name as captain_last_name,
      COALESCE(t.sport_id, tour.sport_id) as resolved_sport_id
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON t.captain_id = u.id
    LEFT JOIN tournaments tour ON t.tournament_id = tour.id
    WHERE COALESCE(t.sport_id, tour.sport_id) = ?
      AND t.creator_id = ?
      AND t.deleted_at IS NULL
      AND t.status = 'locked'
      AND t.team_type IN ('tournament', 'reusable')
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `;

  const teams = await query(sql, [sportId, userId]);
  return teams;
};

/**
 * Get team members
 */
const getTeamMembers = async (teamId) => {
  const sql = `
    SELECT 
      tm.user_id,
      tm.is_captain,
      u.first_name,
      u.last_name,
      u.email
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.is_captain DESC, u.first_name ASC
  `;

  const members = await query(sql, [teamId]);
  return members;
};

module.exports = {
  quickCreateTeam,
  getAvailableTeams,
  getTeamMembers
};

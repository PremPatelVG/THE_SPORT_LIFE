const { query } = require('../config/database');

/**
 * Save match squad (replace existing)
 */
const saveSquad = async (matchId, teamId, squadMembers) => {
  // Delete existing squad for this team in this match
  await query(
    'DELETE FROM match_squads WHERE match_id = ? AND team_id = ?',
    [matchId, teamId]
  );
  
  // Also delete from match_player_status
  await query(
    'DELETE FROM match_player_status WHERE match_id = ? AND team_id = ?',
    [matchId, teamId]
  );

  // Insert new squad members
  if (squadMembers && squadMembers.length > 0) {
    const values = squadMembers.map(member => [
      matchId,
      teamId,
      member.user_id,
      member.position_label || null,
      member.jersey_number || null,
      member.is_starting !== undefined ? member.is_starting : true,
      member.is_captain || false,
      member.notes || null
    ]);

    const sql = `
      INSERT INTO match_squads 
      (match_id, team_id, user_id, position_label, jersey_number, is_starting, is_captain, notes)
      VALUES ?
    `;

    await query(sql, [values]);
    
    // Also populate match_player_status table
    // Initially: starters are playing (TRUE), substitutes are on bench (FALSE)
    const statusSql = `
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
        ms.is_starting AS is_playing,  -- Starters play, substitutes don't
        ms.is_starting
      FROM match_squads ms
      JOIN users u ON ms.user_id = u.id
      WHERE ms.match_id = ? AND ms.team_id = ?
    `;
    
    await query(statusSql, [matchId, teamId]);
  }

  return getSquadByMatchAndTeam(matchId, teamId);
};

/**
 * Get squad for a specific team in a match
 */
const getSquadByMatchAndTeam = async (matchId, teamId) => {
  const sql = `
    SELECT 
      ms.*,
      u.first_name,
      u.last_name,
      u.email,
      u.profile_image,
      tm.position as default_position,
      tm.jersey_number as default_jersey_number
    FROM match_squads ms
    JOIN users u ON ms.user_id = u.id
    LEFT JOIN team_members tm ON ms.team_id = tm.team_id AND ms.user_id = tm.user_id
    WHERE ms.match_id = ? AND ms.team_id = ?
    ORDER BY ms.is_starting DESC, ms.position_label ASC, u.first_name ASC
  `;

  return await query(sql, [matchId, teamId]);
};

/**
 * Get all squads for a match (both teams)
 */
const getSquadsByMatch = async (matchId) => {
  const sql = `
    SELECT 
      ms.*,
      u.first_name,
      u.last_name,
      u.email,
      u.profile_image,
      t.name as team_name,
      tm.position as default_position,
      tm.jersey_number as default_jersey_number
    FROM match_squads ms
    JOIN users u ON ms.user_id = u.id
    JOIN teams t ON ms.team_id = t.id
    LEFT JOIN team_members tm ON ms.team_id = tm.team_id AND ms.user_id = tm.user_id
    WHERE ms.match_id = ?
    ORDER BY ms.team_id, ms.is_playing DESC, ms.is_starting DESC, ms.position_label ASC, u.first_name ASC
  `;

  return await query(sql, [matchId]);
};

/**
 * Check if squad is set for a team in a match
 */
const isSquadSet = async (matchId, teamId) => {
  const sql = 'SELECT COUNT(*) as count FROM match_squads WHERE match_id = ? AND team_id = ?';
  const result = await query(sql, [matchId, teamId]);
  return result[0].count > 0;
};

/**
 * Delete squad for a team in a match
 */
const deleteSquad = async (matchId, teamId) => {
  await query(
    'DELETE FROM match_squads WHERE match_id = ? AND team_id = ?',
    [matchId, teamId]
  );
};

/**
 * Get position presets for a sport
 */
const getPositionPresetsBySport = async (sportId) => {
  const sql = `
    SELECT 
      id,
      position_name,
      position_code,
      display_order
    FROM sport_position_presets
    WHERE sport_id = ? AND is_active = TRUE
    ORDER BY display_order ASC
  `;

  return await query(sql, [sportId]);
};

/**
 * Get team members available for squad selection
 */
const getTeamMembersForSquad = async (teamId) => {
  const sql = `
    SELECT 
      tm.id,
      tm.user_id,
      tm.position,
      tm.jersey_number,
      u.first_name,
      u.last_name,
      u.email,
      u.profile_image,
      CASE WHEN tm.user_id = t.captain_id THEN TRUE ELSE FALSE END as is_captain
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.team_id = ? AND tm.is_active = TRUE
    ORDER BY is_captain DESC, u.first_name ASC
  `;

  return await query(sql, [teamId]);
};

module.exports = {
  saveSquad,
  getSquadByMatchAndTeam,
  getSquadsByMatch,
  isSquadSet,
  deleteSquad,
  getPositionPresetsBySport,
  getTeamMembersForSquad
};

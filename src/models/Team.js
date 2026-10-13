const { query, transaction } = require('../config/database');

/**
 * Create a new team
 */
const create = async (teamData) => {
  const {
    name,
    tournament_id,
    creator_id,
    captain_id,
    logo,
    description,
    max_players = 11,
    is_tournament_specific = true,
    sport_id = null,
    is_public = false
  } = teamData;

  // Validation: tournament-specific teams must have tournament_id
  if (is_tournament_specific && !tournament_id) {
    throw new Error('Tournament ID is required for tournament-specific teams');
  }

  // Validation: reusable teams must have sport_id
  if (!is_tournament_specific && !sport_id) {
    throw new Error('Sport ID is required for reusable teams');
  }

  // Determine team_type based on is_tournament_specific
  const team_type = is_tournament_specific ? 'tournament' : 'reusable';

  const sql = `
    INSERT INTO teams (
      name, tournament_id, creator_id, captain_id, logo, description, max_players,
      is_tournament_specific, sport_id, is_public, team_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    name, 
    tournament_id || null, 
    creator_id, 
    captain_id, 
    logo || null, 
    description, 
    max_players,
    is_tournament_specific,
    sport_id || null,
    is_public,
    team_type
  ]);

  return result.insertId;
}

/**
 * Find team by ID
 */
const findById = async (id) => {
  const sql = `
    SELECT 
      t.*,
      tour.name as tournament_name,
      COALESCE(t.sport_id, tour.sport_id) as sport_id,
      COALESCE(s1.name, s2.name) as sport_name,
      creator.first_name as creator_first_name,
      creator.last_name as creator_last_name,
      captain.first_name as captain_first_name,
      captain.last_name as captain_last_name,
      captain.email as captain_email,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND is_active = TRUE) as member_count
    FROM teams t
    LEFT JOIN tournaments tour ON t.tournament_id = tour.id
    LEFT JOIN sports s1 ON t.sport_id = s1.id
    LEFT JOIN sports s2 ON tour.sport_id = s2.id
    LEFT JOIN users creator ON t.creator_id = creator.id
    LEFT JOIN users captain ON t.captain_id = captain.id
    WHERE t.id = ? AND t.deleted_at IS NULL
  `;

  const teams = await query(sql, [id]);
  return teams.length > 0 ? teams[0] : null;
}

/**
 * Find all teams with filters
 */
const findAll = async (filters = {}) => {
  const {
    tournament_id,
    creator_id,
    sport_id,
    is_tournament_specific,
    is_public,
    search,
    limit = 20,
    offset = 0
  } = filters;

  let sql = `
    SELECT 
      t.*,
      tour.name as tournament_name,
      tour.sport_id as sport_id,
      s.name as sport_name,
      creator.first_name as creator_first_name,
      creator.last_name as creator_last_name,
      captain.first_name as captain_first_name,
      captain.last_name as captain_last_name,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND is_active = TRUE) as member_count
    FROM teams t
    LEFT JOIN tournaments tour ON t.tournament_id = tour.id
    LEFT JOIN sports s ON tour.sport_id = s.id
    LEFT JOIN users creator ON t.creator_id = creator.id
    LEFT JOIN users captain ON t.captain_id = captain.id
    WHERE t.deleted_at IS NULL
  `;

  const params = [];

  if (tournament_id) {
    sql += ' AND t.tournament_id = ?';
    params.push(tournament_id);
  }

  if (creator_id) {
    sql += ' AND t.creator_id = ?';
    params.push(creator_id);
  }

  if (sport_id) {
    sql += ' AND tour.sport_id = ?';
    params.push(sport_id);
  }

  if (is_tournament_specific !== undefined) {
    sql += ' AND t.is_tournament_specific = ?';
    params.push(is_tournament_specific);
  }

  if (is_public !== undefined) {
    sql += ' AND t.is_public = ?';
    params.push(is_public);
  }

  if (search) {
    sql += ' AND (t.name LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  return await query(sql, params);
}

/**
 * Update team
 */
const update = async (id, updateData) => {
  const allowedFields = [
    'name', 'captain_id', 'logo', 'description', 'max_players'
  ];

  const updates = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);
  const sql = `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
  return findById(id);
}

/**
 * Soft delete team
 */
const softDelete = async (id) => {
  const sql = 'UPDATE teams SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
  await query(sql, [id]);
}

/**
 * Get team members
 */
const getMembers = async (teamId) => {
  const sql = `
    SELECT 
      tm.*,
      u.first_name,
      u.last_name,
      u.email,
      u.profile_image,
      u.phone,
      CASE WHEN tm.user_id = t.captain_id THEN TRUE ELSE FALSE END as is_captain
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.team_id = ? AND tm.is_active = TRUE
    ORDER BY is_captain DESC, tm.joined_at ASC
  `;

  return await query(sql, [teamId]);
}

/**
 * Add team member
 */
const addMember = async (teamId, userId, position = null, jerseyNumber = null) => {
  // Check if already an active member
  const existing = await query(
    'SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND is_active = TRUE',
    [teamId, userId]
  );

  if (existing.length > 0) {
    throw new Error('User is already a team member');
  }

  // Use INSERT ... ON DUPLICATE KEY UPDATE to handle re-joining
  // If user was previously removed, reactivate them
  const sql = `
    INSERT INTO team_members (team_id, user_id, position, jersey_number, is_active, joined_at)
    VALUES (?, ?, ?, ?, TRUE, NOW())
    ON DUPLICATE KEY UPDATE 
      is_active = TRUE,
      joined_at = NOW(),
      position = VALUES(position),
      jersey_number = VALUES(jersey_number)
  `;

  const result = await query(sql, [teamId, userId, position, jerseyNumber]);
  return result.insertId || result.affectedRows;
}

/**
 * Remove team member
 */
const removeMember = async (teamId, userId) => {
  const sql = 'UPDATE team_members SET is_active = FALSE WHERE team_id = ? AND user_id = ?';
  await query(sql, [teamId, userId]);
}

/**
 * Update member details
 */
const updateMember = async (teamId, userId, updateData) => {
  const { position, jersey_number } = updateData;
  
  const updates = [];
  const values = [];

  if (position !== undefined) {
    updates.push('position = ?');
    values.push(position);
  }

  if (jersey_number !== undefined) {
    updates.push('jersey_number = ?');
    values.push(jersey_number);
  }

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(teamId, userId);
  const sql = `UPDATE team_members SET ${updates.join(', ')} WHERE team_id = ? AND user_id = ?`;
  
  await query(sql, values);
}

/**
 * Change team captain
 */
const changeCaptain = async (teamId, newCaptainId) => {
  // Verify new captain is a team member
  const member = await query(
    'SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND is_active = TRUE',
    [teamId, newCaptainId]
  );

  if (member.length === 0) {
    throw new Error('New captain must be a team member');
  }

  await query('UPDATE teams SET captain_id = ? WHERE id = ?', [newCaptainId, teamId]);
}

/**
 * Check if user is team creator
 */
const isCreator = async (teamId, userId) => {
  const sql = 'SELECT creator_id FROM teams WHERE id = ? AND deleted_at IS NULL';
  const teams = await query(sql, [teamId]);
  
  if (teams.length === 0) return false;
  return teams[0].creator_id === userId;
}

/**
 * Check if user is team captain
 */
const isCaptain = async (teamId, userId) => {
  const sql = 'SELECT captain_id FROM teams WHERE id = ? AND deleted_at IS NULL';
  const teams = await query(sql, [teamId]);
  
  if (teams.length === 0) return false;
  return teams[0].captain_id === userId;
}

/**
 * Check if user is team member
 */
const isMember = async (teamId, userId) => {
  const sql = 'SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND is_active = TRUE';
  const members = await query(sql, [teamId, userId]);
  return members.length > 0;
}

/**
 * Get team by name and tournament
 */
const findByNameAndTournament = async (name, tournamentId) => {
  const sql = `
    SELECT * FROM teams 
    WHERE name = ? AND tournament_id = ? AND deleted_at IS NULL
  `;
  
  const teams = await query(sql, [name, tournamentId]);
  return teams.length > 0 ? teams[0] : null;
}

/**
 * Get user's teams with type filter
 * @param {number} userId - User ID
 * @param {string} type - Filter type: 'all', 'tournament', 'reusable'
 */
const getUserTeams = async (userId, type = 'all') => {
  let typeCondition = '';
  
  if (type === 'tournament') {
    typeCondition = "AND t.team_type = 'tournament'";
  } else if (type === 'reusable') {
    typeCondition = "AND t.team_type = 'reusable'";
  } else {
    // For 'all', exclude temporary teams
    typeCondition = "AND t.team_type IN ('tournament', 'reusable')";
  }
  
  const sql = `
    SELECT DISTINCT
      t.*,
      tour.name as tournament_name,
      COALESCE(s1.name, s2.name) as sport_name,
      COALESCE(t.sport_id, tour.sport_id) as sport_id,
      CASE 
        WHEN t.creator_id = ? THEN TRUE
        ELSE FALSE
      END as is_creator,
      CASE 
        WHEN t.captain_id = ? THEN TRUE
        ELSE FALSE
      END as is_captain,
      CASE 
        WHEN tm.user_id IS NOT NULL THEN TRUE
        ELSE FALSE
      END as is_member,
      CONCAT(captain.first_name, ' ', captain.last_name) as captain_name,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND is_active = TRUE) as current_size
    FROM teams t
    LEFT JOIN tournaments tour ON t.tournament_id = tour.id
    LEFT JOIN sports s1 ON tour.sport_id = s1.id
    LEFT JOIN sports s2 ON t.sport_id = s2.id
    LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ?
    LEFT JOIN users captain ON t.captain_id = captain.id
    WHERE t.deleted_at IS NULL
      AND (t.creator_id = ? OR t.captain_id = ? OR (tm.user_id = ? AND tm.is_active = TRUE))
      ${typeCondition}
    ORDER BY t.created_at DESC
  `;

  return await query(sql, [userId, userId, userId, userId, userId, userId]);
}

/**
 * Get teams for tournament
 */
const getTeamsByTournament = async (tournamentId) => {
  const sql = `
    SELECT 
      t.*,
      creator.first_name as creator_first_name,
      creator.last_name as creator_last_name,
      captain.first_name as captain_first_name,
      captain.last_name as captain_last_name,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND is_active = TRUE) as member_count
    FROM teams t
    LEFT JOIN users creator ON t.creator_id = creator.id
    LEFT JOIN users captain ON t.captain_id = captain.id
    WHERE t.tournament_id = ? AND t.deleted_at IS NULL
    ORDER BY t.created_at DESC
  `;

  return await query(sql, [tournamentId]);
}

/**
 * Check if team is full
 */
const isFull = async (teamId) => {
  const team = await findById(teamId);
  if (!team) return true;

  const memberCount = await query(
    'SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND is_active = TRUE',
    [teamId]
  );

  return memberCount[0].count >= team.max_players;
}

/**
 * Get team statistics
 */
const getStatistics = async (teamId) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM team_members WHERE team_id = ? AND is_active = TRUE) as total_members,
      (SELECT COUNT(*) FROM team_invitations WHERE team_id = ? AND status = 'pending') as pending_invitations,
      (SELECT COUNT(*) FROM tournament_participants WHERE team_id = ?) as tournaments_participated
  `;

  const result = await query(sql, [teamId, teamId, teamId]);
  return result[0];
}

/**
 * Get team match statistics
 */
const getMatchStatistics = async (teamId) => {
  const sql = `
    SELECT 
      COUNT(*) as total_matches,
      SUM(CASE WHEN winner_participant_id = ? THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN winner_participant_id IS NOT NULL AND winner_participant_id != ? THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN status = 'completed' AND winner_participant_id IS NULL THEN 1 ELSE 0 END) as draws
    FROM matches
    WHERE (participant1_id = ? OR participant2_id = ?)
      AND status = 'completed'
  `;

  const result = await query(sql, [teamId, teamId, teamId, teamId]);
  return result[0] || { total_matches: 0, wins: 0, losses: 0, draws: 0 };
}

/**
 * Check if team can be registered for tournament
 */
const canRegisterForTournament = async (teamId, tournamentId) => {
  const team = await findById(teamId);
  
  if (!team) {
    throw new Error('Team not found');
  }

  if (team.tournament_id !== tournamentId) {
    throw new Error('Team belongs to a different tournament');
  }

  // Get current member count
  const memberCountResult = await query(
    'SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND is_active = TRUE',
    [teamId]
  );

  const currentMembers = Array.isArray(memberCountResult) 
    ? memberCountResult[0]?.count || 0
    : memberCountResult?.count || 0;

  // Require FULL team (all max_players slots filled)
  // For a football team with max_players=11, need exactly 11 members
  const requiredMembers = team.max_players;

  console.log(`Team ${teamId} validation: ${currentMembers}/${requiredMembers} members`);

  if (currentMembers < requiredMembers) {
    throw new Error(`Team must have all ${requiredMembers} members to register for tournament (currently has ${currentMembers})`);
  }

  return true;
}

/**
 * Get available jersey numbers
 */
const getAvailableJerseyNumbers = async (teamId) => {
  const usedNumbers = await query(
    'SELECT jersey_number FROM team_members WHERE team_id = ? AND is_active = TRUE AND jersey_number IS NOT NULL',
    [teamId]
  );

  const used = usedNumbers.map(row => row.jersey_number);
  const available = [];

  for (let i = 1; i <= 99; i++) {
    if (!used.includes(i)) {
      available.push(i);
    }
  }

  return available;
}

/**
 * Register reusable team for a tournament
 */
const registerForTournament = async (teamId, tournamentId) => {
  const sql = `
    INSERT INTO team_tournament_registrations (team_id, tournament_id, status, payment_status)
    VALUES (?, ?, 'pending', 'pending')
  `;
  
  const result = await query(sql, [teamId, tournamentId]);
  return result.insertId;
}

/**
 * Get team's tournament registrations
 */
const getTeamTournamentRegistrations = async (teamId) => {
  const sql = `
    SELECT 
      ttr.*,
      t.name as tournament_name,
      t.start_date,
      t.end_date,
      t.entry_fee,
      t.status as tournament_status,
      s.name as sport_name
    FROM team_tournament_registrations ttr
    JOIN tournaments t ON ttr.tournament_id = t.id
    LEFT JOIN sports s ON t.sport_id = s.id
    WHERE ttr.team_id = ?
    ORDER BY ttr.created_at DESC
  `;
  
  return await query(sql, [teamId]);
}

/**
 * Get reusable teams available for a tournament
 */
const getReusableTeamsForTournament = async (userId, sportId) => {
  const sql = `
    SELECT 
      t.*,
      s.name as sport_name,
      creator.first_name as creator_first_name,
      creator.last_name as creator_last_name,
      captain.first_name as captain_first_name,
      captain.last_name as captain_last_name,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND is_active = TRUE) as member_count
    FROM teams t
    LEFT JOIN sports s ON t.sport_id = s.id
    LEFT JOIN users creator ON t.creator_id = creator.id
    LEFT JOIN users captain ON t.captain_id = captain.id
    WHERE t.deleted_at IS NULL
      AND t.is_tournament_specific = FALSE
      AND t.sport_id = ?
      AND (t.creator_id = ? OR t.captain_id = ? OR t.is_public = TRUE 
           OR EXISTS (SELECT 1 FROM team_members WHERE team_id = t.id AND user_id = ? AND is_active = TRUE))
    ORDER BY t.created_at DESC
  `;
  
  return await query(sql, [sportId, userId, userId, userId]);
}

/**
 * Check if team is already registered for tournament
 */
const isRegisteredForTournament = async (teamId, tournamentId) => {
  const sql = `
    SELECT COUNT(*) as count 
    FROM team_tournament_registrations 
    WHERE team_id = ? AND tournament_id = ? AND status != 'withdrawn'
  `;
  
  const result = await query(sql, [teamId, tournamentId]);
  return result[0].count > 0;
}

module.exports = {
  create,
  findById,
  findAll,
  update,
  softDelete,
  getMembers,
  addMember,
  removeMember,
  updateMember,
  changeCaptain,
  isCreator,
  isCaptain,
  isMember,
  findByNameAndTournament,
  getUserTeams,
  getTeamsByTournament,
  isFull,
  getStatistics,
  getMatchStatistics,
  canRegisterForTournament,
  getAvailableJerseyNumbers,
  registerForTournament,
  getTeamTournamentRegistrations,
  getReusableTeamsForTournament,
  isRegisteredForTournament
};

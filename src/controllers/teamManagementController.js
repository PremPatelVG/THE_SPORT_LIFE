const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * TEAM MANAGEMENT CONTROLLER
 * Handles team/pair creation for tournaments
 * Only organizers can create and manage teams
 */

/**
 * Get available locked players for team assignment
 * GET /api/v1/tournaments/:tournamentId/available-players
 */
const getAvailablePlayers = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    const tournamentCategory = tournament[0].category;

    // Get locked players not yet assigned to teams/pairs
    let availablePlayers;

    if (tournamentCategory === 'teams') {
      // Get players not in any team
      availablePlayers = await query(`
        SELECT 
          tr.id as registration_id,
          tr.user_id,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.profile_image,
          us.skill_level,
          s.name as sport_name,
          tr.locked_at
        FROM tournament_registrations tr
        INNER JOIN users u ON tr.user_id = u.id
        LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
        LEFT JOIN sports s ON s.id = ?
        WHERE tr.tournament_id = ?
        AND tr.status = 'locked'
        AND u.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM team_members tm
          INNER JOIN teams t ON tm.team_id = t.id
          WHERE tm.user_id = tr.user_id
          AND t.tournament_id = ?
          AND t.deleted_at IS NULL
        )
        ORDER BY tr.locked_at ASC
      `, [tournament[0].sport_id, tournament[0].sport_id, tournamentId, tournamentId]);

    } else if (tournamentCategory === 'doubles') {
      // Get players not in any pair
      availablePlayers = await query(`
        SELECT 
          tr.id as registration_id,
          tr.user_id,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.profile_image,
          us.skill_level,
          s.name as sport_name,
          tr.locked_at
        FROM tournament_registrations tr
        INNER JOIN users u ON tr.user_id = u.id
        LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
        LEFT JOIN sports s ON s.id = ?
        WHERE tr.tournament_id = ?
        AND tr.status = 'locked'
        AND u.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM pairs p
          WHERE (p.player1_id = tr.user_id OR p.player2_id = tr.user_id)
          AND p.tournament_id = ?
        )
        ORDER BY tr.locked_at ASC
      `, [tournament[0].sport_id, tournament[0].sport_id, tournamentId, tournamentId]);

    } else {
      // Singles - just get all locked players
      availablePlayers = await query(`
        SELECT 
          tr.id as registration_id,
          tr.user_id,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.profile_image,
          us.skill_level,
          s.name as sport_name,
          tr.locked_at
        FROM tournament_registrations tr
        INNER JOIN users u ON tr.user_id = u.id
        LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
        LEFT JOIN sports s ON s.id = ?
        WHERE tr.tournament_id = ?
        AND tr.status = 'locked'
        AND u.deleted_at IS NULL
        ORDER BY tr.locked_at ASC
      `, [tournament[0].sport_id, tournament[0].sport_id, tournamentId]);
    }

    res.status(200).json({
      success: true,
      data: {
        category: tournamentCategory,
        available_players: availablePlayers,
        count: availablePlayers.length
      }
    });

  } catch (error) {
    console.error('Get available players error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available players',
      error: error.message
    });
  }
};

/**
 * Create a new team
 * POST /api/v1/tournaments/:tournamentId/teams
 */
const createTeam = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { name, description, logo, max_players } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    // Verify organizer and tournament category
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    if (tournament[0].category !== 'teams') {
      return res.status(400).json({
        success: false,
        message: 'Can only create teams for TEAMS category tournaments'
      });
    }

    // Create team with temporary captain (will be set when adding members)
    const result = await query(`
      INSERT INTO teams 
      (name, tournament_id, creator_id, captain_id, description, logo, max_players, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
    `, [
      name.trim(),
      tournamentId,
      organizerId,
      organizerId, // Temporary captain (organizer)
      description || null,
      logo || null,
      max_players || 11
    ]);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: {
        id: result.insertId,
        name: name.trim(),
        tournament_id: tournamentId,
        status: 'draft'
      }
    });

  } catch (error) {
    console.error('Create team error:', error);
    
    // Check for duplicate team name error
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('unique_team_name_creator_tournament')) {
      return res.status(400).json({
        success: false,
        message: 'Team name must be unique. A team with this name already exists in this tournament. Please choose a different name.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
};

/**
 * Get all teams for a tournament
 * GET /api/v1/tournaments/:tournamentId/teams
 */
const getTeams = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    // Get all teams with member count
    const teams = await query(`
      SELECT 
        t.*,
        u.first_name as captain_first_name,
        u.last_name as captain_last_name,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.captain_id = u.id
      WHERE t.tournament_id = ?
      AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `, [tournamentId]);

    // Get members for each team
    for (let team of teams) {
      const members = await query(`
        SELECT 
          tm.*,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.profile_image,
          us.skill_level
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
        WHERE tm.team_id = ?
        ORDER BY tm.is_captain DESC, tm.joined_at ASC
      `, [tournament[0].sport_id, team.id]);

      team.members = members;
    }

    res.status(200).json({
      success: true,
      data: {
        teams,
        total: teams.length,
        locked: teams.filter(t => t.status === 'locked').length,
        draft: teams.filter(t => t.status === 'draft').length
      }
    });

  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams',
      error: error.message
    });
  }
};

/**
 * Add player to team
 * POST /api/v1/teams/:teamId/members
 */
const addTeamMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const organizerId = req.user.id;
    const { user_id, is_captain } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    // Get team and verify organizer
    const team = await query(`
      SELECT t.*, tour.organizer_id, tour.category, tour.sport_id
      FROM teams t
      INNER JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    if (!team || team.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can add members'
      });
    }

    if (team[0].status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add members to a locked team'
      });
    }

    // Verify player is locked in tournament
    const registration = await query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ? AND status = "locked"',
      [team[0].tournament_id, user_id]
    );

    if (!registration || registration.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Player must be locked in tournament before adding to team'
      });
    }

    // Check if player already in another team
    const existingTeam = await query(`
      SELECT tm.*, t.name as team_name
      FROM team_members tm
      INNER JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
      AND t.tournament_id = ?
      AND t.deleted_at IS NULL
    `, [user_id, team[0].tournament_id]);

    if (existingTeam && existingTeam.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Player is already in team: ${existingTeam[0].team_name}`
      });
    }

    // If setting as captain, remove captain flag from others
    if (is_captain) {
      await query(
        'UPDATE team_members SET is_captain = FALSE WHERE team_id = ?',
        [teamId]
      );

      // Update team captain_id
      await query(
        'UPDATE teams SET captain_id = ? WHERE id = ?',
        [user_id, teamId]
      );
    }

    // Add member
    await query(
      'INSERT INTO team_members (team_id, user_id, is_captain) VALUES (?, ?, ?)',
      [teamId, user_id, is_captain || false]
    );

    res.status(201).json({
      success: true,
      message: 'Player added to team successfully'
    });

  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team member',
      error: error.message
    });
  }
};

/**
 * Add multiple players to team (bulk operation)
 * POST /api/v1/teams/:teamId/members/bulk
 */
const addTeamMembersBulk = async (req, res) => {
  try {
    const { teamId } = req.params;
    const organizerId = req.user.id;
    const { members } = req.body;

    // Validate input
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'members array is required and must not be empty'
      });
    }

    // Validate each member has user_id
    for (const member of members) {
      if (!member.user_id) {
        return res.status(400).json({
          success: false,
          message: 'Each member must have a user_id'
        });
      }
    }

    // Get team and verify organizer
    const team = await query(`
      SELECT t.*, tour.organizer_id, tour.category, tour.sport_id
      FROM teams t
      INNER JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    if (!team || team.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can add members'
      });
    }

    if (team[0].status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add members to a locked team'
      });
    }

    // Verify all players are locked in tournament
    const userIds = members.map(m => m.user_id);
    const registrations = await query(
      `SELECT user_id FROM tournament_registrations 
       WHERE tournament_id = ? AND user_id IN (?) AND status = "locked"`,
      [team[0].tournament_id, userIds]
    );

    const lockedUserIds = registrations.map(r => r.user_id);
    const notLockedUsers = userIds.filter(id => !lockedUserIds.includes(id));
    
    if (notLockedUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Players with IDs ${notLockedUsers.join(', ')} are not locked in tournament`
      });
    }

    // Check if any player is already in another team
    const existingTeams = await query(`
      SELECT tm.user_id, t.name as team_name
      FROM team_members tm
      INNER JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id IN (?)
      AND t.tournament_id = ?
      AND t.deleted_at IS NULL
    `, [userIds, team[0].tournament_id]);

    if (existingTeams && existingTeams.length > 0) {
      const conflicts = existingTeams.map(et => `User ${et.user_id} is in ${et.team_name}`);
      return res.status(400).json({
        success: false,
        message: `Some players are already in teams: ${conflicts.join(', ')}`
      });
    }

    // Find the captain
    const captain = members.find(m => m.is_captain);
    
    // If there's a captain, update captain flag and team captain_id
    if (captain) {
      await query(
        'UPDATE team_members SET is_captain = FALSE WHERE team_id = ?',
        [teamId]
      );
      
      await query(
        'UPDATE teams SET captain_id = ? WHERE id = ?',
        [captain.user_id, teamId]
      );
    }

    // Bulk insert all members
    const values = members.map(m => [teamId, m.user_id, m.is_captain || false]);
    await query(
      'INSERT INTO team_members (team_id, user_id, is_captain) VALUES ?',
      [values]
    );

    res.status(201).json({
      success: true,
      message: `${members.length} player(s) added to team successfully`,
      added_count: members.length
    });

  } catch (error) {
    console.error('Add team members bulk error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team members',
      error: error.message
    });
  }
};

/**
 * Remove player from team
 * DELETE /api/v1/teams/:teamId/members/:userId
 */
const removeTeamMember = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;
    const organizerId = req.user.id;

    // First check if this is a tournament team
    const teamCheck = await query(`
      SELECT tournament_id FROM teams WHERE id = ? AND deleted_at IS NULL
    `, [teamId]);

    // If not a tournament team (reusable team), pass to next handler
    if (!teamCheck || teamCheck.length === 0 || !teamCheck[0].tournament_id) {
      return next(); // Let team.routes.js handle reusable teams
    }

    // Get team and verify organizer (for tournament teams only)
    const team = await query(`
      SELECT t.*, tour.organizer_id
      FROM teams t
      INNER JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    if (!team || team.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can remove members'
      });
    }

    if (team[0].status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove members from a locked team'
      });
    }

    // Remove member
    await query(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Player removed from team successfully'
    });

  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member',
      error: error.message
    });
  }
};

/**
 * Set team captain
 * PUT /api/v1/teams/:teamId/captain/:userId
 */
const setTeamCaptain = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const organizerId = req.user.id;

    // Get team and verify organizer
    const team = await query(`
      SELECT t.*, tour.organizer_id
      FROM teams t
      INNER JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    if (!team || team.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can set captain'
      });
    }

    if (team[0].status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change captain of a locked team'
      });
    }

    // Verify user is in team
    const member = await query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (!member || member.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }

    // Remove captain flag from all members
    await query(
      'UPDATE team_members SET is_captain = FALSE WHERE team_id = ?',
      [teamId]
    );

    // Set new captain
    await query(
      'UPDATE team_members SET is_captain = TRUE WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    // Update team captain_id
    await query(
      'UPDATE teams SET captain_id = ? WHERE id = ?',
      [userId, teamId]
    );

    res.status(200).json({
      success: true,
      message: 'Team captain updated successfully'
    });

  } catch (error) {
    console.error('Set team captain error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set team captain',
      error: error.message
    });
  }
};

/**
 * Lock team (finalize)
 * PUT /api/v1/teams/:teamId/lock
 */
const lockTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const organizerId = req.user.id;

    // First check if this is a tournament team
    const teamCheck = await query(`
      SELECT tournament_id FROM teams WHERE id = ? AND deleted_at IS NULL
    `, [teamId]);

    // If not a tournament team (reusable team), pass to next handler
    if (!teamCheck || teamCheck.length === 0 || !teamCheck[0].tournament_id) {
      return next(); // Let team.routes.js handle reusable teams
    }

    // Get team and verify organizer (for tournament teams only)
    const team = await query(`
      SELECT t.*, tour.organizer_id
      FROM teams t
      INNER JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    if (!team || team.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can lock teams'
      });
    }

    if (team[0].status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Team is already locked'
      });
    }

    // Check if team has members
    const members = await query(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
      [teamId]
    );

    if (members[0].count === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot lock team with no members'
      });
    }

    // Check if team has captain
    const captain = await query(
      'SELECT * FROM team_members WHERE team_id = ? AND is_captain = TRUE',
      [teamId]
    );

    if (!captain || captain.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot lock team without a captain'
      });
    }

    // Lock team
    await query(
      'UPDATE teams SET status = "locked", locked_at = NOW() WHERE id = ?',
      [teamId]
    );

    // Get all team members
    const teamMembers = await query(
      'SELECT user_id FROM team_members WHERE team_id = ?',
      [teamId]
    );

    // Register all team members for the tournament (if not already registered)
    const tournamentId = team[0].tournament_id;
    for (const member of teamMembers) {
      // Check if already registered
      const existing = await query(
        'SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
        [tournamentId, member.user_id]
      );

      if (existing.length === 0) {
        // Register the player
        await query(
          `INSERT INTO tournament_registrations 
           (tournament_id, user_id, registration_type, status, created_by, locked_at) 
           VALUES (?, ?, 'invitation', 'locked', ?, NOW())`,
          [tournamentId, member.user_id, organizerId]
        );
      } else {
        // Update existing registration to locked
        await query(
          'UPDATE tournament_registrations SET status = "locked", locked_at = NOW() WHERE id = ?',
          [existing[0].id]
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Team locked successfully and all members registered',
      data: {
        id: teamId,
        status: 'locked',
        members_registered: teamMembers.length
      }
    });

  } catch (error) {
    console.error('Lock team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock team',
      error: error.message
    });
  }
};

/**
 * Unlock team
 * PUT /api/v1/teams/:teamId/unlock
 */
const unlockTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const organizerId = req.user.id;

    // First check if this is a tournament team
    const teamCheck = await query(`
      SELECT tournament_id FROM teams WHERE id = ? AND deleted_at IS NULL
    `, [teamId]);

    // If not a tournament team (reusable team), pass to next handler
    if (!teamCheck || teamCheck.length === 0 || !teamCheck[0].tournament_id) {
      return next(); // Let team.routes.js handle reusable teams
    }

    // Get team and verify organizer (for tournament teams only)
    const team = await query(`
      SELECT t.*, tour.organizer_id
      FROM teams t
      INNER JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    if (!team || team.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can unlock teams'
      });
    }

    if (team[0].status !== 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Team is not locked'
      });
    }

    // Unlock team
    await query(
      'UPDATE teams SET status = "draft", locked_at = NULL WHERE id = ?',
      [teamId]
    );

    // Get all team members
    const teamMembers = await query(
      'SELECT user_id FROM team_members WHERE team_id = ?',
      [teamId]
    );

    // Unlock all team members' registrations
    const tournamentId = team[0].tournament_id;
    for (const member of teamMembers) {
      await query(
        'UPDATE tournament_registrations SET status = "accepted", locked_at = NULL WHERE tournament_id = ? AND user_id = ?',
        [tournamentId, member.user_id]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Team unlocked successfully and all members registration updated',
      data: {
        id: teamId,
        status: 'draft'
      }
    });

  } catch (error) {
    console.error('Unlock team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock team',
      error: error.message
    });
  }
};

/**
 * Update team details
 * PUT /api/v1/teams/:teamId
 */
const updateTeam = async (req, res) => {
  console.log("teamManagementController.updateTeam called for team:", req.params.teamId);
  console.log("User ID:", req.user.id);
  
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { name, description, logo, max_players } = req.body;

    // First, check if team exists (both tournament and player-created teams)
    const teamCheck = await query(`
      SELECT t.*, tour.organizer_id
      FROM teams t
      LEFT JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    console.log("Team check result:", teamCheck.length > 0 ? "Team found" : "Team NOT found");

    if (!teamCheck || teamCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const team = teamCheck[0];
    console.log("Team type:", team.tournament_id ? "Tournament team" : "Player-created team");

    // Check authorization based on team type
    if (team.tournament_id) {
      // Tournament team - must be organizer
      if (team.organizer_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the tournament organizer can update teams'
        });
      }
    } else {
      // Player-created team - must be creator or captain
      if (team.creator_id !== userId && team.captain_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the team creator or captain can update the team'
        });
      }
    }

    // Check if team is locked
    if (team.status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a locked team. Unlock it first.'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (logo !== undefined) {
      updates.push('logo = ?');
      values.push(logo);
    }

    if (max_players !== undefined) {
      updates.push('max_players = ?');
      values.push(max_players);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add teamId to values
    values.push(teamId);

    // Update team
    await query(
      `UPDATE teams SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Team updated successfully'
    });

  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team',
      error: error.message
    });
  }
};

/**
 * Delete team
 * DELETE /api/v1/teams/:teamId
 */
const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const organizerId = req.user.id;

    // Get team and verify organizer
    const team = await query(`
      SELECT t.*, tour.organizer_id
      FROM teams t
      INNER JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [teamId]);

    if (!team || team.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can delete teams'
      });
    }

    // Allow deleting locked teams - players stay locked
    // This allows organizer to delete and recreate teams without unlocking players

    // Hard delete - permanently remove from database
    // Team members will be automatically deleted due to CASCADE
    // Players in tournament_registrations remain locked
    await query(
      'DELETE FROM teams WHERE id = ?',
      [teamId]
    );

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully. Players remain locked in tournament.'
    });

  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team',
      error: error.message
    });
  }
};

/**
 * Bulk lock teams
 * POST /api/v1/tournaments/:tournamentId/teams/bulk-lock
 */
const bulkLockTeams = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamIds } = req.body;
    const organizerId = req.user.id;

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'teamIds array is required'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT organizer_id FROM tournaments WHERE id = ?',
      [tournamentId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (tournament[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can lock teams'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const teamId of teamIds) {
      try {
        // Get team
        const team = await query(`
          SELECT * FROM teams 
          WHERE id = ? AND tournament_id = ? AND deleted_at IS NULL
        `, [teamId, tournamentId]);

        if (!team || team.length === 0) {
          results.failed.push({ teamId, reason: 'Team not found' });
          continue;
        }

        // If already locked, skip silently (consider it success)
        if (team[0].status === 'locked') {
          results.success.push({ teamId, name: team[0].name, note: 'Already locked' });
          continue;
        }

        // Check members and captain
        const members = await query(
          'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
          [teamId]
        );

        if (members[0].count === 0) {
          results.failed.push({ teamId, reason: 'No members' });
          continue;
        }

        const captain = await query(
          'SELECT * FROM team_members WHERE team_id = ? AND is_captain = TRUE',
          [teamId]
        );

        if (!captain || captain.length === 0) {
          results.failed.push({ teamId, reason: 'No captain' });
          continue;
        }

        // Lock team
        await query(
          'UPDATE teams SET status = ? WHERE id = ?',
          ['locked', teamId]
        );

        // Register all members - use INSERT IGNORE to skip duplicates
        const teamMembers = await query(
          'SELECT user_id FROM team_members WHERE team_id = ?',
          [teamId]
        );

        for (const member of teamMembers) {
          await query(`
            INSERT IGNORE INTO tournament_participants (tournament_id, user_id, team_id, status)
            VALUES (?, ?, ?, 'confirmed')
          `, [tournamentId, member.user_id, teamId]);
        }

        results.success.push({ teamId, name: team[0].name });
      } catch (error) {
        results.failed.push({ teamId, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: `Locked ${results.success.length} teams`,
      data: results
    });
  } catch (error) {
    logger.error('Bulk lock teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk lock teams',
      error: error.message
    });
  }
};

/**
 * Bulk unlock teams
 * POST /api/v1/tournaments/:tournamentId/teams/bulk-unlock
 */
const bulkUnlockTeams = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamIds } = req.body;
    const organizerId = req.user.id;

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'teamIds array is required'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT organizer_id FROM tournaments WHERE id = ?',
      [tournamentId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (tournament[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can unlock teams'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const teamId of teamIds) {
      try {
        // Get team
        const team = await query(`
          SELECT * FROM teams 
          WHERE id = ? AND tournament_id = ? AND deleted_at IS NULL
        `, [teamId, tournamentId]);

        if (!team || team.length === 0) {
          results.failed.push({ teamId, reason: 'Team not found' });
          continue;
        }

        // If already unlocked, skip silently (consider it success)
        if (team[0].status !== 'locked') {
          results.success.push({ teamId, name: team[0].name, note: 'Already unlocked' });
          continue;
        }

        // Unlock team
        await query(
          'UPDATE teams SET status = ? WHERE id = ?',
          ['draft', teamId]
        );

        results.success.push({ teamId, name: team[0].name });
      } catch (error) {
        results.failed.push({ teamId, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: `Unlocked ${results.success.length} teams`,
      data: results
    });
  } catch (error) {
    logger.error('Bulk unlock teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk unlock teams',
      error: error.message
    });
  }
};

module.exports = {
  getAvailablePlayers,
  createTeam,
  getTeams,
  updateTeam,
  addTeamMember,
  addTeamMembersBulk,
  removeTeamMember,
  setTeamCaptain,
  lockTeam,
  unlockTeam,
  deleteTeam,
  bulkLockTeams,
  bulkUnlockTeams
};

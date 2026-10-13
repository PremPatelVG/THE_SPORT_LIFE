const Team = require('../models/Team');
const TeamInvitation = require('../models/TeamInvitation');
const Tournament = require('../models/Tournament');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a new team
 */
const createTeam = async (teamData, creatorId) => {
    try {
      // Validate based on team type
      if (teamData.is_tournament_specific !== false) {
        // Tournament-specific team validation
        const tournament = await Tournament.findById(teamData.tournament_id);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        // Check if tournament allows teams
        if (tournament.category !== 'teams') {
          throw new Error('This tournament does not support team registration');
        }

        // Check for duplicate team name in tournament
        const existing = await Team.findByNameAndTournament(
          teamData.name,
          teamData.tournament_id
        );

        if (existing) {
          throw new Error('A team with this name already exists in this tournament');
        }
      } else {
        // Reusable team validation
        if (!teamData.sport_id) {
          throw new Error('Sport ID is required for reusable teams');
        }
      }

      // Set creator as captain if no captain specified
      if (!teamData.captain_id) {
        teamData.captain_id = creatorId;
      }

      teamData.creator_id = creatorId;

      return await transaction(async (conn) => {
        // Create team
        const teamId = await Team.create(teamData);

        // Add creator as first member
        await Team.addMember(teamId, creatorId);

        // If captain is different from creator, add captain too
        if (teamData.captain_id !== creatorId) {
          await Team.addMember(teamId, teamData.captain_id);
        }

        logger.info(`Team created: ${teamId} by user ${creatorId}`);

        return await Team.findById(teamId);
      });
    } catch (error) {
      logger.error('Create team error:', error);
      throw error;
    }
};

/**
 * Update team
 */
const updateTeam = async (teamId, updateData, userId) => {
    try {
      logger.info(`Attempting to update team ${teamId} by user ${userId}`);
      logger.info(`Update data:`, updateData);
      
      // Check if user is creator or captain
      const isCreator = await Team.isCreator(teamId, userId);
      const isCaptain = await Team.isCaptain(teamId, userId);
      
      logger.info(`User ${userId} - isCreator: ${isCreator}, isCaptain: ${isCaptain}`);

      if (!isCreator && !isCaptain) {
        throw new Error('Only team creator or captain can update the team');
      }

      // If changing captain, verify new captain is a member
      if (updateData.captain_id) {
        const isMember = await Team.isMember(teamId, updateData.captain_id);
        if (!isMember) {
          throw new Error('New captain must be a team member');
        }
      }

      const updatedTeam = await Team.update(teamId, updateData);
      
      if (!updatedTeam) {
        logger.error(`Team.update returned null for team ${teamId}`);
        throw new Error('Team not found');
      }
      
      logger.info(`Team updated successfully: ${teamId}`);
      
      return updatedTeam;
    } catch (error) {
      logger.error('Update team error:', error);
      throw error;
    }
};

/**
 * Delete team
 */
const deleteTeam = async (teamId, userId) => {
    try {
      // Check if user is creator
      const isCreator = await Team.isCreator(teamId, userId);
      if (!isCreator) {
        throw new Error('Only team creator can delete the team');
      }

      // Check if team is registered in tournament
      const participations = await query(
        'SELECT id FROM tournament_participants WHERE team_id = ? AND status IN ("registered", "confirmed")',
        [teamId]
      );

      if (participations.length > 0) {
        throw new Error('Cannot delete team that is registered in a tournament');
      }

      // Hard delete - remove team members first, then team
      await query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
      await query('DELETE FROM teams WHERE id = ?', [teamId]);
      
      logger.info(`Team deleted: ${teamId}`);
      
      return { success: true, message: 'Team deleted successfully' };
    } catch (error) {
      logger.error('Delete team error:', error);
      throw error;
    }
};

/**
 * Get team by ID
 */
const getTeam = async (teamId) => {
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }

    // Get members and statistics
    const [members, statistics] = await Promise.all([
      Team.getMembers(teamId),
      Team.getStatistics(teamId)
    ]);

    return {
      ...team,
      members,
      statistics
    };
};

/**
 * Get team by ID with match statistics
 */
const getTeamWithStats = async (teamId) => {
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }

    // Get members, statistics, and match stats
    const [members, statistics, matchStats] = await Promise.all([
      Team.getMembers(teamId),
      Team.getStatistics(teamId),
      Team.getMatchStatistics(teamId)
    ]);

    return {
      ...team,
      members,
      statistics,
      matchStats
    };
};

/**
 * Get all teams with filters
 */
const getTeams = async (filters) => {
    return await Team.findAll(filters);
};

/**
 * Invite user to team by email
 */
const inviteUserByEmail = async (teamId, email, inviterId) => {
    try {
      // Find user by email
      const { query } = require('../config/database');
      const sql = 'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL';
      const result = await query(sql, [email]);
      
      const users = Array.isArray(result) 
        ? result 
        : Array.isArray(result[0]) 
          ? result[0] 
          : [result];

      if (!users || users.length === 0) {
        throw new Error('User not found with this email');
      }

      const invitedUserId = users[0].id;

      // Use existing inviteUser logic
      return await inviteUser(teamId, invitedUserId, inviterId);
    } catch (error) {
      logger.error('Invite user by email error:', error);
      throw error;
    }
};

/**
 * Invite user to team (by user ID)
 */
const inviteUser = async (teamId, invitedUserId, inviterId) => {
    try {
      // Check if inviter is creator or captain
      const isCreator = await Team.isCreator(teamId, inviterId);
      const isCaptain = await Team.isCaptain(teamId, inviterId);

      if (!isCreator && !isCaptain) {
        throw new Error('Only team creator or captain can invite members');
      }

      // Check if team is full
      const isFull = await Team.isFull(teamId);
      if (isFull) {
        throw new Error('Team is full');
      }

      // FIRST: Check if user is already in team_members table (actual member)
      const isMember = await Team.isMember(teamId, invitedUserId);
      
      if (isMember) {
        throw new Error('User is already a team member');
      }

      // SECOND: Check for existing invitations
      const existingInvitation = await TeamInvitation.findByTeamAndUser(teamId, invitedUserId);
      
      if (existingInvitation) {
        // If invitation is accepted but user is not in members table, something is wrong
        // This shouldn't happen, but if it does, delete the old invitation
        if (existingInvitation.status === 'accepted') {
          await TeamInvitation.deleteById(existingInvitation.id);
        }
        // If invitation is pending, user already has a pending invitation
        else if (existingInvitation.status === 'pending') {
          throw new Error('Invitation already sent to this user');
        }
        // If invitation is rejected or expired, delete it and send a new one
        else {
          await TeamInvitation.deleteById(existingInvitation.id);
        }
      }

      // Create invitation
      const invitationId = await TeamInvitation.create({
        team_id: teamId,
        user_id: invitedUserId,
        initiated_by: inviterId,
        type: 'invitation'
      });

      logger.info(`Team invitation sent: ${invitationId} from team ${teamId} to user ${invitedUserId}`);

      // Send SMS notification to invited user via MSG91
      try {
        // Get team and user details
        const team = await Team.findById(teamId);
        const invitedUser = await query('SELECT first_name, phone FROM users WHERE id = ?', [invitedUserId]);
        const inviter = await query('SELECT first_name, last_name FROM users WHERE id = ?', [inviterId]);
        
        if (invitedUser && invitedUser.length > 0 && invitedUser[0].phone && team) {
          const inviterName = inviter && inviter.length > 0 
            ? `${inviter[0].first_name} ${inviter[0].last_name}` 
            : 'Someone';
          
          const teamLink = `${process.env.FRONTEND_URL}/teams/${teamId}`;
          
          // Use MSG91 service for SMS (auto-handles dev/production)
          const msg91Service = require('../utils/msg91Service');
          const formattedMobile = msg91Service.formatMobileNumber(invitedUser[0].phone, '91');
          
          const result = await msg91Service.sendTeamInvitation(
            formattedMobile,
            invitedUser[0].first_name,
            inviterName,
            team.name,
            teamLink
          );
          
          if (result.success) {
            logger.info(`Team invitation SMS sent successfully to ${formattedMobile}`);
          } else {
            logger.warn(`Failed to send team invitation SMS: ${result.message}`);
          }
        }
      } catch (smsError) {
        // Don't fail the invitation if SMS fails
        logger.error('Failed to send team invitation SMS:', smsError);
      }

      return await TeamInvitation.findById(invitationId);
    } catch (error) {
      logger.error('Invite user error:', error);
      throw error;
    }
};

/**
 * Accept team invitation
 */
const acceptInvitation = async (invitationId, userId) => {
  
  
    try {
      const invitation = await TeamInvitation.findById(invitationId);
console.log("dev value=====", invitationId,userId,invitation);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.user_id !== userId) {
        throw new Error('This invitation is not for you');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer pending');
      }

      // Check if team is still not full
      const isFull = await Team.isFull(invitation.team_id);
      if (isFull) {
        throw new Error('Team is now full');
      }

      return await transaction(async (conn) => {
        // Accept invitation
        await TeamInvitation.accept(invitationId);

        // Add user to team
        await Team.addMember(invitation.team_id, userId);

        logger.info(`User ${userId} accepted invitation ${invitationId} and joined team ${invitation.team_id}`);

        return await Team.findById(invitation.team_id);
      });
    } catch (error) {
      logger.error('Accept invitation error:', error);
      throw error;
    }
};

/**
 * Reject team invitation
 */
const rejectInvitation = async (invitationId, userId) => {
    try {
      const invitation = await TeamInvitation.findById(invitationId);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.user_id !== userId) {
        throw new Error('This invitation is not for you');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer pending');
      }

      await TeamInvitation.reject(invitationId);

      logger.info(`User ${userId} rejected invitation ${invitationId}`);

      return { success: true, message: 'Invitation rejected' };
    } catch (error) {
      logger.error('Reject invitation error:', error);
      throw error;
    }
};

/**
 * Cancel team invitation
 */
const cancelInvitation = async (invitationId, userId) => {
    try {
      const invitation = await TeamInvitation.findById(invitationId);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check if user is creator or captain
      const isCreator = await Team.isCreator(invitation.team_id, userId);
      const isCaptain = await Team.isCaptain(invitation.team_id, userId);

      if (!isCreator && !isCaptain) {
        throw new Error('Only team creator or captain can cancel invitations');
      }

      await TeamInvitation.cancel(invitationId);

      logger.info(`Invitation ${invitationId} cancelled by user ${userId}`);

      return { success: true, message: 'Invitation cancelled' };
    } catch (error) {
      logger.error('Cancel invitation error:', error);
      throw error;
    }
};

/**
 * Remove team member
 */
const removeMember = async (teamId, memberId, requesterId) => {
    try {
      console.log("dev valeu======", teamId);
      // Check if requester is creator or captain
      const isCreator = await Team.isCreator(teamId, requesterId);
      const isCaptain = await Team.isCaptain(teamId, requesterId);

      if (!isCreator && !isCaptain && requesterId !== memberId) {
        throw new Error('Only team creator, captain, or the member themselves can remove a member');
      }

      // Get team details
      const team = await Team.findById(teamId);

      
      
      if (!team) {
        throw new Error('Team not found');
      }

      // Cannot remove captain
      if (memberId === team.captain_id) {
        throw new Error('Cannot remove team captain. Change captain first.');
      }

      // Cannot remove creator
      if (memberId === team.creator_id) {
        throw new Error('Cannot remove team creator');
      }

      // Hard delete for tournament teams
      await query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, memberId]);

      logger.info(`Member ${memberId} removed from team ${teamId}`);

      return { success: true, message: 'Member removed successfully' };
    } catch (error) {
      logger.error('Remove member error:', error);
      throw error;
    }
};

/**
 * Update member details
 */
const updateMember = async (teamId, memberId, updateData, requesterId) => {
    try {
      // Check if requester is creator or captain
      const isCreator = await Team.isCreator(teamId, requesterId);
      const isCaptain = await Team.isCaptain(teamId, requesterId);

      if (!isCreator && !isCaptain) {
        throw new Error('Only team creator or captain can update member details');
      }

      // Verify member exists
      const isMember = await Team.isMember(teamId, memberId);
      if (!isMember) {
        throw new Error('User is not a team member');
      }

      await Team.updateMember(teamId, memberId, updateData);

      logger.info(`Member ${memberId} updated in team ${teamId}`);

      return { success: true, message: 'Member updated successfully' };
    } catch (error) {
      logger.error('Update member error:', error);
      throw error;
    }
};

/**
 * Change team captain
 */
const changeCaptain = async (teamId, newCaptainId, requesterId) => {
    try {
      // Only creator can change captain
      const isCreator = await Team.isCreator(teamId, requesterId);
      if (!isCreator) {
        throw new Error('Only team creator can change the captain');
      }

      await Team.changeCaptain(teamId, newCaptainId);

      logger.info(`Team ${teamId} captain changed to user ${newCaptainId}`);

      return await Team.findById(teamId);
    } catch (error) {
      logger.error('Change captain error:', error);
      throw error;
    }
};

/**
 * Get team members
 */
const getMembers = async (teamId) => {
    return await Team.getMembers(teamId);
};

/**
 * Get team invitations
 */
const getTeamInvitations = async (teamId, userId) => {
    // Check if user is creator or captain
    const isCreator = await Team.isCreator(teamId, userId);
    const isCaptain = await Team.isCaptain(teamId, userId);

    if (!isCreator && !isCaptain) {
      // Return empty array with message instead of throwing error
      return {
        restricted: true,
        message: 'Only team creator or captain can view invitations',
        invitations: []
      };
    }

    const invitations = await TeamInvitation.findByTeam(teamId);
    return {
      restricted: false,
      invitations
    };
};

/**
 * Get user's team invitations
 */
const getUserInvitations = async (userId, status = null) => {
    return await TeamInvitation.findByUser(userId, status);
};

/**
 * Get user's teams with type filter
 * @param {number} userId - User ID
 * @param {string} type - Filter type: 'all', 'tournament', 'reusable'
 */
const getUserTeams = async (userId, type = 'all') => {
    return await Team.getUserTeams(userId, type);
};

/**
 * Get teams for tournament
 */
const getTournamentTeams = async (tournamentId) => {
    return await Team.getTeamsByTournament(tournamentId);
};

/**
 * Leave team
 */
const leaveTeam = async (teamId, userId) => {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Cannot leave if you're the creator
      if (team.creator_id === userId) {
        throw new Error('Team creator cannot leave the team. Delete the team instead.');
      }

      // If captain is leaving, assign a new captain from remaining members
      let newCaptainAssigned = false;
      if (team.captain_id === userId) {
        // Get all team members except the one leaving
        const members = await query(`
          SELECT user_id 
          FROM team_members 
          WHERE team_id = ? AND user_id != ? AND is_active = TRUE
          ORDER BY joined_at ASC
          LIMIT 1
        `, [teamId, userId]);

        if (members && members.length > 0) {
          // Assign the first member (oldest member) as new captain
          const newCaptainId = members[0].user_id;
          await query(`
            UPDATE teams 
            SET captain_id = ? 
            WHERE id = ?
          `, [newCaptainId, teamId]);
          
          newCaptainAssigned = true;
          logger.info(`Captain ${userId} left team ${teamId}, assigned new captain ${newCaptainId}`);
        } else {
          // No other members, set captain to NULL
          await query(`
            UPDATE teams 
            SET captain_id = NULL 
            WHERE id = ?
          `, [teamId]);
          
          logger.info(`Captain ${userId} left team ${teamId}, no other members to assign as captain`);
        }
      }

      await Team.removeMember(teamId, userId);

      logger.info(`User ${userId} left team ${teamId}`);

      const message = newCaptainAssigned 
        ? 'Successfully left the team. A new captain has been assigned.'
        : 'Successfully left the team';

      return { success: true, message };
    } catch (error) {
      logger.error('Leave team error:', error);
      throw error;
    }
};

/**
 * Get available jersey numbers
 */
const getAvailableJerseyNumbers = async (teamId) => {
    return await Team.getAvailableJerseyNumbers(teamId);
};

/**
 * Validate team for tournament registration
 */
const validateForTournament = async (teamId, tournamentId) => {
    try {
      await Team.canRegisterForTournament(teamId, tournamentId);
      return { valid: true, message: 'Team is eligible for registration' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
};

/**
 * Register reusable team for tournament
 */
const registerTeamForTournament = async (teamId, tournamentId, userId) => {
  try {
    // Get team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if team is reusable
    if (team.is_tournament_specific) {
      throw new Error('This team is tournament-specific and cannot be registered for other tournaments');
    }

    // Check if user has permission (creator, captain, or member)
    const isCreator = await Team.isCreator(teamId, userId);
    const isCaptain = await Team.isCaptain(teamId, userId);
    const isMember = await Team.isMember(teamId, userId);

    if (!isCreator && !isCaptain && !isMember) {
      throw new Error('Only team members can register the team for tournaments');
    }

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Check if tournament allows teams
    if (tournament.category !== 'teams') {
      throw new Error('This tournament does not support team registration');
    }

    // Check if team sport matches tournament sport
    if (team.sport_id !== tournament.sport_id) {
      throw new Error('Team sport does not match tournament sport');
    }

    // Check if already registered
    const alreadyRegistered = await Team.isRegisteredForTournament(teamId, tournamentId);
    if (alreadyRegistered) {
      throw new Error('Team is already registered for this tournament');
    }

    // Check if team has enough members
    const memberCount = team.member_count || 0;
    if (memberCount < team.max_players) {
      throw new Error(`Team must have all ${team.max_players} members to register (currently has ${memberCount})`);
    }

    // Register team
    const registrationId = await Team.registerForTournament(teamId, tournamentId);

    logger.info(`Team ${teamId} registered for tournament ${tournamentId} by user ${userId}`);

    return await Team.findById(teamId);
  } catch (error) {
    logger.error('Register team for tournament error:', error);
    throw error;
  }
};

/**
 * Get reusable teams for user
 */
const getReusableTeams = async (userId, sportId) => {
  try {
    return await Team.getReusableTeamsForTournament(userId, sportId);
  } catch (error) {
    logger.error('Get reusable teams error:', error);
    throw error;
  }
};

/**
 * Get team tournament registrations
 */
const getTeamTournamentRegistrations = async (teamId) => {
  try {
    return await Team.getTeamTournamentRegistrations(teamId);
  } catch (error) {
    logger.error('Get team tournament registrations error:', error);
    throw error;
  }
};

/**
 * Lock team (finalize roster)
 */
const lockTeam = async (teamId, userId) => {
  try {
    // Check if user is creator or captain
    const isCreator = await Team.isCreator(teamId, userId);
    const isCaptain = await Team.isCaptain(teamId, userId);

    if (!isCreator && !isCaptain) {
      throw new Error('Only team creator or captain can lock the team');
    }

    // Get team details
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (team.status === 'locked') {
      throw new Error('Team is already locked');
    }

    // Check if team has members
    const members = await query(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND is_active = TRUE',
      [teamId]
    );

    if (members[0].count === 0) {
      throw new Error('Cannot lock team with no members');
    }

    // Lock team
    await query(
      'UPDATE teams SET status = "locked", locked_at = NOW() WHERE id = ?',
      [teamId]
    );

    logger.info(`Team ${teamId} locked by user ${userId}`);

    return { success: true, message: 'Team locked successfully' };
  } catch (error) {
    logger.error('Lock team error:', error);
    throw error;
  }
};

/**
 * Unlock team
 */
const unlockTeam = async (teamId, userId) => {
  try {
    // Check if user is creator or captain
    const isCreator = await Team.isCreator(teamId, userId);
    const isCaptain = await Team.isCaptain(teamId, userId);

    if (!isCreator && !isCaptain) {
      throw new Error('Only team creator or captain can unlock the team');
    }

    // Get team details
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (team.status !== 'locked') {
      throw new Error('Team is not locked');
    }

    // Unlock team
    await query(
      'UPDATE teams SET status = "draft", locked_at = NULL WHERE id = ?',
      [teamId]
    );

    logger.info(`Team ${teamId} unlocked by user ${userId}`);

    return { success: true, message: 'Team unlocked successfully' };
  } catch (error) {
    logger.error('Unlock team error:', error);
    throw error;
  }
};

/**
 * Get invitation statuses for multiple users
 * Only returns invitation status if user is NOT actually a member
 */
const getInvitationStatuses = async (teamId, userIds) => {
  try {
    const placeholders = userIds.map(() => '?').join(',');
    
    // Get actual team members
    const members = await query(`
      SELECT user_id
      FROM team_members
      WHERE team_id = ? AND user_id IN (${placeholders}) AND is_active = TRUE
    `, [teamId, ...userIds]);
    
    const memberIds = new Set(members.map(m => m.user_id));
    
    // Get invitations
    const invitations = await query(`
      SELECT user_id, status, created_at, responded_at
      FROM team_invitations
      WHERE team_id = ? AND user_id IN (${placeholders})
    `, [teamId, ...userIds]);

    // Create a map of user_id to status
    const statusMap = {};
    invitations.forEach(inv => {
      // If user is actually a member, ignore invitation status
      if (memberIds.has(inv.user_id)) {
        statusMap[inv.user_id] = {
          user_id: inv.user_id,
          status: 'member', // Special status to indicate they're a member
          created_at: inv.created_at,
          responded_at: inv.responded_at
        };
      } else {
        // User is not a member, return actual invitation status
        // If invitation is accepted but user is not a member, return null (they were removed)
        statusMap[inv.user_id] = {
          user_id: inv.user_id,
          status: inv.status === 'accepted' ? null : inv.status,
          created_at: inv.created_at,
          responded_at: inv.responded_at
        };
      }
    });

    // Return status for all requested users
    return userIds.map(userId => {
      return statusMap[userId] || {
        user_id: userId,
        status: null,
        created_at: null,
        responded_at: null
      };
    });
  } catch (error) {
    logger.error('Get invitation statuses error:', error);
    throw error;
  }
};

module.exports = {
  createTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getTeamWithStats,
  getTeams,
  inviteUser,
  inviteUserByEmail,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  removeMember,
  updateMember,
  changeCaptain,
  getMembers,
  getTeamInvitations,
  getUserInvitations,
  getUserTeams,
  getTournamentTeams,
  leaveTeam,
  getAvailableJerseyNumbers,
  validateForTournament,
  registerTeamForTournament,
  getReusableTeams,
  getTeamTournamentRegistrations,
  lockTeam,
  unlockTeam,
  getInvitationStatuses
};

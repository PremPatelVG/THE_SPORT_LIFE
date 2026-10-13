const teamService = require('../services/teamService');
const logger = require('../utils/logger');

  /**
   * Create team
   * POST /api/v1/teams
   */
const createTeam = async (req, res) => {
  try {
    logger.info('Create team request body:', req.body);
    const team = await teamService.createTeam(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    logger.error('Create team controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all teams
 * GET /api/v1/teams
 */
const getTeams = async (req, res) => {
  try {
    const filters = {
      tournament_id: req.query.tournament_id,
      creator_id: req.query.creator_id,
      search: req.query.search,
      limit: req.query.limit || 20,
      offset: req.query.offset || 0
    };

    const teams = await teamService.getTeams(filters);
    
    res.json({
      success: true,
      data: teams,
      pagination: {
        limit: parseInt(filters.limit),
        offset: parseInt(filters.offset),
        total: teams.length
      }
    });
  } catch (error) {
    logger.error('Get teams controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
}

/**
 * Get team by ID with statistics
 * GET /api/v1/teams/:id
 */
const getTeam = async (req, res) => {
  try {
    const team = await teamService.getTeamWithStats(req.params.id);
    
    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    logger.error('Get team controller error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Update team
 * PUT /api/v1/teams/:id
 */
const updateTeam = async (req, res) => {
  try {
    const team = await teamService.updateTeam(
      req.params.id,
      req.body,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Team updated successfully',
      data: team
    });
  } catch (error) {
    logger.error('Update team controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Delete team
 * DELETE /api/v1/teams/:id
 */
const deleteTeam = async (req, res) => {
  try {
    const result = await teamService.deleteTeam(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete team controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get team members
 * GET /api/v1/teams/:id/members
 */
const getMembers = async (req, res) => {
  try {
    const members = await teamService.getMembers(req.params.id);
    
    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    logger.error('Get members controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members'
    });
  }
}

/**
 * Invite user to team
 * POST /api/v1/teams/:id/invite
 */
const inviteUser = async (req, res) => {
  try {
    const { user_id } = req.body;
    
    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }
    
    const invitation = await teamService.inviteUser(
      req.params.id,
      user_id,
      req.user.id
    );
    
    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: invitation
    });
  } catch (error) {
    logger.error('Invite user controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Remove team member
 * DELETE /api/v1/teams/:id/members/:memberId
 */
const removeMember = async (req, res) => {
  console.log("==========");
  
  try {
    const result = await teamService.removeMember(
      req.params.id,
      req.params.memberId,
      req.user.id
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Remove member controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Update member details
 * PUT /api/v1/teams/:id/members/:memberId
 */
const updateMember = async (req, res) => {
  try {
    const result = await teamService.updateMember(
      req.params.id,
      req.params.memberId,
      req.body,
      req.user.id
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Update member controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Change team captain
 * POST /api/v1/teams/:id/change-captain
 */
const changeCaptain = async (req, res) => {
  try {
    const { captain_id } = req.body;
    const team = await teamService.changeCaptain(
      req.params.id,
      captain_id,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Captain changed successfully',
      data: team
    });
  } catch (error) {
    logger.error('Change captain controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get team invitations
 * GET /api/v1/teams/:id/invitations
 */
const getTeamInvitations = async (req, res) => {
  try {
    const result = await teamService.getTeamInvitations(
      req.params.id,
      req.user.id
    );
    
    // If restricted (not owner/captain), return success with message
    if (result.restricted) {
      return res.json({
        success: true,
        message: result.message,
        data: result.invitations
      });
    }
    
    // Owner/Captain - return invitations
    res.json({
      success: true,
      data: result.invitations
    });
  } catch (error) {
    logger.error('Get team invitations controller error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get user's team invitations
 * GET /api/v1/teams/invitations/my
 */
const getMyInvitations = async (req, res) => {
  try {
    const status = req.query.status;
    const invitations = await teamService.getUserInvitations(req.user.id, status);
    
    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    logger.error('Get my invitations controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invitations'
    });
  }
}

/**
 * Accept team invitation
 * POST /api/v1/teams/:teamId/accept-invitation
 */
const acceptInvitation = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.user.id;
    
    // Find the pending invitation for this team and user
    const TeamInvitation = require('../models/TeamInvitation');
    const invitations = await TeamInvitation.findByUser(userId, 'pending');
    const invitation = invitations.find(inv => 
      inv.team_id === parseInt(teamId)
    );
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'No pending invitation found for this team'
      });
    }
    
    const team = await teamService.acceptInvitation(invitation.id, userId);
    
    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: team
    });
  } catch (error) {
    logger.error('Accept invitation controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Reject team invitation
 * POST /api/v1/teams/:teamId/reject-invitation
 */
const rejectInvitation = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.user.id;
    
    // Find the pending invitation for this team and user
    const TeamInvitation = require('../models/TeamInvitation');
    const invitations = await TeamInvitation.findByUser(userId, 'pending');
    const invitation = invitations.find(inv => 
      inv.team_id === parseInt(teamId)
    );
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'No pending invitation found for this team'
      });
    }
    
    const result = await teamService.rejectInvitation(invitation.id, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Reject invitation controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Cancel team invitation
 * DELETE /api/v1/teams/invitations/:id
 */
const cancelInvitation = async (req, res) => {
  try {
    const result = await teamService.cancelInvitation(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Cancel invitation controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get user's teams
 * GET /api/v1/teams/my-teams?type=all|tournament|reusable
 */
const getMyTeams = async (req, res) => {
  try {
    const type = req.query.type || 'all'; // all, tournament, reusable
    const teams = await teamService.getUserTeams(req.user.id, type);
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error('Get my teams controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
}

/**
 * Leave team
 * POST /api/v1/teams/:id/leave
 */
const leaveTeam = async (req, res) => {
  try {
    const result = await teamService.leaveTeam(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Leave team controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get available jersey numbers
 * GET /api/v1/teams/:id/available-jerseys
 */
const getAvailableJerseys = async (req, res) => {
  try {
    const numbers = await teamService.getAvailableJerseyNumbers(req.params.id);
    
    res.json({
      success: true,
      data: numbers
    });
  } catch (error) {
    logger.error('Get available jerseys controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available jersey numbers'
    });
  }
}

/**
 * Get teams for tournament
 * GET /api/v1/teams/tournament/:tournamentId
 */
const getTournamentTeams = async (req, res) => {
  try {
    const teams = await teamService.getTournamentTeams(req.params.tournamentId);
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error('Get tournament teams controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament teams'
    });
  }
}

/**
 * Register reusable team for tournament
 * POST /api/v1/teams/:id/register-tournament
 */
const registerTeamForTournament = async (req, res) => {
  try {
    const result = await teamService.registerTeamForTournament(
      req.params.id,
      req.body.tournament_id,
      req.user.id
    );
    
    res.status(201).json({
      success: true,
      message: 'Team registered for tournament successfully',
      data: result
    });
  } catch (error) {
    logger.error('Register team for tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get reusable teams for tournament
 * GET /api/v1/teams/reusable
 */
const getReusableTeams = async (req, res) => {
  try {
    const teams = await teamService.getReusableTeams(req.user.id, req.query.sport_id);
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error('Get reusable teams controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reusable teams'
    });
  }
}

/**
 * Get team tournament registrations
 * GET /api/v1/teams/:id/tournament-registrations
 */
const getTeamTournamentRegistrations = async (req, res) => {
  try {
    const registrations = await teamService.getTeamTournamentRegistrations(req.params.id);
    
    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    logger.error('Get team tournament registrations controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team tournament registrations'
    });
  }
}

/**
 * Lock team
 * PUT /api/v1/teams/:id/lock
 */
const lockTeam = async (req, res) => {
  try {
    await teamService.lockTeam(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Team locked successfully'
    });
  } catch (error) {
    logger.error('Lock team controller error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Unlock team
 * PUT /api/v1/teams/:id/unlock
 */
const unlockTeam = async (req, res) => {
  try {
    await teamService.unlockTeam(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Team unlocked successfully'
    });
  } catch (error) {
    logger.error('Unlock team controller error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get invitation statuses for multiple users
 * GET /api/v1/teams/:id/invitation-statuses?userIds=1,2,3
 */
const getInvitationStatuses = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.query;

    if (!userIds) {
      return res.status(400).json({
        success: false,
        error: 'userIds query parameter is required'
      });
    }

    const userIdArray = userIds.split(',').map(id => parseInt(id.trim()));
    const statuses = await teamService.getInvitationStatuses(id, userIdArray);

    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    logger.error('Get invitation statuses error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  getMembers,
  inviteUser,
  removeMember,
  updateMember,
  changeCaptain,
  getTeamInvitations,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  getMyTeams,
  leaveTeam,
  getAvailableJerseys,
  getInvitationStatuses,
  getTournamentTeams,
  registerTeamForTournament,
  getReusableTeams,
  getTeamTournamentRegistrations,
  lockTeam,
  unlockTeam
};

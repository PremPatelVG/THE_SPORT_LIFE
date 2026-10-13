const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { auth } = require('../middleware/auth');
const {
  createTeamValidation,
  updateTeamValidation,
  getTeamValidation,
  inviteUserValidation,
  removeMemberValidation,
  updateMemberValidation,
  changeCaptainValidation,
  getTeamsValidation,
  invitationIdValidation,
  getInvitationsValidation,
  tournamentIdValidation,
  registerTeamForTournamentValidation,
  getReusableTeamsValidation
} = require('../validators/teamValidator');

// // ============================================
// // PUBLIC ROUTES (No authentication required)
// // ============================================

// /**
//  * @route   GET /api/v1/teams
//  * @desc    Get all teams with filters
//  * @access  Public
//  */
router.get('/', getTeamsValidation, teamController.getTeams);

// /**
//  * @route   GET /api/v1/teams/tournament/:tournamentId
//  * @desc    Get teams for a specific tournament
//  * @access  Public
//  */
// router.get('/tournament/:tournamentId', tournamentIdValidation, teamController.getTournamentTeams);

// // ============================================
// // PROTECTED ROUTES (Authentication required)
// // ============================================

/**
 * @route   POST /api/v1/teams
 * @desc    Create new reusable team
 * @access  Private
 */
router.post('/', auth, createTeamValidation, teamController.createTeam);

/**
 * @route   GET /api/v1/teams/my-teams
 * @desc    Get user's teams (all, tournament, reusable)
 * @access  Private
 * @note    MUST be before /:id route to avoid matching "my-teams" as an ID
 */
router.get('/my-teams', auth, teamController.getMyTeams);

/**
 * @route   GET /api/v1/teams/:id
 * @desc    Get team by ID with statistics
 * @access  Public
 */
router.get('/:id', getTeamValidation, teamController.getTeam);

/**
 * @route   GET /api/v1/teams/:id/members
 * @desc    Get team members
 * @access  Public
 */
router.get('/:id/members', getTeamValidation, teamController.getMembers);

/**
 * @route   GET /api/v1/teams/invitations/my
 * @desc    Get user's team invitations
 * @access  Private
 */
router.get('/invitations/my', auth, teamController.getMyInvitations);

/**
 * @route   PUT /api/v1/teams/:id
 * @desc    Update team
 * @access  Private (Creator or Captain)
 */
router.put('/:id', auth, teamController.updateTeam);

// /**
//  * @route   DELETE /api/v1/teams/:id
//  * @desc    Delete team
//  * @access  Private (Creator only)
//  */
// router.delete('/:id', auth, getTeamValidation, teamController.deleteTeam);

/**
 * @route   POST /api/v1/teams/:id/invite
 * @desc    Invite user to team by user_id
 * @access  Private (Creator or Captain)
 * @body    { user_id }
 */
router.post('/:id/invite', auth, inviteUserValidation, teamController.inviteUser);

/**
 * @route   GET /api/v1/teams/:id/invitations
 * @desc    Get team invitations
 * @access  Private (Creator or Captain)
 */
router.get('/:id/invitations', auth, getTeamValidation, teamController.getTeamInvitations);

/**
 * @route   GET /api/v1/teams/:id/invitation-statuses
 * @desc    Get invitation statuses for multiple users
 * @access  Private
 */
router.get('/:id/invitation-statuses', auth, teamController.getInvitationStatuses);

/**
 * @route   DELETE /api/v1/teams/:id/members/:memberId
 * @desc    Remove team member
 * @access  Private (Creator, Captain, or Member themselves)
 */
router.delete('/:id/members/:memberId', auth, teamController.removeMember);

/**
 * @route   PUT /api/v1/teams/:id/lock
 * @desc    Lock team (finalize roster)
 * @access  Private (Creator or Captain)
 */
router.put('/:id/lock', auth, teamController.lockTeam);

/**
 * @route   PUT /api/v1/teams/:id/unlock
 * @desc    Unlock team
 * @access  Private (Creator or Captain)
 */
router.put('/:id/unlock', auth, teamController.unlockTeam);

// /**
//  * @route   PUT /api/v1/teams/:id/members/:memberId
//  * @desc    Update member details (position, jersey number)
//  * @access  Private (Creator or Captain)
//  */
// router.put('/:id/members/:memberId', auth, updateMemberValidation, teamController.updateMember);

// /**
//  * @route   POST /api/v1/teams/:id/change-captain
//  * @desc    Change team captain
//  * @access  Private (Creator only)
//  */
// router.post('/:id/change-captain', auth, changeCaptainValidation, teamController.changeCaptain);

/**
 * @route   POST /api/v1/teams/:id/leave
 * @desc    Leave team
 * @access  Private
 */
router.post('/:id/leave', auth, getTeamValidation, teamController.leaveTeam);

// /**
//  * @route   GET /api/v1/teams/:id/available-jerseys
//  * @desc    Get available jersey numbers
//  * @access  Private
//  */
// router.get('/:id/available-jerseys', auth, getTeamValidation, teamController.getAvailableJerseys);

/**
 * @route   POST /api/v1/teams/:teamId/accept-invitation
 * @desc    Accept team invitation
 * @access  Private
 */
router.post('/:teamId/accept-invitation', auth, teamController.acceptInvitation);

/**
 * @route   POST /api/v1/teams/:teamId/reject-invitation
 * @desc    Reject team invitation
 * @access  Private
 */
router.post('/:teamId/reject-invitation', auth, teamController.rejectInvitation);

// /**
//  * @route   DELETE /api/v1/teams/invitations/:id
//  * @desc    Cancel team invitation
//  * @access  Private (Creator or Captain)
//  */
// router.delete('/invitations/:id', auth, invitationIdValidation, teamController.cancelInvitation);

// /**
//  * @route   GET /api/v1/teams/reusable
//  * @desc    Get reusable teams for user (for tournament registration)
//  * @access  Private
//  */
// router.get('/reusable', auth, getReusableTeamsValidation, teamController.getReusableTeams);

// /**
//  * @route   POST /api/v1/teams/:id/register-tournament
//  * @desc    Register reusable team for a tournament
//  * @access  Private (Team member)
//  */
// router.post('/:id/register-tournament', auth, registerTeamForTournamentValidation, teamController.registerTeamForTournament);

// /**
//  * @route   GET /api/v1/teams/:id/tournament-registrations
//  * @desc    Get team's tournament registrations
//  * @access  Private
//  */
// router.get('/:id/tournament-registrations', auth, getTeamValidation, teamController.getTeamTournamentRegistrations);

module.exports = router;

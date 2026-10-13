const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const tournamentParticipantsController = require('../controllers/tournamentParticipantsController');
const customGroupController = require('../controllers/customGroupController');
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { flexibleAuth, optionalFlexibleAuth } = require('../middleware/flexibleAuth');
const {
  createTournamentValidation,
  updateTournamentValidation,
  getTournamentValidation,
  registerValidation,
  withdrawValidation,
  assignSeedsValidation,
  getTournamentsValidation,
  getMatchesValidation,
  getStandingsValidation
} = require('../validators/tournamentValidator');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   GET /api/v1/tournaments
 * @desc    Get all tournaments with filters
 * @access  Public (optionalAuth - shows more if logged in)
 */
router.get('/', auth, getTournamentsValidation, tournamentController.getTournaments);

/**
 * @route   GET /api/v1/tournaments/upcoming
 * @desc    Get upcoming tournaments
 * @access  Public
 */
router.get('/upcoming',auth, tournamentController.getUpcomingTournaments);

/**
 * @route   GET /api/v1/tournaments/ongoing
 * @desc    Get ongoing tournaments
 * @access  Public
 */
router.get('/ongoing',auth, tournamentController.getOngoingTournaments);

/**
 * @route   GET /api/v1/tournaments/:id
 * @desc    Get tournament by ID
 * @access  Public (accepts both player and admin tokens)
 */
router.get('/:id', flexibleAuth, getTournamentValidation, tournamentController.getTournament);

/**
 * @route   GET /api/v1/tournaments/:id/participants
 * @desc    Get tournament participants with full details (players/pairs/teams)
 * @access  Public
 */
router.get('/:id/participants', flexibleAuth, tournamentParticipantsController.getTournamentParticipants);

/**
 * @route   GET /api/v1/tournaments/:id/standings
 * @desc    Get tournament standings (enhanced with comprehensive statistics)
 * @access  Public
 */
router.get('/:id/standings', flexibleAuth, getStandingsValidation, tournamentController.getStandings);

/**
 * @route   GET /api/v1/tournaments/:id/points-table
 * @desc    Get formatted points table for display
 * @access  Public
 */
router.get('/:id/points-table', flexibleAuth, getStandingsValidation, tournamentController.getPointsTable);

/**
 * @route   GET /api/v1/tournaments/:id/matches
 * @desc    Get tournament matches
 * @access  Public
 */
router.get('/:id/matches', flexibleAuth, getMatchesValidation, tournamentController.getMatches);

/**
 * @route   GET /api/v1/tournaments/:id/statistics
 * @desc    Get tournament statistics
 * @access  Public
 */
router.get('/:id/statistics', flexibleAuth, getTournamentValidation, tournamentController.getStatistics);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * @route   POST /api/v1/tournaments
 * @desc    Create new tournament
 * @access  Private (Player, Admin)
 */
router.post('/', auth, createTournamentValidation, tournamentController.createTournament);

/**
 * @route   GET /api/v1/tournaments/my-tournaments
 * @desc    Get user's tournaments (as organizer or participant)
 * @access  Private
 */
router.get('/my/tournaments', auth, tournamentController.getMyTournaments);

/**
 * @route   PUT /api/v1/tournaments/:id
 * @desc    Update tournament
 * @access  Private (Organizer only)
 */
router.put('/:id', auth, updateTournamentValidation, tournamentController.updateTournament);

/**
 * @route   DELETE /api/v1/tournaments/:id
 * @desc    Delete tournament
 * @access  Private (Organizer only)
 */
router.delete('/:id', auth, getTournamentValidation, tournamentController.deleteTournament);

/**
 * @route   POST /api/v1/tournaments/:id/publish
 * @desc    Publish tournament (open for registration)
 * @access  Private (Organizer only)
 */
router.post('/:id/publish', auth, getTournamentValidation, tournamentController.publishTournament);

/**
 * @route   POST /api/v1/tournaments/:id/close-registration
 * @desc    Close tournament registration
 * @access  Private (Organizer only)
 */
router.post('/:id/close-registration', auth, getTournamentValidation, tournamentController.closeRegistration);

/**
 * @route   POST /api/v1/tournaments/:id/assign-seeds
 * @desc    Assign seeds to participants
 * @access  Private (Organizer only)
 */
router.post('/:id/assign-seeds', auth, getTournamentValidation, tournamentController.assignSeeds);

/**
 * @route   POST /api/v1/tournaments/:id/register
 * @desc    Register for tournament
 * @access  Private
 */
router.post('/:id/register', auth, registerValidation, tournamentController.registerForTournament);

/**
 * @route   POST /api/v1/tournaments/:id/withdraw
 * @desc    Withdraw from tournament
 * @access  Private
 */
router.post('/:id/withdraw', auth, withdrawValidation, tournamentController.withdrawFromTournament);

/**
 * @route   POST /api/v1/tournaments/:id/preview-matches
 * @desc    Preview tournament matches before generation
 * @access  Private (Organizer only)
 */
router.post('/:id/preview-matches', auth, getTournamentValidation, tournamentController.previewMatches);

/**
 * @route   POST /api/v1/tournaments/:id/generate-brackets
 * @desc    Generate tournament brackets
 * @access  Private (Organizer only)
 */
router.post('/:id/generate-brackets', auth, getTournamentValidation, tournamentController.generateBrackets);

/**
 * @route   POST /api/v1/tournaments/:id/assign-seeds
 * @desc    Assign seeds to participants
 * @access  Private (Organizer only)
 */
router.post('/:id/assign-seeds', auth, assignSeedsValidation, tournamentController.assignSeeds);

/**
 * @route   GET /api/v1/tournaments/:id/seeds
 * @desc    Get seeded participants for tournament
 * @access  Public
 */
router.get('/:id/seeds', getTournamentValidation, tournamentController.getSeeds);

/**
 * @route   POST /api/v1/tournaments/:id/complete
 * @desc    Complete tournament
 * @access  Private (Organizer only)
 */
router.post('/:id/complete', auth, getTournamentValidation, tournamentController.completeTournament);

/**
 * @route   GET /api/v1/tournaments/:id/eligible-teams
 * @desc    Get eligible teams for tournament registration
 * @access  Private
 */
router.get('/:id/eligible-teams', auth, getTournamentValidation, tournamentController.getEligibleTeams);

/**
 * @route   GET /api/v1/tournaments/:id/eligible-partnerships
 * @desc    Get eligible partnerships for tournament registration
 * @access  Private
 */
router.get('/:id/eligible-partnerships', auth, getTournamentValidation, tournamentController.getEligiblePartnerships);

/**
 * @route   GET /api/v1/tournaments/:id/join-options
 * @desc    Get tournament join options for current user
 * @access  Private
 */
router.get('/:id/join-options', auth, getTournamentValidation, tournamentController.getJoinOptions);

/**
 * @route   GET /api/v1/tournaments/:id/check-team-eligibility/:teamId
 * @desc    Check if a team is eligible to join the tournament
 * @access  Private
 */
router.get('/:id/check-team-eligibility/:teamId', auth, tournamentController.checkTeamEligibility);

/**
 * @route   POST /api/v1/tournaments/:id/finalize-groups
 * @desc    Finalize group stage and advance top 2 to knockout
 * @access  Private (Organizer only)
 */
router.post('/:id/finalize-groups', auth, getTournamentValidation, tournamentController.finalizeGroupStage);

/**
 * @route   GET /api/v1/tournaments/:id/group-stage-status
 * @desc    Check if group stage is complete
 * @access  Private
 */
router.get('/:id/group-stage-status', auth, getTournamentValidation, tournamentController.getGroupStageStatus);

// ============================================
// CUSTOM GROUPS ROUTES (Groups+Knockout Format)
// ============================================

/**
 * @route   POST /api/v1/tournaments/:id/custom-groups
 * @desc    Create custom groups for tournament
 * @access  Private (Organizer only)
 */
router.post('/:id/custom-groups', auth, getTournamentValidation, customGroupController.createCustomGroups);

/**
 * @route   GET /api/v1/tournaments/:id/custom-groups
 * @desc    Get custom groups with participants
 * @access  Private
 */
router.get('/:id/custom-groups', auth, getTournamentValidation, customGroupController.getCustomGroups);

/**
 * @route   PUT /api/v1/tournaments/:id/custom-groups
 * @desc    Update custom groups (delete and recreate)
 * @access  Private (Organizer only)
 */
router.put('/:id/custom-groups', auth, getTournamentValidation, customGroupController.updateCustomGroups);

/**
 * @route   DELETE /api/v1/tournaments/:id/custom-groups
 * @desc    Delete custom groups
 * @access  Private (Organizer only)
 */
router.delete('/:id/custom-groups', auth, getTournamentValidation, customGroupController.deleteCustomGroups);

/**
 * @route   POST /api/v1/tournaments/:id/custom-groups/assign
 * @desc    Assign participants to custom groups
 * @access  Private (Organizer only)
 */
router.post('/:id/custom-groups/assign', auth, getTournamentValidation, customGroupController.assignParticipants);

/**
 * @route   GET /api/v1/tournaments/:id/custom-groups/validate
 * @desc    Validate group assignments
 * @access  Private
 */
router.get('/:id/custom-groups/validate', auth, getTournamentValidation, customGroupController.validateAssignments);

/**
 * @route   GET /api/v1/tournaments/:id/custom-groups/unassigned
 * @desc    Get unassigned participants
 * @access  Private
 */
router.get('/:id/custom-groups/unassigned', auth, getTournamentValidation, customGroupController.getUnassignedParticipants);

/**
 * @route   POST /api/v1/tournaments/:id/custom-groups/fix-duplicates
 * @desc    Fix duplicate group assignments (removes duplicates, keeps first assignment)
 * @access  Private (Organizer only)
 */
router.post('/:id/custom-groups/fix-duplicates', auth, getTournamentValidation, customGroupController.fixDuplicates);

/**
 * @route   POST /api/v1/tournaments/:id/recalculate-positions
 * @desc    Recalculate tournament standings positions (for fixing existing tournaments)
 * @access  Private (Organizer only)
 */
router.post('/:id/recalculate-positions', auth, getTournamentValidation, tournamentController.recalculatePositions);

module.exports = router;

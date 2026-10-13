const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { auth } = require('../middleware/auth');
const {
  createMatchValidation,
  updateMatchValidation,
  getMatchValidation,
  completeMatchValidation,
  cancelMatchValidation,
  postponeMatchValidation,
  assignRefereeValidation,
  walkoverValidation,
  getMatchesValidation,
  tournamentIdValidation
} = require('../validators/matchValidator');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   GET /api/v1/matches
 * @desc    Get all matches with filters
 * @access  Public
 */
router.get('/', getMatchesValidation, matchController.getMatches);

/**
 * @route   GET /api/v1/matches/upcoming
 * @desc    Get upcoming matches
 * @access  Public
 */
router.get('/upcoming', matchController.getUpcomingMatches);

/**
 * @route   GET /api/v1/matches/live
 * @desc    Get live matches
 * @access  Public
 */
router.get('/live', matchController.getLiveMatches);

/**
 * @route   GET /api/v1/matches/dashboard/live
 * @desc    Get live matches for dashboard (with live_score and participant names)
 * @access  Public
 */
router.get('/dashboard/live', matchController.getLiveMatchesForDashboard);

/**
 * @route   GET /api/v1/matches/tournament/:tournamentId
 * @desc    Get matches for a specific tournament
 * @access  Public
 */
router.get('/tournament/:tournamentId', tournamentIdValidation, matchController.getTournamentMatches);

/**
 * @route   GET /api/v1/matches/tournament/:tournamentId/participant/:participantId
 * @desc    Get all matches for a specific participant in a tournament
 * @access  Public
 */
router.get('/tournament/:tournamentId/participant/:participantId', matchController.getParticipantMatches);

/**
 * @route   GET /api/v1/matches/:id/details
 * @desc    Get match details with full participant info
 * @access  Private
 */
router.get('/:id/details', auth, matchController.getMatchDetailsController);

/**
 * @route   GET /api/v1/matches/:id
 * @desc    Get match by ID
 * @access  Private
 */
router.get('/:id', auth, matchController.getMatch);

/**
 * @route   GET /api/v1/matches/:id/statistics
 * @desc    Get match statistics
 * @access  Public
 */
router.get('/:id/statistics', getMatchValidation, matchController.getStatistics);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * @route   POST /api/v1/matches
 * @desc    Create new match
 * @access  Private (Organizer only)
 */
router.post('/', auth, createMatchValidation, matchController.createMatch);

/**
 * @route   GET /api/v1/matches/my/matches
 * @desc    Get user's matches
 * @access  Private
 */
router.get('/my/matches', auth, matchController.getMyMatches);

/**
 * @route   GET /api/v1/matches/my/completed
 * @desc    Get user's completed matches
 * @access  Private
 */
router.get('/my/completed', auth, matchController.getMyCompletedMatches);

/**
 * @route   GET /api/v1/matches/my/referee-matches
 * @desc    Get matches where user is referee
 * @access  Private
 */
router.get('/my/referee-matches', auth, matchController.getMyRefereeMatches);

/**
 * @route   PUT /api/v1/matches/:id
 * @desc    Update match
 * @access  Private (Organizer only)
 */
router.put('/:id', auth, updateMatchValidation, matchController.updateMatch);

/**
 * @route   DELETE /api/v1/matches/:id
 * @desc    Delete match
 * @access  Private (Organizer only)
 */
router.delete('/:id', auth, getMatchValidation, matchController.deleteMatch);

/**
 * @route   POST /api/v1/matches/:id/check-in
 * @desc    Check-in for match
 * @access  Private (Participant only)
 */
router.post('/:id/check-in', auth, getMatchValidation, matchController.checkIn);

/**
 * @route   POST /api/v1/matches/:id/start
 * @desc    Start match
 * @access  Private (Organizer or Referee)
 */
router.post('/:id/start', auth, getMatchValidation, matchController.startMatch);

/**
 * @route   POST /api/v1/matches/:id/complete
 * @desc    Complete match
 * @access  Private (Organizer or Referee)
 */
router.post('/:id/complete', auth, completeMatchValidation, matchController.completeMatch);

/**
 * @route   POST /api/v1/matches/:id/cancel
 * @desc    Cancel match
 * @access  Private (Organizer only)
 */
router.post('/:id/cancel', auth, cancelMatchValidation, matchController.cancelMatch);

/**
 * @route   POST /api/v1/matches/:id/postpone
 * @desc    Postpone match
 * @access  Private (Organizer only)
 */
router.post('/:id/postpone', auth, postponeMatchValidation, matchController.postponeMatch);

/**
 * @route   POST /api/v1/matches/:id/assign-referee
 * @desc    Assign referee to match
 * @access  Private (Organizer only)
 */
router.post('/:id/assign-referee', auth, assignRefereeValidation, matchController.assignReferee);

/**
 * @route   POST /api/v1/matches/:id/verify
 * @desc    Verify match result
 * @access  Private (Organizer only)
 */
router.post('/:id/verify', auth, getMatchValidation, matchController.verifyResult);

/**
 * @route   POST /api/v1/matches/:id/walkover
 * @desc    Record walkover
 * @access  Private (Organizer or Referee)
 */
router.post('/:id/walkover', auth, walkoverValidation, matchController.recordWalkover);

/**
 * @route   GET /api/v1/matches/:id/available-participants
 * @desc    Get available participants for match (locked participants in tournament)
 * @access  Private (Organizer only)
 */
router.get('/:id/available-participants', auth, getMatchValidation, matchController.getAvailableParticipants);

/**
 * @route   PUT /api/v1/matches/:id/participants
 * @desc    Update match participants
 * @access  Private (Organizer only)
 */
router.put('/:id/participants', auth, getMatchValidation, matchController.updateMatchParticipants);

/**
 * @route   POST /api/v1/matches/:id/rematch
 * @desc    Create a rematch (duplicate match with reset scores) - Only for standalone matches
 * @access  Private (Referee)
 */
router.post('/:id/rematch', auth, matchController.createRematch);

/**
 * @route   POST /api/v1/matches/:id/reset
 * @desc    Reset match - Clear all scores, events, and timings
 * @access  Private (Organizer or Referee)
 */
router.post('/:id/reset', auth, getMatchValidation, matchController.resetMatch);

module.exports = router;

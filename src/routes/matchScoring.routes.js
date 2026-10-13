/**
 * Match Scoring Routes
 * API endpoints for live match scoring
 */

const router = require('express').Router();
const { auth, authorizeReferee } = require('../middleware/auth');
const matchScoringController = require('../controllers/matchScoringController');

// =====================================================
// MATCH CONTROL ENDPOINTS
// =====================================================

/**
 * @route   POST /api/v1/matches/:id/start
 * @desc    Start a match (referee only)
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/start', auth, authorizeReferee, matchScoringController.startMatch);

/**
 * @route   POST /api/v1/matches/:id/pause
 * @desc    Pause a match (referee only)
 * @access  Private (Referee)
 * @body    { reason?: string }
 */
router.post('/:id/pause', auth, authorizeReferee, matchScoringController.pauseMatch);

/**
 * @route   POST /api/v1/matches/:id/resume
 * @desc    Resume a paused match (referee only)
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/resume', auth, authorizeReferee, matchScoringController.resumeMatch);

/**
 * @route   POST /api/v1/matches/:id/end
 * @desc    End a match (referee only)
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/end', auth, authorizeReferee, matchScoringController.endMatch);

/**
 * @route   POST /api/v1/matches/:id/end-half
 * @desc    End current half (1st or 2nd) - Manual control
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/end-half', auth, authorizeReferee, matchScoringController.endHalf);

/**
 * @route   POST /api/v1/matches/:id/start-break
 * @desc    Start break period - Manual control
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/start-break', auth, authorizeReferee, matchScoringController.startBreak);

/**
 * @route   POST /api/v1/matches/:id/end-break
 * @desc    End break period - Manual control
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/end-break', auth, authorizeReferee, matchScoringController.endBreak);

/**
 * @route   POST /api/v1/matches/:id/start-second-half
 * @desc    Start second half - Manual control
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/start-second-half', auth, authorizeReferee, matchScoringController.startSecondHalf);

/**
 * @route   POST /api/v1/matches/:id/declare-draw
 * @desc    Declare match as draw (after 2nd half ends with equal score)
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/declare-draw', auth, authorizeReferee, matchScoringController.declareMatchDraw);

/**
 * @route   POST /api/v1/matches/:id/start-extra-time
 * @desc    Start extra time (after 2nd half ends with equal score)
 * @access  Private (Referee)
 * @body    { extraTimeMinutes: number }
 */
router.post('/:id/start-extra-time', auth, authorizeReferee, matchScoringController.startExtraTime);

/**
 * @route   POST /api/v1/matches/:id/start-penalty-shootout
 * @desc    Start penalty shootout (after 2nd half or extra time ends with equal score)
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/start-penalty-shootout', auth, authorizeReferee, matchScoringController.startPenaltyShootout);

// =====================================================
// EXTRA TIME ENDPOINTS (NEW)
// =====================================================

/**
 * @route   POST /api/v1/matches/:id/extra-time/initialize
 * @desc    Initialize extra time with user-provided configuration
 * @access  Private (Referee)
 * @body    {
 *   half_duration: number (minutes, e.g., 15),
 *   break_duration: number (minutes, e.g., 5)
 * }
 */
router.post('/:id/extra-time/initialize', auth, authorizeReferee, matchScoringController.initializeExtraTime);

/**
 * @route   POST /api/v1/matches/:id/extra-time/start-first-half
 * @desc    Start Extra Time 1st Half
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/extra-time/start-first-half', auth, authorizeReferee, matchScoringController.startExtraTimeFirstHalf);

/**
 * @route   POST /api/v1/matches/:id/extra-time/end-first-half
 * @desc    End Extra Time 1st Half
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/extra-time/end-first-half', auth, authorizeReferee, matchScoringController.endExtraTimeFirstHalf);

/**
 * @route   POST /api/v1/matches/:id/extra-time/start-break
 * @desc    Start Extra Time Break
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/extra-time/start-break', auth, authorizeReferee, matchScoringController.startExtraTimeBreak);

/**
 * @route   POST /api/v1/matches/:id/extra-time/start-second-half
 * @desc    Start Extra Time 2nd Half
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/extra-time/start-second-half', auth, authorizeReferee, matchScoringController.startExtraTimeSecondHalf);

/**
 * @route   POST /api/v1/matches/:id/extra-time/end-second-half
 * @desc    End Extra Time 2nd Half
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/extra-time/end-second-half', auth, authorizeReferee, matchScoringController.endExtraTimeSecondHalf);

// =====================================================
// SCORING ENDPOINTS
// =====================================================

/**
 * @route   POST /api/v1/matches/:id/score/point
 * @desc    Add a point to a participant (referee only)
 * @access  Private (Referee)
 * @body    {
 *   participant_side: 'participant1' | 'participant2' (required),
 *   event_type?: 'point' | 'goal' | 'ace' | 'fault' | 'double_fault' (default: 'point'),
 *   player_id?: number (for teams/doubles)
 * }
 */
router.post('/:id/score/point', auth, authorizeReferee, matchScoringController.addPoint);

/**
 * @route   POST /api/v1/matches/:id/score/confirm-end
 * @desc    Confirm or decline match end (for Badminton, Tennis, etc.)
 * @access  Private (Referee)
 * @body    {
 *   confirmed: boolean (true to complete match, false to undo last point)
 * }
 */
router.post('/:id/score/confirm-end', auth, authorizeReferee, matchScoringController.confirmMatchEnd);

/**
 * @route   POST /api/v1/matches/:id/score/goal
 * @desc    Add a goal (Football-specific, referee only)
 * @access  Private (Referee)
 * @body    {
 *   participant_side: 'participant1' | 'participant2' (required),
 *   player_id: number (required),
 *   minute: number (required),
 *   goal_type?: 'open_play' | 'penalty' | 'free_kick' | 'header' | 'own_goal' (default: 'open_play'),
 *   assist_player_id?: number (optional)
 * }
 */
router.post('/:id/score/goal', auth, authorizeReferee, matchScoringController.addGoal);

/**
 * @route   POST /api/v1/matches/:id/score/yellow-card
 * @desc    Add a yellow card (Football-specific, referee only)
 * @access  Private (Referee)
 * @body    {
 *   participant_side: 'participant1' | 'participant2' (required),
 *   player_id: number (required),
 *   minute: number (required),
 *   reason?: string (optional)
 * }
 */
router.post('/:id/score/yellow-card', auth, authorizeReferee, matchScoringController.addYellowCard);

/**
 * @route   POST /api/v1/matches/:id/score/red-card
 * @desc    Add a red card (Football-specific, referee only)
 * @access  Private (Referee)
 * @body    {
 *   participant_side: 'participant1' | 'participant2' (required),
 *   player_id: number (required),
 *   minute: number (required),
 *   reason?: string (optional)
 * }
 */
router.post('/:id/score/red-card', auth, authorizeReferee, matchScoringController.addRedCard);

/**
 * @route   POST /api/v1/matches/:id/score/undo
 * @desc    Undo the last point (referee only)
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/score/undo', auth, authorizeReferee, matchScoringController.undoLastPoint);

/**
 * @route   POST /api/v1/matches/:id/score/toggle-server
 * @desc    Toggle/switch the serving player (racket sports, referee only)
 * @access  Private (Referee)
 * @body    none
 */
router.post('/:id/score/toggle-server', auth, authorizeReferee, matchScoringController.toggleServer);

// =====================================================
// EVENT ENDPOINTS
// =====================================================

/**
 * @route   POST /api/v1/matches/:id/events
 * @desc    Record an event (timeout, card, injury, etc.)
 * @access  Private (Referee)
 * @body    {
 *   event_type: 'timeout' | 'yellow_card' | 'red_card' | 'injury' | 'substitution' | 'challenge' (required),
 *   participant_side: 'participant1' | 'participant2' (required),
 *   player_id?: number,
 *   notes?: string,
 *   score_snapshot?: object
 * }
 */
router.post('/:id/events', auth, authorizeReferee, matchScoringController.recordEvent);

/**
 * @route   GET /api/v1/matches/:id/events
 * @desc    Get all events for a match
 * @access  Private
 * @query   { limit?: number (default: 50) }
 */
router.get('/:id/events', auth, matchScoringController.getMatchEvents);

/**
 * @route   DELETE /api/v1/matches/:id/events/:eventId
 * @desc    Delete an event (referee only)
 * @access  Private (Referee)
 * @body    none
 */
router.delete('/:id/events/:eventId', auth, authorizeReferee, matchScoringController.deleteEvent);

// =====================================================
// LIVE DATA ENDPOINTS
// =====================================================

/**
 * @route   GET /api/v1/matches/:id/live-score
 * @desc    Get current live score
 * @access  Private
 */
router.get('/:id/live-score', auth, matchScoringController.getLiveScore);

/**
 * @route   GET /api/v1/matches/:id/score-details
 * @desc    Get detailed set-by-set/period-by-period scores
 * @access  Private
 */
router.get('/:id/score-details', auth, matchScoringController.getScoreDetails);

/**
 * @route   POST /api/v1/matches/:id/timer
 * @desc    Update match timer (for time-based sports like Football)
 * @access  Private (Referee)
 * @body    {
 *   elapsed_seconds: number (required),
 *   current_half: number (required)
 * }
 */
router.post('/:id/timer', auth, authorizeReferee, matchScoringController.updateMatchTimer);

/**
 * @route   POST /api/v1/matches/:id/additional-time
 * @desc    Add additional time (injury time) to current half
 * @access  Private (Referee)
 * @body    {
 *   half: number (required),
 *   additional_seconds: number (required)
 * }
 */
router.post('/:id/additional-time', auth, authorizeReferee, matchScoringController.addAdditionalTime);

// =====================================================
// PENALTY SHOOTOUT ENDPOINTS
// =====================================================

/**
 * @route   POST /api/v1/matches/:id/penalty-kick
 * @desc    Record penalty kick result (Penalty Shootout)
 * @access  Private (Referee)
 * @body    {
 *   participant_side: 'participant1' | 'participant2' (required),
 *   player_id: number (required),
 *   result: 'scored' | 'missed' | 'saved' (required)
 * }
 */
router.post('/:id/penalty-kick', auth, authorizeReferee, matchScoringController.recordPenaltyKick);

module.exports = router;

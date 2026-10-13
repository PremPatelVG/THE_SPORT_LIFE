const express = require('express');
const router = express.Router();
const matchTimingController = require('../controllers/matchTimingController');
const { auth } = require('../middleware/auth');

/**
 * Match Timing Routes
 * These are NEW routes that don't affect existing match routes
 * All routes require authentication
 */

/**
 * @route   POST /api/v1/matches/:id/timing/start
 * @desc    Start match timing (record actual start time)
 * @access  Private (Referee/Organizer)
 */
router.post('/:id/timing/start', auth, matchTimingController.startMatchTiming);

/**
 * @route   POST /api/v1/matches/:id/timing/end
 * @desc    End match timing (record actual end time and calculate duration)
 * @access  Private (Referee/Organizer)
 */
router.post('/:id/timing/end', auth, matchTimingController.endMatchTiming);

/**
 * @route   GET /api/v1/matches/:id/timing
 * @desc    Get match timing summary (overall + segments)
 * @access  Private
 */
router.get('/:id/timing', auth, matchTimingController.getMatchTimingSummary);

/**
 * @route   GET /api/v1/matches/:id/timing/events
 * @desc    Get match timing events (audit trail)
 * @access  Private
 */
router.get('/:id/timing/events', auth, matchTimingController.getMatchTimingEvents);

/**
 * @route   POST /api/v1/matches/:id/segments/start
 * @desc    Start a segment (set/game/half)
 * @access  Private (Referee/Organizer)
 * @body    { segment_type: 'set'|'game'|'half', segment_number: 1 }
 */
router.post('/:id/segments/start', auth, matchTimingController.startSegment);

/**
 * @route   POST /api/v1/matches/:id/segments/end
 * @desc    End a segment (set/game/half)
 * @access  Private (Referee/Organizer)
 * @body    { segment_type: 'set'|'game'|'half', segment_number: 1 }
 */
router.post('/:id/segments/end', auth, matchTimingController.endSegment);

/**
 * @route   GET /api/v1/matches/:id/segments/:type/:number
 * @desc    Get specific segment timing
 * @access  Private
 * @params  type: 'set'|'game'|'half', number: segment number
 */
router.get('/:id/segments/:type/:number', auth, matchTimingController.getSegmentTiming);

/**
 * @route   POST /api/v1/matches/:id/segments/injury-time
 * @desc    Add injury/additional time to a segment (mainly for football)
 * @access  Private (Referee/Organizer)
 * @body    { segment_type: 'half', segment_number: 1, additional_minutes: 2.5 }
 */
router.post('/:id/segments/injury-time', auth, matchTimingController.addInjuryTime);

/**
 * @route   POST /api/v1/matches/:id/segments/pause
 * @desc    Pause a segment (for future use - timeouts, medical breaks)
 * @access  Private (Referee/Organizer)
 * @body    { segment_type: 'set', segment_number: 1, notes: 'Medical timeout' }
 */
router.post('/:id/segments/pause', auth, matchTimingController.pauseSegment);

/**
 * @route   POST /api/v1/matches/:id/segments/resume
 * @desc    Resume a paused segment
 * @access  Private (Referee/Organizer)
 * @body    { segment_type: 'set', segment_number: 1 }
 */
router.post('/:id/segments/resume', auth, matchTimingController.resumeSegment);

module.exports = router;

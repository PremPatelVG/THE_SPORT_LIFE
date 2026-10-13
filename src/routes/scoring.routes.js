const express = require('express');
const router = express.Router();
const scoringController = require('../controllers/scoringController');
const { auth } = require('../middleware/auth');

// Start match
router.post('/:matchId/start', auth, scoringController.startMatch);

// Record event
router.post('/:matchId/events', auth, scoringController.recordEvent);

// Get live state
router.get('/:matchId/live', scoringController.getLiveState);

// Get timeline
router.get('/:matchId/timeline', scoringController.getTimeline);

// Get statistics
router.get('/:matchId/statistics', scoringController.getStatistics);

// Complete match
router.post('/:matchId/complete', auth, scoringController.completeMatch);

// Undo last event
router.post('/:matchId/undo', auth, scoringController.undoLastEvent);

// Pause match
router.post('/:matchId/pause', auth, scoringController.pauseMatch);

// Resume match
router.post('/:matchId/resume', auth, scoringController.resumeMatch);

// Get all live matches
router.get('/live', scoringController.getAllLive);

module.exports = router;

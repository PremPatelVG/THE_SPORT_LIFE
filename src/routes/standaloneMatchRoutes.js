const express = require('express');
const router = express.Router();
const standaloneMatchController = require('../controllers/standaloneMatchController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

/**
 * @route POST /api/v1/standalone-matches
 * @desc Create standalone match
 * @access Private
 */
router.post('/', standaloneMatchController.createMatch);

/**
 * @route GET /api/v1/standalone-matches/available-pairs/:sportId
 * @desc Get available pairs for a sport
 * @access Private
 */
router.get('/available-pairs/:sportId', standaloneMatchController.getAvailablePairs);

/**
 * @route GET /api/v1/standalone-matches/available-teams/:sportId
 * @desc Get available teams for a sport
 * @access Private
 */
router.get('/available-teams/:sportId', standaloneMatchController.getAvailableTeams);

/**
 * @route POST /api/v1/standalone-matches/quick-team
 * @desc Create a quick team for standalone match
 * @access Private
 */
router.post('/quick-team', standaloneMatchController.createQuickTeam);

/**
 * @route POST /api/v1/standalone-matches/quick-pair
 * @desc Create a quick pair for standalone match
 * @access Private
 */
router.post('/quick-pair', standaloneMatchController.createQuickPair);

/**
 * @route GET /api/v1/standalone-matches/my-matches
 * @desc Get user's standalone matches
 * @access Private
 */
router.get('/my-matches', standaloneMatchController.getMyMatches);

/**
 * @route DELETE /api/v1/standalone-matches/:id
 * @desc Delete standalone match
 * @access Private
 */
router.delete('/:id', standaloneMatchController.deleteMatch);

module.exports = router;

const express = require('express');
const router = express.Router();
const matchSquadController = require('../controllers/matchSquadController');
const { auth } = require('../middleware/auth');

/**
 * @route   GET /api/v1/matches/:matchId/squads/status
 * @desc    Check if squads are set for both teams
 * @access  Private
 */
router.get('/:matchId/squads/status', auth, matchSquadController.checkSquadsStatus);

/**
 * @route   GET /api/v1/matches/:matchId/squads/:teamId/members
 * @desc    Get team members for squad selection
 * @access  Private (Referee or Organizer)
 */
router.get('/:matchId/squads/:teamId/members', auth, matchSquadController.getTeamMembersForSquad);

/**
 * @route   GET /api/v1/matches/:matchId/squads
 * @desc    Get all squads for a match (both teams)
 * @access  Private
 */
router.get('/:matchId/squads', auth, matchSquadController.getMatchSquads);

/**
 * @route   POST /api/v1/matches/:matchId/squads/:teamId
 * @desc    Save match squad for a team
 * @access  Private (Referee or Organizer)
 */
router.post('/:matchId/squads/:teamId', auth, matchSquadController.saveMatchSquad);

module.exports = router;

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getAvailablePlayers,
  createTeam,
  getTeams,
  updateTeam,
  addTeamMember,
  addTeamMembersBulk,
  removeTeamMember,
  setTeamCaptain,
  lockTeam,
  unlockTeam,
  deleteTeam,
  bulkLockTeams,
  bulkUnlockTeams
} = require('../controllers/teamManagementController');

const {
  createPair,
  getPairs,
  lockPair,
  unlockPair,
  deletePair,
  updatePair,
  bulkLockPairs,
  bulkUnlockPairs
} = require('../controllers/pairManagementController');

/**
 * TEAM MANAGEMENT ROUTES
 * All routes require authentication and organizer permission
 */

/**
 * @route   GET /api/v1/tournaments/:tournamentId/available-players
 * @desc    Get available locked players for team/pair assignment
 * @access  Private (Organizer only)
 */
router.get('/tournaments/:tournamentId/available-players', auth, getAvailablePlayers);

/**
 * @route   POST /api/v1/tournaments/:tournamentId/teams
 * @desc    Create a new team
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/teams', auth, createTeam);

/**
 * @route   GET /api/v1/tournaments/:tournamentId/teams
 * @desc    Get all teams for a tournament
 * @access  Private (Organizer only)
 */
router.get('/tournaments/:tournamentId/teams', auth, getTeams);

/**
 * @route   POST /api/v1/teams/:teamId/members/bulk
 * @desc    Add multiple players to team (bulk operation)
 * @access  Private (Organizer only)
 */
router.post('/teams/:teamId/members/bulk', auth, addTeamMembersBulk);

/**
 * @route   POST /api/v1/teams/:teamId/members
 * @desc    Add player to team
 * @access  Private (Organizer only)
 */
router.post('/teams/:teamId/members', auth, addTeamMember);

/**
 * @route   DELETE /api/v1/teams/:teamId/members/:userId
 * @desc    Remove player from team
 * @access  Private (Organizer only)
 */
router.delete('/teams/:teamId/members/:userId', auth, removeTeamMember);

/**
 * @route   PUT /api/v1/teams/:teamId/captain/:userId
 * @desc    Set team captain
 * @access  Private (Organizer only)
 */
router.put('/teams/:teamId/captain/:userId', auth, setTeamCaptain);

/**
 * @route   PUT /api/v1/teams/:teamId/lock
 * @desc    Lock team (finalize)
 * @access  Private (Organizer only)
 */
router.put('/teams/:teamId/lock', auth, lockTeam);

/**
 * @route   PUT /api/v1/teams/:teamId/unlock
 * @desc    Unlock team
 * @access  Private (Organizer only)
 */
router.put('/teams/:teamId/unlock', auth, unlockTeam);

/**
 * @route   POST /api/v1/tournaments/:tournamentId/teams/bulk-lock
 * @desc    Bulk lock multiple teams
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/teams/bulk-lock', auth, bulkLockTeams);

/**
 * @route   POST /api/v1/tournaments/:tournamentId/teams/bulk-unlock
 * @desc    Bulk unlock multiple teams
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/teams/bulk-unlock', auth, bulkUnlockTeams);

/**
 * @route   PUT /api/v1/teams/:teamId
 * @desc    Update team details (name, description, logo, max_players)
 * @access  Private (Organizer only)
 */
router.put('/teams/:teamId', auth, updateTeam);

/**
 * @route   DELETE /api/v1/teams/:teamId
 * @desc    Delete team (hard delete - permanently removes from database)
 * @access  Private (Organizer only)
 */
router.delete('/teams/:teamId', auth, deleteTeam);

/**
 * PAIR MANAGEMENT ROUTES (For DOUBLES tournaments)
 */

/**
 * @route   POST /api/v1/tournaments/:tournamentId/pairs
 * @desc    Create a new pair
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/pairs', auth, createPair);

/**
 * @route   GET /api/v1/tournaments/:tournamentId/pairs
 * @desc    Get all pairs for a tournament
 * @access  Private (Organizer only)
 */
router.get('/tournaments/:tournamentId/pairs', auth, getPairs);

/**
 * @route   PUT /api/v1/pairs/:pairId
 * @desc    Update pair name
 * @access  Private (Organizer only)
 */
router.put('/pairs/:pairId', auth, updatePair);

/**
 * @route   PUT /api/v1/pairs/:pairId/lock
 * @desc    Lock pair (finalize)
 * @access  Private (Organizer only)
 */
router.put('/pairs/:pairId/lock', auth, lockPair);

/**
 * @route   PUT /api/v1/pairs/:pairId/unlock
 * @desc    Unlock pair
 * @access  Private (Organizer only)
 */
router.put('/pairs/:pairId/unlock', auth, unlockPair);

/**
 * @route   POST /api/v1/tournaments/:tournamentId/pairs/bulk-lock
 * @desc    Bulk lock multiple pairs
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/pairs/bulk-lock', auth, bulkLockPairs);

/**
 * @route   POST /api/v1/tournaments/:tournamentId/pairs/bulk-unlock
 * @desc    Bulk unlock multiple pairs
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/pairs/bulk-unlock', auth, bulkUnlockPairs);

/**
 * @route   DELETE /api/v1/pairs/:pairId
 * @desc    Delete pair
 * @access  Private (Organizer only)
 */
router.delete('/pairs/:pairId', auth, deletePair);

module.exports = router;

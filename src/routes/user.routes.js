const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getAllUsers, searchUsers, getAvailableUsersForTournament, getUserProfile } = require('../controllers/userController');
const { getPlayerStatistics } = require('../controllers/playerStatisticsController');

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (with optional role filter)
 * @access  Private
 */
router.get('/', auth, getAllUsers);

/**
 * @route   GET /api/v1/users/:userId/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/:userId/profile', auth, getUserProfile);

/**
 * @route   GET /api/v1/users/:userId/statistics
 * @desc    Get player statistics
 * @access  Private
 */
router.get('/:userId/statistics', auth, getPlayerStatistics);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users by name or email
 * @access  Private
 */
router.get('/search', auth, searchUsers);

/**
 * @route   GET /api/v1/users/tournament/:tournamentId/available
 * @desc    Get all system users available for tournament invitation (excluding already invited)
 * @access  Private
 */
router.get('/tournament/:tournamentId/available', auth, getAvailableUsersForTournament);

module.exports = router;

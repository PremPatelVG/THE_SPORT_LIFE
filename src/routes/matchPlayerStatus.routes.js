/**
 * Match Player Status Routes
 * API endpoints for managing player status during matches
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const matchPlayerStatusService = require('../services/matchPlayerStatusService');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/matches/:matchId/player-status/:teamId/playing
 * @desc    Get playing players for a team
 * @access  Private
 */
router.get('/:matchId/player-status/:teamId/playing', auth, async (req, res) => {
  try {
    const { matchId, teamId } = req.params;
    
    const players = await matchPlayerStatusService.getPlayingPlayers(matchId, teamId);
    
    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    logger.error('Get playing players error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get playing players'
    });
  }
});

/**
 * @route   GET /api/v1/matches/:matchId/player-status/:teamId/substitutes
 * @desc    Get substitute players for a team
 * @access  Private
 */
router.get('/:matchId/player-status/:teamId/substitutes', auth, async (req, res) => {
  try {
    const { matchId, teamId } = req.params;
    
    const players = await matchPlayerStatusService.getSubstitutePlayers(matchId, teamId);
    
    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    logger.error('Get substitute players error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get substitute players'
    });
  }
});

/**
 * @route   GET /api/v1/matches/:matchId/player-status/:teamId/all
 * @desc    Get all players for a team (playing + substitutes)
 * @access  Private
 */
router.get('/:matchId/player-status/:teamId/all', auth, async (req, res) => {
  try {
    const { matchId, teamId } = req.params;
    
    const players = await matchPlayerStatusService.getAllPlayers(matchId, teamId);
    
    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    logger.error('Get all players error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get players'
    });
  }
});

module.exports = router;

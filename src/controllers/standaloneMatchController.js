const standaloneMatchService = require('../services/standaloneMatchService');
const quickPairService = require('../services/quickPairService');
const quickTeamService = require('../services/quickTeamService');
const logger = require('../utils/logger');

/**
 * Create standalone match
 * POST /api/v1/standalone-matches
 */
const createMatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const matchData = req.body;

    const result = await standaloneMatchService.createStandaloneMatch(userId, matchData);

    res.status(201).json({
      success: true,
      message: 'Standalone match created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Create standalone match error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available pairs for sport
 * GET /api/v1/standalone-matches/available-pairs/:sportId
 */
const getAvailablePairs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sportId } = req.params;

    const pairs = await quickPairService.getAvailablePairs(sportId, userId);

    res.json({
      success: true,
      data: pairs
    });
  } catch (error) {
    logger.error('Get available pairs error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available teams for sport
 * GET /api/v1/standalone-matches/available-teams/:sportId
 */
const getAvailableTeams = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sportId } = req.params;

    const teams = await quickTeamService.getAvailableTeams(sportId, userId);

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error('Get available teams error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get my standalone matches
 * GET /api/v1/standalone-matches/my-matches
 */
const getMyMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
      limit: req.query.limit
    };

    const matches = await standaloneMatchService.getUserStandaloneMatches(userId, filters);

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get my standalone matches error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create quick team
 * POST /api/v1/standalone-matches/quick-team
 */
const createQuickTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamData = req.body;

    const teamId = await quickTeamService.quickCreateTeam(userId, teamData);

    // Fetch the created team details
    const [team] = await require('../config/database').query(
      `SELECT 
        t.id,
        t.name,
        t.sport_id,
        t.captain_id,
        t.max_players,
        COUNT(tm.id) as current_size
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.id = ?
      GROUP BY t.id`,
      [teamId]
    );

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    logger.error('Create quick team error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create quick pair
 * POST /api/v1/standalone-matches/quick-pair
 */
const createQuickPair = async (req, res) => {
  try {
    const userId = req.user.id;
    const pairData = req.body;

    const pairId = await quickPairService.quickCreatePair(userId, pairData);

    // Fetch the created pair details
    const [pair] = await require('../config/database').query(
      `SELECT 
        p.id,
        p.name,
        p.sport_id,
        p.player1_id,
        p.player2_id,
        u1.first_name as player1_first_name,
        u1.last_name as player1_last_name,
        u2.first_name as player2_first_name,
        u2.last_name as player2_last_name
      FROM pairs p
      JOIN users u1 ON p.player1_id = u1.id
      JOIN users u2 ON p.player2_id = u2.id
      WHERE p.id = ?`,
      [pairId]
    );

    res.status(201).json({
      success: true,
      message: 'Pair created successfully',
      data: pair
    });
  } catch (error) {
    logger.error('Create quick pair error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete standalone match
 * DELETE /api/v1/standalone-matches/:id
 */
const deleteMatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await standaloneMatchService.deleteStandaloneMatch(id, userId);

    res.json({
      success: true,
      message: 'Standalone match deleted successfully'
    });
  } catch (error) {
    logger.error('Delete standalone match error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createMatch,
  getAvailablePairs,
  getAvailableTeams,
  createQuickTeam,
  createQuickPair,
  getMyMatches,
  deleteMatch
};

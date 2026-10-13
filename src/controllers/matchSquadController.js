const matchSquadService = require('../services/matchSquadService');
const logger = require('../utils/logger');

/**
 * Get team members for squad selection
 * GET /api/v1/matches/:matchId/squads/:teamId/members
 */
const getTeamMembersForSquad = async (req, res) => {
  try {
    const { matchId, teamId } = req.params;
    const userId = req.user.id;

    const result = await matchSquadService.getTeamMembersForSquad(
      parseInt(matchId),
      parseInt(teamId),
      userId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get team members for squad error:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Save match squad
 * POST /api/v1/matches/:matchId/squads/:teamId
 */
const saveMatchSquad = async (req, res) => {
  try {
    const { matchId, teamId } = req.params;
    const { squad_members } = req.body;
    const userId = req.user.id;

    if (!squad_members || !Array.isArray(squad_members)) {
      return res.status(400).json({
        success: false,
        error: 'squad_members array is required'
      });
    }

    const result = await matchSquadService.saveMatchSquad(
      parseInt(matchId),
      parseInt(teamId),
      squad_members,
      userId
    );

    res.json(result);
  } catch (error) {
    logger.error('Save match squad error:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get match squads (both teams)
 * GET /api/v1/matches/:matchId/squads
 */
const getMatchSquads = async (req, res) => {
  try {
    const { matchId } = req.params;

    const result = await matchSquadService.getMatchSquads(parseInt(matchId));

    res.json(result);
  } catch (error) {
    logger.error('Get match squads error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check squads status
 * GET /api/v1/matches/:matchId/squads/status
 */
const checkSquadsStatus = async (req, res) => {
  try {
    const { matchId } = req.params;

    const status = await matchSquadService.checkSquadsStatus(parseInt(matchId));

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Check squads status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getTeamMembersForSquad,
  saveMatchSquad,
  getMatchSquads,
  checkSquadsStatus
};

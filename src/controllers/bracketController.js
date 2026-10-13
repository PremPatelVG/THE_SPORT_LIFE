const bracketService = require('../services/bracketService');
const logger = require('../utils/logger');

/**
 * Generate tournament brackets
 */
const generateBrackets = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { participants, scheduleConfig } = req.body;

    logger.info(`Generating brackets for tournament ${tournamentId}`);

    const result = await bracketService.generateBrackets(
      tournamentId,
      participants,
      scheduleConfig
    );

    res.json({
      success: true,
      message: 'Brackets generated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Generate brackets error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate brackets'
    });
  }
};

/**
 * Preview tournament matches before generation
 * Returns exact match structure that will be created
 */
const previewMatches = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { participants, scheduleConfig } = req.body;

    logger.info(`Generating match preview for tournament ${tournamentId}`);

    const result = await bracketService.previewMatches(
      tournamentId,
      participants,
      scheduleConfig
    );

    res.json({
      success: true,
      message: 'Match preview generated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Preview matches error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate match preview'
    });
  }
};

/**
 * Finalize group stage and advance to knockout
 */
const finalizeGroupStage = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    logger.info(`Finalizing group stage for tournament ${tournamentId}`);

    const result = await bracketService.finalizeGroupStage(tournamentId);

    res.json({
      success: true,
      message: 'Group stage finalized successfully',
      data: result
    });
  } catch (error) {
    logger.error('Finalize group stage error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to finalize group stage'
    });
  }
};

/**
 * Check if group stage is complete
 */
const checkGroupStageComplete = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const isComplete = await bracketService.isGroupStageComplete(tournamentId);

    res.json({
      success: true,
      data: {
        isComplete
      }
    });
  } catch (error) {
    logger.error('Check group stage complete error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check group stage status'
    });
  }
};

module.exports = {
  generateBrackets,
  previewMatches,
  finalizeGroupStage,
  checkGroupStageComplete
};

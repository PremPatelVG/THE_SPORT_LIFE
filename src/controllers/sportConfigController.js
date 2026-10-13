const SportMatchConfig = require('../models/SportMatchConfig');
const logger = require('../utils/logger');

/**
 * Get all sport configurations
 * GET /api/v1/sport-configs
 */
const getAllSportConfigs = async (req, res) => {
  try {
    const configs = await SportMatchConfig.getAll();
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    logger.error('Get all sport configs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sport configurations'
    });
  }
};

/**
 * Get sport configuration by sport ID
 * GET /api/v1/sport-configs/:sportId
 */
const getSportConfig = async (req, res) => {
  try {
    const config = await SportMatchConfig.getBySportId(req.params.sportId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Sport configuration not found'
      });
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Get sport config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sport configuration'
    });
  }
};

/**
 * Get match configuration presets for a sport
 * GET /api/v1/sport-configs/:sportId/presets
 */
const getSportPresets = async (req, res) => {
  try {
    const presets = await SportMatchConfig.getPresets(req.params.sportId);
    
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    logger.error('Get sport presets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sport presets'
    });
  }
};

/**
 * Validate match configuration
 * POST /api/v1/sport-configs/validate
 */
const validateMatchConfig = async (req, res) => {
  try {
    const { match_config, match_structure } = req.body;
    
    if (!match_config || !match_structure) {
      return res.status(400).json({
        success: false,
        error: 'match_config and match_structure are required'
      });
    }
    
    const validation = SportMatchConfig.validateMatchConfig(match_config, match_structure);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    logger.error('Validate match config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate match configuration'
    });
  }
};

/**
 * Calculate estimated match duration
 * POST /api/v1/sport-configs/calculate-duration
 */
const calculateDuration = async (req, res) => {
  try {
    const { match_config, match_structure } = req.body;
    
    if (!match_config || !match_structure) {
      return res.status(400).json({
        success: false,
        error: 'match_config and match_structure are required'
      });
    }
    
    const duration = SportMatchConfig.calculateEstimatedDuration(match_config, match_structure);
    
    res.json({
      success: true,
      data: {
        estimated_duration: duration,
        unit: 'minutes'
      }
    });
  } catch (error) {
    logger.error('Calculate duration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate duration'
    });
  }
};

module.exports = {
  getAllSportConfigs,
  getSportConfig,
  getSportPresets,
  validateMatchConfig,
  calculateDuration
};

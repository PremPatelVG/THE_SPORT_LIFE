const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get sport match configuration by sport ID
 */
const getBySportId = async (sportId) => {
  try {
    const sql = `
      SELECT 
        smc.*,
        s.name as sport_name,
        s.category as sport_category
      FROM sport_match_configs smc
      LEFT JOIN sports s ON smc.sport_id = s.id
      WHERE smc.sport_id = ?
    `;
    
    const result = await query(sql, [sportId]);
    const configs = Array.isArray(result) ? result : result[0] ? [result[0]] : [];
    
    if (configs.length === 0) return null;
    
    const config = configs[0];
    
    // Parse JSON fields
    if (config.default_config && typeof config.default_config === 'string') {
      config.default_config = JSON.parse(config.default_config);
    }
    if (config.category_support && typeof config.category_support === 'string') {
      config.category_support = JSON.parse(config.category_support);
    }
    
    return config;
  } catch (error) {
    logger.error('Error fetching sport match config:', error);
    throw error;
  }
};

/**
 * Get all sport match configurations
 */
const getAll = async () => {
  try {
    const sql = `
      SELECT 
        smc.*,
        s.name as sport_name,
        s.category as sport_category
      FROM sport_match_configs smc
      LEFT JOIN sports s ON smc.sport_id = s.id
      ORDER BY smc.sport_name ASC
    `;
    
    const result = await query(sql);
    const configs = Array.isArray(result) ? result : result[0] ? [result[0]] : [];
    
    // Parse JSON fields
    configs.forEach(config => {
      if (config.default_config && typeof config.default_config === 'string') {
        config.default_config = JSON.parse(config.default_config);
      }
      if (config.category_support && typeof config.category_support === 'string') {
        config.category_support = JSON.parse(config.category_support);
      }
    });
    
    return configs;
  } catch (error) {
    logger.error('Error fetching all sport match configs:', error);
    throw error;
  }
};

/**
 * Validate category support for a sport
 */
const isCategorySupported = async (sportId, category) => {
  try {
    const config = await getBySportId(sportId);
    
    if (!config || !config.category_support) {
      return false;
    }
    
    return config.category_support[category] === true;
  } catch (error) {
    logger.error('Error checking category support:', error);
    return false;
  }
};

/**
 * Get default match configuration for a sport
 */
const getDefaultConfig = async (sportId) => {
  try {
    const config = await getBySportId(sportId);
    
    if (!config) {
      throw new Error('Sport configuration not found');
    }
    
    return config.default_config;
  } catch (error) {
    logger.error('Error getting default config:', error);
    throw error;
  }
};

/**
 * Validate match configuration structure
 * FULLY FLEXIBLE - User can configure any values
 */
const validateMatchConfig = (matchConfig, matchStructure) => {
  const errors = [];
  
  if (!matchConfig || typeof matchConfig !== 'object') {
    errors.push('Match configuration must be an object');
    return { valid: false, errors };
  }
  
  // Validate based on match structure - FLEXIBLE VALIDATION
  switch (matchStructure) {
    case 'set_based':
      // Required fields
      if (!matchConfig.total_sets) errors.push('total_sets is required');
      
      // Flexible validation - just check reasonable ranges
      if (matchConfig.total_sets && (matchConfig.total_sets < 1 || matchConfig.total_sets > 9)) {
        errors.push('total_sets must be between 1 and 9');
      }
      
      // Auto-calculate sets_to_win if not provided
      if (matchConfig.total_sets && !matchConfig.sets_to_win) {
        matchConfig.sets_to_win = Math.ceil(matchConfig.total_sets / 2);
      }
      
      // Check for points_per_set or games_per_set
      if (!matchConfig.points_per_set && !matchConfig.games_per_set) {
        errors.push('Either points_per_set or games_per_set is required');
      }
      
      // Validate point/game ranges
      if (matchConfig.points_per_set && (matchConfig.points_per_set < 1 || matchConfig.points_per_set > 100)) {
        errors.push('points_per_set must be between 1 and 100');
      }
      
      if (matchConfig.games_per_set && (matchConfig.games_per_set < 1 || matchConfig.games_per_set > 20)) {
        errors.push('games_per_set must be between 1 and 20');
      }
      break;
      
    case 'game_based':
      // Required fields
      if (!matchConfig.total_games) errors.push('total_games is required');
      if (!matchConfig.points_per_game) errors.push('points_per_game is required');
      
      // Flexible validation
      if (matchConfig.total_games && (matchConfig.total_games < 1 || matchConfig.total_games > 9)) {
        errors.push('total_games must be between 1 and 9');
      }
      
      if (matchConfig.points_per_game && (matchConfig.points_per_game < 1 || matchConfig.points_per_game > 100)) {
        errors.push('points_per_game must be between 1 and 100');
      }
      
      // Auto-calculate games_to_win if not provided
      if (matchConfig.total_games && !matchConfig.games_to_win) {
        matchConfig.games_to_win = Math.ceil(matchConfig.total_games / 2);
      }
      break;
      
    case 'time_based':
      if (!matchConfig.periods) errors.push('periods is required');
      if (!matchConfig.period_duration) errors.push('period_duration is required');
      
      if (matchConfig.periods && (matchConfig.periods < 1 || matchConfig.periods > 6)) {
        errors.push('periods must be between 1 and 6');
      }
      
      if (matchConfig.period_duration && (matchConfig.period_duration < 1 || matchConfig.period_duration > 120)) {
        errors.push('period_duration must be between 1 and 120 minutes');
      }
      break;
      
    default:
      errors.push('Invalid match_structure');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get match configuration presets for a sport
 */
const getPresets = async (sportId) => {
  try {
    const config = await getBySportId(sportId);
    
    if (!config) {
      return [];
    }
    
    const presets = [];
    const defaultConfig = config.default_config;
    
    // Generate common presets based on sport type
    if (config.match_structure === 'set_based') {
      // Best of 3
      presets.push({
        name: 'Best of 3',
        description: 'Standard format - First to win 2 sets',
        config: {
          ...defaultConfig,
          sets_to_win: 2,
          total_sets: 3
        }
      });
      
      // Best of 5
      if (defaultConfig.points_per_set || defaultConfig.games_per_set) {
        presets.push({
          name: 'Best of 5',
          description: 'Extended format - First to win 3 sets',
          config: {
            ...defaultConfig,
            sets_to_win: 3,
            total_sets: 5
          }
        });
      }
    } else if (config.match_structure === 'game_based') {
      // Best of 3
      presets.push({
        name: 'Best of 3',
        description: 'Quick format - First to win 2 games',
        config: {
          ...defaultConfig,
          games_to_win: 2,
          total_games: 3
        }
      });
      
      // Best of 5
      presets.push({
        name: 'Best of 5',
        description: 'Standard format - First to win 3 games',
        config: {
          ...defaultConfig,
          games_to_win: 3,
          total_games: 5
        }
      });
      
      // Best of 7
      presets.push({
        name: 'Best of 7',
        description: 'Extended format - First to win 4 games',
        config: {
          ...defaultConfig,
          games_to_win: 4,
          total_games: 7
        }
      });
    }
    
    return presets;
  } catch (error) {
    logger.error('Error getting presets:', error);
    return [];
  }
};

/**
 * Calculate estimated match duration
 */
const calculateEstimatedDuration = (matchConfig, matchStructure) => {
  let duration = 0;
  
  switch (matchStructure) {
    case 'set_based':
      if (matchConfig.points_per_set) {
        // Estimate: 2 minutes per point on average
        const pointsPerSet = matchConfig.points_per_set;
        const totalSets = matchConfig.total_sets;
        duration = pointsPerSet * 2 * totalSets;
      } else if (matchConfig.games_per_set) {
        // Estimate: 5 minutes per game
        const gamesPerSet = matchConfig.games_per_set;
        const totalSets = matchConfig.total_sets;
        duration = gamesPerSet * 5 * totalSets;
      }
      break;
      
    case 'game_based':
      // Estimate: 1.5 minutes per point
      const pointsPerGame = matchConfig.points_per_game || 11;
      const totalGames = matchConfig.total_games;
      duration = pointsPerGame * 1.5 * totalGames;
      break;
      
    case 'time_based':
      duration = matchConfig.periods * matchConfig.period_duration;
      if (matchConfig.break_duration) {
        duration += (matchConfig.periods - 1) * matchConfig.break_duration;
      }
      break;
  }
  
  // Add buffer time (20%)
  duration = Math.ceil(duration * 1.2);
  
  return duration;
};

module.exports = {
  getBySportId,
  getAll,
  isCategorySupported,
  getDefaultConfig,
  validateMatchConfig,
  getPresets,
  calculateEstimatedDuration
};

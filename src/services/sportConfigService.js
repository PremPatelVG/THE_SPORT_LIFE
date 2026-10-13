import api from '../config/api';

/**
 * Get all sport configurations
 */
export const getSportConfigs = async () => {
  try {
    const response = await api.get('/sport-configs');
    return response.data;
  } catch (error) {
    console.error('Error fetching sport configs:', error);
    throw error;
  }
};

/**
 * Get sport configuration by sport ID
 */
export const getSportConfig = async (sportId) => {
  try {
    const response = await api.get(`/sport-configs/${sportId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching sport config for sport ${sportId}:`, error);
    throw error;
  }
};

/**
 * Get match configuration presets for a sport
 */
export const getSportPresets = async (sportId) => {
  try {
    const response = await api.get(`/sport-configs/${sportId}/presets`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching presets for sport ${sportId}:`, error);
    throw error;
  }
};

/**
 * Validate match configuration
 */
export const validateMatchConfig = async (matchConfig, matchStructure) => {
  try {
    const response = await api.post('/sport-configs/validate', {
      match_config: matchConfig,
      match_structure: matchStructure
    });
    return response.data;
  } catch (error) {
    console.error('Error validating match config:', error);
    throw error;
  }
};

/**
 * Calculate estimated match duration
 */
export const calculateDuration = async (matchConfig, matchStructure) => {
  try {
    const response = await api.post('/sport-configs/calculate-duration', {
      match_config: matchConfig,
      match_structure: matchStructure
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating duration:', error);
    throw error;
  }
};

export default {
  getSportConfigs,
  getSportConfig,
  getSportPresets,
  validateMatchConfig,
  calculateDuration
};

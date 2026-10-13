/**
 * Sport-specific icon mappings for serving indicators
 */

/**
 * Get serving icon emoji based on sport name
 * @param {string} sportName - Name of the sport
 * @returns {string} Emoji icon for the sport
 */
export const getServingIcon = (sportName) => {
  const iconMap = {
    'Badminton': '🏸',
    'Tennis': '🎾',
    'Padel': '🎾',
    'Pickleball': '🏓',
    'Table Tennis': '🏓',
    'Squash': '🎾',
    'Volleyball': '🏐'
  };

  return iconMap[sportName] || '🎾'; // Default to tennis ball
};

/**
 * Get sport display name for serving context
 * @param {string} sportName - Name of the sport
 * @returns {string} Display name
 */
export const getServingSportLabel = (sportName) => {
  const labelMap = {
    'Badminton': 'Shuttlecock',
    'Tennis': 'Ball',
    'Padel': 'Ball',
    'Pickleball': 'Ball',
    'Table Tennis': 'Ball',
    'Squash': 'Ball',
    'Volleyball': 'Ball'
  };

  return labelMap[sportName] || 'Ball';
};

/**
 * Check if sport uses serving system
 * @param {string} sportName - Name of the sport
 * @returns {boolean} True if sport uses serving
 */
export const sportUsesServing = (sportName) => {
  const servingSports = [
    'Badminton',
    'Tennis',
    'Padel',
    'Pickleball',
    'Table Tennis',
    'Squash',
    'Volleyball'
  ];

  return servingSports.includes(sportName);
};

/**
 * Get sport icon emoji based on sport name
 * @param {string} sportName - Name of the sport
 * @returns {string} Emoji icon for the sport
 */
export const getSportIcon = (sportName) => {
  const iconMap = {
    'Badminton': '🏸',
    'Tennis': '🎾',
    'Padel': '🎾',
    'Pickleball': '🏓',
    'Table Tennis': '🏓',
    'Squash': '🎾',
    'Volleyball': '🏐',
    'Football': '⚽',
    'Basketball': '🏀',
    'Cricket': '🏏',
    'Hockey': '🏒',
    'Baseball': '⚾',
    'Rugby': '🏉'
  };

  return iconMap[sportName] || '🏆'; // Default to trophy
};

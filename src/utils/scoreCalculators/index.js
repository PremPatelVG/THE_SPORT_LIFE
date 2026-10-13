/**
 * Score Calculators - Main Router
 * Routes to appropriate calculator based on sport
 */

const PickleballScoreCalculator = require('./pickleball');
const PadelScoreCalculator = require('./padel');
const TableTennisScoreCalculator = require('./tableTennis');
const TennisScoreCalculator = require('./tennis');
const BadmintonScoreCalculator = require('./badminton');
const SquashScoreCalculator = require('./squash');
const VolleyballScoreCalculator = require('./volleyball');
const FootballScoreCalculator = require('./football');

/**
 * Get calculator instance for a sport
 */
const getCalculator = (sportName, config = {}) => {
  const sport = sportName.toLowerCase().replace(/\s+/g, '');

  switch (sport) {
    case 'pickleball':
      return new PickleballScoreCalculator(config);
    
    case 'padel':
      return new PadelScoreCalculator(config);
    
    case 'tabletennis':
    case 'table tennis':
      return new TableTennisScoreCalculator(config);
    
    case 'tennis':
      return new TennisScoreCalculator(config);
    
    case 'badminton':
      return new BadmintonScoreCalculator(config);
    
    case 'squash':
      return new SquashScoreCalculator(config);
    
    case 'volleyball':
      return new VolleyballScoreCalculator(config);
    
    case 'football':
    case 'soccer':
      return new FootballScoreCalculator(config);
    
    default:
      throw new Error(`No calculator available for sport: ${sportName}`);
  }
};

/**
 * Calculate score for any sport
 */
const calculateScore = (sportName, currentScore, eventType, eventData, config = {}) => {
  const calculator = getCalculator(sportName, config);
  return calculator.calculate(currentScore, eventType, eventData);
};

/**
 * Initialize score for any sport
 */
const initializeScore = (sportName, config = {}) => {
  const calculator = getCalculator(sportName, config);
  return calculator.initializeScore();
};

/**
 * Get score display for any sport
 */
const getScoreDisplay = (sportName, currentScore, config = {}) => {
  const calculator = getCalculator(sportName, config);
  return calculator.getScoreDisplay(currentScore);
};

/**
 * Get list of supported sports
 */
const getSupportedSports = () => {
  return [
    'pickleball',
    'padel',
    'table tennis',
    'tennis',
    'badminton',
    'squash',
    'volleyball',
    'football'
  ];
};

module.exports = {
  getCalculator,
  calculateScore,
  initializeScore,
  getScoreDisplay,
  getSupportedSports,
  
  // Export individual calculators for direct use
  PickleballScoreCalculator,
  PadelScoreCalculator,
  TableTennisScoreCalculator,
  TennisScoreCalculator,
  BadmintonScoreCalculator,
  SquashScoreCalculator,
  VolleyballScoreCalculator,
  FootballScoreCalculator
};

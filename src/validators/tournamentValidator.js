const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware to check for errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Create tournament validation
 */
const createTournamentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tournament name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Tournament name must be between 3 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  
  body('sport_id')
    .notEmpty()
    .withMessage('Sport is required')
    .isInt({ min: 1 })
    .withMessage('Invalid sport ID'),
  
  body('venue_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid venue ID'),
  
  body('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format')
    .custom((value) => {
      const startDate = new Date(value);
      const now = new Date();
      if (startDate < now) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),
  
  body('end_date')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.start_date);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('registration_start')
    .notEmpty()
    .withMessage('Registration start date is required')
    .isISO8601()
    .withMessage('Invalid registration start date format'),
  
  body('registration_end')
    .notEmpty()
    .withMessage('Registration end date is required')
    .isISO8601()
    .withMessage('Invalid registration end date format')
    .custom((value, { req }) => {
      const regEnd = new Date(value);
      const regStart = new Date(req.body.registration_start);
      const tournamentStart = new Date(req.body.start_date);
      
      if (regEnd <= regStart) {
        throw new Error('Registration end must be after registration start');
      }
      if (regEnd > tournamentStart) {
        throw new Error('Registration must end before tournament starts');
      }
      return true;
    }),
  
  body('max_participants')
    .optional()
    .isInt({ min: 2, max: 1000 })
    .withMessage('Max participants must be between 2 and 1000'),
  
  body('entry_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be a positive number'),
  
  body('prize_money')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Prize money must be a positive number'),
  
  body('format_type')
    .notEmpty()
    .withMessage('Tournament format is required')
    .isIn(['knockout', 'round_robin', 'groups_knockout', 'league', 'ladder'])
    .withMessage('Invalid tournament format'),
  
  body('category')
    .notEmpty()
    .withMessage('Tournament category is required')
    .isIn(['singles', 'doubles', 'teams'])
    .withMessage('Invalid tournament category'),
  
  body('tournament_type')
    .optional()
    .isIn(['open', 'closed'])
    .withMessage('Invalid tournament type'),
  
  body('match_config')
    .optional()
    .isObject()
    .withMessage('Match configuration must be an object')
    .custom((value) => {
      if (value && value.match_structure) {
        const validStructures = ['set_based', 'game_based', 'time_based'];
        if (!validStructures.includes(value.match_structure)) {
          throw new Error('Invalid match structure');
        }
        
        // Flexible validation - just check ranges
        if (value.match_structure === 'set_based') {
          if (value.total_sets && (value.total_sets < 1 || value.total_sets > 9)) {
            throw new Error('total_sets must be between 1 and 9');
          }
          if (value.points_per_set && (value.points_per_set < 1 || value.points_per_set > 100)) {
            throw new Error('points_per_set must be between 1 and 100');
          }
          if (value.games_per_set && (value.games_per_set < 1 || value.games_per_set > 20)) {
            throw new Error('games_per_set must be between 1 and 20');
          }
        }
        
        if (value.match_structure === 'game_based') {
          if (value.total_games && (value.total_games < 1 || value.total_games > 9)) {
            throw new Error('total_games must be between 1 and 9');
          }
          if (value.points_per_game && (value.points_per_game < 1 || value.points_per_game > 100)) {
            throw new Error('points_per_game must be between 1 and 100');
          }
        }
        
        if (value.match_structure === 'time_based') {
          if (value.periods && (value.periods < 1 || value.periods > 6)) {
            throw new Error('periods must be between 1 and 6');
          }
          if (value.period_duration && (value.period_duration < 1 || value.period_duration > 120)) {
            throw new Error('period_duration must be between 1 and 120 minutes');
          }
        }
      }
      return true;
    }),
  
  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
  
  body('rules')
    .optional()
    .isObject()
    .withMessage('Rules must be an object'),
  
  body('platform_commission_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Platform commission must be between 0 and 100'),
  
  validate
];

/**
 * Update tournament validation
 */
const updateTournamentValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Tournament name must be between 3 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  body('registration_start')
    .optional()
    .isISO8601()
    .withMessage('Invalid registration start date format'),
  
  body('registration_end')
    .optional()
    .isISO8601()
    .withMessage('Invalid registration end date format'),
  
  body('max_participants')
    .optional()
    .isInt({ min: 2, max: 1000 })
    .withMessage('Max participants must be between 2 and 1000'),
  
  body('entry_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be a positive number'),
  
  body('prize_money')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Prize money must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  validate
];

/**
 * Get tournament by ID validation
 */
const getTournamentValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  validate
];

/**
 * Register for tournament validation
 */
const registerValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  validate
];

/**
 * Withdraw validation
 */
const withdrawValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  validate
];

/**
 * Assign seeds validation
 */
const assignSeedsValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  body('seeds')
    .isArray({ min: 1 })
    .withMessage('Seeds must be a non-empty array'),
  
  body('seeds.*.participant_id')
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID'),
  
  body('seeds.*.seed_number')
    .isInt({ min: 1 })
    .withMessage('Invalid seed number'),
  
  validate
];

/**
 * Get tournaments query validation
 */
const getTournamentsValidation = [
  query('status')
    .optional()
    .isIn(['draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('sport_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid sport ID'),
  
  query('category')
    .optional()
    .isIn(['singles', 'doubles', 'teams'])
    .withMessage('Invalid category'),
  
  query('format_type')
    .optional()
    .isIn(['knockout', 'round_robin', 'groups_knockout', 'league', 'ladder'])
    .withMessage('Invalid format type'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query too long'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive number'),
  
  validate
];

/**
 * Get matches query validation
 */
const getMatchesValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  query('round')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid round number'),
  
  query('status')
    .optional()
    .isIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover'])
    .withMessage('Invalid match status'),
  
  validate
];

/**
 * Get standings query validation
 */
const getStandingsValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  query('group_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid group ID'),
  
  validate
];

module.exports = {
  createTournamentValidation,
  updateTournamentValidation,
  getTournamentValidation,
  registerValidation,
  withdrawValidation,
  assignSeedsValidation,
  getTournamentsValidation,
  getMatchesValidation,
  getStandingsValidation
};

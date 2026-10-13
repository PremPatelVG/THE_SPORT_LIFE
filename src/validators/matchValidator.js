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
 * Create match validation
 */
const createMatchValidation = [
  body('tournament_id')
    .notEmpty()
    .withMessage('Tournament ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  body('round_number')
    .notEmpty()
    .withMessage('Round number is required')
    .isInt({ min: 1 })
    .withMessage('Round number must be a positive integer'),
  
  body('match_number')
    .notEmpty()
    .withMessage('Match number is required')
    .isInt({ min: 1 })
    .withMessage('Match number must be a positive integer'),
  
  body('round_name')
    .notEmpty()
    .withMessage('Round name is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Round name must not exceed 100 characters'),
  
  body('participant1_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid participant 1 ID'),
  
  body('participant2_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid participant 2 ID'),
  
  body('venue_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid venue ID'),
  
  body('court_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid court ID'),
  
  body('match_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid match date format'),
  
  body('match_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM:SS)'),
  
  body('scheduled_duration')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('Duration must be between 30 and 480 minutes'),
  
  validate
];

/**
 * Update match validation
 */
const updateMatchValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID'),
  
  body('participant1_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid participant 1 ID'),
  
  body('participant2_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid participant 2 ID'),
  
  body('venue_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid venue ID'),
  
  body('court_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid court ID'),
  
  body('match_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid match date format'),
  
  body('match_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM:SS)'),
  
  body('scheduled_duration')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('Duration must be between 30 and 480 minutes'),
  
  body('referee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid referee ID'),
  
  validate
];

/**
 * Get match by ID validation
 */
const getMatchValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID'),
  
  validate
];

/**
 * Complete match validation
 */
const completeMatchValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID'),
  
  body('winner_id')
    .notEmpty()
    .withMessage('Winner ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid winner ID'),
  
  body('score')
    .notEmpty()
    .withMessage('Score is required')
    .isObject()
    .withMessage('Score must be an object'),
  
  validate
];

/**
 * Cancel match validation
 */
const cancelMatchValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  validate
];

/**
 * Postpone match validation
 */
const postponeMatchValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID'),
  
  body('new_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('new_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM:SS)'),
  
  validate
];

/**
 * Assign referee validation
 */
const assignRefereeValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID'),
  
  body('referee_id')
    .notEmpty()
    .withMessage('Referee ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid referee ID'),
  
  validate
];

/**
 * Walkover validation
 */
const walkoverValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID'),
  
  body('winner_id')
    .notEmpty()
    .withMessage('Winner ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid winner ID'),
  
  validate
];

/**
 * Get matches query validation
 */
const getMatchesValidation = [
  query('tournament_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  query('venue_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid venue ID'),
  
  query('court_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid court ID'),
  
  query('status')
    .optional()
    .isIn(['scheduled', 'ready', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover'])
    .withMessage('Invalid status'),
  
  query('match_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  query('round_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid round number'),
  
  query('participant_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID'),
  
  query('referee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid referee ID'),
  
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
 * Tournament ID validation
 */
const tournamentIdValidation = [
  param('tournamentId')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  validate
];

module.exports = {
  createMatchValidation,
  updateMatchValidation,
  getMatchValidation,
  completeMatchValidation,
  cancelMatchValidation,
  postponeMatchValidation,
  assignRefereeValidation,
  walkoverValidation,
  getMatchesValidation,
  tournamentIdValidation
};

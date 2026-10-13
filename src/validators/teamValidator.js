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
 * Create team validation
 */
const createTeamValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Team name must be between 3 and 100 characters'),
  
  body('is_tournament_specific')
    .optional()
    .isBoolean()
    .withMessage('is_tournament_specific must be a boolean'),
  
  body('tournament_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID')
    .custom((value, { req }) => {
      if (req.body.is_tournament_specific === true && !value) {
        throw new Error('Tournament ID is required for tournament-specific teams');
      }
      return true;
    }),
  
  body('sport_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid sport ID')
    .custom((value, { req }) => {
      if (req.body.is_tournament_specific === false && !value) {
        throw new Error('Sport ID is required for reusable teams');
      }
      return true;
    }),
  
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be a boolean'),
  
  body('captain_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid captain ID'),
  
  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('max_players')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Max players must be between 2 and 50'),
  
  validate
];

/**
 * Update team validation
 */
const updateTeamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Team name must be between 3 and 100 characters'),
  
  body('captain_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid captain ID'),
  
  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('max_players')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Max players must be between 2 and 50'),
  
  validate
];

/**
 * Get team by ID validation
 */
const getTeamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID'),
  
  validate
];

/**
 * Invite user validation
 */
const inviteUserValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID'),
  
  body('user_id')
    .notEmpty()
    .withMessage('user_id is required')
    .isInt({ min: 1 })
    .withMessage('Invalid user_id'),
  
  validate
];

/**
 * Remove member validation
 */
const removeMemberValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID'),
  
  param('memberId')
    .isInt({ min: 1 })
    .withMessage('Invalid member ID'),
  
  validate
];

/**
 * Update member validation
 */
const updateMemberValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID'),
  
  param('memberId')
    .isInt({ min: 1 })
    .withMessage('Invalid member ID'),
  
  body('position')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Position must not exceed 50 characters'),
  
  body('jersey_number')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),
  
  validate
];

/**
 * Change captain validation
 */
const changeCaptainValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID'),
  
  body('captain_id')
    .notEmpty()
    .withMessage('Captain ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid captain ID'),
  
  validate
];

/**
 * Get teams query validation
 */
const getTeamsValidation = [
  query('tournament_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  query('creator_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid creator ID'),
  
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
 * Invitation ID validation
 */
const invitationIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid invitation ID'),
  
  validate
];

/**
 * Get invitations query validation
 */
const getInvitationsValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected', 'cancelled'])
    .withMessage('Invalid status'),
  
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

/**
 * Register team for tournament validation
 */
const registerTeamForTournamentValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID'),
  
  body('tournament_id')
    .notEmpty()
    .withMessage('Tournament ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid tournament ID'),
  
  validate
];

/**
 * Get reusable teams validation
 */
const getReusableTeamsValidation = [
  query('sport_id')
    .notEmpty()
    .withMessage('Sport ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid sport ID'),
  
  validate
];

module.exports = {
  createTeamValidation,
  updateTeamValidation,
  getTeamValidation,
  inviteUserValidation,
  removeMemberValidation,
  updateMemberValidation,
  changeCaptainValidation,
  getTeamsValidation,
  invitationIdValidation,
  getInvitationsValidation,
  tournamentIdValidation,
  registerTeamForTournamentValidation,
  getReusableTeamsValidation
};

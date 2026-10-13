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
 * Register validation rules (legacy - for email/password registration)
 */
const registerValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number with country code'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('handedness')
    .optional()
    .isIn(['left', 'right', 'ambidextrous'])
    .withMessage('Handedness must be left, right, or ambidextrous'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const age = (new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 13) {
        throw new Error('You must be at least 13 years old to register');
      }
      if (age > 120) {
        throw new Error('Please provide a valid date of birth');
      }
      return true;
    }),
  
  body('role')
    .optional()
    .isIn(['player', 'admin', 'scorer', 'spectator'])
    .withMessage('Invalid role'),
  
  body('sport_interests')
    .optional()
    .isArray()
    .withMessage('Sport interests must be an array'),
  
  body('sport_interests.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each sport interest must be a valid sport ID'),
  
  validate
];

/**
 * Complete registration validation (mobile signup - no password)
 */
const completeRegistrationValidation = [
  body('phone')
    .trim()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('handedness')
    .optional()
    .isIn(['left', 'right', 'ambidextrous'])
    .withMessage('Handedness must be left, right, or ambidextrous'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      if (!value) return true;
      const age = (new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 13) {
        throw new Error('You must be at least 13 years old to register');
      }
      if (age > 120) {
        throw new Error('Please provide a valid date of birth');
      }
      return true;
    }),
  
  body('sport_interests')
    .optional()
    .isArray()
    .withMessage('Sport interests must be an array'),
  
  body('sport_interests.*.sport_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each sport interest must have a valid sport_id'),
  
  body('sport_interests.*.skill_level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
    .withMessage('Skill level must be beginner, intermediate, advanced, or professional'),
  
  validate
];

/**
 * Complete Google registration validation (with phone verification)
 */
const completeGoogleRegistrationValidation = [
  body('googleId')
    .notEmpty()
    .withMessage('Google ID is required'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('handedness')
    .optional()
    .isIn(['left', 'right', 'ambidextrous'])
    .withMessage('Handedness must be left, right, or ambidextrous'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  body('sport_interests')
    .optional()
    .isArray()
    .withMessage('Sport interests must be an array'),
  
  body('sport_interests.*.sport_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each sport interest must have a valid sport_id'),
  
  body('sport_interests.*.skill_level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
    .withMessage('Skill level must be beginner, intermediate, advanced, or professional'),
  
  validate
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validate
];

/**
 * Google auth validation rules
 */
const googleAuthValidation = [
  body('token')
    .notEmpty()
    .withMessage('Google token is required'),
  
  validate
];

/**
 * Facebook auth validation rules
 */
const facebookAuthValidation = [
  body('accessToken')
    .notEmpty()
    .withMessage('Facebook access token is required'),
  
  validate
];

/**
 * Complete Facebook registration validation (with phone verification)
 */
const completeFacebookRegistrationValidation = [
  body('facebookId')
    .notEmpty()
    .withMessage('Facebook ID is required'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('handedness')
    .optional()
    .isIn(['left', 'right', 'ambidextrous'])
    .withMessage('Handedness must be left, right, or ambidextrous'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  body('sport_interests')
    .optional()
    .isArray()
    .withMessage('Sport interests must be an array'),
  
  validate
];

/**
 * Apple auth validation rules
 * Accepts both "token" and "identityToken" field names
 */
const appleAuthValidation = [
  body()
    .custom((value, { req }) => {
      // Accept either "token" or "identityToken"
      if (!req.body.token && !req.body.identityToken) {
        throw new Error('Apple identity token is required (provide either "token" or "identityToken")');
      }
      return true;
    }),
  
  validate
];

/**
 * Complete Apple registration validation (with phone verification)
 */
const completeAppleRegistrationValidation = [
  body('appleId')
    .notEmpty()
    .withMessage('Apple ID is required'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('handedness')
    .optional()
    .isIn(['left', 'right', 'ambidextrous'])
    .withMessage('Handedness must be left, right, or ambidextrous'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  body('sport_interests')
    .optional()
    .isArray()
    .withMessage('Sport interests must be an array'),
  
  validate
];

/**
 * Send OTP validation rules
 */
const sendOTPValidation = [
  body('phone')
    .trim()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('purpose')
    .optional()
    .isIn(['signup', 'login'])
    .withMessage('Purpose must be either signup or login'),
  
  validate
];

/**
 * Verify OTP validation rules
 */
const verifyOTPValidation = [
  body('phone')
    .trim()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  
  validate
];

/**
 * Verify email validation rules
 */
const verifyEmailValidation = [
  query('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid verification token'),
  
  validate
];

/**
 * Forgot password validation rules
 */
const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  validate
];

/**
 * Reset password validation rules
 */
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validate
];

/**
 * Change password validation rules
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validate
];

/**
 * Refresh token validation rules
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  
  validate
];

/**
 * Update profile validation rules
 */
const updateProfileValidation = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number with country code'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('handedness')
    .optional()
    .isIn(['left', 'right', 'ambidextrous'])
    .withMessage('Handedness must be left, right, or ambidextrous'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  validate
];

module.exports = {
  registerValidation,
  completeRegistrationValidation,
  completeGoogleRegistrationValidation,
  completeFacebookRegistrationValidation,
  completeAppleRegistrationValidation,
  loginValidation,
  googleAuthValidation,
  facebookAuthValidation,
  appleAuthValidation,
  sendOTPValidation,
  verifyOTPValidation,
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  refreshTokenValidation,
  updateProfileValidation
};

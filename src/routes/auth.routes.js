const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { normalizeIndianPhone } = require('../middleware/phoneNormalizer');
const upload = require('../middleware/upload');
const {
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
} = require('../validators/authValidator');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user with email/password
 * @access  Public
 */
router.post('/register', registerValidation, authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email/password (legacy)
 * @access  Public
 */
router.post('/login', loginValidation, authController.login);

/**
 * @route   POST /api/v1/auth/login-otp
 * @desc    Login with phone and OTP
 * @access  Public
 */
router.post('/login-otp', normalizeIndianPhone, verifyOTPValidation, authController.loginWithOTP);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Google OAuth authentication (client-side flow)
 * @access  Public
 */
router.post('/google', googleAuthValidation, authController.googleAuth);

/**
 * @route   GET /api/v1/auth/google/login
 * @desc    Initiate Google OAuth (server-side flow)
 * @access  Public
 */
router.get('/google/login', authController.googleLogin);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback (server-side flow)
 * @access  Public
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @route   POST /api/v1/auth/facebook
 * @desc    Facebook OAuth authentication (client-side flow)
 * @access  Public
 */
router.post('/facebook', facebookAuthValidation, authController.facebookAuth);

/**
 * @route   POST /api/v1/auth/apple
 * @desc    Apple Sign-In authentication (mobile app flow)
 * @access  Public
 */
router.post('/apple', appleAuthValidation, authController.appleAuth);

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/send-otp', normalizeIndianPhone, sendOTPValidation, authController.sendOTP);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post('/verify-otp', normalizeIndianPhone, verifyOTPValidation, authController.verifyOTP);

/**
 * @route   POST /api/v1/auth/complete-registration
 * @desc    Complete registration after OTP verification
 * @access  Public
 */
router.post('/complete-registration', normalizeIndianPhone, completeRegistrationValidation, authController.completeRegistration);

/**
 * @route   POST /api/v1/auth/complete-google-registration
 * @desc    Complete Google registration with additional details
 * @access  Public
 */
router.post('/complete-google-registration', normalizeIndianPhone, completeGoogleRegistrationValidation, authController.completeGoogleRegistration);

/**
 * @route   POST /api/v1/auth/complete-facebook-registration
 * @desc    Complete Facebook registration with additional details
 * @access  Public
 */
router.post('/complete-facebook-registration', normalizeIndianPhone, completeFacebookRegistrationValidation, authController.completeFacebookRegistration);

/**
 * @route   POST /api/v1/auth/complete-apple-registration
 * @desc    Complete Apple registration with additional details
 * @access  Public
 */
router.post('/complete-apple-registration', normalizeIndianPhone, completeAppleRegistrationValidation, authController.completeAppleRegistration);

/**
 * @route   GET /api/v1/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.get('/verify-email', verifyEmailValidation, authController.verifyEmail);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', refreshTokenValidation, authController.refreshToken);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', auth, authController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', auth, updateProfileValidation, authController.updateProfile);

/**
 * @route   POST /api/v1/auth/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/profile/picture', auth, upload.single('profile_image'), authController.uploadProfilePicture);

/**
 * @route   DELETE /api/v1/auth/profile/picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/profile/picture', auth, authController.deleteProfilePicture);

/**
 * @route   PUT /api/v1/auth/profile/sports
 * @desc    Update user sport interests
 * @access  Private
 */
router.put('/profile/sports', auth, authController.updateSportInterests);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (when logged in)
 * @access  Private
 */
router.post('/change-password', auth, changePasswordValidation, authController.changePassword);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout (invalidate refresh token)
 * @access  Private
 */
router.post('/logout', auth, authController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', auth, authController.logoutAll);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get all active sessions
 * @access  Private
 */
router.get('/sessions', auth, authController.getSessions);

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', auth, authController.revokeSession);

/**
 * @route   DELETE /api/v1/auth/account
 * @desc    Soft delete user account
 * @access  Private
 */
router.delete('/account', auth, authController.deleteAccount);

/**
 * @route   POST /api/v1/auth/check-deleted-account
 * @desc    Check if deleted account exists for phone/email
 * @access  Public
 */
router.post('/check-deleted-account', authController.checkDeletedAccount);

/**
 * @route   POST /api/v1/auth/recover-account
 * @desc    Recover deleted account with OTP verification
 * @access  Public
 */
router.post('/recover-account', authController.recoverAccount);

module.exports = router;

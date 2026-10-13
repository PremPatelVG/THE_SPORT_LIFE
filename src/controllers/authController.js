const authService = require('../services/authService');
const User = require('../models/User');
const logger = require('../utils/logger');

  /**
   * Register new user
   * POST /api/v1/auth/register
   */
const register = async (req, res) => {
  try {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.register(req.body, deviceInfo, ipAddress);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Register controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Login with email/password
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.login(email, password, deviceInfo, ipAddress);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Login controller error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Google OAuth authentication (client-side flow)
 * POST /api/v1/auth/google
 */
const googleAuth = async (req, res) => {
  try {
    const { token, userInfo } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.googleAuth(token, deviceInfo, ipAddress, userInfo);
    
    // Check if profile completion is needed
    if (result.needsProfileCompletion) {
      return res.json({
        success: true,
        needsProfileCompletion: true,
        googleData: result.googleData,
        message: result.message
      });
    }
    
    // Existing user - return tokens
    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Google auth controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Initiate Google OAuth (server-side flow)
 * GET /api/v1/auth/google/login
 */
const googleLogin = async (req, res) => {
  try {
    const authUrl = authService.getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Google login initiate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate Google login'
    });
  }
}

/**
 * Google OAuth callback (server-side flow)
 * GET /api/v1/auth/google/callback
 */
const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.googleCallback(code, deviceInfo, ipAddress);
    
    // Check if profile completion is needed
    if (result.needsProfileCompletion) {
      // Redirect to frontend with Google data in query params or session
      const googleDataEncoded = encodeURIComponent(JSON.stringify(result.googleData));
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?googleData=${googleDataEncoded}`);
    }
    
    // Existing user - redirect to frontend with tokens
    const tokensEncoded = encodeURIComponent(JSON.stringify(result.tokens));
    const userEncoded = encodeURIComponent(JSON.stringify(result.user));
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?tokens=${tokensEncoded}&user=${userEncoded}`);
  } catch (error) {
    logger.error('Google callback controller error:', error);
    // Redirect to frontend with error
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Send OTP to phone
 * POST /api/v1/auth/send-otp
 */
const sendOTP = async (req, res) => {
  try {
    const { phone, purpose } = req.body; // purpose: 'signup' or 'login'
    const result = await authService.sendOTP(phone, purpose || 'signup');
    
    res.json({
      success: true,
      message: result.message,
      data: {
        expiresIn: result.expiresIn
      }
    });
  } catch (error) {
    logger.error('Send OTP controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Verify OTP
 * POST /api/v1/auth/verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const result = await authService.verifyOTP(phone, otp);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        verified: result.verified,
        phone: result.phone
      }
    });
  } catch (error) {
    logger.error('Verify OTP controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Complete registration after OTP verification
 * POST /api/v1/auth/complete-registration
 */
const completeRegistration = async (req, res) => {
  try {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.completeRegistration(req.body, deviceInfo, ipAddress);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Complete registration controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Verify email with token
 * GET /api/v1/auth/verify-email?token=xxx
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const result = await authService.verifyEmail(token);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Verify email controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Forgot password controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Reset password controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Change password (authenticated)
 * POST /api/v1/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Change password controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    logger.error('Refresh token controller error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Logout (invalidate refresh token)
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Logout controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Logout from all devices
 * POST /api/v1/auth/logout-all
 */
const logoutAll = async (req, res) => {
  try {
    const result = await authService.logoutAll(req.user.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Logout all controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get current user profile
 * GET /api/v1/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const profile = await User.getProfileWithSports(req.user.id);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Get profile controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
}

/**
 * Update user profile
 * PUT /api/v1/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const updatedUser = await User.update(req.user.id, req.body);
    
    // Remove sensitive data
    delete updatedUser.password_hash;
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Update profile controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get user sessions
 * GET /api/v1/auth/sessions
 */
const getSessions = async (req, res) => {
  try {
    const { query: dbQuery } = require('../config/database');
    const sessions = await dbQuery(
      `SELECT id, device_info, ip_address, created_at, expires_at 
       FROM user_sessions 
       WHERE user_id = ? AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Get sessions controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
}

/**
 * Soft delete user account
 * DELETE /api/v1/auth/account
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Soft delete the user account
    await User.softDelete(userId);
    
    // Invalidate all user sessions
    await authService.logoutAll(userId);
    
    res.json({
      success: true,
      message: 'Account deleted successfully. We\'re sorry to see you go!'
    });
  } catch (error) {
    logger.error('Delete account controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
}

/**
 * Check if deleted account exists for phone/email
 * POST /api/v1/auth/check-deleted-account
 */
const checkDeletedAccount = async (req, res) => {
  try {
    const { phone, email } = req.body;
    
    let deletedUser = null;
    
    if (phone) {
      deletedUser = await User.findDeletedByPhone(phone);
    } else if (email) {
      deletedUser = await User.findDeletedByEmail(email);
    }
    
    if (deletedUser) {
      return res.json({
        success: true,
        hasDeletedAccount: true,
        data: {
          userId: deletedUser.id,
          firstName: deletedUser.first_name,
          lastName: deletedUser.last_name,
          email: deletedUser.email,
          phone: deletedUser.phone,
          deletedAt: deletedUser.deleted_at
        }
      });
    }
    
    res.json({
      success: true,
      hasDeletedAccount: false
    });
  } catch (error) {
    logger.error('Check deleted account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check deleted account'
    });
  }
}

/**
 * Recover deleted account
 * POST /api/v1/auth/recover-account
 */
const recoverAccount = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Call authService to handle recovery
    const result = await authService.recoverDeletedAccount(phone, otp, deviceInfo, ipAddress);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Recover account error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to recover account'
    });
  }
}

/**
 * Revoke specific session
 * DELETE /api/v1/auth/sessions/:sessionId
 */
const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { query: dbQuery } = require('../config/database');
    
    await dbQuery(
      'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke session controller error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
}

/**
 * Upload profile picture
 * POST /api/v1/auth/profile/picture
 */
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Get the file path relative to uploads directory
    const profileImagePath = `/uploads/profiles/${req.file.filename}`;

    // Update user profile with new image path
    const updatedUser = await User.update(req.user.id, {
      profile_image: profileImagePath
    });

    // Remove sensitive data
    delete updatedUser.password_hash;

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profile_image: profileImagePath,
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture'
    });
  }
};

/**
 * Delete profile picture
 * DELETE /api/v1/auth/profile/picture
 */
const deleteProfilePicture = async (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.profile_image) {
      return res.status(404).json({
        success: false,
        error: 'No profile picture to delete'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', user.profile_image);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update user profile to remove image path
    const updatedUser = await User.update(req.user.id, {
      profile_image: null
    });

    // Remove sensitive data
    delete updatedUser.password_hash;

    res.json({
      success: true,
      message: 'Profile picture deleted successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile picture'
    });
  }
};

/**
 * Update user sport interests
 * PUT /api/v1/auth/profile/sports
 */
const updateSportInterests = async (req, res) => {
  try {
    const { sport_interests } = req.body;
    const userId = req.user.id;
    const { query: dbQuery } = require('../config/database');

    // Validate input
    if (!Array.isArray(sport_interests)) {
      return res.status(400).json({
        success: false,
        error: 'Sport interests must be an array'
      });
    }

    // Delete existing sport interests
    await dbQuery('DELETE FROM user_sports WHERE user_id = ?', [userId]);

    // Insert new sport interests
    if (sport_interests.length > 0) {
      const sportValues = sport_interests.map(sport => [
        userId,
        sport.sport_id,
        sport.skill_level || 'beginner'
      ]);
      const placeholders = sportValues.map(() => '(?, ?, ?)').join(', ');
      const flatValues = sportValues.flat();
      
      await dbQuery(
        `INSERT INTO user_sports (user_id, sport_id, skill_level) VALUES ${placeholders}`,
        flatValues
      );
    }

    res.json({
      success: true,
      message: 'Sport interests updated successfully'
    });
  } catch (error) {
    logger.error('Update sport interests controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Complete Google registration
 * POST /api/v1/auth/complete-google-registration
 */
const completeGoogleRegistration = async (req, res) => {
  try {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.completeGoogleRegistration(req.body, deviceInfo, ipAddress);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Complete Google registration controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Facebook OAuth authentication (client-side flow)
 * POST /api/v1/auth/facebook
 */
const facebookAuth = async (req, res) => {
  try {
    const { accessToken, userInfo } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.facebookAuth(accessToken, deviceInfo, ipAddress, userInfo);
    
    // Check if profile completion is needed
    if (result.needsProfileCompletion) {
      return res.json({
        success: true,
        needsProfileCompletion: true,
        facebookData: result.facebookData,
        message: result.message
      });
    }
    
    // Existing user - return tokens
    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Facebook auth controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Complete Facebook registration
 * POST /api/v1/auth/complete-facebook-registration
 */
const completeFacebookRegistration = async (req, res) => {
  try {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.completeFacebookRegistration(req.body, deviceInfo, ipAddress);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Complete Facebook registration controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Login with OTP
 * POST /api/v1/auth/login-otp
 */
const loginWithOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.loginWithOTP(phone, otp, deviceInfo, ipAddress);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Login with OTP controller error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Apple Sign-In authentication (mobile app flow)
 * POST /api/v1/auth/apple
 */
const appleAuth = async (req, res) => {
  try {
    // Support both formats:
    // Format 1: { identityToken, userInfo }
    // Format 2: { token, userInfo } (from frontend)
    const identityToken = req.body.identityToken || req.body.token;
    const userInfo = req.body.userInfo;
    
    if (!identityToken) {
      return res.status(400).json({
        success: false,
        error: 'Identity token is required (provide either "token" or "identityToken")'
      });
    }
    
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.appleAuth(identityToken, userInfo, deviceInfo, ipAddress);
    
    
    
    // Check if profile completion is needed
    if (result.needsProfileCompletion) {
      return res.json({
        success: true,
        needsProfileCompletion: true,
        appleData: result.appleData,
        message: result.message
      });
    }
    
    // Existing user - return tokens
    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Apple auth controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Complete Apple registration
 * POST /api/v1/auth/complete-apple-registration
 */
const completeAppleRegistration = async (req, res) => {
  try {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await authService.completeAppleRegistration(req.body, deviceInfo, ipAddress);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Complete Apple registration controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  loginWithOTP,
  googleAuth,
  facebookAuth,
  appleAuth,
  googleLogin,
  googleCallback,
  sendOTP,
  verifyOTP,
  completeRegistration,
  completeGoogleRegistration,
  completeFacebookRegistration,
  completeAppleRegistration,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  getSessions,
  revokeSession,
  uploadProfilePicture,
  deleteProfilePicture,
  updateSportInterests,
  deleteAccount,
  checkDeletedAccount,
  recoverAccount
};

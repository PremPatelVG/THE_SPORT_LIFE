const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { query, transaction } = require('../config/database');
const User = require('../models/User');
const otpService = require('./otpService');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Store refresh token in database
 */
const storeRefreshToken = async (userId, token, deviceInfo = null, ipAddress = null) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await query(
    'INSERT INTO user_sessions (user_id, token, device_info, ip_address, expires_at) VALUES (?, ?, ?, ?, ?)',
    [userId, token, deviceInfo, ipAddress, expiresAt]
  );
};

/**
 * Register new user with email/password
 */
const register = async (userData, deviceInfo = null, ipAddress = null) => {
  try {
    // Validate required fields
    const { email, phone, password, first_name, last_name, gender, sport_interests } = userData;
    
    if (!email || !phone || !password || !first_name || !last_name || !gender) {
      throw new Error('Missing required fields');
    }

    // Check if email already exists
    if (await User.emailExists(email)) {
      throw new Error('Email already registered');
    }

    // Check if phone already exists
    if (await User.phoneExists(phone)) {
      throw new Error('Phone number already registered');
    }

    // Create user
    const userId = await User.create({
      ...userData,
      role: userData.role || 'player'
    });

    // Add sport interests if provided
    if (sport_interests && Array.isArray(sport_interests) && sport_interests.length > 0) {
      const sportValues = sport_interests.map(sport => [
        userId,
        sport.sport_id,
        sport.skill_level || 'beginner'
      ]);
      const placeholders = sportValues.map(() => '(?, ?, ?)').join(', ');
      const flatValues = sportValues.flat();
      
      await query(
        `INSERT INTO user_sports (user_id, sport_id, skill_level) VALUES ${placeholders}`,
        flatValues
      );
    }

    const user = await User.findById(userId);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // Store verification token (we'll use user_sessions table temporarily)
    await query(
      'INSERT INTO user_sessions (user_id, token, device_info, expires_at) VALUES (?, ?, ?, ?)',
      [userId, `verify_${verificationToken}`, 'email_verification', expiresAt]
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(userId, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Registration successful. Please verify your email.'
    };
  } catch (error) {
    logger.error('Registration error:', error);
    throw error;
  }
};

/**
 * Login with phone and OTP
 */
const loginWithOTP = async (phone, otp, deviceInfo = null, ipAddress = null) => {
  try {
    // Verify OTP
    const otpResult = await otpService.verifyOTP(phone, otp);
    if (!otpResult.success) {
      throw new Error('Invalid OTP');
    }

    // Find user by phone
    const user = await User.findByPhone(phone);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Clear OTP verification
    await otpService.clearVerification(phone);

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(user.id, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Login successful'
    };
  } catch (error) {
    logger.error('Login with OTP error:', error);
    throw error;
  }
};

/**
 * Login with email/password (legacy - kept for backward compatibility)
 */
const login = async (email, password, deviceInfo = null, ipAddress = null) => {
  try {
    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(user, password);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(user.id, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Login successful'
    };
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

/**
 * Google OAuth login/register
 * For new users: requires phone verification
 * For existing users: direct login
 */
const googleAuth = async (googleToken, deviceInfo = null, ipAddress = null, userInfo = null) => {
    try {
      let googleId, email, given_name, family_name, picture;

      // If userInfo is provided (from frontend), use it directly
      if (userInfo) {
        googleId = userInfo.sub;
        email = userInfo.email;
        given_name = userInfo.given_name;
        family_name = userInfo.family_name;
        picture = userInfo.picture;
      } else {
        // Otherwise verify Google ID token
        const ticket = await googleClient.verifyIdToken({
          idToken: googleToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        googleId = payload.sub;
        email = payload.email;
        given_name = payload.given_name;
        family_name = payload.family_name;
        picture = payload.picture;
      }

      // Check if user exists with this Google ID
      let user = await User.findByGoogleId(googleId);

      if (!user) {
        // Check if user exists with this email
        user = await User.findByEmail(email);

        if (user) {
          // Link Google account to existing user
          await User.update(user.id, { google_id: googleId });
          user.google_id = googleId;
        } else {
          // New user - return Google data for profile completion (with phone verification)
          return {
            needsProfileCompletion: true,
            googleData: {
              googleId,
              email,
              first_name: given_name || '',
              last_name: family_name || '',
              profile_image: picture
            },
            message: 'Please verify your phone number and complete your profile'
          };
        }
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Generate tokens
      const tokens = generateTokens(user);
      await storeRefreshToken(user.id, tokens.refreshToken, deviceInfo, ipAddress);

      // Remove sensitive data
      delete user.password_hash;

      return {
        user,
        tokens,
        message: 'Google authentication successful'
      };
    } catch (error) {
      logger.error('Google auth error:', error);
      throw new Error('Google authentication failed');
    }
};

/**
 * Send OTP for phone verification (for both signup and login)
 */
const sendOTP = async (phone, purpose = 'signup') => {
  try {
    const phoneExists = await User.phoneExists(phone);
    
    // For signup, phone should not exist
    if (purpose === 'signup' && phoneExists) {
      throw new Error('Phone number already registered. Please login instead.');
    }
    
    // For login, phone must exist
    if (purpose === 'login' && !phoneExists) {
      throw new Error('Phone number not registered. Please signup first.');
    }

    return await otpService.createOTP(phone);
  } catch (error) {
    logger.error('Send OTP error:', error);
    throw error;
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (phone, otpCode) => {
  try {
    const result = await otpService.verifyOTP(phone, otpCode);
    return {
      ...result,
      verified: true,
      phone: phone
    };
  } catch (error) {
    logger.error('Verify OTP error:', error);
    throw error;
  }
};

/**
 * Helper function to normalize phone numbers for matching
 * Handles both +91XXXXXXXXXX and XXXXXXXXXX formats
 */
const normalizePhoneForMatching = (phone) => {
  if (!phone) return null;
  // Remove +91 prefix if present
  return phone.replace(/^\+91/, '');
};

/**
 * Auto-link user to pending invitations after registration
 * Links tournament_registrations with NULL user_id to the newly registered user
 */
const linkPendingInvitations = async (userId, phone) => {
  try {
    const cleanPhone = normalizePhoneForMatching(phone);
    
    // Update tournament_registrations (keep status as 'pending' - organizer still needs to accept)
    const result = await query(`
      UPDATE tournament_registrations 
      SET user_id = ?
      WHERE user_id IS NULL
      AND (
        invited_phone = ? OR 
        invited_phone = ? OR
        REPLACE(invited_phone, '+91', '') = ?
      )
    `, [userId, phone, cleanPhone, cleanPhone]);
    
    if (result.affectedRows > 0) {
      logger.info(`Auto-linked ${result.affectedRows} pending invitation(s) for user ${userId} with phone ${phone}`);
    }
  } catch (error) {
    logger.error('Link pending invitations error:', error);
    // Don't throw - this is a background operation
  }
};

/**
 * Complete registration after OTP verification (Mobile signup flow)
 */
const completeRegistration = async (userData, deviceInfo = null, ipAddress = null) => {
  try {
    // Validate required fields - NO PASSWORD REQUIRED
    const { phone, first_name, last_name, gender, sport_interests, date_of_birth, handedness } = userData;
    
    if (!phone || !first_name || !last_name || !gender) {
      throw new Error('Missing required fields');
    }

    // Check if phone already exists
    if (await User.phoneExists(phone)) {
      throw new Error('Phone number already registered');
    }

    // Verify that OTP was verified for this phone
    const otpVerified = await otpService.isPhoneVerified(phone);
    if (!otpVerified) {
      throw new Error('Phone number not verified. Please verify OTP first.');
    }

    // Generate email from phone if not provided
    const email = userData.email || `${phone.replace('+', '')}@sportlife.temp`;

    // Create user WITHOUT password
    const userId = await User.create({
      email,
      phone,
      password: null, // No password for mobile signup
      first_name,
      last_name,
      gender,
      date_of_birth: date_of_birth || null,
      handedness: handedness || null,
      role: userData.role || 'player',
      phone_verified: true, // Mark phone as verified
      auth_method: 'mobile'
    });

    // Add sport interests if provided
    if (sport_interests && Array.isArray(sport_interests) && sport_interests.length > 0) {
      const sportValues = sport_interests.map(sport => [
        userId,
        sport.sport_id,
        sport.skill_level || 'beginner'
      ]);
      const placeholders = sportValues.map(() => '(?, ?, ?)').join(', ');
      const flatValues = sportValues.flat();
      
      await query(
        `INSERT INTO user_sports (user_id, sport_id, skill_level) VALUES ${placeholders}`,
        flatValues
      );
    }

    // **AUTO-LINK PENDING INVITATIONS**
    await linkPendingInvitations(userId, phone);

    const user = await User.findById(userId);

    // Clear OTP verification record
    await otpService.clearVerification(phone);

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(userId, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Registration completed successfully!'
    };
  } catch (error) {
    logger.error('Complete registration error:', error);
    throw error;
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (token) => {
    try {
      // Find verification token
      const sessions = await query(
        'SELECT * FROM user_sessions WHERE token = ? AND expires_at > NOW()',
        [`verify_${token}`]
      );

      if (sessions.length === 0) {
        throw new Error('Invalid or expired verification token');
      }

      const session = sessions[0];

      // Mark user as verified
      await User.markEmailVerified(session.user_id);

      // Delete verification token
      await query('DELETE FROM user_sessions WHERE id = ?', [session.id]);

      const user = await User.findById(session.user_id);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
      }

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
};

/**
 * Request password reset
 */
const forgotPassword = async (email) => {
    try {
      const user = await User.findByEmail(email);

      if (!user) {
        // Don't reveal if email exists
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

      // Store reset token
      await query(
        'INSERT INTO user_sessions (user_id, token, device_info, expires_at) VALUES (?, ?, ?, ?)',
        [user.id, `reset_${resetToken}`, 'password_reset', expiresAt]
      );

      // Send reset email
      await emailService.sendPasswordResetEmail(user, resetToken);

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      };
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw new Error('Failed to process password reset request');
    }
};

/**
 * Reset password with token
 */
const resetPassword = async (token, newPassword) => {
    try {
      // Find reset token
      const sessions = await query(
        'SELECT * FROM user_sessions WHERE token = ? AND expires_at > NOW()',
        [`reset_${token}`]
      );

      if (sessions.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      const session = sessions[0];

      // Update password
      await User.updatePassword(session.user_id, newPassword);

      // Delete all sessions for this user (logout from all devices)
      await query('DELETE FROM user_sessions WHERE user_id = ?', [session.user_id]);

      return {
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      };
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
};

/**
 * Refresh access token
 */
const refreshToken = async (refreshToken) => {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token exists in database
      const sessions = await query(
        'SELECT * FROM user_sessions WHERE token = ? AND user_id = ? AND expires_at > NOW()',
        [refreshToken, decoded.id]
      );

      if (sessions.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      // Get user
      const user = await User.findById(decoded.id);

      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      return {
        accessToken,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new Error('Invalid or expired refresh token');
    }
};

/**
 * Logout (invalidate refresh token)
 */
const logout = async (refreshToken) => {
  try {
    await query('DELETE FROM user_sessions WHERE token = ?', [refreshToken]);
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    logger.error('Logout error:', error);
    throw error;
  }
};

/**
 * Logout from all devices
 */
const logoutAll = async (userId) => {
  try {
    await query('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    
    return {
      success: true,
      message: 'Logged out from all devices'
    };
  } catch (error) {
    logger.error('Logout all error:', error);
    throw error;
  }
};

/**
 * Change password (when user is logged in)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await User.verifyPassword(user, currentPassword);
    
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    await User.updatePassword(userId, newPassword);

    // Logout from all devices except current
    // (In a real app, you'd want to keep the current session)
    
    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    logger.error('Change password error:', error);
    throw error;
  }
};

/**
 * Complete Google registration with phone verification and additional details
 */
const completeGoogleRegistration = async (userData, deviceInfo = null, ipAddress = null) => {
  try {
    const { googleId, email, phone, first_name, last_name, gender, date_of_birth, handedness, sport_interests } = userData;

    // Validate required fields
    if (!googleId || !email || !phone || !first_name || !last_name || !gender) {
      throw new Error('Missing required fields');
    }

    // Check if phone already exists
    if (await User.phoneExists(phone)) {
      throw new Error('Phone number already registered');
    }

    // Verify that OTP was verified for this phone
    const otpVerified = await otpService.isPhoneVerified(phone);
    if (!otpVerified) {
      throw new Error('Phone number not verified. Please verify OTP first.');
    }

    // Create user with Google data - NO PASSWORD
    const userId = await User.create({
      email,
      phone,
      password: null, // No password for Google signup
      google_id: googleId,
      first_name,
      last_name,
      gender,
      date_of_birth,
      handedness,
      profile_image: userData.profile_image,
      role: 'player',
      phone_verified: true, // Mark phone as verified
      auth_method: 'google'
    });

    // Add sport interests if provided
    if (sport_interests && Array.isArray(sport_interests) && sport_interests.length > 0) {
      const sportValues = sport_interests.map(sport => [
        userId,
        sport.sport_id,
        sport.skill_level || 'beginner'
      ]);
      const placeholders = sportValues.map(() => '(?, ?, ?)').join(', ');
      const flatValues = sportValues.flat();
      
      await query(
        `INSERT INTO user_sports (user_id, sport_id, skill_level) VALUES ${placeholders}`,
        flatValues
      );
    }

    // **AUTO-LINK PENDING INVITATIONS**
    await linkPendingInvitations(userId, phone);

    const user = await User.findById(userId);

    // Clear OTP verification record
    await otpService.clearVerification(phone);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
    }

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(userId, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Google registration completed successfully!'
    };
  } catch (error) {
    logger.error('Complete Google registration error:', error);
    throw error;
  }
};

/**
 * Get Google OAuth authorization URL
 */
const getGoogleAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  return authUrl;
};

/**
 * Handle Google OAuth callback
 * Exchange authorization code for tokens and authenticate user
 */
const googleCallback = async (code, deviceInfo = null, ipAddress = null) => {
  try {
    // Exchange authorization code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Verify the ID token and get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const given_name = payload.given_name;
    const family_name = payload.family_name;
    const picture = payload.picture;

    // Check if user exists with this Google ID
    let user = await User.findByGoogleId(googleId);

    if (!user) {
      // Check if user exists with this email
      user = await User.findByEmail(email);

      if (user) {
        // Link Google account to existing user
        await User.update(user.id, { google_id: googleId });
        user.google_id = googleId;
      } else {
        // New user - return Google data for profile completion (with phone verification)
        return {
          needsProfileCompletion: true,
          googleData: {
            googleId,
            email,
            first_name: given_name || '',
            last_name: family_name || '',
            profile_image: picture
          },
          message: 'Please verify your phone number and complete your profile'
        };
      }
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Generate tokens
    const authTokens = generateTokens(user);
    await storeRefreshToken(user.id, authTokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens: authTokens,
      message: 'Google authentication successful'
    };
  } catch (error) {
    logger.error('Google callback error:', error);
    throw error;
  }
};

/**
 * Facebook OAuth login/register
 * For new users: requires phone verification
 * For existing users: direct login
 */
const facebookAuth = async (accessToken, deviceInfo = null, ipAddress = null, userInfo = null) => {
  try {
    let facebookId, email, first_name, last_name, picture;

    // If userInfo is provided (from frontend), use it directly
    if (userInfo) {
      facebookId = userInfo.id;
      email = userInfo.email;
      first_name = userInfo.first_name || userInfo.name?.split(' ')[0];
      last_name = userInfo.last_name || userInfo.name?.split(' ').slice(1).join(' ');
      picture = userInfo.picture?.data?.url;
    } else {
      // Otherwise fetch user info from Facebook Graph API
      const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture&access_token=${accessToken}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error('Invalid Facebook access token');
      }

      facebookId = data.id;
      email = data.email;
      first_name = data.first_name;
      last_name = data.last_name;
      picture = data.picture?.data?.url;
    }

    // Check if user exists with this Facebook ID
    let user = await User.findByFacebookId(facebookId);

    if (!user) {
      // Check if user exists with this email
      if (email) {
        user = await User.findByEmail(email);
      }

      if (user) {
        // Link Facebook account to existing user
        await User.update(user.id, { facebook_id: facebookId });
        user.facebook_id = facebookId;
      } else {
        // New user - return Facebook data for profile completion (with phone verification)
        return {
          needsProfileCompletion: true,
          facebookData: {
            facebookId,
            email: email || '',
            first_name: first_name || '',
            last_name: last_name || '',
            profile_image: picture
          },
          message: 'Please verify your phone number and complete your profile'
        };
      }
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(user.id, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Facebook authentication successful'
    };
  } catch (error) {
    logger.error('Facebook auth error:', error);
    throw new Error('Facebook authentication failed');
  }
};

/**
 * Complete Facebook registration with phone verification and additional details
 */
const completeFacebookRegistration = async (userData, deviceInfo = null, ipAddress = null) => {
  try {
    const { facebookId, email, phone, first_name, last_name, gender, date_of_birth, handedness, sport_interests } = userData;

    // Validate required fields
    if (!facebookId || !phone || !first_name || !last_name || !gender) {
      throw new Error('Missing required fields');
    }

    // Check if phone already exists
    if (await User.phoneExists(phone)) {
      throw new Error('Phone number already registered');
    }

    // Verify that OTP was verified for this phone
    const otpVerified = await otpService.isPhoneVerified(phone);
    if (!otpVerified) {
      throw new Error('Phone number not verified. Please verify OTP first.');
    }

    // Create user with Facebook data - NO PASSWORD
    const userId = await User.create({
      email: email || null,
      phone,
      password: null, // No password for Facebook signup
      facebook_id: facebookId,
      first_name,
      last_name,
      gender,
      date_of_birth,
      handedness,
      profile_image: userData.profile_image,
      role: 'player',
      phone_verified: true, // Mark phone as verified
      auth_method: 'facebook'
    });

    // Add sport interests if provided
    if (sport_interests && Array.isArray(sport_interests) && sport_interests.length > 0) {
      const sportValues = sport_interests.map(sport => [
        userId,
        sport.sport_id,
        sport.skill_level || 'beginner'
      ]);
      const placeholders = sportValues.map(() => '(?, ?, ?)').join(', ');
      const flatValues = sportValues.flat();
      
      await query(
        `INSERT INTO user_sports (user_id, sport_id, skill_level) VALUES ${placeholders}`,
        flatValues
      );
    }

    // **AUTO-LINK PENDING INVITATIONS**
    await linkPendingInvitations(userId, phone);

    const user = await User.findById(userId);

    // Clear OTP verification record
    await otpService.clearVerification(phone);

    // Send welcome email if email exists
    if (email) {
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
      }
    }

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(userId, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Facebook registration completed successfully!'
    };
  } catch (error) {
    logger.error('Complete Facebook registration error:', error);
    throw error;
  }
};

/**
 * Recover deleted account
 */
const recoverDeletedAccount = async (phone, otp, deviceInfo = null, ipAddress = null) => {
  try {
    // Verify OTP first
    const otpResult = await otpService.verifyOTP(phone, otp);
    if (!otpResult.success) {
      throw new Error('Invalid or expired OTP');
    }
    
    // Find deleted user
    const deletedUser = await User.findDeletedByPhone(phone);
    
    if (!deletedUser) {
      throw new Error('No deleted account found for this phone number');
    }
    
    // Recover the account
    const recoveredUser = await User.recoverAccount(deletedUser.id);
    
    // Clear OTP verification
    await otpService.clearVerification(phone);
    
    // Generate tokens
    const tokens = generateTokens(recoveredUser);
    await storeRefreshToken(recoveredUser.id, tokens.refreshToken, deviceInfo, ipAddress);
    
    // Remove sensitive data
    delete recoveredUser.password_hash;
    
    return {
      user: recoveredUser,
      tokens,
      message: 'Welcome back! Your account has been recovered successfully.'
    };
  } catch (error) {
    logger.error('Recover deleted account error:', error);
    throw error;
  }
};

/**
 * Apple Sign-In authentication
 * Verifies Apple identity token from mobile app
 * For new users: requires phone verification
 * For existing users: direct login
 */
const appleAuth = async (identityToken, userInfo = null, deviceInfo = null, ipAddress = null) => {
  try {
    const appleVerify = require('apple-signin-auth');
    
    // Verify the identity token
    const appleData = await appleVerify.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID || process.env.APPLE_BUNDLE_ID,
      ignoreExpiration: false
    });

    const appleId = appleData.sub;
    const email = appleData.email || userInfo?.email;

    // Check if user exists with this Apple ID
    let user = await User.findByAppleId(appleId);

    if (!user) {
      // Check if user exists with this email
      if (email) {
        user = await User.findByEmail(email);
      }

      if (user) {
        // Link Apple account to existing user
        await User.update(user.id, { apple_id: appleId });
        user.apple_id = appleId;
      } else {
        // New user - return Apple data for profile completion (with phone verification)
        return {
          needsProfileCompletion: true,
          appleData: {
            appleId,
            email: email || '',
            first_name: userInfo?.firstName || userInfo?.givenName || '',
            last_name: userInfo?.lastName || userInfo?.familyName || ''
          },
          message: 'Please verify your phone number and complete your profile'
        };
      }
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(user.id, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Apple authentication successful'
    };
  } catch (error) {
    logger.error('Apple auth error:', error);
    throw new Error('Apple authentication failed: ' + error.message);
  }
};

/**
 * Complete Apple registration with phone verification and additional details
 */
const completeAppleRegistration = async (userData, deviceInfo = null, ipAddress = null) => {
  try {
    const { appleId, email, phone, first_name, last_name, gender, date_of_birth, handedness, sport_interests } = userData;

    // Validate required fields
    if (!appleId || !phone || !first_name || !last_name || !gender) {
      throw new Error('Missing required fields');
    }

    // Check if phone already exists
    if (await User.phoneExists(phone)) {
      throw new Error('Phone number already registered');
    }

    // Verify that OTP was verified for this phone
    const otpVerified = await otpService.isPhoneVerified(phone);
    if (!otpVerified) {
      throw new Error('Phone number not verified. Please verify OTP first.');
    }

    // Generate email from phone if not provided
    const userEmail = email || `${phone.replace('+', '')}@sportlife.apple`;

    // Create user with Apple data - NO PASSWORD
    const userId = await User.create({
      email: userEmail,
      phone,
      password: null, // No password for Apple signup
      apple_id: appleId,
      first_name,
      last_name,
      gender,
      date_of_birth,
      handedness,
      profile_image: userData.profile_image || null,
      role: 'player',
      phone_verified: true, // Mark phone as verified
      auth_method: 'apple'
    });

    // Add sport interests if provided
    if (sport_interests && Array.isArray(sport_interests) && sport_interests.length > 0) {
      const sportValues = sport_interests.map(sport => [
        userId,
        sport.sport_id,
        sport.skill_level || 'beginner'
      ]);
      const placeholders = sportValues.map(() => '(?, ?, ?)').join(', ');
      const flatValues = sportValues.flat();
      
      await query(
        `INSERT INTO user_sports (user_id, sport_id, skill_level) VALUES ${placeholders}`,
        flatValues
      );
    }

    // **AUTO-LINK PENDING INVITATIONS**
    await linkPendingInvitations(userId, phone);

    const user = await User.findById(userId);

    // Clear OTP verification record
    await otpService.clearVerification(phone);

    // Send welcome email if email exists and is not temp
    if (email && !email.includes('@sportlife.apple')) {
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
      }
    }

    // Generate tokens
    const tokens = generateTokens(user);
    await storeRefreshToken(userId, tokens.refreshToken, deviceInfo, ipAddress);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      tokens,
      message: 'Apple registration completed successfully!'
    };
  } catch (error) {
    logger.error('Complete Apple registration error:', error);
    throw error;
  }
};

module.exports = {
  generateTokens,
  storeRefreshToken,
  register,
  login,
  loginWithOTP,
  googleAuth,
  facebookAuth,
  appleAuth,
  getGoogleAuthUrl,
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
  refreshToken,
  logout,
  logoutAll,
  changePassword,
  recoverDeletedAccount
};

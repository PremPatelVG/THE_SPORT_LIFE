const { query } = require('../config/database');
const crypto = require('crypto');
const logger = require('../utils/logger');
const msg91Service = require('../utils/msg91Service');

/**
 * Test phone numbers that always return 123456 OTP
 */
const TEST_PHONE_NUMBERS = [
  '+919999999999',
  '9999999999',
  '+918888888888',
  '8888888888',
  '+919898989898',
  '9898989898'
];

/**
 * Check if phone is a test number
 */
const isTestPhoneNumber = (phone) => {
  const normalizedPhone = phone.replace(/[^0-9]/g, '');
  return TEST_PHONE_NUMBERS.some(testPhone => {
    const normalizedTest = testPhone.replace(/[^0-9]/g, '');
    return normalizedPhone === normalizedTest;
  });
};

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via SMS (using MSG91)
 */
const sendOTP = async (phone, otp) => {
    try {
      const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || '10';
      
      // Format mobile number with country code
      const formattedPhone = msg91Service.formatMobileNumber(phone, '91');
      
      // Send OTP via MSG91 (auto-handles dev/production)
      const result = await msg91Service.sendOTP(formattedPhone, otp, expiryMinutes);
      
      if (result.success) {
        logger.info(`✅ OTP sent to ${formattedPhone}`);
        return true;
      } else {
        logger.error(`❌ Failed to send OTP to ${formattedPhone}:`, result.message);
        return false;
      }
    } catch (error) {
      logger.error('Failed to send OTP:', error);
      return false;
    }
};

/**
 * Create OTP record in database
 */
const createOTP = async (phone) => {
  try {
    // Generate OTP
    // Test phone numbers always return 123456
    // In dev mode, MSG91 service will return 123456 regardless of what we send
    // In production, it will send the actual OTP
    const otp = isTestPhoneNumber(phone) ? '123456' : (msg91Service.isDevMode() ? '123456' : generateOTP());
    
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
    
    const sql = `
      INSERT INTO otp_verifications (phone, otp_code, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
    `;

    await query(sql, [phone, otp, expiryMinutes]);
    
    // Send OTP via SMS (MSG91)
    const smsSent = await sendOTP(phone, otp);
    
    if (!smsSent) {
      logger.warn('⚠️  SMS sending failed, but OTP stored in database');
    }
    
    return {
      success: true,
      message: isTestPhoneNumber(phone) 
        ? 'OTP sent successfully (TEST NUMBER - Use 123456)'
        : (msg91Service.isDevMode() 
          ? 'OTP sent successfully (DEV MODE - Use 123456)' 
          : 'OTP sent successfully'),
      expiresIn: expiryMinutes * 60, // in seconds
      // Include OTP in dev mode or for test numbers
      ...((msg91Service.isDevMode() || isTestPhoneNumber(phone)) && { devOTP: '123456' })
    };
  } catch (error) {
    console.error('❌ Failed to send OTP:', error); // log actual error
    throw new Error('Failed to send OTP. Please try again.'); // rethrow
  }
};


/**
 * Verify OTP
 */
const verifyOTP = async (phone, otpCode) => {
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;

    // Get the latest OTP for this phone
    const sql = `
      SELECT * FROM otp_verifications
      WHERE phone = ? AND is_verified = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const otps = await query(sql, [phone]);

    if (otps.length === 0) {
      throw new Error('No OTP found for this phone number');
    }

    const otpRecord = otps[0];

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= maxAttempts) {
      throw new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
    }

    // Increment attempts
    await query(
      'UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?',
      [otpRecord.id]
    );

    // Verify OTP
    if (otpRecord.otp_code !== otpCode) {
      const remainingAttempts = maxAttempts - (otpRecord.attempts + 1);
      throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
    }

    // Mark as verified
    await query(
      'UPDATE otp_verifications SET is_verified = TRUE WHERE id = ?',
      [otpRecord.id]
    );

    return {
      success: true,
      message: 'OTP verified successfully'
    };
};

/**
 * Resend OTP
 */
const resendOTP = async (phone) => {
    // Invalidate previous OTPs
    await query(
      'UPDATE otp_verifications SET is_verified = TRUE WHERE phone = ? AND is_verified = FALSE',
      [phone]
    );

    // Create new OTP
    return await createOTP(phone);
};

/**
 * Clean up expired OTPs (should be run periodically)
 */
const cleanupExpiredOTPs = async () => {
    const sql = `
      DELETE FROM otp_verifications
      WHERE expires_at < NOW() AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;
    
    const result = await query(sql);
    logger.info(`Cleaned up ${result.affectedRows} expired OTP records`);
    return result.affectedRows;
};

/**
 * Check if phone has verified OTP recently
 */
const hasRecentVerification = async (phone, minutesAgo = 30) => {
    const sql = `
      SELECT * FROM otp_verifications
      WHERE phone = ? 
        AND is_verified = TRUE
        AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const otps = await query(sql, [phone, minutesAgo]);
    return otps.length > 0;
};

/**
 * Check if phone number is verified (for registration flow)
 * Allow 30 minutes after verification for user to complete registration
 */
const isPhoneVerified = async (phone) => {
    const sql = `
      SELECT * FROM otp_verifications
      WHERE phone = ? 
        AND is_verified = TRUE
        AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const otps = await query(sql, [phone]);
    return otps.length > 0;
};

/**
 * Clear verification record after successful registration
 */
const clearVerification = async (phone) => {
    await query(
      'DELETE FROM otp_verifications WHERE phone = ?',
      [phone]
    );
};

module.exports = {
  generateOTP,
  sendOTP,
  createOTP,
  verifyOTP,
  resendOTP,
  cleanupExpiredOTPs,
  hasRecentVerification,
  isPhoneVerified,
  clearVerification
};

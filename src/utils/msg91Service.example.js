/**
 * MSG91 Service Usage Examples
 * 
 * This file demonstrates how to use the MSG91 OTP service
 * in your controllers or services.
 */

const msg91Service = require('./msg91Service');

// ============================================
// Example 1: Send OTP during User Registration
// ============================================
async function sendRegistrationOTP(mobile) {
  try {
    // Generate OTP
    const otp = msg91Service.generateOTP();
    
    // Format mobile number (adds country code if needed)
    const formattedMobile = msg91Service.formatMobileNumber(mobile, '91');
    
    // Send OTP (10 minutes validity)
    const result = await msg91Service.sendOTP(formattedMobile, otp, '10');
    
    if (result.success) {
      console.log('✅ OTP sent successfully');
      
      // In DEV mode, result.data.otp will always be "123456"
      // In PRODUCTION mode, result.data contains MSG91 API response
      
      // Store OTP in database with expiry time
      // await saveOTPToDatabase(mobile, otp, expiryTime);
      
      return {
        success: true,
        message: 'OTP sent successfully',
        // Don't send actual OTP in response for security
        mobile: formattedMobile
      };
    } else {
      console.error('❌ Failed to send OTP:', result.message);
      return {
        success: false,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
}

// ============================================
// Example 2: Send OTP during Login
// ============================================
async function sendLoginOTP(mobile) {
  try {
    const otp = msg91Service.generateOTP();
    const formattedMobile = msg91Service.formatMobileNumber(mobile);
    
    // Send OTP with 5 minutes validity
    const result = await msg91Service.sendOTP(formattedMobile, otp, '5');
    
    if (result.success) {
      // Store OTP in database or cache (Redis)
      // await storeOTPInCache(mobile, otp, 300); // 5 minutes = 300 seconds
      
      return {
        success: true,
        message: 'OTP sent to your mobile number'
      };
    }
    
    return {
      success: false,
      message: 'Failed to send OTP'
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================
// Example 3: Verify OTP
// ============================================
async function verifyOTP(mobile, userEnteredOTP) {
  try {
    // Check environment
    if (msg91Service.isDevMode()) {
      // In DEV mode, accept "123456" as valid OTP
      if (userEnteredOTP === '123456') {
        return {
          success: true,
          message: 'OTP verified successfully (DEV MODE)'
        };
      }
    }
    
    // In PRODUCTION, verify against database stored OTP
    // const storedOTP = await getOTPFromDatabase(mobile);
    // const isValid = storedOTP === userEnteredOTP;
    // const isExpired = checkIfOTPExpired(mobile);
    
    // if (isExpired) {
    //   return { success: false, message: 'OTP expired' };
    // }
    
    // if (isValid) {
    //   await deleteOTPFromDatabase(mobile); // Clear used OTP
    //   return { success: true, message: 'OTP verified successfully' };
    // }
    
    return {
      success: false,
      message: 'Invalid OTP'
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

// ============================================
// Example 4: Check Environment
// ============================================
function checkEnvironment() {
  console.log('Current Environment:', msg91Service.getEnvironment());
  console.log('Is Dev Mode:', msg91Service.isDevMode());
  
  if (msg91Service.isDevMode()) {
    console.log('⚠️  Running in DEVELOPMENT mode - OTPs will not be sent via SMS');
    console.log('💡 Use OTP: 123456 for testing');
  } else {
    console.log('🚀 Running in PRODUCTION mode - OTPs will be sent via MSG91');
  }
}

// ============================================
// Example 5: Integration in Auth Controller
// ============================================
class AuthController {
  async signup(req, res) {
    try {
      const { mobile, name, email } = req.body;
      
      // Generate and send OTP
      const otp = msg91Service.generateOTP();
      const formattedMobile = msg91Service.formatMobileNumber(mobile);
      
      const result = await msg91Service.sendOTP(formattedMobile, otp, '10');
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP'
        });
      }
      
      // Store OTP in database with user details
      // await User.storeOTP(mobile, otp, name, email);
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          mobile: formattedMobile,
          expiryMinutes: 10,
          // In dev mode, you might want to include OTP for testing
          ...(msg91Service.isDevMode() && { otp: '123456' })
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  async verifyOTP(req, res) {
    try {
      const { mobile, otp } = req.body;
      
      // In dev mode, accept 123456
      if (msg91Service.isDevMode() && otp === '123456') {
        // Create user account or login
        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully (DEV MODE)',
          token: 'jwt_token_here'
        });
      }
      
      // In production, verify against database
      // const isValid = await User.verifyOTP(mobile, otp);
      
      // if (isValid) {
      //   const token = generateJWT(user);
      //   return res.status(200).json({
      //     success: true,
      //     message: 'Login successful',
      //     token: token
      //   });
      // }
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

// Export examples
module.exports = {
  sendRegistrationOTP,
  sendLoginOTP,
  verifyOTP,
  checkEnvironment,
  AuthController
};

# MSG91 OTP Service Implementation Guide

## Overview
MSG91 OTP service with environment-based logic for sending SMS OTPs during user authentication (signup/login).

## Features
✅ **Environment-Based Logic**
- **DEV Mode**: Returns mock OTP (`123456`) without sending SMS
- **PRODUCTION Mode**: Sends actual OTP via MSG91 API

✅ **Helper Functions**
- Generate random 6-digit OTP
- Format mobile numbers with country code
- Send OTP with custom validity period
- Environment detection

✅ **Error Handling**
- Comprehensive error logging
- Graceful fallback in case of API failures
- Detailed error responses

---

## Configuration

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Node Environment (controls OTP behavior)
NODE_ENV=development  # Use 'production' for live environment

# MSG91 Configuration
MSG91_AUTH_KEY=481367AukcilfN46953ab17P1
MSG91_OTP_TEMPLATE_ID=694f7872f96596599d2c3ea2
```

### 2. MSG91 Template
**Template ID**: `694f7872f96596599d2c3ea2`

**Template Message**:
```
The sportlife verification code is: ##otp##. Valid for ##time## minutes. Regards, The sportlife team
```

**Variables**:
- `##otp##` - OTP code (6 digits)
- `##time##` - Validity period in minutes

---

## Usage

### Basic Import
```javascript
const msg91Service = require('./utils/msg91Service');
```

### 1. Send OTP
```javascript
// Generate OTP
const otp = msg91Service.generateOTP(); // Returns: "123456" (random 6 digits)

// Format mobile number (adds country code)
const mobile = msg91Service.formatMobileNumber('9408373007', '91'); // Returns: "919408373007"

// Send OTP
const result = await msg91Service.sendOTP(mobile, otp, '10'); // 10 minutes validity

if (result.success) {
  console.log('OTP sent successfully');
  // Store OTP in database for verification
} else {
  console.error('Failed to send OTP:', result.message);
}
```

### 2. Development vs Production Behavior

#### Development Mode (`NODE_ENV=development`)
```javascript
const result = await msg91Service.sendOTP('919408373007', '123456', '10');

// Console Output:
// 🔧 [DEV MODE] MSG91 OTP Service - Mock Response
// 📱 Mobile: 919408373007
// 🔑 OTP: 123456 (Mock OTP for development)
// ⏱️  Validity: 10 minutes

// Response:
{
  success: true,
  message: 'OTP sent successfully (DEV MODE - Mock)',
  data: {
    type: 'success',
    message: 'Mock OTP for development',
    otp: '123456',
    mobile: '919408373007',
    environment: 'development'
  }
}
```

#### Production Mode (`NODE_ENV=production`)
```javascript
const result = await msg91Service.sendOTP('919408373007', '654321', '10');

// Console Output:
// 📤 [PRODUCTION] Sending OTP via MSG91...
// 📱 Mobile: 919408373007
// ⏱️  Validity: 10 minutes
// ✅ OTP sent successfully via MSG91

// Response:
{
  success: true,
  message: 'OTP sent successfully',
  data: {
    // MSG91 API response
    type: 'success',
    message: 'Message sent successfully'
  }
}
```

### 3. Helper Functions

#### Generate OTP
```javascript
const otp = msg91Service.generateOTP();
// Returns: "123456" (random 6-digit number)
```

#### Format Mobile Number
```javascript
// With country code
const mobile1 = msg91Service.formatMobileNumber('9408373007', '91');
// Returns: "919408373007"

// Already has country code
const mobile2 = msg91Service.formatMobileNumber('919408373007', '91');
// Returns: "919408373007"

// Default country code (India: 91)
const mobile3 = msg91Service.formatMobileNumber('9408373007');
// Returns: "919408373007"
```

#### Check Environment
```javascript
const env = msg91Service.getEnvironment();
// Returns: "development" or "production"

const isDev = msg91Service.isDevMode();
// Returns: true or false
```

---

## Integration Examples

### Example 1: User Signup with OTP

```javascript
// controllers/authController.js
const msg91Service = require('../utils/msg91Service');
const User = require('../models/User');

exports.signup = async (req, res) => {
  try {
    const { mobile, name, email } = req.body;
    
    // Validate mobile number
    if (!mobile || mobile.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findByMobile(mobile);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    // Generate OTP
    const otp = msg91Service.generateOTP();
    
    // Format mobile number
    const formattedMobile = msg91Service.formatMobileNumber(mobile);
    
    // Send OTP
    const result = await msg91Service.sendOTP(formattedMobile, otp, '10');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }
    
    // Store OTP in database with expiry
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await User.storeOTP({
      mobile: formattedMobile,
      otp: otp,
      name: name,
      email: email,
      expiresAt: expiryTime
    });
    
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        mobile: formattedMobile,
        expiryMinutes: 10,
        // Include OTP in dev mode for testing
        ...(msg91Service.isDevMode() && { devOTP: '123456' })
      }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

### Example 2: Verify OTP

```javascript
// controllers/authController.js
exports.verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    
    // Validate inputs
    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile and OTP are required'
      });
    }
    
    const formattedMobile = msg91Service.formatMobileNumber(mobile);
    
    // In dev mode, accept 123456
    if (msg91Service.isDevMode() && otp === '123456') {
      // Get pending user data
      const userData = await User.getPendingUser(formattedMobile);
      
      if (!userData) {
        return res.status(400).json({
          success: false,
          message: 'No pending registration found'
        });
      }
      
      // Create user account
      const user = await User.create(userData);
      
      // Generate JWT token
      const token = generateJWT(user);
      
      return res.status(200).json({
        success: true,
        message: 'Registration successful (DEV MODE)',
        token: token,
        user: user
      });
    }
    
    // Production mode: Verify against database
    const storedOTP = await User.getOTP(formattedMobile);
    
    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired'
      });
    }
    
    // Check if OTP is expired
    if (new Date() > new Date(storedOTP.expiresAt)) {
      await User.deleteOTP(formattedMobile);
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new one.'
      });
    }
    
    // Verify OTP
    if (storedOTP.otp !== otp) {
      // Increment attempt count
      await User.incrementOTPAttempts(formattedMobile);
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    
    // OTP is valid - Create user account
    const userData = await User.getPendingUser(formattedMobile);
    const user = await User.create(userData);
    
    // Clear OTP
    await User.deleteOTP(formattedMobile);
    
    // Generate JWT token
    const token = generateJWT(user);
    
    return res.status(200).json({
      success: true,
      message: 'Registration successful',
      token: token,
      user: user
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

### Example 3: Resend OTP

```javascript
// controllers/authController.js
exports.resendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }
    
    const formattedMobile = msg91Service.formatMobileNumber(mobile);
    
    // Check if user has pending registration
    const userData = await User.getPendingUser(formattedMobile);
    
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found'
      });
    }
    
    // Generate new OTP
    const otp = msg91Service.generateOTP();
    
    // Send OTP
    const result = await msg91Service.sendOTP(formattedMobile, otp, '10');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP'
      });
    }
    
    // Update OTP in database
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
    await User.updateOTP(formattedMobile, otp, expiryTime);
    
    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        mobile: formattedMobile,
        expiryMinutes: 10,
        ...(msg91Service.isDevMode() && { devOTP: '123456' })
      }
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

---

## Testing

### Development Testing
1. Set `NODE_ENV=development` in `.env`
2. Send OTP request
3. Use OTP: `123456` for verification
4. No actual SMS will be sent

### Production Testing
1. Set `NODE_ENV=production` in `.env`
2. Ensure MSG91 credentials are configured
3. Send OTP request
4. Check mobile for actual SMS
5. Use received OTP for verification

---

## Error Handling

### Common Errors

#### 1. Missing Credentials (Production)
```javascript
{
  success: false,
  message: 'MSG91 credentials not configured. Please set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in .env file'
}
```

#### 2. Invalid Mobile Number
```javascript
{
  success: false,
  message: 'Mobile number is required'
}
```

#### 3. MSG91 API Error
```javascript
{
  success: false,
  message: 'Failed to send OTP',
  error: {
    status: 400,
    data: { message: 'Invalid template ID' },
    message: 'Request failed with status code 400'
  }
}
```

---

## Database Schema (Recommended)

### OTP Storage Table
```sql
CREATE TABLE user_otps (
  id INT PRIMARY KEY AUTO_INCREMENT,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  otp VARCHAR(6) NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  attempts INT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile (mobile),
  INDEX idx_expires_at (expires_at)
);
```

---

## Security Best Practices

1. **Never return OTP in API response** (except in dev mode for testing)
2. **Limit OTP attempts** (max 3-5 attempts)
3. **Set expiry time** (5-10 minutes)
4. **Rate limit OTP requests** (prevent spam)
5. **Clear OTP after successful verification**
6. **Hash OTP before storing** (optional, for extra security)
7. **Use HTTPS** in production
8. **Validate mobile number format**

---

## Troubleshooting

### Issue 1: OTP not received in production
- Check MSG91 credentials are correct
- Verify template ID is active
- Check mobile number format (should include country code)
- Check MSG91 account balance
- Review MSG91 API logs

### Issue 2: Always getting dev OTP in production
- Verify `NODE_ENV=production` in `.env`
- Restart server after changing environment variable
- Check `msg91Service.getEnvironment()` output

### Issue 3: Invalid template error
- Verify template ID matches MSG91 dashboard
- Ensure template is approved and active
- Check template variables match (##otp##, ##time##)

---

## Files Created

1. **`src/utils/msg91Service.js`** - Main service file
2. **`src/utils/msg91Service.example.js`** - Usage examples
3. **`.env.example`** - Updated with MSG91 configuration
4. **`MSG91_IMPLEMENTATION_GUIDE.md`** - This documentation

---

## Next Steps

1. ✅ Add MSG91 credentials to your `.env` file
2. ✅ Import and use `msg91Service` in your auth controller
3. ✅ Create database table for OTP storage
4. ✅ Implement OTP verification logic
5. ✅ Test in development mode (OTP: 123456)
6. ✅ Test in production mode with real mobile number
7. ✅ Add rate limiting for OTP requests
8. ✅ Implement OTP attempt tracking

---

## Support

For MSG91 API documentation, visit: https://docs.msg91.com/

For issues or questions, contact your development team.

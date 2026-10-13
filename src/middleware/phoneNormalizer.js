/**
 * Phone Number Normalizer Middleware
 * Automatically adds +91 prefix for Indian phone numbers
 */

/**
 * Normalize Indian phone numbers
 * Handles both formats: 1234567890 and +911234567890
 */
const normalizeIndianPhone = (req, res, next) => {
  if (req.body.phone) {
    let phone = req.body.phone.toString().trim();
    
    // Remove all non-digit characters except +
    phone = phone.replace(/[^\d+]/g, '');
    
    // If starts with +91, keep as is
    if (phone.startsWith('+91')) {
      req.body.phone = phone;
    }
    // If starts with 91 (without +), add +
    else if (phone.startsWith('91') && phone.length === 12) {
      req.body.phone = `+${phone}`;
    }
    // If 10 digits (Indian number without country code), add +91
    else if (phone.length === 10 && /^[6-9]\d{9}$/.test(phone)) {
      req.body.phone = `+91${phone}`;
    }
    // If starts with 0, remove it and add +91 (old format)
    else if (phone.startsWith('0') && phone.length === 11) {
      req.body.phone = `+91${phone.substring(1)}`;
    }
    
    // Validate final format
    if (!req.body.phone.match(/^\+91[6-9]\d{9}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Indian phone number. Please enter a valid 10-digit mobile number.'
      });
    }
  }
  
  next();
};

/**
 * Validate Indian phone number format
 */
const validateIndianPhone = (phone) => {
  // Should be +91 followed by 10 digits starting with 6-9
  const indianPhoneRegex = /^\+91[6-9]\d{9}$/;
  return indianPhoneRegex.test(phone);
};

module.exports = {
  normalizeIndianPhone,
  validateIndianPhone
};

# 🔐 Twilio OTP Setup Guide

## Overview
This guide will help you set up Twilio for sending OTP (One-Time Password) via SMS for user authentication.

---

## 📋 Prerequisites
- Twilio Account (Free trial available)
- Phone number for testing
- Backend `.env` file

---

## 🚀 Step-by-Step Setup

### 1. Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free account
3. Verify your email and phone number

### 2. Get Twilio Credentials

After logging in to Twilio Console:

1. **Account SID** and **Auth Token**
   - Go to [Console Dashboard](https://console.twilio.com/)
   - Copy `Account SID` and `Auth Token`

2. **Get a Phone Number**
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number with SMS capability
   - For trial: You get $15 credit and one free number

### 3. Configure Environment Variables

Add these to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
```

**Replace with your actual values:**
- `TWILIO_ACCOUNT_SID`: From Twilio Console Dashboard
- `TWILIO_AUTH_TOKEN`: From Twilio Console Dashboard  
- `TWILIO_PHONE_NUMBER`: Your purchased Twilio phone number (format: +1234567890)

### 4. Verify Phone Numbers (Trial Account)

⚠️ **Important for Trial Accounts:**

Twilio trial accounts can only send SMS to **verified phone numbers**.

**To verify a phone number:**
1. Go to Console → Phone Numbers → Manage → Verified Caller IDs
2. Click "Add a new Caller ID"
3. Enter the phone number you want to test with
4. Complete the verification process

---

## 🧪 Testing

### Development Mode (Without Twilio)

If Twilio credentials are not configured, the OTP will be logged to the console:

```bash
📱 OTP for +911234567890: 123456
```

### Production Mode (With Twilio)

Once configured, SMS will be sent automatically:

```javascript
// Test API endpoint
POST http://localhost:5000/api/v1/auth/send-otp
Content-Type: application/json

{
  "phone": "+911234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

---

## 📱 SMS Message Format

The OTP SMS will look like:

```
Your SportLife verification code is: 123456. Valid for 10 minutes.
```

---

## 💰 Pricing (As of 2024)

### Free Trial
- $15 credit
- 1 free phone number
- Can send SMS to verified numbers only

### After Trial
- **SMS Pricing**: ~$0.0075 per SMS (varies by country)
- **Phone Number**: ~$1/month
- **Pay-as-you-go**: No monthly minimums

---

## 🔧 Troubleshooting

### Issue: "OTP not received"

**Solutions:**
1. Check if phone number is verified (trial accounts)
2. Verify Twilio credentials in `.env`
3. Check Twilio Console → Monitor → Logs for errors
4. Ensure phone number format is correct: `+[country_code][number]`

### Issue: "Failed to send OTP"

**Solutions:**
1. Check Twilio account balance
2. Verify Auth Token is correct
3. Check if Twilio phone number has SMS capability
4. Review error logs in backend console

### Issue: "Invalid phone number"

**Solutions:**
1. Use E.164 format: `+911234567890`
2. Include country code
3. No spaces or special characters

---

## 🌍 International Phone Numbers

Twilio supports international SMS. Format examples:

- **India**: `+911234567890`
- **USA**: `+11234567890`
- **UK**: `+441234567890`
- **Australia**: `+611234567890`

---

## 🔒 Security Best Practices

1. ✅ Never commit `.env` file to Git
2. ✅ Use environment variables for credentials
3. ✅ Set OTP expiry (default: 10 minutes)
4. ✅ Limit OTP attempts (default: 3 attempts)
5. ✅ Rate limit OTP requests
6. ✅ Use HTTPS in production

---

## 📊 Monitoring

Monitor OTP delivery in Twilio Console:

1. Go to Monitor → Logs → Messaging
2. View delivery status, errors, and costs
3. Set up alerts for failures

---

## 🎯 Production Checklist

Before going live:

- [ ] Upgrade from trial account
- [ ] Add sufficient credit
- [ ] Configure production phone number
- [ ] Test with real phone numbers
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Review Twilio security settings
- [ ] Set up billing alerts

---

## 📚 Additional Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [Twilio Pricing](https://www.twilio.com/sms/pricing)
- [Twilio Console](https://console.twilio.com/)

---

## 🆘 Support

If you encounter issues:

1. Check Twilio Console logs
2. Review backend error logs
3. Contact Twilio Support (for account issues)
4. Check our troubleshooting section above

---

**Happy Coding! 🚀**

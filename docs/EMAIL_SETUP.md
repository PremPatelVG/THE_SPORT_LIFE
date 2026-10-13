# Email Service Setup Guide

## Current Status

✅ **Email service is working in DEVELOPMENT MODE**
- Registration works without SMTP configuration
- Emails are logged to console instead of being sent
- No errors thrown during registration

## Development Mode

When SMTP is not configured, the system:
- ✅ Allows registration to complete successfully
- 📧 Logs email content to console for testing
- ⚠️ Shows warning in logs (not an error)
- 🔄 Returns success response

**Console Output Example:**
```
📧 [DEV MODE] Email would be sent to user@example.com: Verify Your SportLife Account

=== EMAIL PREVIEW (Development Mode) ===
To: user@example.com
Subject: Verify Your SportLife Account
Content: Welcome to SportLife! ...
========================================
```

---

## Production Setup

### Option 1: Gmail SMTP (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Add to `.env` file:**
```env
# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=SportLife <noreply@sportlife.com>

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up at:** https://sendgrid.com (Free tier: 100 emails/day)
2. **Create API Key:**
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the API key

3. **Add to `.env` file:**
```env
# Email Configuration (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=SportLife <noreply@sportlife.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Option 3: AWS SES (Best for High Volume)

```env
# Email Configuration (AWS SES)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-smtp-username
SMTP_PASSWORD=your-aws-smtp-password
EMAIL_FROM=SportLife <noreply@sportlife.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Option 4: Mailtrap (Best for Development Testing)

```env
# Email Configuration (Mailtrap - catches all emails)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-username
SMTP_PASSWORD=your-mailtrap-password
EMAIL_FROM=SportLife <noreply@sportlife.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## Email Templates Available

### 1. **Verification Email**
- **Trigger:** Sent automatically on registration
- **Purpose:** Verify user's email address
- **Expiry:** 24 hours
- **Endpoint:** `GET /api/v1/auth/verify-email?token={token}`

### 2. **Password Reset Email**
- **Trigger:** User requests password reset
- **Purpose:** Provide secure reset link
- **Expiry:** 1 hour
- **Endpoint:** `POST /api/v1/auth/reset-password`

### 3. **Welcome Email**
- **Trigger:** After email verification or Google OAuth
- **Purpose:** Welcome user and show features
- **Content:** Dashboard link and feature overview

---

## Testing Email Service

### Test in Development Mode (Current)

```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "TestPass123",
    "first_name": "Test",
    "last_name": "User",
    "gender": "male"
  }'

# Check console output for email preview
```

### Test with SMTP Configured

1. **Configure SMTP** (add settings to `.env`)
2. **Restart server:** `npm run dev`
3. **Check logs for:** `Email service initialized`
4. **Register user** and check email inbox

---

## Troubleshooting

### Issue: "Email service not configured" warning

**Solution:** This is normal in development mode. Add SMTP settings to `.env` for production.

### Issue: "Failed to send email" error

**Possible causes:**
1. Invalid SMTP credentials
2. Gmail blocking "less secure apps" (use App Password)
3. Firewall blocking port 587
4. Wrong SMTP host/port

**Debug steps:**
```bash
# Check if SMTP settings are loaded
node -e "require('dotenv').config(); console.log(process.env.SMTP_HOST)"

# Test SMTP connection
npm install -g nodemailer
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email', pass: 'your-password' }
});
transporter.verify().then(console.log).catch(console.error);
"
```

### Issue: Emails going to spam

**Solutions:**
1. Use verified domain email address
2. Add SPF/DKIM records to your domain
3. Use reputable SMTP service (SendGrid, AWS SES)
4. Avoid spam trigger words in subject/content

---

## Email Service Features

✅ **HTML & Plain Text** - Beautiful HTML with plain text fallback  
✅ **Development Mode** - Console logging when SMTP not configured  
✅ **Error Handling** - Graceful failures don't block registration  
✅ **Responsive Design** - Emails look great on all devices  
✅ **Branded Templates** - SportLife branding with gradient headers  
✅ **Security** - Token-based verification with expiry  

---

## Environment Variables Reference

```env
# Required for email service
SMTP_HOST=smtp.example.com          # SMTP server hostname
SMTP_PORT=587                        # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                    # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=your-email@example.com     # SMTP username
SMTP_PASSWORD=your-password          # SMTP password or API key
EMAIL_FROM=SportLife <noreply@sportlife.com>  # From address

# Required for email links
FRONTEND_URL=http://localhost:3000   # Your frontend URL
```

---

## Next Steps

1. ✅ **Current:** Development mode is working
2. 🔄 **Optional:** Set up Mailtrap for email testing
3. 🚀 **Production:** Configure SendGrid or AWS SES before deployment

---

**Last Updated:** October 15, 2025  
**Status:** ✅ Working in Development Mode

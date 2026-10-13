# ⚙️ Environment Variables Setup Instructions

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file with your actual credentials**

---

## 🔑 Required Configuration

### 1. Database (MySQL)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sportlife
```

### 2. JWT Secrets
```env
JWT_SECRET=generate_random_string_here_min_32_chars
JWT_REFRESH_SECRET=generate_another_random_string_min_32_chars
```

**Generate secure secrets:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

### 3. Twilio (for OTP SMS)

**Get credentials from:** [https://console.twilio.com/](https://console.twilio.com/)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_from_twilio_console
TWILIO_PHONE_NUMBER=+1234567890
```

**Steps:**
1. Sign up at Twilio
2. Get Account SID and Auth Token from dashboard
3. Buy a phone number with SMS capability
4. For trial: Verify test phone numbers

---

## 🔧 Optional Configuration

### Email (SMTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
```

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate App Password: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use App Password in `SMTP_PASSWORD`

### Google OAuth
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

**Get from:** [https://console.cloud.google.com/](https://console.cloud.google.com/)

### Stripe Payment
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Get from:** [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

---

## 🚦 Development vs Production

### Development
```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### Production
```env
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

---

## ✅ Verification Checklist

After setting up `.env`:

- [ ] Database connection works
- [ ] JWT tokens generate correctly
- [ ] Twilio sends OTP (check console logs in dev mode)
- [ ] Email sends (if configured)
- [ ] Google OAuth works (if configured)
- [ ] Stripe payment works (if configured)

**Test database connection:**
```bash
npm run dev
# Check console for "Database connected successfully"
```

**Test OTP (Development Mode):**
```bash
# Without Twilio configured, OTP will print in console:
# 📱 OTP for +911234567890: 123456
```

---

## 🔒 Security Notes

1. ✅ **Never commit `.env` to Git**
   - Already in `.gitignore`
   
2. ✅ **Use strong secrets**
   - Minimum 32 characters
   - Random and unique
   
3. ✅ **Different secrets for dev/prod**
   - Don't reuse production secrets in development
   
4. ✅ **Rotate secrets regularly**
   - Change JWT secrets every 3-6 months
   - Change API keys if compromised

---

## 🆘 Common Issues

### Issue: "Database connection failed"
**Solution:** Check MySQL is running and credentials are correct
```bash
mysql -u root -p
# Enter password and verify connection
```

### Issue: "OTP not sending"
**Solution:** 
- Development: Check console for OTP log
- Production: Verify Twilio credentials and phone number

### Issue: "JWT token invalid"
**Solution:** Ensure `JWT_SECRET` is set and consistent

---

## 📝 Example Complete `.env`

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mypassword123
DB_NAME=sportlife

# JWT
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_REFRESH_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Twilio (OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+11234567890

# OTP Settings
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

**Ready to start! 🚀**

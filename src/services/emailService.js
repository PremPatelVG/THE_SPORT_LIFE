const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Initialize transporter
let transporter = null;

/**
 * Initialize email transporter
 */
const initializeTransporter = () => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.warn('Email service not configured. Emails will be logged only.');
      return;
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    logger.info('Email service initialized');
  } catch (error) {
    logger.error('Failed to initialize email service:', error);
  }
};

// Initialize on module load
initializeTransporter();

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // Development mode - no SMTP configured
  if (!transporter) {
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    return { success: true, messageId: 'dev-mode' };
  }

  // Production mode - send actual email
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send verification email
 */
const sendVerificationEmail = async (user, verificationToken) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Welcome to SportLife!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.first_name},</h2>
            <p>Thank you for registering with SportLife! We're excited to have you join our sports community.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <center>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with SportLife, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SportLife. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to SportLife!
      
      Hi ${user.first_name},
      
      Thank you for registering with SportLife!
      
      Please verify your email address by visiting: ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with SportLife, please ignore this email.
    `;

    return await sendEmail({
      to: user.email,
      subject: 'Verify Your SportLife Account',
      html,
      text
    });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.first_name},</h2>
            <p>We received a request to reset your password for your SportLife account.</p>
            <p>Click the button below to reset your password:</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SportLife. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hi ${user.first_name},
      
      We received a request to reset your password for your SportLife account.
      
      Reset your password by visiting: ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this reset, please ignore this email.
    `;

    return await sendEmail({
      to: user.email,
      subject: 'Reset Your SportLife Password',
      html,
      text
    });
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (user) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SportLife!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.first_name},</h2>
            <p>Your account has been successfully verified! You're now part of the SportLife community.</p>
            
            <h3>What you can do now:</h3>
            <div class="feature">
              <strong>🏆 Join Tournaments</strong><br>
              Browse and register for upcoming tournaments in your favorite sports
            </div>
            <div class="feature">
              <strong>👥 Create Teams</strong><br>
              Form teams and compete with friends
            </div>
            <div class="feature">
              <strong>📊 Track Stats</strong><br>
              Monitor your performance and improve your game
            </div>
            <div class="feature">
              <strong>🎯 Organize Events</strong><br>
              Create and manage your own tournaments
            </div>
            
            <center>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </center>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SportLife. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmail({
      to: user.email,
      subject: 'Welcome to SportLife - Get Started!',
      html
    });
};

module.exports = {
  initializeTransporter,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};

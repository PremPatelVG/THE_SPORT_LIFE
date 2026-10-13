/**
 * Flexible Authentication Middleware
 * Accepts both player tokens (from users table) and admin tokens (from admins table)
 * Useful for routes that should be accessible by both players and admins
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Flexible auth - accepts both player and admin tokens
 */
const flexibleAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Flexible auth: No authorization header');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info(`Flexible auth: Token verified, type: ${decoded.type}, id: ${decoded.id}`);
    } catch (err) {
      logger.error(`Flexible auth: Token verification failed - ${err.message}`);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Check token type and fetch appropriate user
    if (decoded.type === 'admin') {
      // Admin token - fetch from admins table
      const sql = 'SELECT id, email, role, is_active FROM admins WHERE id = ? AND deleted_at IS NULL';
      const admins = await query(sql, [decoded.id]);

      if (!admins || admins.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Admin not found'
        });
      }

      const admin = admins[0];

      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Admin account is deactivated'
        });
      }

      // Attach admin info to request
      req.user = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        userType: 'admin'
      };
      req.admin = admin; // Also attach to req.admin for compatibility

    } else {
      // Player token - fetch from users table
      const sql = 'SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL';
      const users = await query(sql, [decoded.id]);

      if (!users || users.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = users[0];

      // Attach user info to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        userType: 'player'
      };
    }

    next();

  } catch (error) {
    logger.error('Flexible auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Optional flexible auth - doesn't fail if no token provided
 */
const optionalFlexibleAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Invalid token, continue without authentication
      return next();
    }

    // Check token type and fetch appropriate user
    if (decoded.type === 'admin') {
      const sql = 'SELECT id, email, role, is_active FROM admins WHERE id = ? AND deleted_at IS NULL';
      const admins = await query(sql, [decoded.id]);

      if (admins && admins.length > 0 && admins[0].is_active) {
        req.user = {
          id: admins[0].id,
          email: admins[0].email,
          role: admins[0].role,
          userType: 'admin'
        };
        req.admin = admins[0];
      }
    } else {
      const sql = 'SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL';
      const users = await query(sql, [decoded.id]);

      if (users && users.length > 0) {
        req.user = {
          id: users[0].id,
          email: users[0].email,
          role: users[0].role,
          userType: 'player'
        };
      }
    }

    next();

  } catch (error) {
    logger.error('Optional flexible auth middleware error:', error);
    // Don't fail on error, just continue without authentication
    next();
  }
};

module.exports = { flexibleAuth, optionalFlexibleAuth };

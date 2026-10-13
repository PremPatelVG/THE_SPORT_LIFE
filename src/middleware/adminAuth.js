/**
 * Admin Authentication Middleware
 * Verifies admin JWT tokens and ensures access to admin routes
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Verify admin authentication
 * Checks JWT token and verifies admin from admins table
 */
const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.'
      });
    }

    // Verify this is an admin token
    if (decoded.type !== 'admin') {
      logger.warn(`Non-admin token used for admin route: ${decoded.email}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin authentication required.'
      });
    }

    // Fetch admin from database to verify they still exist and are active
    const sql = 'SELECT id, email, role, is_active FROM admins WHERE id = ? AND deleted_at IS NULL';
    const admins = await query(sql, [decoded.id]);

    if (!admins || admins.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Admin account not found'
      });
    }

    const admin = admins[0];

    // Check if admin is active
    if (!admin.is_active) {
      logger.warn(`Inactive admin access attempt: ${admin.email} (ID: ${admin.id})`);
      return res.status(403).json({
        success: false,
        error: 'Admin account is deactivated. Please contact super admin.'
      });
    }

    // Attach admin info to request object
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role
    };

    // Admin is authenticated and active, allow access
    next();

  } catch (error) {
    logger.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Verify super admin role
 * Must be used after adminAuth middleware
 */
const superAdminAuth = async (req, res, next) => {
  try {
    if (!req.admin || req.admin.role !== 'super_admin') {
      logger.warn(`Unauthorized super admin access attempt by admin ${req.admin?.id}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin privileges required.'
      });
    }

    next();
  } catch (error) {
    logger.error('Super admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = { adminAuth, superAdminAuth };

const adminAuthService = require('../services/adminAuthService');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

/**
 * Admin login with email and password
 * POST /api/v1/admin/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const result = await adminAuthService.login(email, password, deviceInfo, ipAddress);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        admin: result.admin,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Admin login controller error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Refresh access token
 * POST /api/v1/admin/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await adminAuthService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    logger.error('Admin refresh token controller error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Logout admin
 * POST /api/v1/admin/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await adminAuthService.logout(refreshToken);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Admin logout controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Logout from all devices
 * POST /api/v1/admin/auth/logout-all
 */
const logoutAll = async (req, res) => {
  try {
    const result = await adminAuthService.logoutAll(req.admin.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Admin logout all controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get current admin profile
 * GET /api/v1/admin/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const profile = await Admin.getProfile(req.admin.id);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Get admin profile controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

/**
 * Update admin profile
 * PUT /api/v1/admin/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const result = await adminAuthService.updateProfile(req.admin.id, req.body);
    
    res.json({
      success: true,
      message: result.message,
      data: result.admin
    });
  } catch (error) {
    logger.error('Update admin profile controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Change password
 * POST /api/v1/admin/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await adminAuthService.changePassword(
      req.admin.id,
      currentPassword,
      newPassword
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Admin change password controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create new admin (super admin only)
 * POST /api/v1/admin/auth/create-admin
 */
const createAdmin = async (req, res) => {
  try {
    const result = await adminAuthService.createAdmin(req.body, req.admin.id);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.admin
    });
  } catch (error) {
    logger.error('Create admin controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all admins (super admin only)
 * GET /api/v1/admin/auth/admins
 */
const getAllAdmins = async (req, res) => {
  try {
    const filters = {
      role: req.query.role,
      is_active: req.query.is_active,
      limit: req.query.limit
    };
    
    const result = await adminAuthService.getAllAdmins(req.admin.id, filters);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        admins: result.admins,
        total: result.total
      }
    });
  } catch (error) {
    logger.error('Get all admins controller error:', error);
    res.status(403).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update admin status (super admin only)
 * PATCH /api/v1/admin/auth/admins/:adminId/status
 */
const updateAdminStatus = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { is_active } = req.body;
    
    const result = await adminAuthService.updateAdminStatus(
      req.admin.id,
      parseInt(adminId),
      is_active
    );
    
    res.json({
      success: true,
      message: result.message,
      data: result.admin
    });
  } catch (error) {
    logger.error('Update admin status controller error:', error);
    res.status(403).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete admin (super admin only)
 * DELETE /api/v1/admin/auth/admins/:adminId
 */
const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const result = await adminAuthService.deleteAdmin(
      req.admin.id,
      parseInt(adminId)
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete admin controller error:', error);
    res.status(403).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get admin sessions
 * GET /api/v1/admin/auth/sessions
 */
const getSessions = async (req, res) => {
  try {
    const { query: dbQuery } = require('../config/database');
    const sessions = await dbQuery(
      `SELECT id, device_info, ip_address, created_at, expires_at 
       FROM admin_sessions 
       WHERE admin_id = ? AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.admin.id]
    );
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Get admin sessions controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
};

/**
 * Revoke specific session
 * DELETE /api/v1/admin/auth/sessions/:sessionId
 */
const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { query: dbQuery } = require('../config/database');
    
    await dbQuery(
      'DELETE FROM admin_sessions WHERE id = ? AND admin_id = ?',
      [sessionId, req.admin.id]
    );
    
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke admin session controller error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  changePassword,
  createAdmin,
  getAllAdmins,
  updateAdminStatus,
  deleteAdmin,
  getSessions,
  revokeSession
};

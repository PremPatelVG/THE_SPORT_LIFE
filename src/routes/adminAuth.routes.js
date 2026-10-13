const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { adminAuth } = require('../middleware/adminAuth');

/**
 * Admin Authentication Routes
 * Base path: /api/v1/admin/auth
 */

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   POST /api/v1/admin/auth/login
 * @desc    Admin login with email and password
 * @access  Public
 */
router.post('/login', adminAuthController.login);

/**
 * @route   POST /api/v1/admin/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', adminAuthController.refreshToken);

/**
 * @route   POST /api/v1/admin/auth/logout
 * @desc    Logout admin (invalidate refresh token)
 * @access  Public
 */
router.post('/logout', adminAuthController.logout);

// ============================================
// PROTECTED ROUTES (Admin authentication required)
// ============================================

/**
 * @route   GET /api/v1/admin/auth/profile
 * @desc    Get current admin profile
 * @access  Private (Admin)
 */
router.get('/profile', adminAuth, adminAuthController.getProfile);

/**
 * @route   PUT /api/v1/admin/auth/profile
 * @desc    Update admin profile
 * @access  Private (Admin)
 */
router.put('/profile', adminAuth, adminAuthController.updateProfile);

/**
 * @route   POST /api/v1/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private (Admin)
 */
router.post('/change-password', adminAuth, adminAuthController.changePassword);

/**
 * @route   POST /api/v1/admin/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private (Admin)
 */
router.post('/logout-all', adminAuth, adminAuthController.logoutAll);

/**
 * @route   GET /api/v1/admin/auth/sessions
 * @desc    Get all active admin sessions
 * @access  Private (Admin)
 */
router.get('/sessions', adminAuth, adminAuthController.getSessions);

/**
 * @route   DELETE /api/v1/admin/auth/sessions/:sessionId
 * @desc    Revoke specific admin session
 * @access  Private (Admin)
 */
router.delete('/sessions/:sessionId', adminAuth, adminAuthController.revokeSession);

// ============================================
// SUPER ADMIN ROUTES
// ============================================

/**
 * @route   POST /api/v1/admin/auth/create-admin
 * @desc    Create new admin (super admin only)
 * @access  Private (Super Admin)
 */
router.post('/create-admin', adminAuth, adminAuthController.createAdmin);

/**
 * @route   GET /api/v1/admin/auth/admins
 * @desc    Get all admins (super admin only)
 * @access  Private (Super Admin)
 */
router.get('/admins', adminAuth, adminAuthController.getAllAdmins);

/**
 * @route   PATCH /api/v1/admin/auth/admins/:adminId/status
 * @desc    Update admin status (super admin only)
 * @access  Private (Super Admin)
 */
router.patch('/admins/:adminId/status', adminAuth, adminAuthController.updateAdminStatus);

/**
 * @route   DELETE /api/v1/admin/auth/admins/:adminId
 * @desc    Delete admin (super admin only)
 * @access  Private (Super Admin)
 */
router.delete('/admins/:adminId', adminAuth, adminAuthController.deleteAdmin);

module.exports = router;

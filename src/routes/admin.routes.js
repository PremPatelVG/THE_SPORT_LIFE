/**
 * Admin Routes
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/adminAuth');

// ============================================
// PUBLIC ADMIN ROUTES (No authentication)
// ============================================

/**
 * @route   POST /api/v1/admin/login
 * @desc    Admin login (DEPRECATED - Use /api/v1/admin/auth/login instead)
 * @access  Public
 */
router.post('/login', adminController.adminLogin);

// ============================================
// PROTECTED ADMIN ROUTES (Admin only)
// ============================================

// Apply adminAuth middleware to all routes below
// Note: adminAuth now handles JWT verification directly, no need for auth middleware
router.use(adminAuth);

/**
 * @route   GET /api/v1/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/dashboard/stats', adminController.getDashboardStats);

/**
 * @route   GET /api/v1/admin/tournaments
 * @desc    Get all tournaments with filters
 * @access  Admin
 */
router.get('/tournaments', adminController.getAllTournaments);

/**
 * @route   GET /api/v1/admin/tournaments/pending
 * @desc    Get pending tournament approvals
 * @access  Admin
 */
router.get('/tournaments/pending', adminController.getPendingApprovals);

/**
 * @route   POST /api/v1/admin/tournaments/:id/approve
 * @desc    Approve tournament
 * @access  Admin
 */
router.post('/tournaments/:id/approve', adminController.approveTournament);

/**
 * @route   POST /api/v1/admin/tournaments/:id/reject
 * @desc    Reject tournament
 * @access  Admin
 */
router.post('/tournaments/:id/reject', adminController.rejectTournament);

/**
 * @route   GET /api/v1/admin/matches
 * @desc    Get all matches with filters
 * @access  Admin
 */
router.get('/matches', adminController.getAllMatches);

/**
 * @route   GET /api/v1/admin/matches/:id
 * @desc    Get match details by ID
 * @access  Admin
 */
router.get('/matches/:id', adminController.getMatchById);

/**
 * @route   PUT /api/v1/admin/matches/:id/live-link
 * @desc    Update match live link
 * @access  Admin
 */
router.put('/matches/:id/live-link', adminController.updateMatchLiveLink);

/**
 * @route   PUT /api/v1/admin/matches/:id/end
 * @desc    End match and declare winner
 * @access  Admin
 */
router.put('/matches/:id/end', adminController.endMatchAndDeclareWinner);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with filters
 * @access  Admin
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   PUT /api/v1/admin/tournaments/:id/toggle-active
 * @desc    Toggle tournament active/inactive status
 * @access  Admin
 */
router.put('/tournaments/:id/toggle-active', adminController.toggleTournamentActive);

/**
 * @route   PUT /api/v1/admin/matches/:id/toggle-active
 * @desc    Toggle match active/inactive status
 * @access  Admin
 */
router.put('/matches/:id/toggle-active', adminController.toggleMatchActive);

module.exports = router;

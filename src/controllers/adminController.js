/**
 * Admin Controller
 * Handles admin authentication and dashboard
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const adminService = require('../services/adminService');
const logger = require('../utils/logger');

/**
 * Admin login
 * POST /api/v1/admin/login
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const sql = `
      SELECT id, email, password_hash, first_name, last_name, role, is_active
      FROM users 
      WHERE email = ? AND deleted_at IS NULL
    `;
    const users = await query(sql, [email]);

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check if user is admin
    if (user.role !== 'admin') {
      logger.warn(`Non-admin login attempt: ${email}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`Admin login successful: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      }
    });

  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

/**
 * Get dashboard statistics
 * GET /api/v1/admin/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * Get all tournaments
 * GET /api/v1/admin/tournaments
 */
const getAllTournaments = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      admin_approved: req.query.admin_approved,
      search: req.query.search,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const { tournaments, total } = await adminService.getAllTournaments(filters);

    res.json({
      success: true,
      data: tournaments,
      pagination: {
        limit: parseInt(filters.limit),
        offset: parseInt(filters.offset),
        total: parseInt(total)
      }
    });

  } catch (error) {
    logger.error('Get all tournaments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
};

/**
 * Get pending tournament approvals
 * GET /api/v1/admin/tournaments/pending
 */
const getPendingApprovals = async (req, res) => {
  try {
    const tournaments = await adminService.getPendingApprovals();

    res.json({
      success: true,
      data: tournaments,
      count: tournaments.length
    });

  } catch (error) {
    logger.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals'
    });
  }
};

/**
 * Approve tournament
 * POST /api/v1/admin/tournaments/:id/approve
 */
const approveTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    const tournament = await adminService.approveTournament(id, adminId);

    res.json({
      success: true,
      message: 'Tournament approved successfully',
      data: tournament
    });

  } catch (error) {
    logger.error('Approve tournament error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reject tournament
 * POST /api/v1/admin/tournaments/:id/reject
 */
const rejectTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    const tournament = await adminService.rejectTournament(id, adminId, reason);

    res.json({
      success: true,
      message: 'Tournament rejected',
      data: tournament
    });

  } catch (error) {
    logger.error('Reject tournament error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all matches
 * GET /api/v1/admin/matches
 */
const getAllMatches = async (req, res) => {
  try {
    const filters = {
      tournament_id: req.query.tournament_id,
      sport_id: req.query.sport_id,
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      search: req.query.search,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const { matches, total } = await adminService.getAllMatches(filters);

    res.json({
      success: true,
      data: matches,
      pagination: {
        limit: parseInt(filters.limit),
        offset: parseInt(filters.offset),
        total: parseInt(total)
      }
    });

  } catch (error) {
    logger.error('Get all matches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches'
    });
  }
};

/**
 * Get all users
 * GET /api/v1/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const filters = {
      role: req.query.role,
      is_active: req.query.is_active,
      search: req.query.search,
      sport_id: req.query.sport_id,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const { users, total } = await adminService.getAllUsers(filters);

    res.json({
      success: true,
      data: users,
      pagination: {
        limit: parseInt(filters.limit),
        offset: parseInt(filters.offset),
        total: parseInt(total)
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

/**
 * Get match by ID
 * GET /api/v1/admin/matches/:id
 */
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await adminService.getMatchById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    res.json({
      success: true,
      data: match
    });

  } catch (error) {
    logger.error('Get match by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match details'
    });
  }
};

/**
 * Update match live link
 * PUT /api/v1/admin/matches/:id/live-link
 */
const updateMatchLiveLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { live_link } = req.body;

    // Validate live link format (optional - basic YouTube URL validation)
    if (live_link && !live_link.includes('youtube.com') && !live_link.includes('youtu.be')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid YouTube link'
      });
    }

    const match = await adminService.updateMatchLiveLink(id, live_link);

    res.json({
      success: true,
      message: 'Live link updated successfully',
      data: match
    });

  } catch (error) {
    logger.error('Update match live link error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * End match and declare winner
 * PUT /api/v1/admin/matches/:id/end
 */
const endMatchAndDeclareWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const { winner_participant_id } = req.body;

    if (!winner_participant_id) {
      return res.status(400).json({
        success: false,
        error: 'Winner participant ID is required'
      });
    }

    await adminService.endMatchAndDeclareWinner(id, winner_participant_id);

    res.json({
      success: true,
      message: 'Match ended and winner declared successfully'
    });

  } catch (error) {
    logger.error('End match and declare winner error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end match'
    });
  }
};

/**
 * Toggle tournament active status
 * PUT /api/v1/admin/tournaments/:id/toggle-active
 */
const toggleTournamentActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_active must be a boolean value'
      });
    }

    const tournament = await adminService.toggleTournamentActive(id, is_active);

    res.json({
      success: true,
      message: `Tournament ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: tournament
    });

  } catch (error) {
    logger.error('Toggle tournament active error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Toggle match active status
 * PUT /api/v1/admin/matches/:id/toggle-active
 */
const toggleMatchActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_active must be a boolean value'
      });
    }

    const match = await adminService.toggleMatchActive(id, is_active);

    res.json({
      success: true,
      message: `Match ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: match
    });

  } catch (error) {
    logger.error('Toggle match active error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  adminLogin,
  getDashboardStats,
  getAllTournaments,
  getPendingApprovals,
  approveTournament,
  rejectTournament,
  getAllMatches,
  getMatchById,
  updateMatchLiveLink,
  getAllUsers,
  endMatchAndDeclareWinner,
  toggleTournamentActive,
  toggleMatchActive
};

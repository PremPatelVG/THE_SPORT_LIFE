const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (!user || user.length === 0) {
      throw new Error();
    }

    req.user = user[0];
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid authentication token' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token, just sets req.user if available
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (user && user.length > 0) {
      req.user = user[0];
      req.token = token;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Invalid token, but don't fail - just continue without user
    req.user = null;
    next();
  }
};

/**
 * Referee authorization middleware
 * Verifies that the authenticated user is the assigned referee for the match
 * Must be used after auth middleware
 */
const authorizeReferee = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    
    if (!matchId) {
      return res.status(400).json({
        success: false,
        error: 'Match ID is required'
      });
    }

    // Get match and verify referee
    const matches = await query(
      'SELECT referee_id FROM matches WHERE id = ?',
      [matchId]
    );

    if (!matches || matches.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    const match = matches[0];

    // Check if user is the assigned referee
    if (match.referee_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only the assigned referee can perform this action.'
      });
    }

    next();
  } catch (error) {
    console.error('Referee authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

module.exports = { auth, authorize, optionalAuth, authorizeReferee };

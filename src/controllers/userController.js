const { query } = require('../config/database');

/**
 * Get all users by role
 * GET /api/v1/users?role=player
 */
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    let sql = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image,
        u.role
      FROM users u
      WHERE u.is_active = TRUE
        AND u.deleted_at IS NULL
    `;

    const params = [];
    
    if (role) {
      sql += ` AND u.role = ?`;
      params.push(role);
    }

    sql += ` ORDER BY u.first_name, u.last_name`;

    const users = await query(sql, params);

    return res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

/**
 * Search users
 * GET /api/v1/users/search?q=query
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchTerm = `%${q.trim()}%`;

    const users = await query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image,
        u.role,
        GROUP_CONCAT(DISTINCT CONCAT(s.name, ':', us.skill_level) SEPARATOR '|') as sports_info
      FROM users u
      LEFT JOIN user_sports us ON u.id = us.user_id
      LEFT JOIN sports s ON us.sport_id = s.id
      WHERE (
        u.first_name LIKE ? OR
        u.last_name LIKE ? OR
        u.email LIKE ? OR
        u.phone LIKE ? OR
        CONCAT(u.first_name, ' ', u.last_name) LIKE ?
      )
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL
      GROUP BY u.id
      LIMIT 20`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );

    // Parse sports info into array
    const usersWithSports = users.map(user => {
      const sports = [];
      if (user.sports_info) {
        const sportsArray = user.sports_info.split('|');
        sportsArray.forEach(sportInfo => {
          const [name, level] = sportInfo.split(':');
          if (name && level) {
            sports.push({ name, skill_level: level });
          }
        });
      }
      return {
        ...user,
        sports,
        sports_info: undefined // Remove the raw string
      };
    });

    res.status(200).json({
      success: true,
      data: usersWithSports
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};

/**
 * Get all system users for tournament invitation (excluding already invited)
 * GET /api/v1/users/tournament/:tournamentId/available
 */
const getAvailableUsersForTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { sport_id } = req.query; // Optional sport filter

    // Determine sport filter logic
    let tournamentSportId = null;
    let applyFilter = false;

    // If sport_id is explicitly 'all', don't filter by sport
    if (sport_id && sport_id !== 'all') {
      tournamentSportId = sport_id;
      applyFilter = true;
    } else if (!sport_id) {
      // If no sport_id provided, get tournament's sport and filter by it
      const tournament = await query(
        `SELECT sport_id FROM tournaments WHERE id = ?`,
        [tournamentId]
      );
      if (tournament && tournament.length > 0 && tournament[0].sport_id) {
        tournamentSportId = tournament[0].sport_id;
        applyFilter = true;
      }
    }
    // If sport_id is 'all', applyFilter remains false and shows all users

    // Build query with optional sport filter
    let sqlQuery = `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image,
        u.role,
        GROUP_CONCAT(DISTINCT CONCAT(s.name, ':', us.skill_level) SEPARATOR '|') as sports_info
      FROM users u
      LEFT JOIN user_sports us ON u.id = us.user_id
      LEFT JOIN sports s ON us.sport_id = s.id
      WHERE u.is_active = TRUE 
        AND u.deleted_at IS NULL
        AND u.id NOT IN (
          SELECT user_id 
          FROM tournament_registrations 
          WHERE tournament_id = ? AND user_id IS NOT NULL
        )`;

    const params = [tournamentId];

    // Add sport filter only if a specific sport is selected
    if (applyFilter && tournamentSportId) {
      sqlQuery += `
        AND u.id IN (
          SELECT user_id 
          FROM user_sports 
          WHERE sport_id = ?
        )`;
      params.push(tournamentSportId);
    }

    sqlQuery += `
      GROUP BY u.id
      ORDER BY u.first_name, u.last_name`;

    const users = await query(sqlQuery, params);

    // Parse sports info into array
    const usersWithSports = users.map(user => {
      const sports = [];
      if (user.sports_info) {
        const sportsArray = user.sports_info.split('|');
        sportsArray.forEach(sportInfo => {
          const [name, level] = sportInfo.split(':');
          if (name && level) {
            sports.push({ name, skill_level: level });
          }
        });
      }
      return {
        ...user,
        sports,
        sports_info: undefined // Remove the raw string
      };
    });

    res.status(200).json({
      success: true,
      data: usersWithSports
    });
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available users',
      error: error.message
    });
  }
};

/**
 * Mask email for privacy
 * Example: john.doe@gmail.com -> jo***@gmail.com
 */
const maskEmail = (email) => {
  if (!email) return null;
  
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  // Show first 2 characters, mask the rest
  const maskedLocal = localPart.substring(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
};

/**
 * Get user profile
 * GET /api/v1/users/:userId
 */
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user basic info
    const user = await query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.gender,
        u.date_of_birth,
        u.profile_image,
        u.role,
        u.created_at
      FROM users u
      WHERE u.id = ? AND u.is_active = TRUE AND u.deleted_at IS NULL`,
      [userId]
    );

    if (!user || user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user sports
    const userSports = await query(
      `SELECT 
        us.id,
        us.sport_id,
        s.name as sport_name,
        us.skill_level
      FROM user_sports us
      INNER JOIN sports s ON us.sport_id = s.id
      WHERE us.user_id = ?
      ORDER BY s.name ASC`,
      [userId]
    );

    const userData = user[0];
    
    // Mask sensitive data
    const maskedData = {
      id: userData.id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: maskEmail(userData.email), // Masked email
      // phone: removed completely for privacy
      // city & state: not available in users table
      gender: userData.gender,
      date_of_birth: userData.date_of_birth,
      profile_image: userData.profile_image,
      role: userData.role,
      created_at: userData.created_at,
      sports: userSports || []
    };

    res.status(200).json({
      success: true,
      data: maskedData
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  searchUsers,
  getAvailableUsersForTournament,
  getUserProfile
};

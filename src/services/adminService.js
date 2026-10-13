/**
 * Admin Service
 * Handles admin-specific operations
 */

const { query } = require('../config/database');
const Tournament = require('../models/Tournament');
const logger = require('../utils/logger');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async () => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM tournaments) as total_tournaments,
        (SELECT COUNT(*) FROM tournaments WHERE status = 'draft' AND admin_approved = FALSE) as pending_approvals,
        (SELECT COUNT(*) FROM tournaments WHERE status = 'open') as open_tournaments,
        (SELECT COUNT(*) FROM tournaments WHERE status = 'ongoing') as ongoing_tournaments,
        (SELECT COUNT(*) FROM matches) as total_matches,
        (SELECT COUNT(*) FROM matches WHERE status = 'completed') as completed_matches,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users
    `);

    return stats[0];
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    throw error;
  }
};

/**
 * Get all tournaments with filters
 */
const getAllTournaments = async (filters = {}) => {
  try {
    const {
      status,
      admin_approved,
      search,
      limit = 50,
      offset = 0
    } = filters;

    let baseSql = `
      FROM tournaments t
      LEFT JOIN sports s ON t.sport_id = s.id
      LEFT JOIN venues v ON t.venue_id = v.id
      LEFT JOIN users u ON t.organizer_id = u.id
      WHERE t.deleted_at IS NULL
    `;

    const params = [];

    if (status) {
      baseSql += ' AND t.status = ?';
      params.push(status);
    }

    if (admin_approved !== undefined && admin_approved !== '') {
      baseSql += ' AND t.admin_approved = ?';
      params.push(admin_approved === 'true' || admin_approved === true || admin_approved === '1' || admin_approved === 1 ? 1 : 0);
    }

    if (search) {
      baseSql += ' AND (t.name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count first
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const countResult = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    // Get paginated data
    const selectSql = `
      SELECT 
        t.*,
        s.name as sport_name,
        v.name as venue_name,
        v.city as venue_city,
        u.first_name as organizer_first_name,
        u.last_name as organizer_last_name,
        u.email as organizer_email,
        CASE 
          WHEN t.category = 'singles' THEN 
            (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = t.id AND status = 'locked')
          WHEN t.category = 'doubles' THEN 
            (SELECT COUNT(*) FROM pairs WHERE tournament_id = t.id AND status = 'locked')
          WHEN t.category = 'teams' THEN 
            (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id AND status = 'locked' AND deleted_at IS NULL)
          ELSE 0
        END as participant_count
    `;

    const dataSql = selectSql + baseSql + ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    const dataParams = [...params, parseInt(limit), parseInt(offset)];

    const tournaments = await query(dataSql, dataParams);
    return {
      tournaments: Array.isArray(tournaments) ? tournaments : [],
      total
    };
  } catch (error) {
    logger.error('Get all tournaments error:', error);
    throw error;
  }
};

/**
 * Get pending tournament approvals
 */
const getPendingApprovals = async () => {
  try {
    const sql = `
      SELECT 
        t.*,
        s.name as sport_name,
        v.name as venue_name,
        v.city as venue_city,
        u.first_name as organizer_first_name,
        u.last_name as organizer_last_name,
        u.email as organizer_email,
        u.phone as organizer_phone
      FROM tournaments t
      LEFT JOIN sports s ON t.sport_id = s.id
      LEFT JOIN venues v ON t.venue_id = v.id
      LEFT JOIN users u ON t.organizer_id = u.id
      WHERE t.status = 'draft' 
        AND t.admin_approved = FALSE 
        AND t.deleted_at IS NULL
      ORDER BY t.created_at ASC
    `;

    const tournaments = await query(sql);
    return Array.isArray(tournaments) ? tournaments : [];
  } catch (error) {
    logger.error('Get pending approvals error:', error);
    throw error;
  }
};

/**
 * Approve tournament
 */
const approveTournament = async (tournamentId, adminId) => {
  try {
    // Check if tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Check if already approved
    if (tournament.admin_approved) {
      throw new Error('Tournament is already approved');
    }

    // Approve tournament
    await query(
      'UPDATE tournaments SET admin_approved = TRUE WHERE id = ?',
      [tournamentId]
    );

    logger.info(`Tournament ${tournamentId} approved by admin ${adminId}`);

    return await Tournament.findById(tournamentId);
  } catch (error) {
    logger.error('Approve tournament error:', error);
    throw error;
  }
};

/**
 * Reject tournament
 */
const rejectTournament = async (tournamentId, adminId, reason = null) => {
  try {
    // Check if tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Check if already rejected
    if (tournament.status === 'rejected') {
      throw new Error('Tournament is already rejected');
    }

    // Update tournament with rejection details
    await query(
      `UPDATE tournaments 
       SET status = 'rejected',
           admin_approved = FALSE,
           rejection_reason = ?,
           rejected_at = NOW(),
           rejected_by = ?
       WHERE id = ?`,
      [reason, adminId, tournamentId]
    );

    logger.info(`Tournament ${tournamentId} rejected by admin ${adminId}. Reason: ${reason || 'Not provided'}`);

    // Send SMS notification to organizer
    try {
      const msg91Service = require('../utils/msg91Service');
      
      // Get organizer details
      const organizerQuery = `
        SELECT u.phone, u.first_name, u.last_name, t.name as tournament_name
        FROM tournaments t
        JOIN users u ON t.organizer_id = u.id
        WHERE t.id = ?
      `;
      const organizerResult = await query(organizerQuery, [tournamentId]);
      
      if (organizerResult && organizerResult.length > 0) {
        const organizer = organizerResult[0];
        const organizerName = `${organizer.first_name} ${organizer.last_name}`;
        const tournamentName = organizer.tournament_name;
        const mobile = msg91Service.formatMobileNumber(organizer.phone);
        
        logger.info(`Sending rejection SMS to organizer: ${mobile}`);
        
        // Send rejection SMS using dedicated method
        const smsResult = await msg91Service.sendTournamentRejection(
          mobile,
          organizerName,
          tournamentName,
          reason
        );
        
        if (smsResult.success) {
          logger.info(`Rejection SMS sent successfully to ${mobile}`);
        } else {
          logger.error(`Failed to send rejection SMS: ${smsResult.message}`);
        }
      }
    } catch (smsError) {
      // Log SMS error but don't fail the rejection
      logger.error('Failed to send rejection SMS:', smsError);
    }

    return await Tournament.findById(tournamentId);
  } catch (error) {
    logger.error('Reject tournament error:', error);
    throw error;
  }
};

/**
 * Get all matches with filters
 */
const getAllMatches = async (filters = {}) => {
  try {
    const {
      tournament_id,
      sport_id,
      status,
      date_from,
      date_to,
      search,
      limit = 50,
      offset = 0
    } = filters;

    let baseSql = `
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(t.sport_id, m.sport_id) = s.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN courts c ON m.court_id = c.id
      
      -- Tournament participant joins (singles) - participant_id -> tournament_registrations -> users
      LEFT JOIN tournament_registrations tr1 ON m.participant1_id = tr1.id AND m.is_standalone = 0 AND t.category = 'singles'
      LEFT JOIN users u1 ON tr1.user_id = u1.id
      LEFT JOIN tournament_registrations tr2 ON m.participant2_id = tr2.id AND m.is_standalone = 0 AND t.category = 'singles'
      LEFT JOIN users u2 ON tr2.user_id = u2.id
      
      -- Tournament participant joins (doubles) - participant_id -> pairs
      LEFT JOIN pairs p1 ON m.participant1_id = p1.id AND m.is_standalone = 0 AND t.category = 'doubles'
      LEFT JOIN pairs p2 ON m.participant2_id = p2.id AND m.is_standalone = 0 AND t.category = 'doubles'
      
      -- Tournament participant joins (teams) - participant_id -> teams
      LEFT JOIN teams t1 ON m.participant1_id = t1.id AND m.is_standalone = 0 AND t.category = 'teams'
      LEFT JOIN teams t2 ON m.participant2_id = t2.id AND m.is_standalone = 0 AND t.category = 'teams'
      
      -- Standalone match participant joins (singles) - participant_id -> users directly
      LEFT JOIN users su1 ON m.participant1_id = su1.id AND m.is_standalone = 1 AND m.category = 'singles'
      LEFT JOIN users su2 ON m.participant2_id = su2.id AND m.is_standalone = 1 AND m.category = 'singles'
      
      -- Standalone match participant joins (doubles) - participant_id -> pairs directly
      LEFT JOIN pairs sp1 ON m.participant1_id = sp1.id AND m.is_standalone = 1 AND m.category = 'doubles'
      LEFT JOIN pairs sp2 ON m.participant2_id = sp2.id AND m.is_standalone = 1 AND m.category = 'doubles'
      
      -- Standalone match participant joins (teams) - participant_id -> teams directly
      LEFT JOIN teams st1 ON m.participant1_id = st1.id AND m.is_standalone = 1 AND m.category = 'teams'
      LEFT JOIN teams st2 ON m.participant2_id = st2.id AND m.is_standalone = 1 AND m.category = 'teams'
      
      LEFT JOIN users ref ON m.referee_id = ref.id
      
      WHERE 1=1
    `;

    const params = [];

    if (tournament_id) {
      baseSql += ' AND m.tournament_id = ?';
      params.push(tournament_id);
    }

    if (sport_id) {
      baseSql += ' AND t.sport_id = ?';
      params.push(sport_id);
    }

    if (status) {
      baseSql += ' AND m.status = ?';
      params.push(status);
    }

    if (date_from) {
      baseSql += ' AND m.match_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      baseSql += ' AND m.match_date <= ?';
      params.push(date_to);
    }

    if (search) {
      baseSql += ' AND (t.name LIKE ? OR p1.display_name LIKE ? OR p2.display_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count first
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const countResult = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    // Get paginated data
    const selectSql = `
      SELECT 
        m.*,
        t.name as tournament_name,
        t.category as tournament_category,
        s.id as sport_id,
        s.name as sport_name,
        v.name as venue_name,
        c.name as court_name,
        
        -- Participant 1 name (handles both tournament and standalone matches)
        CASE 
          -- Standalone singles matches (participant1_id points directly to users table)
          WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su1.first_name, ' ', su1.last_name)
          -- Standalone doubles matches (participant1_id points directly to pairs table)
          WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp1.name
          -- Standalone team matches (participant1_id points directly to teams table)
          WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st1.name
          -- Tournament singles matches (participant1_id points to tournament_registrations)
          WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(u1.first_name, ' ', u1.last_name)
          -- Tournament doubles matches (participant1_id points to pairs table)
          WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN p1.name
          -- Tournament team matches (participant1_id points to teams table)
          WHEN m.is_standalone = 0 AND t.category = 'teams' THEN t1.name
          ELSE NULL
        END as participant1_name,
        
        -- Participant 2 name (handles both tournament and standalone matches)
        CASE 
          -- Standalone singles matches (participant2_id points directly to users table)
          WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su2.first_name, ' ', su2.last_name)
          -- Standalone doubles matches (participant2_id points directly to pairs table)
          WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp2.name
          -- Standalone team matches (participant2_id points directly to teams table)
          WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st2.name
          -- Tournament singles matches (participant2_id points to tournament_registrations)
          WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(u2.first_name, ' ', u2.last_name)
          -- Tournament doubles matches (participant2_id points to pairs table)
          WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN p2.name
          -- Tournament team matches (participant2_id points to teams table)
          WHEN m.is_standalone = 0 AND t.category = 'teams' THEN t2.name
          ELSE NULL
        END as participant2_name,
        
        ref.first_name as referee_first_name,
        ref.last_name as referee_last_name
    `;

    const dataSql = selectSql + baseSql + ' ORDER BY m.match_date DESC, m.match_time DESC LIMIT ? OFFSET ?';
    const dataParams = [...params, parseInt(limit), parseInt(offset)];

    const matches = await query(dataSql, dataParams);
    return {
      matches: Array.isArray(matches) ? matches : [],
      total
    };
  } catch (error) {
    logger.error('Get all matches error:', error);
    throw error;
  }
};

/**
 * Get all users with filters
 */
const getAllUsers = async (filters = {}) => {
  try {
    const {
      role,
      is_active,
      search,
      sport_id,
      limit = 50,
      offset = 0
    } = filters;

    let baseSql = ' FROM users u WHERE u.deleted_at IS NULL';
    const params = [];

    if (role) {
      baseSql += ' AND u.role = ?';
      params.push(role);
    }

    if (is_active !== undefined && is_active !== '') {
      baseSql += ' AND u.is_active = ?';
      params.push(is_active === 'true' || is_active === true || is_active === '1' || is_active === 1 ? 1 : 0);
    }

    if (sport_id) {
      baseSql += ' AND EXISTS (SELECT 1 FROM user_sports us WHERE us.user_id = u.id AND us.sport_id = ?)';
      params.push(parseInt(sport_id));
    }

    if (search) {
      baseSql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count first
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const countResult = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    // Get paginated data
    const selectSql = `
      SELECT 
        u.id,
        u.email,
        u.phone,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.is_verified,
        u.phone_verified,
        u.created_at,
        (
          SELECT GROUP_CONCAT(s.name SEPARATOR ',')
          FROM user_sports us
          JOIN sports s ON us.sport_id = s.id
          WHERE us.user_id = u.id
        ) as sports
    `;
    const dataSql = selectSql + baseSql + ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    const dataParams = [...params, parseInt(limit), parseInt(offset)];

    const users = await query(dataSql, dataParams);
    return {
      users: Array.isArray(users) ? users : [],
      total
    };
  } catch (error) {
    logger.error('Get all users error:', error);
    throw error;
  }
};

/**
 * Get match by ID with full details
 */
const getMatchById = async (matchId) => {
  try {
    const sql = `
      SELECT 
        m.*,
        t.name as tournament_name,
        t.category as tournament_category,
        s.id as sport_id,
        s.name as sport_name,
        v.name as venue_name,
        v.address as venue_address,
        v.city as venue_city,
        c.name as court_name,
        
        -- Participant 1 name (based on tournament category)
        CASE 
          WHEN t.category = 'singles' THEN CONCAT(u1.first_name, ' ', u1.last_name)
          WHEN t.category = 'doubles' THEN p1.name
          WHEN t.category = 'teams' THEN t1.name
          ELSE NULL
        END as participant1_name,
        
        -- Participant 2 name (based on tournament category)
        CASE 
          WHEN t.category = 'singles' THEN CONCAT(u2.first_name, ' ', u2.last_name)
          WHEN t.category = 'doubles' THEN p2.name
          WHEN t.category = 'teams' THEN t2.name
          ELSE NULL
        END as participant2_name,
        
        ref.first_name as referee_first_name,
        ref.last_name as referee_last_name,
        ref.email as referee_email
        
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON t.sport_id = s.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN courts c ON m.court_id = c.id
      
      -- Participant 1 joins (singles)
      LEFT JOIN tournament_registrations tr1 ON m.participant1_id = tr1.id AND t.category = 'singles'
      LEFT JOIN users u1 ON tr1.user_id = u1.id
      
      -- Participant 1 joins (doubles)
      LEFT JOIN pairs p1 ON m.participant1_id = p1.id AND t.category = 'doubles'
      
      -- Participant 1 joins (teams)
      LEFT JOIN teams t1 ON m.participant1_id = t1.id AND t.category = 'teams'
      
      -- Participant 2 joins (singles)
      LEFT JOIN tournament_registrations tr2 ON m.participant2_id = tr2.id AND t.category = 'singles'
      LEFT JOIN users u2 ON tr2.user_id = u2.id
      
      -- Participant 2 joins (doubles)
      LEFT JOIN pairs p2 ON m.participant2_id = p2.id AND t.category = 'doubles'
      
      -- Participant 2 joins (teams)
      LEFT JOIN teams t2 ON m.participant2_id = t2.id AND t.category = 'teams'
      
      LEFT JOIN users ref ON m.referee_id = ref.id
      
      WHERE m.id = ?
    `;

    const matches = await query(sql, [matchId]);
    return matches && matches.length > 0 ? matches[0] : null;
  } catch (error) {
    logger.error('Get match by ID error:', error);
    throw error;
  }
};

/**
 * Update match live link (Admin only)
 */
const updateMatchLiveLink = async (matchId, liveLink) => {
  try {
    // Validate match exists
    const match = await getMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Update live link
    await query(
      'UPDATE matches SET match_live_link = ? WHERE id = ?',
      [liveLink || null, matchId]
    );

    logger.info(`Match ${matchId} live link updated`);

    return await getMatchById(matchId);
  } catch (error) {
    logger.error('Update match live link error:', error);
    throw error;
  }
};

/**
 * End match and declare winner
 */
const endMatchAndDeclareWinner = async (matchId, winnerParticipantId) => {
  try {
    // Get match details
    const matchSql = 'SELECT * FROM matches WHERE id = ?';
    const matches = await query(matchSql, [matchId]);
    
    if (!matches || matches.length === 0) {
      throw new Error('Match not found');
    }
    
    const match = matches[0];
    
    // Validate winner is one of the participants
    if (winnerParticipantId !== match.participant1_id && winnerParticipantId !== match.participant2_id) {
      throw new Error('Winner must be one of the match participants');
    }
    
    // Update match status and winner
    const updateSql = `
      UPDATE matches 
      SET 
        status = 'completed',
        winner_participant_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await query(updateSql, [winnerParticipantId, matchId]);
    
    logger.info(`Match ${matchId} ended with winner ${winnerParticipantId}`);
    
    return { success: true };
  } catch (error) {
    logger.error('End match and declare winner error:', error);
    throw error;
  }
};

/**
 * Toggle tournament active status
 * Also toggles all matches of the tournament
 */
const toggleTournamentActive = async (tournamentId, isActive) => {
  try {
    // Update tournament status
    const updateTournamentSql = 'UPDATE tournaments SET is_active = ? WHERE id = ?';
    await query(updateTournamentSql, [isActive, tournamentId]);
    
    // Update all matches of this tournament
    const updateMatchesSql = 'UPDATE matches SET is_active = ? WHERE tournament_id = ?';
    const matchResult = await query(updateMatchesSql, [isActive, tournamentId]);
    
    logger.info(`Tournament ${tournamentId} ${isActive ? 'activated' : 'deactivated'} along with ${matchResult.affectedRows} matches`);
    
    return await Tournament.findById(tournamentId);
  } catch (error) {
    logger.error('Toggle tournament active error:', error);
    throw error;
  }
};

/**
 * Toggle match active status
 */
const toggleMatchActive = async (matchId, isActive) => {
  try {
    const updateSql = 'UPDATE matches SET is_active = ? WHERE id = ?';
    await query(updateSql, [isActive, matchId]);
    
    logger.info(`Match ${matchId} ${isActive ? 'activated' : 'deactivated'}`);
    
    const Match = require('../models/Match');
    return await Match.findById(matchId);
  } catch (error) {
    logger.error('Toggle match active error:', error);
    throw error;
  }
};

module.exports = {
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

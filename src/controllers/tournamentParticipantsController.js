const { query } = require('../config/database');

/**
 * Get tournament participants with details
 * Returns different data based on tournament category:
 * - SINGLES: List of locked players
 * - DOUBLES: List of locked pairs with player details
 * - TEAMS: List of locked teams with member details
 * 
 * GET /api/v1/tournaments/:tournamentId/participants
 */
const getTournamentParticipants = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId || req.params.id;

    // Get tournament category and sport_id
    const tournament = await query(
      'SELECT id, name, category, sport_id FROM tournaments WHERE id = ? AND deleted_at IS NULL',
      [tournamentId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const category = tournament[0].category;
    const sportId = tournament[0].sport_id;
    let participants = [];
    let count = 0;

    if (category === 'singles') {
      // Get all participants for singles (pending, accepted, locked, rejected)
      participants = await query(`
        SELECT 
          tr.id as registration_id,
          tr.user_id,
          tr.status,
          tr.locked_at,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.profile_image,
          us.skill_level,
          s.name as sport_name
        FROM tournament_registrations tr
        INNER JOIN users u ON tr.user_id = u.id
        LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
        LEFT JOIN sports s ON s.id = ?
        WHERE tr.tournament_id = ?
        AND tr.status IN ('pending', 'accepted', 'locked', 'rejected', 'declined')
        AND u.deleted_at IS NULL
        ORDER BY 
          CASE tr.status
            WHEN 'locked' THEN 1
            WHEN 'accepted' THEN 2
            WHEN 'pending' THEN 3
            WHEN 'rejected' THEN 4
            WHEN 'declined' THEN 5
          END,
          tr.locked_at ASC,
          tr.responded_at ASC
      `, [sportId, sportId, tournamentId]);

      count = participants.length;

    } else if (category === 'doubles') {
      // Get all pairs with player details (pending, accepted, locked, rejected)
      // console.log('Fetching pairs for tournament:', tournamentId);
      participants = await query(`
        SELECT 
          p.id as pair_id,
          p.name as pair_name,
          p.status,
          p.locked_at,
          
          -- Player 1
          p.player1_id,
          u1.first_name as player1_first_name,
          u1.last_name as player1_last_name,
          u1.phone as player1_phone,
          u1.profile_image as player1_image,
          us1.skill_level as player1_skill_level,
          
          -- Player 2
          p.player2_id,
          u2.first_name as player2_first_name,
          u2.last_name as player2_last_name,
          u2.phone as player2_phone,
          u2.profile_image as player2_image,
          us2.skill_level as player2_skill_level,
          
          s.name as sport_name
        FROM pairs p
        INNER JOIN users u1 ON p.player1_id = u1.id
        INNER JOIN users u2 ON p.player2_id = u2.id
        LEFT JOIN user_sports us1 ON us1.user_id = u1.id AND us1.sport_id = (SELECT sport_id FROM tournaments WHERE id = ?)
        LEFT JOIN user_sports us2 ON us2.user_id = u2.id AND us2.sport_id = (SELECT sport_id FROM tournaments WHERE id = ?)
        LEFT JOIN tournaments t ON p.tournament_id = t.id
        LEFT JOIN sports s ON t.sport_id = s.id
        WHERE p.tournament_id = ?
        AND p.status IN ('pending', 'accepted', 'locked', 'rejected', 'declined')
        ORDER BY 
          CASE p.status
            WHEN 'locked' THEN 1
            WHEN 'accepted' THEN 2
            WHEN 'pending' THEN 3
            WHEN 'rejected' THEN 4
            WHEN 'declined' THEN 5
          END,
          p.locked_at ASC
      `, [tournamentId, tournamentId, tournamentId]);

      // console.log('Found pairs:', participants.length, participants);
      count = participants.length;

    } else if (category === 'teams') {
      // Get all teams with member details (pending, accepted, locked, rejected)
      participants = await query(`
        SELECT 
          t.id as team_id,
          t.name as team_name,
          t.status,
          t.locked_at,
          t.logo,
          t.captain_id,
          
          -- Captain details
          uc.first_name as captain_first_name,
          uc.last_name as captain_last_name,
          
          -- Member count
          (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
          
          -- Members list (JSON)
          (SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'user_id', tm.user_id,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'phone', u.phone,
              'profile_image', u.profile_image,
              'is_captain', tm.is_captain,
              'position', tm.position,
              'skill_level', us.skill_level
            )
          )
          FROM team_members tm
          INNER JOIN users u ON tm.user_id = u.id
          LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = (SELECT sport_id FROM tournaments WHERE id = ?)
          WHERE tm.team_id = t.id
          ) as members,
          
          s.name as sport_name
        FROM teams t
        INNER JOIN users uc ON t.captain_id = uc.id
        LEFT JOIN tournaments tour ON t.tournament_id = tour.id
        LEFT JOIN sports s ON tour.sport_id = s.id
        WHERE t.tournament_id = ?
        AND t.status IN ('pending', 'accepted', 'locked', 'rejected', 'declined')
        AND t.deleted_at IS NULL
        ORDER BY 
          CASE t.status
            WHEN 'locked' THEN 1
            WHEN 'accepted' THEN 2
            WHEN 'pending' THEN 3
            WHEN 'rejected' THEN 4
            WHEN 'declined' THEN 5
          END,
          t.locked_at ASC
      `, [tournamentId, tournamentId]);

      count = participants.length;
    }

    // Disable caching for this endpoint
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Return participants array directly
    res.status(200).json({
      success: true,
      data: participants
    });

  } catch (error) {
    console.error('Get tournament participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tournament participants',
      error: error.message
    });
  }
};

module.exports = {
  getTournamentParticipants
};

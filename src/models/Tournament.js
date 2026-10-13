const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a new tournament
 */
const create = async (tournamentData) => {
  try {
    const {
      name,
      description,
      sport_id,
      venue_id,
      custom_venue_name,
      organizer_id,
      logo = null,
      logo_url = null,
      start_date,
      end_date,
      registration_start,
      registration_end,
      max_participants,
      entry_fee = 0,
      prize_money = 0,
      format_type,
      category,
      tournament_type = 'open',
      match_config = null,
      platform_commission_percent = 10
    } = tournamentData;

    console.log("details==", tournamentData);

    // Basic validation for required fields
    // Either venue_id or custom_venue_name must be provided
    if (!name || !sport_id || !start_date || !end_date) {
      throw new Error('Missing required tournament fields: name, sport_id, start_date, end_date');
    }
    
    if (!venue_id && !custom_venue_name) {
      throw new Error('Either venue_id or custom_venue_name must be provided');
    }

    const sql = `
      INSERT INTO tournaments (
        name, description, sport_id, venue_id, custom_venue_name, organizer_id, logo, logo_url,
        start_date, end_date, registration_start, registration_end,
        max_participants, entry_fee, prize_money, format_type, category, 
        tournament_type, match_config, platform_commission_percent, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `;

    // Helper function to convert ISO format to MySQL DATETIME (preserve local time)
    const convertToMySQLDateTime = (isoDate) => {
      if (!isoDate) return null;
      // Input can be: 2025-11-16T18:30:00 or 2025-11-16T18:30:00.000Z
      // Output: 2025-11-16 18:30:00
      // Take first 19 chars (YYYY-MM-DDTHH:MM:SS) and replace T with space
      const dateTimePart = isoDate.slice(0, 19);
      return dateTimePart.replace('T', ' ');
    };

    const queryResult = await query(sql, [
      name,
      description || null,
      sport_id,
      venue_id || null,
      custom_venue_name || null,
      organizer_id || null,
      logo,
      logo_url,
      convertToMySQLDateTime(start_date),
      convertToMySQLDateTime(end_date),
      convertToMySQLDateTime(registration_start),
      convertToMySQLDateTime(registration_end),
      max_participants || null,
      entry_fee,
      prize_money,
      format_type || null,
      category || null,
      tournament_type,
      match_config ? JSON.stringify(match_config) : null,
      platform_commission_percent
    ]);

    const result = queryResult[0] || queryResult;
    return result.insertId;

  } catch (error) {
    console.error("Error creating tournament:", error.message);
    throw new Error(`Tournament creation failed: ${error.message}`);
  }
};

/**
 * Find tournament by ID
 */
const findById = async (id) => {
  const sql = `
    SELECT t.*, 
           s.name AS sport_name,
           s.category AS sport_category,
           s.min_players_per_side,
           s.max_players_per_side,
           COALESCE(v.name, t.custom_venue_name) AS venue_name,
           v.city AS venue_city,
           COALESCE(v.name, t.custom_venue_name) AS display_venue_name,
           u.first_name AS organizer_first_name,
           u.last_name AS organizer_last_name,
           u.email AS organizer_email,
           u.profile_image AS organizer_profile_image,
           CASE 
             WHEN t.category = 'singles' THEN 
               (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = t.id AND status = 'locked')
             WHEN t.category = 'doubles' THEN 
               (SELECT COUNT(*) FROM pairs WHERE tournament_id = t.id AND status = 'locked')
             WHEN t.category = 'teams' THEN 
               (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id AND status = 'locked' AND deleted_at IS NULL)
             ELSE 0
           END AS participant_count,
           CASE 
             WHEN t.winner_participant_id IS NOT NULL AND t.category = 'teams' THEN 
               (SELECT name FROM teams WHERE id = t.winner_participant_id)
             WHEN t.winner_participant_id IS NOT NULL AND t.category = 'singles' THEN 
               (SELECT CONCAT(u2.first_name, ' ', u2.last_name) FROM tournament_registrations tr 
                JOIN users u2 ON tr.user_id = u2.id 
                WHERE tr.id = t.winner_participant_id)
             WHEN t.winner_participant_id IS NOT NULL AND t.category = 'doubles' THEN 
               (SELECT CONCAT(u3.first_name, ' ', u3.last_name, ' & ', u4.first_name, ' ', u4.last_name) 
                FROM pairs p 
                JOIN users u3 ON p.player1_id = u3.id 
                JOIN users u4 ON p.player2_id = u4.id 
                WHERE p.id = t.winner_participant_id)
             ELSE NULL
           END AS winner_name
    FROM tournaments t
    LEFT JOIN sports s ON t.sport_id = s.id
    LEFT JOIN venues v ON t.venue_id = v.id
    LEFT JOIN users u ON t.organizer_id = u.id
    WHERE t.id = ? AND t.deleted_at IS NULL
  `;

  try {
    const result = await query(sql, [id]);
    const tournaments = Array.isArray(result) ? result : result[0]; // normalize result

    if (!tournaments || tournaments.length === 0) return null;

    const tournament = tournaments[0] || tournaments;
    
    // Helper function to format Date to MySQL DATETIME string without timezone conversion
    const formatDateToMySQL = (date) => {
      if (!(date instanceof Date)) return date;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    // Convert Date objects to MySQL DATETIME strings to prevent timezone issues
    tournament.start_date = formatDateToMySQL(tournament.start_date);
    tournament.end_date = formatDateToMySQL(tournament.end_date);
    tournament.registration_start = formatDateToMySQL(tournament.registration_start);
    tournament.registration_end = formatDateToMySQL(tournament.registration_end);
    
    return tournament;
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    throw new Error(`Failed to fetch tournament: ${error.message}`);
  }
};


/**
 * Get all tournaments with filters
 */
const findAll = async (filters = {}) => {
  const {
    status,
    sport_id,
    category,
    format_type,
    organizer_id,
    search,
    user_id,
    limit = 20,
    offset = 0
  } = filters;


  let sql = `
    SELECT 
      t.*,
      s.name as sport_name,
      COALESCE(v.name, t.custom_venue_name) as venue_name,
      v.city as venue_city,
      COALESCE(v.name, t.custom_venue_name) AS display_venue_name,
      u.first_name as organizer_first_name,
      u.last_name as organizer_last_name,
      CASE 
        WHEN t.category = 'singles' THEN 
          (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'doubles' THEN 
          (SELECT COUNT(*) FROM pairs WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'teams' THEN 
          (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id AND status = 'locked' AND deleted_at IS NULL)
        ELSE 0
      END as participant_count
    FROM tournaments t
    LEFT JOIN sports s ON t.sport_id = s.id
    LEFT JOIN venues v ON t.venue_id = v.id
    LEFT JOIN users u ON t.organizer_id = u.id
    WHERE t.deleted_at IS NULL AND t.is_active = TRUE
  `;

  const params = [];

  // Filter tournaments based on type and visibility
  // Draft and rejected tournaments only visible to organizer
  // Show tournament if: OPEN (published) OR organizer OR user is invited/accepted
  if (user_id) {
    sql += ` AND (
      (t.tournament_type = 'open' AND t.status NOT IN ('draft', 'rejected'))
      OR (t.organizer_id = ?)
      OR (
        t.status NOT IN ('draft', 'rejected')
        AND EXISTS (
          SELECT 1 FROM tournament_registrations tr 
          WHERE tr.tournament_id = t.id 
          AND tr.user_id = ? 
          AND tr.status IN ('pending', 'accepted', 'locked')
        )
      )
    )`;
    params.push(user_id, user_id);
  } else {
    // If no user logged in, only show published open tournaments (exclude draft and rejected)
    sql += ` AND t.tournament_type = 'open' AND t.status NOT IN ('draft', 'rejected')`;
  }

  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }

  if (sport_id) {
    sql += ' AND t.sport_id = ?';
    params.push(sport_id);
  }

  if (category) {
    sql += ' AND t.category = ?';
    params.push(category);
  }

  if (format_type) {
    sql += ' AND t.format_type = ?';
    params.push(format_type);
  }

  if (organizer_id) {
    sql += ' AND t.organizer_id = ?';
    params.push(organizer_id);
  }

  if (search) {
    sql += ' AND (t.name LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  

  const result = await query(sql, params);
  // const tournaments = result[0] || result;


  const tournaments = Array.isArray(result)
    ? result
    : result && Array.isArray(result[0])
      ? result[0]
      : result
        ? [result]
        : [];

  // Helper function to format Date to MySQL DATETIME string without timezone conversion
  const formatDateToMySQL = (date) => {
    if (!(date instanceof Date)) return date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Parse JSON fields safely and format dates
  if (Array.isArray(tournaments)) {
    tournaments.forEach(tournament => {
      // Parse JSON rules
      if (tournament.rules) {
        try {
          if (typeof tournament.rules === 'string') {
            tournament.rules = JSON.parse(tournament.rules);
          }
        } catch (error) {
          logger.error('Error parsing tournament rules:', error);
          tournament.rules = {};
        }
      } else {
        tournament.rules = {};
      }
      
      // Convert Date objects to MySQL DATETIME strings to prevent timezone issues
      tournament.start_date = formatDateToMySQL(tournament.start_date);
      tournament.end_date = formatDateToMySQL(tournament.end_date);
      tournament.registration_start = formatDateToMySQL(tournament.registration_start);
      tournament.registration_end = formatDateToMySQL(tournament.registration_end);
    });
  }

  return tournaments;
}

/**
 * Update tournament
 */
const update = async (id, updateData) => {
  const allowedFields = [
    'name', 'description', 'sport_id', 'venue_id', 'logo', 'logo_url',
    'start_date', 'end_date', 'registration_start', 'registration_end',
    'max_participants', 'entry_fee', 'prize_money', 'format_type',
    'category', 'tournament_type', 'match_config', 'rules', 'status', 'admin_approved', 'is_active'
  ];

  const dateFields = ['start_date', 'end_date', 'registration_start', 'registration_end'];

  const updates = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      if (key === 'rules' || key === 'match_config') {
        // Handle JSON fields - ensure proper JSON stringification
        const jsonValue = updateData[key];
        if (typeof jsonValue === 'string') {
          values.push(jsonValue);
        } else if (jsonValue && typeof jsonValue === 'object') {
          values.push(JSON.stringify(jsonValue));
        } else {
          values.push(key === 'rules' ? JSON.stringify({}) : null);
        }
      } else if (dateFields.includes(key)) {
        // Convert ISO format to MySQL DATETIME
        // Input can be: 2025-11-16T18:30:00 or 2025-11-16T18:30:00.000Z
        // Output: 2025-11-16 18:30:00 (preserve local time, no UTC conversion)
        const dateValue = updateData[key];
        if (dateValue) {
          // Take first 19 chars (YYYY-MM-DDTHH:MM:SS) and replace T with space
          const mysqlDate = dateValue.slice(0, 19).replace('T', ' ');
          console.log(`Date conversion for ${key}:`, {
            received: dateValue,
            converted: mysqlDate
          });
          values.push(mysqlDate);
        } else {
          values.push(null);
        }
      } else {
        values.push(updateData[key]);
      }
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);
  const sql = `UPDATE tournaments SET ${updates.join(', ')} WHERE id = ?`;

  await query(sql, values);
  return findById(id);
}

/**
 * Update tournament status
 */
const updateStatus = async (id, status) => {
  const sql = 'UPDATE tournaments SET status = ? WHERE id = ?';
  await query(sql, [status, id]);
  return findById(id);
}

/**
 * Soft delete tournament
 */
const softDelete = async (id) => {
  const sql = 'UPDATE tournaments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
  await query(sql, [id]);
}

/**
 * Hard delete tournament (permanently remove from database)
 * CASCADE will automatically delete all related data:
 * - tournament_registrations
 * - teams and team_members
 * - pairs
 * - matches
 */
const hardDelete = async (id) => {
  const sql = 'DELETE FROM tournaments WHERE id = ?';
  await query(sql, [id]);
}

/**
 * Get tournament participants
 * Returns pairs for doubles, teams for teams, players for singles
 */
const getParticipants = async (tournamentId) => {
  // First, get tournament category
  const tournament = await query('SELECT category FROM tournaments WHERE id = ?', [tournamentId]);
  if (!tournament || tournament.length === 0) return [];
  
  const category = tournament[0].category;

  // For DOUBLES tournaments, return locked pairs with player details
  if (category === 'doubles') {
    const pairsSql = `
      SELECT 
        p.id,
        p.tournament_id,
        NULL as user_id,
        p.id as partnership_id,
        NULL as team_id,
        p.created_at as registration_date,
        'paid' as payment_status,
        NULL as payment_id,
        NULL as seed_number,
        p.status,
        p.name as participant_name,
        'doubles' as participant_type,
        NULL as participant_image,
        p.player1_id,
        p.player2_id,
        'pair' as source_table
      FROM pairs p
      WHERE p.tournament_id = ? AND p.status = 'locked'
      ORDER BY p.locked_at ASC
    `;
    const pairs = await query(pairsSql, [tournamentId]);
    const pairsArray = Array.isArray(pairs) ? pairs : [];
    
    // Fetch player details for each pair
    for (let pair of pairsArray) {
      if (pair.player1_id && pair.player2_id) {
        const playersSql = `
          SELECT 
            id, 
            first_name, 
            last_name, 
            email, 
            phone,
            profile_image,
            (SELECT skill_level FROM user_sports WHERE user_id = users.id AND sport_id = (SELECT sport_id FROM tournaments WHERE id = ?)) as skill_level
          FROM users 
          WHERE id IN (?, ?)
        `;
        const players = await query(playersSql, [tournamentId, pair.player1_id, pair.player2_id]);
        pair.players = Array.isArray(players) ? players : [];
      }
    }
    
    return pairsArray;
  }

  // For TEAMS tournaments, return locked teams with member details
  if (category === 'teams') {
    const teamsSql = `
      SELECT 
        t.id,
        t.tournament_id,
        NULL as user_id,
        NULL as partnership_id,
        t.id as team_id,
        t.created_at as registration_date,
        'paid' as payment_status,
        NULL as payment_id,
        NULL as seed_number,
        t.status,
        t.name as participant_name,
        'team' as participant_type,
        t.logo as participant_image,
        t.description as team_description,
        t.captain_id,
        'team' as source_table
      FROM teams t
      WHERE t.tournament_id = ? AND t.status = 'locked' AND t.deleted_at IS NULL
      ORDER BY t.locked_at ASC
    `;
    const teams = await query(teamsSql, [tournamentId]);
    const teamsArray = Array.isArray(teams) ? teams : [];
    
    // Fetch team members for each team
    for (let team of teamsArray) {
      const membersSql = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.profile_image,
          tm.position,
          tm.jersey_number,
          tm.is_active,
          (u.id = ?) as is_captain,
          (SELECT skill_level FROM user_sports WHERE user_id = u.id AND sport_id = (SELECT sport_id FROM tournaments WHERE id = ?)) as skill_level
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY is_captain DESC, u.first_name ASC
      `;
      const members = await query(membersSql, [team.captain_id, tournamentId, team.id]);
      team.members = Array.isArray(members) ? members : [];
      team.member_count = team.members.length;
    }
    
    return teamsArray;
  }

  // For SINGLES tournaments, return locked players
  const registrationsSql = `
    SELECT 
      tr.id,
      tr.tournament_id,
      tr.user_id,
      NULL as partnership_id,
      NULL as team_id,
      tr.created_at as registration_date,
      'paid' as payment_status,
      NULL as payment_id,
      NULL as seed_number,
      tr.status,
      CONCAT(u.first_name, ' ', u.last_name) as participant_name,
      'singles' as participant_type,
      u.profile_image as participant_image,
      u.email as user_email,
      u.phone,
      u.first_name,
      u.last_name,
      NULL as team_description,
      'registration' as source_table,
      (SELECT skill_level FROM user_sports WHERE user_id = u.id AND sport_id = (SELECT sport_id FROM tournaments WHERE id = tr.tournament_id)) as skill_level
    FROM tournament_registrations tr
    LEFT JOIN users u ON tr.user_id = u.id
    WHERE tr.tournament_id = ? AND tr.status = 'locked'
    ORDER BY tr.locked_at ASC
  `;

  const registrations = await query(registrationsSql, [tournamentId]);
  return Array.isArray(registrations) ? registrations : [];
}

/**
 * Get tournament standings (enhanced with comprehensive statistics)
 */
const getStandings = async (tournamentId, groupId = null) => {
  // Use the comprehensive view created in Phase 1
  let sql = `
    SELECT * FROM v_tournament_standings
    WHERE tournament_id = ?
  `;

  const params = [tournamentId];

  if (groupId) {
    sql += ' AND group_id = ?';
    params.push(groupId);
  }

  sql += ' ORDER BY position ASC, points DESC, goal_difference DESC, goals_for DESC';

  const standings = await query(sql, params);
  return Array.isArray(standings) ? standings : [];
}

/**
 * Get formatted points table (for display purposes)
 */
const getPointsTable = async (tournamentId, groupId = null) => {
  // Get tournament format to determine how to display standings
  const tournamentSql = 'SELECT format_type FROM tournaments WHERE id = ? AND deleted_at IS NULL';
  const tournamentResult = await query(tournamentSql, [tournamentId]);
  const formatType = tournamentResult && tournamentResult[0] ? tournamentResult[0].format_type : null;
  
  const standings = await getStandings(tournamentId, groupId);
  
  // For groups_knockout format without specific groupId, return group-wise data
  if (formatType === 'groups_knockout' && !groupId) {
    // Get all groups for this tournament
    const groupsSql = `
      SELECT DISTINCT tg.id, tg.group_name 
      FROM tournament_groups tg
      WHERE tg.tournament_id = ?
      ORDER BY tg.group_name ASC
    `;
    const groups = await query(groupsSql, [tournamentId]);
    
    if (!groups || groups.length === 0) {
      // No groups found, return regular format
      return formatStandingsData(standings, groupId);
    }
    
    // Calculate qualifiers per group (top 1 or 2)
    const participantCountSql = `
      SELECT COUNT(DISTINCT participant_id) as count 
      FROM tournament_standings 
      WHERE tournament_id = ?
    `;
    const participantCountResult = await query(participantCountSql, [tournamentId]);
    const totalParticipants = participantCountResult[0]?.count || 0;
    const avgGroupSize = Math.floor(totalParticipants / groups.length);
    const qualifiersPerGroup = avgGroupSize <= 8 ? 2 : 4;
    
    // Group standings by group
    const groupedStandings = [];
    
    for (const group of groups) {
      const groupStandings = standings.filter(s => s.group_id === group.id);
      
      // Sort by position within group
      groupStandings.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        if (a.points !== b.points) return b.points - a.points;
        if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference;
        return b.goals_for - a.goals_for;
      });
      
      // Format each standing with qualification status
      const formattedGroupStandings = groupStandings.map((s, index) => ({
        position: index + 1, // Position within group
        participant: {
          id: s.participant_id,
          name: s.participant_name,
          image: s.participant_image,
          type: s.participant_type
        },
        stats: {
          played: s.matches_played,
          won: s.matches_won,
          drawn: s.matches_drawn,
          lost: s.matches_lost,
          goalsFor: s.goals_for,
          goalsAgainst: s.goals_against,
          goalDifference: s.goal_difference,
          points: s.points,
          setsWon: s.sets_won || 0,
          setsLost: s.sets_lost || 0,
          setRatio: parseFloat(s.set_ratio) || 0.00,
          pointsWon: s.points_won || 0,
          pointsLost: s.points_lost || 0,
          pointRatio: parseFloat(s.point_ratio) || 0.00
        },
        advanced: {
          cleanSheets: s.clean_sheets,
          avgGoalsFor: parseFloat(s.avg_goals_for) || 0,
          avgGoalsAgainst: parseFloat(s.avg_goals_against) || 0,
          winPercentage: parseFloat(s.win_percentage) || 0,
          lossPercentage: parseFloat(s.loss_percentage) || 0,
          drawPercentage: parseFloat(s.draw_percentage) || 0,
          pointsPerGame: parseFloat(s.points_per_game) || 0,
          winningStreak: s.winning_streak,
          losingStreak: s.losing_streak,
          form: s.last_5_form || ''
        },
        group: {
          id: s.group_id,
          name: s.group_name
        },
        isQualified: index < qualifiersPerGroup,
        qualifiersPerGroup: qualifiersPerGroup,
        isEliminated: s.is_eliminated === 1
      }));
      
      groupedStandings.push({
        group: {
          id: group.id,
          name: group.group_name
        },
        qualifiersPerGroup: qualifiersPerGroup,
        standings: formattedGroupStandings
      });
    }
    
    return groupedStandings;
  }
  
  // For other formats or specific group query, return regular format
  return formatStandingsData(standings, groupId);
}

/**
 * Helper function to format standings data
 */
const formatStandingsData = (standings, groupId = null) => {
  return standings.map(s => ({
    position: s.position,
    participant: {
      id: s.participant_id,
      name: s.participant_name,
      image: s.participant_image,
      type: s.participant_type
    },
    stats: {
      played: s.matches_played,
      won: s.matches_won,
      drawn: s.matches_drawn,
      lost: s.matches_lost,
      goalsFor: s.goals_for,
      goalsAgainst: s.goals_against,
      goalDifference: s.goal_difference,
      points: s.points,
      setsWon: s.sets_won || 0,
      setsLost: s.sets_lost || 0,
      setRatio: parseFloat(s.set_ratio) || 0.00,
      pointsWon: s.points_won || 0,
      pointsLost: s.points_lost || 0,
      pointRatio: parseFloat(s.point_ratio) || 0.00
    },
    advanced: {
      cleanSheets: s.clean_sheets,
      avgGoalsFor: parseFloat(s.avg_goals_for) || 0,
      avgGoalsAgainst: parseFloat(s.avg_goals_against) || 0,
      winPercentage: parseFloat(s.win_percentage) || 0,
      lossPercentage: parseFloat(s.loss_percentage) || 0,
      drawPercentage: parseFloat(s.draw_percentage) || 0,
      pointsPerGame: parseFloat(s.points_per_game) || 0,
      winningStreak: s.winning_streak,
      losingStreak: s.losing_streak,
      form: s.last_5_form || ''
    },
    group: groupId || s.group_id ? {
      id: s.group_id,
      name: s.group_name
    } : null,
    isEliminated: s.is_eliminated === 1
  }));
}

/**
 * Get tournament matches
 */
const getMatches = async (tournamentId, filters = {}) => {
  const { round_number, status } = filters;

  let sql = `
    SELECT 
      m.*,
      p1.participant_name as participant1_name,
      p2.participant_name as participant2_name,
      c.name as court_name,
      v.name as venue_name
    FROM matches m
    LEFT JOIN (
      SELECT 
        tp.id,
        CASE 
          WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
          WHEN tp.team_id IS NOT NULL THEN tm.name
        END as participant_name
      FROM tournament_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      LEFT JOIN partnerships p ON tp.partnership_id = p.id
      LEFT JOIN teams tm ON tp.team_id = tm.id
    ) p1 ON m.participant1_id = p1.id
    LEFT JOIN (
      SELECT 
        tp.id,
        CASE 
          WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
          WHEN tp.team_id IS NOT NULL THEN tm.name
        END as participant_name
      FROM tournament_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      LEFT JOIN partnerships p ON tp.partnership_id = p.id
      LEFT JOIN teams tm ON tp.team_id = tm.id
    ) p2 ON m.participant2_id = p2.id
    LEFT JOIN courts c ON m.court_id = c.id
    LEFT JOIN venues v ON m.venue_id = v.id
    WHERE m.tournament_id = ?
  `;

  const params = [tournamentId];

  if (round_number) {
    sql += ' AND m.round_number = ?';
    params.push(round_number);
  }

  if (status) {
    sql += ' AND m.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY m.round_number ASC, m.match_number ASC';

  const result = await query(sql, params);
  // query() returns an array of rows directly, not nested
  const matches = Array.isArray(result) ? result : [];

  // Parse JSON fields
  if (Array.isArray(matches)) {
    matches.forEach(match => {
      if (match.score) {
        try {
          if (typeof match.score === 'string') {
            match.score = JSON.parse(match.score);
          }
        } catch (error) {
          logger.error('Error parsing match score:', error);
          match.score = {};
        }
      }
    });
  }

  return matches;
}

/**
 * Check if user is organizer
 */
const isOrganizer = async (tournamentId, userId) => {
  const sql = 'SELECT organizer_id FROM tournaments WHERE id = ? AND deleted_at IS NULL';
  const result = await query(sql, [tournamentId]);
  
  console.log('isOrganizer - Raw result:', result);
  console.log('isOrganizer - tournamentId:', tournamentId, 'userId:', userId);
  
  // Handle different result formats
  const tournaments = Array.isArray(result) 
    ? result 
    : Array.isArray(result[0]) 
      ? result[0] 
      : [result];

  console.log('isOrganizer - Processed tournaments:', tournaments);

  if (!tournaments || tournaments.length === 0) {
    console.log('isOrganizer - No tournament found');
    return false;
  }
  
  const tournament = tournaments[0];
  console.log('isOrganizer - Tournament:', tournament);
  
  if (!tournament || !tournament.organizer_id) {
    console.log('isOrganizer - Tournament or organizer_id is undefined');
    return false;
  }
  
  const isOrg = tournament.organizer_id === userId;
  console.log('isOrganizer - Result:', isOrg, '(organizer_id:', tournament.organizer_id, 'vs userId:', userId, ')');
  
  return isOrg;
}

/**
 * Check if user is participant
 */
const isParticipant = async (tournamentId, userId) => {
  const sql = `
    SELECT COUNT(*) as count 
    FROM tournament_participants tp
    WHERE tp.tournament_id = ? 
      AND tp.user_id = ?
      AND tp.status IN ('registered', 'confirmed')
  `;

  const queryResult = await query(sql, [tournamentId, userId]);
  const result = queryResult[0] || queryResult;
  return result[0].count > 0;
}

/**
 * Get tournament statistics
 */
const getStatistics = async (tournamentId) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = ? AND status = 'confirmed') as total_participants,
      (SELECT COUNT(*) FROM matches WHERE tournament_id = ?) as total_matches,
      (SELECT COUNT(*) FROM matches WHERE tournament_id = ? AND status = 'completed') as completed_matches,
      (SELECT SUM(entry_fee) FROM tournament_participants tp JOIN tournaments t ON tp.tournament_id = t.id WHERE tp.tournament_id = ? AND tp.payment_status = 'paid') as total_collected,
      (SELECT COUNT(DISTINCT match_date) FROM matches WHERE tournament_id = ? AND match_date IS NOT NULL) as match_days
  `;

  const queryResult = await query(sql, [tournamentId, tournamentId, tournamentId, tournamentId, tournamentId]);
  const result = queryResult[0] || queryResult;
  return result[0];
}

/**
 * Get upcoming tournaments
 */
const getUpcoming = async (limit = 10) => {
  const sql = `
    SELECT 
      t.*,
      s.name as sport_name,
      COALESCE(v.name, t.custom_venue_name) as venue_name,
      v.city as venue_city,
      CASE 
        WHEN t.category = 'singles' THEN 
          (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'doubles' THEN 
          (SELECT COUNT(*) FROM pairs WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'teams' THEN 
          (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id AND status = 'locked' AND deleted_at IS NULL)
        ELSE 0
      END as participant_count
    FROM tournaments t
    LEFT JOIN sports s ON t.sport_id = s.id
    LEFT JOIN venues v ON t.venue_id = v.id
    WHERE t.deleted_at IS NULL
      AND t.status IN ('open', 'closed')
      AND t.start_date > CURDATE()
    ORDER BY t.start_date ASC
    LIMIT ?
  `;

  const result = await query(sql, [limit]);
  const tournaments = result[0] || result;

  if (Array.isArray(tournaments)) {
    tournaments.forEach(tournament => {
      if (tournament.rules) {
        try {
          if (typeof tournament.rules === 'string') {
            tournament.rules = JSON.parse(tournament.rules);
          }
        } catch (error) {
          logger.error('Error parsing tournament rules:', error);
          tournament.rules = {};
        }
      }
    });
  }

  return tournaments;
}

/**
 * Get ongoing tournaments
 */
const getOngoing = async (limit = 10) => {
  const sql = `
    SELECT 
      t.*,
      s.name as sport_name,
      COALESCE(v.name, t.custom_venue_name) as venue_name,
      v.city as venue_city,
      CASE 
        WHEN t.category = 'singles' THEN 
          (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'doubles' THEN 
          (SELECT COUNT(*) FROM pairs WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'teams' THEN 
          (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id AND status = 'locked' AND deleted_at IS NULL)
        ELSE 0
      END as participant_count
    FROM tournaments t
    LEFT JOIN sports s ON t.sport_id = s.id
    LEFT JOIN venues v ON t.venue_id = v.id
    WHERE t.deleted_at IS NULL
      AND t.status = 'ongoing'
      AND t.start_date <= CURDATE()
      AND t.end_date >= CURDATE()
    ORDER BY t.start_date ASC
    LIMIT ?
  `;

  const result = await query(sql, [limit]);
  const tournaments = result[0] || result;

  if (Array.isArray(tournaments)) {
    tournaments.forEach(tournament => {
      if (tournament.rules) {
        try {
          if (typeof tournament.rules === 'string') {
            tournament.rules = JSON.parse(tournament.rules);
          }
        } catch (error) {
          logger.error('Error parsing tournament rules:', error);
          tournament.rules = {};
        }
      }
    });
  }

  return tournaments;
}

/**
 * Get user's tournaments (as organizer or participant)
 */
const getUserTournaments = async (userId) => {
  const sql = `
    SELECT DISTINCT
      t.*,
      s.name as sport_name,
      COALESCE(v.name, t.custom_venue_name) as venue_name,
      CASE 
        WHEN t.organizer_id = ? THEN 'organizer'
        ELSE 'participant'
      END as user_role,
      CASE 
        WHEN t.category = 'singles' THEN 
          (SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'doubles' THEN 
          (SELECT COUNT(*) FROM pairs WHERE tournament_id = t.id AND status = 'locked')
        WHEN t.category = 'teams' THEN 
          (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id AND status = 'locked' AND deleted_at IS NULL)
        ELSE 0
      END as participant_count
    FROM tournaments t
    LEFT JOIN sports s ON t.sport_id = s.id
    LEFT JOIN venues v ON t.venue_id = v.id
    LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id AND tr.status IN ('pending', 'accepted', 'locked')
    WHERE t.deleted_at IS NULL
      AND (
        t.organizer_id = ? 
        OR tr.user_id = ?
      )
    ORDER BY t.start_date DESC
  `;

  const tournaments = await query(sql, [userId, userId, userId]);

  // Ensure we have an array
  const tournamentList = Array.isArray(tournaments) ? tournaments : [];

  // Parse rules JSON for each tournament
  tournamentList.forEach(tournament => {
    if (tournament.rules) {
      try {
        if (typeof tournament.rules === 'string') {
          tournament.rules = JSON.parse(tournament.rules);
        }
      } catch (error) {
        logger.error('Error parsing tournament rules:', error);
        tournament.rules = {};
      }
    }
  });

  return tournamentList;
}

/**
 * Update financial data
 */
const updateFinancials = async (tournamentId, data) => {
  const { total_collected, organizer_payout_status } = data;

  const updates = [];
  const values = [];

  if (total_collected !== undefined) {
    updates.push('total_collected = ?');
    values.push(total_collected);
  }

  if (organizer_payout_status) {
    updates.push('organizer_payout_status = ?');
    values.push(organizer_payout_status);
  }

  if (updates.length === 0) return;

  values.push(tournamentId);
  const sql = `UPDATE tournaments SET ${updates.join(', ')} WHERE id = ?`;

  await query(sql, values);
}
module.exports = {
  create,
  findById,
  findAll,
  update,
  updateStatus,
  softDelete,
  hardDelete,
  getParticipants,
  getStandings,
  getPointsTable,
  getMatches,
  isOrganizer,
  isParticipant,
  getStatistics,
  getUpcoming,
  getOngoing,
  getUserTournaments,
  updateFinancials
};

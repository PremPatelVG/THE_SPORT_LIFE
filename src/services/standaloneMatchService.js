const { query, transaction } = require('../config/database');
const quickPairService = require('./quickPairService');
const quickTeamService = require('./quickTeamService');
const logger = require('../utils/logger');

/**
 * Create standalone match with smart participant handling
 */
const createStandaloneMatch = async (userId, matchData) => {
  const {
    sport_id,
    category, // 'singles', 'doubles', 'teams'
    match_config,
    
    // Participant 1
    participant1_type, // 'existing' or 'new'
    participant1_id, // If existing
    participant1_data, // If new (for pair/team creation)
    
    // Participant 2
    participant2_type,
    participant2_id,
    participant2_data,
    
    // Optional fields
    referee_id = null,
    venue_id = null,
    court_id = null,
    match_date = null,
    match_time = null,
    start_immediately = false
  } = matchData;

  // Validate sport exists
  const [sport] = await query('SELECT id, name, category FROM sports WHERE id = ?', [sport_id]);
  if (!sport) {
    throw new Error('Sport not found');
  }

  // Validate category is valid
  const validCategories = ['singles', 'doubles', 'teams'];
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  return await transaction(async (conn) => {
    let finalParticipant1Id = participant1_id;
    let finalParticipant2Id = participant2_id;

    // Handle Participant 1
    if (category === 'singles') {
      // Validate user exists
      const [user] = await conn.query('SELECT id FROM users WHERE id = ?', [participant1_id]);
      if (!user) throw new Error('Participant 1 not found');
      finalParticipant1Id = participant1_id;
      
    } else if (category === 'doubles') {
      if (participant1_type === 'new') {
        // Create new pair
        finalParticipant1Id = await quickPairService.quickCreatePair(userId, {
          sport_id,
          ...participant1_data
        });
      } else {
        // Use existing pair
        const [pair] = await conn.query('SELECT id FROM pairs WHERE id = ?', [participant1_id]);
        if (!pair) throw new Error('Participant 1 pair not found');
        finalParticipant1Id = participant1_id;
      }
      
    } else if (category === 'teams') {
      if (participant1_type === 'new') {
        // Create new team
        finalParticipant1Id = await quickTeamService.quickCreateTeam(userId, {
          sport_id,
          ...participant1_data
        });
      } else {
        // Use existing team
        const [team] = await conn.query('SELECT id FROM teams WHERE id = ?', [participant1_id]);
        if (!team) throw new Error('Participant 1 team not found');
        finalParticipant1Id = participant1_id;
      }
    }

    // Handle Participant 2 (same logic)
    if (category === 'singles') {
      const [user] = await conn.query('SELECT id FROM users WHERE id = ?', [participant2_id]);
      if (!user) throw new Error('Participant 2 not found');
      finalParticipant2Id = participant2_id;
      
    } else if (category === 'doubles') {
      if (participant2_type === 'new') {
        finalParticipant2Id = await quickPairService.quickCreatePair(userId, {
          sport_id,
          ...participant2_data
        });
      } else {
        const [pair] = await conn.query('SELECT id FROM pairs WHERE id = ?', [participant2_id]);
        if (!pair) throw new Error('Participant 2 pair not found');
        finalParticipant2Id = participant2_id;
      }
      
    } else if (category === 'teams') {
      if (participant2_type === 'new') {
        finalParticipant2Id = await quickTeamService.quickCreateTeam(userId, {
          sport_id,
          ...participant2_data
        });
      } else {
        const [team] = await conn.query('SELECT id FROM teams WHERE id = ?', [participant2_id]);
        if (!team) throw new Error('Participant 2 team not found');
        finalParticipant2Id = participant2_id;
      }
    }

    // Determine referee_id based on start_immediately flag
    let finalRefereeId = referee_id;
    
    if (start_immediately && !referee_id) {
      // If starting immediately without assigned referee, creator becomes referee
      finalRefereeId = userId;
    } else if (referee_id) {
      // Validate assigned referee exists
      const [referee] = await conn.query('SELECT id FROM users WHERE id = ?', [referee_id]);
      if (!referee) throw new Error('Referee not found');
    }

    // Set match date/time to current if starting immediately and not provided
    let finalMatchDate = match_date;
    let finalMatchTime = match_time;
    
    if (start_immediately) {
      const now = new Date();
      if (!finalMatchDate) {
        finalMatchDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      if (!finalMatchTime) {
        finalMatchTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
      }
    }

    // Create match
    const matchSql = `
      INSERT INTO matches (
        is_standalone,
        sport_id,
        category,
        match_config,
        participant1_id,
        participant2_id,
        referee_id,
        venue_id,
        court_id,
        match_date,
        match_time,
        created_by,
        round_number,
        match_number,
        status
      ) VALUES (
        TRUE, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?,
        1, 1,
        ?
      )
    `;

    // Always create as 'scheduled' - referee will start it via /matches/:id/start API
    // This ensures proper initialization of live_score, server selection, and timing
    const status = start_immediately ? 'ready' : 'scheduled';

    const [result] = await conn.query(matchSql, [
      sport_id,
      category,
      JSON.stringify(match_config),
      finalParticipant1Id,
      finalParticipant2Id,
      finalRefereeId,
      venue_id,
      court_id,
      finalMatchDate,
      finalMatchTime,
      userId,
      status
    ]);

    const matchId = result.insertId;

    logger.info(`Standalone match ${matchId} created by user ${userId} (${category} - ${sport.name})`);

    return {
      matchId,
      participant1_id: finalParticipant1Id,
      participant2_id: finalParticipant2Id,
      referee_id: finalRefereeId,
      match_date: finalMatchDate,
      match_time: finalMatchTime,
      status,
      sport_id,
      category
    };
  });
};

/**
 * Get user's standalone matches
 */
const getUserStandaloneMatches = async (userId, filters = {}) => {
  let sql = `
    SELECT 
      m.*,
      s.name as sport_name,
      v.name as venue_name,
      c.name as court_name,
      r.first_name as referee_first_name,
      r.last_name as referee_last_name
    FROM matches m
    LEFT JOIN sports s ON m.sport_id = s.id
    LEFT JOIN venues v ON m.venue_id = v.id
    LEFT JOIN courts c ON m.court_id = c.id
    LEFT JOIN users r ON m.referee_id = r.id
    WHERE m.is_standalone = TRUE
      AND (m.created_by = ? OR m.referee_id = ? OR m.participant1_id = ? OR m.participant2_id = ?)
  `;

  const params = [userId, userId, userId, userId];

  if (filters.status) {
    sql += ' AND m.status = ?';
    params.push(filters.status);
  }

  sql += ' ORDER BY m.created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }

  const matches = await query(sql, params);
  return matches;
};

/**
 * Delete standalone match
 */
const deleteStandaloneMatch = async (matchId, userId) => {
  const [match] = await query(
    'SELECT id, created_by, status FROM matches WHERE id = ? AND is_standalone = TRUE',
    [matchId]
  );

  if (!match) {
    throw new Error('Standalone match not found');
  }

  if (match.created_by !== userId) {
    throw new Error('Only the creator can delete this match');
  }

  if (match.status === 'in_progress') {
    throw new Error('Cannot delete a match that is in progress');
  }

  await query('DELETE FROM matches WHERE id = ?', [matchId]);
  logger.info(`Standalone match ${matchId} deleted by user ${userId}`);
};

module.exports = {
  createStandaloneMatch,
  getUserStandaloneMatches,
  deleteStandaloneMatch
};

const { query, transaction } = require('../config/database');

/**
 * Create a new match
 */
const create = async (matchData) => {
  const {
    tournament_id = null,
    group_id = null,
    round_number = 1, // Default to 1 for standalone matches
    match_number = 1, // Default to 1 for standalone matches
    round_name = null,
    participant1_id = null,
    participant2_id = null,
    venue_id = null,
    court_id = null,
    match_date = null,
    match_time = null,
    estimated_duration = 90,
    sport_id = null,
    category = null,
    match_config = null,
    created_by = null,
    referee_id = null,
    is_standalone = null,
    status = 'scheduled'
  } = matchData;

  const sql = `
    INSERT INTO matches (
      tournament_id, group_id, round_number, match_number, round_name,
      participant1_id, participant2_id, venue_id, court_id,
      match_date, match_time, estimated_duration, sport_id, category,
      match_config, created_by, referee_id, is_standalone, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    tournament_id, group_id, round_number, match_number, round_name,
    participant1_id, participant2_id, venue_id, court_id,
    match_date, match_time, estimated_duration, sport_id, category,
    match_config ? JSON.stringify(match_config) : null, created_by, referee_id,
    is_standalone, status
  ]);

  return result.insertId;
};

/**
 * Find match by ID
 */
const findById = async (id) => {
  const sql = `
    SELECT 
      m.*,
      t.name as tournament_name,
      COALESCE(m.sport_id, t.sport_id) as sport_id,
      COALESCE(s1.name, s2.name) as sport_name,
      v.name as venue_name,
      c.name as court_name,
      p1.participant_name as participant1_name,
      p2.participant_name as participant2_name,
      r.first_name as referee_first_name,
      r.last_name as referee_last_name,
      CONCAT(r.first_name, ' ', r.last_name) as referee_name
    FROM matches m
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    LEFT JOIN sports s1 ON m.sport_id = s1.id
    LEFT JOIN sports s2 ON t.sport_id = s2.id
    LEFT JOIN venues v ON m.venue_id = v.id
    LEFT JOIN courts c ON m.court_id = c.id
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
    LEFT JOIN users r ON m.referee_id = r.id
    WHERE m.id = ?
  `;

  const matches = await query(sql, [id]);
  
  if (matches.length === 0) return null;

  const match = matches[0];
  
  // Parse JSON fields
  if (match.score) {
    match.score = JSON.parse(match.score);
  }
  
  // Fetch segment timings
  const segmentSql = `
    SELECT 
      id,
      segment_type,
      segment_number,
      start_time,
      end_time,
      duration_seconds,
      duration_formatted,
      additional_time_seconds,
      status,
      notes,
      created_at
    FROM match_segment_timings
    WHERE match_id = ?
    ORDER BY created_at ASC, segment_number ASC
  `;
  
  const segments = await query(segmentSql, [id]);
  match.segment_timings = segments;
  
  // Log for debugging
  if (segments.length > 0) {
    console.log(`✅ Match ${id} has ${segments.length} segment timings:`, 
      segments.map(s => `${s.segment_type}-${s.segment_number}`).join(', '));
  }

  return match;
};

/**
 * Find all matches with filters
 */
const findAll = async (filters = {}) => {
  const {
    tournament_id,
    venue_id,
    court_id,
    status,
    match_date,
    round_number,
    participant_id,
    referee_id,
    limit = 50,
    offset = 0
  } = filters;

  let sql = `
    SELECT 
      m.*,
      t.name as tournament_name,
      v.name as venue_name,
      c.name as court_name,
      p1.participant_name as participant1_name,
      p2.participant_name as participant2_name,
      CONCAT(r.first_name, ' ', r.last_name) as referee_name
    FROM matches m
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    LEFT JOIN venues v ON m.venue_id = v.id
    LEFT JOIN courts c ON m.court_id = c.id
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
    LEFT JOIN users r ON m.referee_id = r.id
    WHERE m.is_active = TRUE
  `;

  const params = [];

  if (tournament_id) {
    sql += ' AND m.tournament_id = ?';
    params.push(tournament_id);
  }

  if (venue_id) {
    sql += ' AND m.venue_id = ?';
    params.push(venue_id);
  }

  if (court_id) {
    sql += ' AND m.court_id = ?';
    params.push(court_id);
  }

  if (status) {
    sql += ' AND m.status = ?';
    params.push(status);
  }

  if (match_date) {
    sql += ' AND m.match_date = ?';
    params.push(match_date);
  }

  if (round_number) {
    sql += ' AND m.round_number = ?';
    params.push(round_number);
  }

  if (participant_id) {
    sql += ' AND (m.participant1_id = ? OR m.participant2_id = ?)';
    params.push(participant_id, participant_id);
  }

  if (referee_id) {
    sql += ' AND m.referee_id = ?';
    params.push(referee_id);
  }

  sql += ' ORDER BY m.match_date ASC, m.match_time ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const matches = await query(sql, params);

  // Parse JSON fields
  matches.forEach(match => {
    if (match.score) {
      match.score = JSON.parse(match.score);
    }
  });

  return matches;
};

/**
 * Update match
 */
const update = async (id, updateData) => {
  const allowedFields = [
    'participant1_id', 'participant2_id', 'venue_id', 'court_id',
    'match_date', 'match_time', 'scheduled_duration', 'referee_id',
    'status', 'score', 'winner_participant_id', 'actual_start_time',
    'actual_end_time', 'total_duration_seconds', 'total_duration_formatted',
    'live_score', 'is_active'
  ];

  const updates = [];
  const values = [];

  // When completing a match, ensure all timing fields are properly set
  if (updateData.status === 'completed') {
    // Get current match data
    const currentMatch = await findById(id);
    
    // 1. Set actual_end_time if not provided
    if (!updateData.actual_end_time) {
      updateData.actual_end_time = new Date();
    }
    
    // 2. Set actual_start_time if match was never started
    if (!updateData.actual_start_time && !currentMatch.actual_start_time) {
      // Match was declared winner without starting - set start time to current time
      updateData.actual_start_time = new Date();
    }
    
    // 3. Calculate total duration
    // Use provided times or fall back to current match times
    const startTime = updateData.actual_start_time 
      ? new Date(updateData.actual_start_time) 
      : (currentMatch.actual_start_time ? new Date(currentMatch.actual_start_time) : null);
    
    const endTime = updateData.actual_end_time 
      ? new Date(updateData.actual_end_time) 
      : new Date();
    
    if (startTime && endTime) {
      // Calculate duration in seconds
      const durationMs = endTime - startTime;
      const durationSeconds = Math.floor(durationMs / 1000);
      
      // Store duration in seconds
      updateData.total_duration_seconds = durationSeconds;
      
      // Format duration as HH:MM:SS
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;
      updateData.total_duration_formatted = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      // Stringify JSON fields (score and live_score)
      if (key === 'score' || key === 'live_score') {
        values.push(typeof updateData[key] === 'string' ? updateData[key] : JSON.stringify(updateData[key]));
      } else {
        values.push(updateData[key]);
      }
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);
  const sql = `UPDATE matches SET ${updates.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
  return findById(id);
};

/**
 * Update match status
 */
const updateStatus = async (id, status) => {
  const sql = 'UPDATE matches SET status = ? WHERE id = ?';
  await query(sql, [status, id]);
  return findById(id);
};

/**
 * Check-in participant
 */
const checkInParticipant = async (matchId, participantId) => {
  const match = await findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  let field;
  if (match.participant1_id === participantId) {
    field = 'participant1_checkin';
  } else if (match.participant2_id === participantId) {
    field = 'participant2_checkin';
  } else {
    throw new Error('Participant not in this match');
  }

  const sql = `UPDATE matches SET ${field} = TRUE WHERE id = ?`;
  await query(sql, [matchId]);

  // Check if both participants checked in
  const updated = await findById(matchId);
  if (updated.participant1_checkin && updated.participant2_checkin) {
    await updateStatus(matchId, 'ready');
  }

  return updated;
};

/**
 * Start match
 */
const startMatch = async (id) => {
  const sql = `
    UPDATE matches 
    SET status = 'in_progress', actual_start_time = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
  await query(sql, [id]);
  return findById(id);
};

/**
 * Complete match
 */
const completeMatch = async (id, winnerId, score) => {
  const sql = `
    UPDATE matches 
    SET status = 'completed', 
        winner_participant_id = ?,
        score = ?,
        actual_end_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  await query(sql, [winnerId, JSON.stringify(score), id]);
  return findById(id);
};

/**
 * Cancel match
 */
const cancelMatch = async (id, reason = null) => {
  const sql = 'UPDATE matches SET status = "cancelled" WHERE id = ?';
  await query(sql, [id]);
  return findById(id);
};

/**
 * Postpone match
 */
const postponeMatch = async (id, newDate = null, newTime = null) => {
  let sql = 'UPDATE matches SET status = "postponed"';
  const params = [];

  if (newDate) {
    sql += ', match_date = ?';
    params.push(newDate);
  }

  if (newTime) {
    sql += ', match_time = ?';
    params.push(newTime);
  }

  sql += ' WHERE id = ?';
  params.push(id);

  await query(sql, params);
  return findById(id);
};

/**
 * Assign referee
 */
const assignReferee = async (matchId, refereeId) => {
  const sql = 'UPDATE matches SET referee_id = ? WHERE id = ?';
  await query(sql, [refereeId, matchId]);
  return findById(id);
};

/**
 * Get matches by tournament
 */
const getByTournament = async (tournamentId, filters = {}) => {
  return findAll({ tournament_id: tournamentId, ...filters });
};

/**
 * Get matches by participant
 */
const getByParticipant = async (participantId) => {
  return findAll({ participant_id: participantId });
};

/**
 * Get matches by date
 */
const getByDate = async (date, venueId = null) => {
  const filters = { match_date: date };
  if (venueId) filters.venue_id = venueId;
  return findAll(filters);
};

/**
 * Get upcoming matches
 */
const getUpcoming = async (limit = 20) => {
  const sql = `
    SELECT 
      m.*,
      t.name as tournament_name,
      v.name as venue_name,
      c.name as court_name,
      p1.participant_name as participant1_name,
      p2.participant_name as participant2_name,
      CONCAT(r.first_name, ' ', r.last_name) as referee_name
    FROM matches m
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    LEFT JOIN venues v ON m.venue_id = v.id
    LEFT JOIN courts c ON m.court_id = c.id
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
    LEFT JOIN users r ON m.referee_id = r.id
    WHERE m.status IN ('scheduled', 'ready')
      AND m.match_date >= CURDATE()
      AND m.is_active = TRUE
    ORDER BY m.match_date ASC, m.match_time ASC
    LIMIT ?
  `;

  const matches = await query(sql, [limit]);

  matches.forEach(match => {
    if (match.score) {
      match.score = JSON.parse(match.score);
    }
  });

  return matches;
};

/**
 * Get live matches
 */
const getLive = async () => {
  const sql = `
    SELECT 
      m.*,
      t.name as tournament_name,
      t.category as tournament_category,
      s.name as sport_name,
      v.name as venue_name,
      c.name as court_name,
      
      -- Participant 1 name (based on tournament category)
      CASE 
        WHEN t.category = 'singles' THEN CONCAT(u1.first_name, ' ', u1.last_name)
        WHEN t.category = 'doubles' THEN p1.name
        WHEN t.category = 'teams' THEN t1.name
      END as participant1_name,
      
      -- Participant 2 name (based on tournament category)
      CASE 
        WHEN t.category = 'singles' THEN CONCAT(u2.first_name, ' ', u2.last_name)
        WHEN t.category = 'doubles' THEN p2.name
        WHEN t.category = 'teams' THEN t2.name
      END as participant2_name,
      
      CONCAT(r.first_name, ' ', r.last_name) as referee_name
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
    
    LEFT JOIN users r ON m.referee_id = r.id
    WHERE m.status = 'in_progress'
      AND m.is_active = TRUE
    ORDER BY m.actual_start_time DESC
  `;

  const matches = await query(sql);

  matches.forEach(match => {
    if (match.score) {
      match.score = JSON.parse(match.score);
    }
  });

  return matches;
};

/**
 * Get live matches for dashboard (with live_score parsed)
 * Handles both tournament matches and standalone matches
 */
const getLiveForDashboard = async () => {
  const sql = `
    SELECT 
      m.*,
      t.name as tournament_name,
      t.category as tournament_category,
      t.sport_id as tournament_sport_id,
      t.match_config as tournament_match_config,
      COALESCE(s1.name, s2.name) as sport_name,
      v.name as venue_name,
      c.name as court_name,
      
      -- Participant 1 name (handles both tournament and standalone matches)
      CASE 
        -- Tournament matches
        WHEN t.category = 'singles' THEN CONCAT(u1.first_name, ' ', u1.last_name)
        WHEN t.category = 'doubles' THEN p1.name
        WHEN t.category = 'teams' THEN t1.name
        -- Standalone matches (participant_id IS the actual entity ID)
        WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su1.first_name, ' ', su1.last_name)
        WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp1.name
        WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st1.name
      END as participant1_name,
      
      -- Participant 2 name (handles both tournament and standalone matches)
      CASE 
        -- Tournament matches
        WHEN t.category = 'singles' THEN CONCAT(u2.first_name, ' ', u2.last_name)
        WHEN t.category = 'doubles' THEN p2.name
        WHEN t.category = 'teams' THEN t2.name
        -- Standalone matches (participant_id IS the actual entity ID)
        WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su2.first_name, ' ', su2.last_name)
        WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp2.name
        WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st2.name
      END as participant2_name,
      
      CONCAT(r.first_name, ' ', r.last_name) as referee_name
    FROM matches m
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    LEFT JOIN sports s1 ON t.sport_id = s1.id
    LEFT JOIN sports s2 ON m.sport_id = s2.id
    LEFT JOIN venues v ON m.venue_id = v.id
    LEFT JOIN courts c ON m.court_id = c.id
    
    -- Tournament Participant 1 joins (singles)
    LEFT JOIN tournament_registrations tr1 ON m.participant1_id = tr1.id AND t.category = 'singles'
    LEFT JOIN users u1 ON tr1.user_id = u1.id
    
    -- Tournament Participant 1 joins (doubles)
    LEFT JOIN pairs p1 ON m.participant1_id = p1.id AND t.category = 'doubles'
    
    -- Tournament Participant 1 joins (teams)
    LEFT JOIN teams t1 ON m.participant1_id = t1.id AND t.category = 'teams'
    
    -- Tournament Participant 2 joins (singles)
    LEFT JOIN tournament_registrations tr2 ON m.participant2_id = tr2.id AND t.category = 'singles'
    LEFT JOIN users u2 ON tr2.user_id = u2.id
    
    -- Tournament Participant 2 joins (doubles)
    LEFT JOIN pairs p2 ON m.participant2_id = p2.id AND t.category = 'doubles'
    
    -- Tournament Participant 2 joins (teams)
    LEFT JOIN teams t2 ON m.participant2_id = t2.id AND t.category = 'teams'
    
    -- Standalone Participant 1 joins (singles)
    LEFT JOIN users su1 ON m.participant1_id = su1.id AND m.is_standalone = 1 AND m.category = 'singles'
    
    -- Standalone Participant 1 joins (doubles)
    LEFT JOIN pairs sp1 ON m.participant1_id = sp1.id AND m.is_standalone = 1 AND m.category = 'doubles'
    
    -- Standalone Participant 1 joins (teams)
    LEFT JOIN teams st1 ON m.participant1_id = st1.id AND m.is_standalone = 1 AND m.category = 'teams'
    
    -- Standalone Participant 2 joins (singles)
    LEFT JOIN users su2 ON m.participant2_id = su2.id AND m.is_standalone = 1 AND m.category = 'singles'
    
    -- Standalone Participant 2 joins (doubles)
    LEFT JOIN pairs sp2 ON m.participant2_id = sp2.id AND m.is_standalone = 1 AND m.category = 'doubles'
    
    -- Standalone Participant 2 joins (teams)
    LEFT JOIN teams st2 ON m.participant2_id = st2.id AND m.is_standalone = 1 AND m.category = 'teams'
    
    LEFT JOIN users r ON m.referee_id = r.id
    WHERE m.status = 'in_progress'
      AND m.is_active = TRUE
    ORDER BY m.actual_start_time DESC
  `;

  const matches = await query(sql);

  matches.forEach(match => {
    // Parse score if it's a string
    if (match.score && typeof match.score === 'string') {
      try {
        match.score = JSON.parse(match.score);
      } catch (e) {
        console.error('Failed to parse score:', e);
      }
    }
    
    // Parse tournament_match_config if it's a string
    if (match.tournament_match_config && typeof match.tournament_match_config === 'string') {
      try {
        match.tournament_match_config = JSON.parse(match.tournament_match_config);
      } catch (e) {
        console.error('Failed to parse tournament_match_config:', e);
      }
    }
    
    // Parse live_score if it's a string
    if (match.live_score && typeof match.live_score === 'string') {
      try {
        match.live_score = JSON.parse(match.live_score);
      } catch (e) {
        console.error('Failed to parse live_score:', e);
      }
    }
    
    // Ensure match_structure is set in live_score from tournament_match_config if missing
    if (match.live_score && !match.live_score.match_structure && match.tournament_match_config?.match_structure) {
      match.live_score.match_structure = match.tournament_match_config.match_structure;
    }
    
    // Remove sport_match_structure from response (not needed)
    delete match.sport_match_structure;
  });

  return matches;
};

/**
 * Check if court is available
 */
const isCourtAvailable = async (courtId, date, time, duration, excludeMatchId = null) => {
  let sql = `
    SELECT COUNT(*) as count
    FROM matches
    WHERE court_id = ?
      AND match_date = ?
      AND status NOT IN ('cancelled', 'completed')
      AND (
        (match_time <= ? AND DATE_ADD(match_time, INTERVAL scheduled_duration MINUTE) > ?)
        OR (match_time >= ? AND match_time < DATE_ADD(?, INTERVAL ? MINUTE))
      )
  `;

  const params = [courtId, date, time, time, time, time, duration];

  if (excludeMatchId) {
    sql += ' AND id != ?';
    params.push(excludeMatchId);
  }

  const result = await query(sql, params);
  return result[0].count === 0;
};

/**
 * Get match statistics
 */
const getStatistics = async (matchId) => {
  const match = await findById(matchId);
  
  if (!match || !match.score) {
    return null;
  }

  // Calculate statistics from score
  const stats = {
    match_id: matchId,
    duration_minutes: null,
    total_sets: match.score.sets?.length || 0,
    participant1_sets_won: 0,
    participant2_sets_won: 0
  };

  if (match.actual_start_time && match.actual_end_time) {
    const start = new Date(match.actual_start_time);
    const end = new Date(match.actual_end_time);
    stats.duration_minutes = Math.round((end - start) / 60000);
  }

  if (match.score.sets) {
    match.score.sets.forEach(set => {
      if (set.participant1_score > set.participant2_score) {
        stats.participant1_sets_won++;
      } else {
        stats.participant2_sets_won++;
      }
    });
  }

  return stats;
};

/**
 * Verify match result
 */
const verifyResult = async (matchId, verifiedBy) => {
  const sql = 'UPDATE matches SET result_verified = TRUE, verified_by = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?';
  await query(sql, [verifiedBy, matchId]);
  return findById(matchId);
};

/**
 * Record walkover
 */
const recordWalkover = async (matchId, winnerId) => {
  const sql = `
    UPDATE matches 
    SET status = 'walkover',
        winner_participant_id = ?,
        actual_end_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  await query(sql, [winnerId, matchId]);
  return findById(matchId);
};

module.exports = {
  create,
  findById,
  findAll,
  update,
  updateStatus,
  checkInParticipant,
  startMatch,
  completeMatch,
  cancelMatch,
  postponeMatch,
  assignReferee,
  getByTournament,
  getByParticipant,
  getByDate,
  getUpcoming,
  getLive,
  getLiveForDashboard,
  isCourtAvailable,
  getStatistics,
  verifyResult,
  recordWalkover
};

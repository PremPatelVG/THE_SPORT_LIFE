const { query } = require('../config/database');

/**
 * Register participant for tournament
 */
const create = async (participantData) => {
  const {
    tournament_id,
    user_id = null,
    partnership_id = null,
    team_id = null,
    payment_status = 'pending',
    payment_id = null,
    seed_number = null
  } = participantData;

  // Validate that only one participant type is provided
  const participantTypes = [user_id, partnership_id, team_id].filter(Boolean);
  if (participantTypes.length !== 1) {
    throw new Error('Must provide exactly one of: user_id, partnership_id, or team_id');
  }

  const sql = `
    INSERT INTO tournament_participants (
      tournament_id, user_id, partnership_id, team_id,
      payment_status, payment_id, seed_number, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'registered')
  `;

  const result = await query(sql, [
    tournament_id, user_id, partnership_id, team_id,
    payment_status, payment_id, seed_number
  ]);

  return result.insertId;
}

/**
 * Find participant by ID
 */
const findById = async (id) => {
  const sql = `
    SELECT 
      tp.*,
      t.name as tournament_name,
      t.entry_fee,
      CASE 
        WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
        WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
        WHEN tp.team_id IS NOT NULL THEN tm.name
      END as participant_name,
      CASE 
        WHEN tp.user_id IS NOT NULL THEN u.email
        WHEN tp.team_id IS NOT NULL THEN (SELECT email FROM users WHERE id = tm.captain_id)
      END as contact_email
    FROM tournament_participants tp
    LEFT JOIN tournaments t ON tp.tournament_id = t.id
    LEFT JOIN users u ON tp.user_id = u.id
    LEFT JOIN partnerships p ON tp.partnership_id = p.id
    LEFT JOIN teams tm ON tp.team_id = tm.id
    WHERE tp.id = ?
  `;

  const participants = await query(sql, [id]);
  return participants.length > 0 ? participants[0] : null;
}

/**
 * Check if user/team/partnership already registered
 */
const isRegistered = async (tournamentId, participantData) => {
  const { user_id, partnership_id, team_id } = participantData;

  let sql = 'SELECT id FROM tournament_participants WHERE tournament_id = ?';
  const params = [tournamentId];

  if (user_id) {
    sql += ' AND user_id = ?';
    params.push(user_id);
  } else if (partnership_id) {
    sql += ' AND partnership_id = ?';
    params.push(partnership_id);
  } else if (team_id) {
    sql += ' AND team_id = ?';
    params.push(team_id);
  }

  sql += ' AND status NOT IN ("withdrawn", "disqualified")';

  const result = await query(sql, params);
  return result.length > 0;
}

/**
 * Update participant status
 */
const updateStatus = async (id, status) => {
  const sql = 'UPDATE tournament_participants SET status = ? WHERE id = ?';
  await query(sql, [status, id]);
  return findById(id);
}

/**
 * Update payment status
 */
const updatePaymentStatus = async (id, paymentStatus, paymentId = null) => {
  const sql = 'UPDATE tournament_participants SET payment_status = ?, payment_id = ? WHERE id = ?';
  await query(sql, [paymentStatus, paymentId, id]);
  return findById(id);
}

/**
 * Assign seed number
 */
const assignSeed = async (id, seedNumber) => {
  const sql = 'UPDATE tournament_participants SET seed_number = ? WHERE id = ?';
  await query(sql, [seedNumber, id]);
}

/**
 * Get all participants for a tournament
 */
const findByTournament = async (tournamentId, filters = {}) => {
  const { status, payment_status } = filters;

  let sql = `
    SELECT 
      tp.*,
      CASE 
        WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
        WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
        WHEN tp.team_id IS NOT NULL THEN tm.name
      END as participant_name,
      CASE 
        WHEN tp.user_id IS NOT NULL THEN u.profile_image
        WHEN tp.team_id IS NOT NULL THEN tm.logo
      END as participant_image,
      CASE 
        WHEN tp.user_id IS NOT NULL THEN 'individual'
        WHEN tp.partnership_id IS NOT NULL THEN 'partnership'
        WHEN tp.team_id IS NOT NULL THEN 'team'
      END as participant_type
    FROM tournament_participants tp
    LEFT JOIN users u ON tp.user_id = u.id
    LEFT JOIN partnerships p ON tp.partnership_id = p.id
    LEFT JOIN teams tm ON tp.team_id = tm.id
    WHERE tp.tournament_id = ?
  `;

  const params = [tournamentId];

  if (status) {
    sql += ' AND tp.status = ?';
    params.push(status);
  }

  if (payment_status) {
    sql += ' AND tp.payment_status = ?';
    params.push(payment_status);
  }

  sql += ' ORDER BY tp.seed_number ASC, tp.registration_date ASC';

  return await query(sql, params);
}

/**
 * Get participant count for tournament
 */
const getCount = async (tournamentId, status = null) => {
  let sql = 'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?';
  const params = [tournamentId];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  const result = await query(sql, params);
  return result[0].count;
}

/**
 * Withdraw participant
 */
const withdraw = async (id, reason = null) => {
  const sql = 'UPDATE tournament_participants SET status = "withdrawn" WHERE id = ?';
  await query(sql, [id]);
  return findById(id);
}

/**
 * Disqualify participant
 */
const disqualify = async (id, reason) => {
  const sql = 'UPDATE tournament_participants SET status = "disqualified" WHERE id = ?';
  await query(sql, [id]);
  return findById(id);
}

/**
 * Get participant's matches
 */
const getMatches = async (participantId) => {
  const sql = `
    SELECT 
      m.*,
      CASE 
        WHEN m.participant1_id = ? THEN 'participant1'
        WHEN m.participant2_id = ? THEN 'participant2'
      END as participant_role,
      c.name as court_name,
      v.name as venue_name
    FROM matches m
    LEFT JOIN courts c ON m.court_id = c.id
    LEFT JOIN venues v ON m.venue_id = v.id
    WHERE (m.participant1_id = ? OR m.participant2_id = ?)
    ORDER BY m.match_date ASC, m.match_time ASC
  `;

  const matches = await query(sql, [participantId, participantId, participantId, participantId]);

  // Parse JSON fields
  matches.forEach(match => {
    if (match.score) {
      match.score = JSON.parse(match.score);
    }
  });

  return matches;
}

/**
 * Get participant statistics
 */
const getStatistics = async (participantId) => {
  const sql = `
    SELECT 
      COUNT(*) as total_matches,
      SUM(CASE WHEN winner_participant_id = ? THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN winner_participant_id IS NOT NULL AND winner_participant_id != ? THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN status = 'completed' AND winner_participant_id IS NULL THEN 1 ELSE 0 END) as draws
    FROM matches
    WHERE (participant1_id = ? OR participant2_id = ?)
      AND status = 'completed'
  `;

  const result = await query(sql, [participantId, participantId, participantId, participantId]);
  return result[0];
}

/**
 * Get user's participation in tournament
 */
const findUserParticipation = async (tournamentId, userId) => {
  const sql = `
    SELECT 
      tp.*,
      CASE 
        WHEN tp.user_id IS NOT NULL THEN 'individual'
        WHEN tp.partnership_id IS NOT NULL THEN 'partnership'
        WHEN tp.team_id IS NOT NULL THEN 'team'
      END as participation_type
    FROM tournament_participants tp
    LEFT JOIN partnerships p ON tp.partnership_id = p.id
    LEFT JOIN team_members tm ON tp.team_id = tm.team_id
    WHERE tp.tournament_id = ?
      AND (
        tp.user_id = ? 
        OR (p.player1_id = ? OR p.player2_id = ?)
        OR tm.user_id = ?
      )
      AND tp.status NOT IN ('withdrawn', 'disqualified')
    LIMIT 1
  `;

  const participants = await query(sql, [tournamentId, userId, userId, userId, userId]);
  return participants.length > 0 ? participants[0] : null;
}

/**
 * Bulk update seeds
 */
const bulkUpdateSeeds = async (participants) => {
  if (!participants || participants.length === 0) return;

  const cases = participants.map(() => 'WHEN id = ? THEN ?').join(' ');
  const ids = participants.map(p => p.participant_id);
  const values = participants.flatMap(p => [p.participant_id, p.seed_number]);
  values.push(...ids);

  const sql = `
    UPDATE tournament_participants
    SET seed_number = CASE ${cases} END
    WHERE id IN (${ids.map(() => '?').join(',')})
  `;

  await query(sql, values);
}

/**
 * Get confirmed participants for bracket generation
 */
const getConfirmedParticipants = async (tournamentId) => {
  const sql = `
    SELECT 
      tp.*,
      CASE 
        WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
        WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
        WHEN tp.team_id IS NOT NULL THEN tm.name
      END as participant_name
    FROM tournament_participants tp
    LEFT JOIN users u ON tp.user_id = u.id
    LEFT JOIN partnerships p ON tp.partnership_id = p.id
    LEFT JOIN teams tm ON tp.team_id = tm.id
    LEFT JOIN tournaments t ON tp.tournament_id = t.id
    WHERE tp.tournament_id = ?
      AND tp.status IN ('registered', 'confirmed')
      AND (
        t.entry_fee = 0 OR 
        tp.payment_status = 'paid'
      )
    ORDER BY tp.seed_number ASC, tp.registration_date ASC
  `;

  return await query(sql, [tournamentId]);
}
module.exports = {
  create,
  findById,
  isRegistered,
  updateStatus,
  updatePaymentStatus,
  assignSeed,
  findByTournament,
  getCount,
  withdraw,
  disqualify,
  getMatches,
  getStatistics,
  findUserParticipation,
  bulkUpdateSeeds,
  getConfirmedParticipants
};

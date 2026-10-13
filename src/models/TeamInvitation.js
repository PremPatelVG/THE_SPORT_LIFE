const { query } = require('../config/database');

/**
 * Create a new invitation or join request
 * @param {Object} invitationData - { team_id, partnership_id, user_id, initiated_by, type, message }
 * type: 'invitation' (team owner invites) or 'join_request' (player requests)
 */
const create = async (invitationData) => {
  const {
    team_id,
    partnership_id,
    user_id,
    initiated_by,
    type = 'invitation',
    message = null
  } = invitationData;

  // Validate that either team_id or partnership_id is provided
  if (!team_id && !partnership_id) {
    throw new Error('Either team_id or partnership_id is required');
  }

  if (team_id && partnership_id) {
    throw new Error('Cannot specify both team_id and partnership_id');
  }

  // Check if invitation/request already exists
  const whereClause = team_id 
    ? 'team_id = ? AND user_id = ? AND type = ? AND status = "pending"'
    : 'partnership_id = ? AND user_id = ? AND type = ? AND status = "pending"';
  
  const existing = await query(
    `SELECT id FROM team_invitations WHERE ${whereClause}`,
    [team_id || partnership_id, user_id, type]
  );

  if (existing.length > 0) {
    throw new Error(`${type === 'invitation' ? 'Invitation' : 'Join request'} already exists`);
  }

  const sql = `
    INSERT INTO team_invitations (team_id, partnership_id, user_id, initiated_by, type, message, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `;

  const result = await query(sql, [team_id || null, partnership_id || null, user_id, initiated_by, type, message]);
  return result.insertId;
}

/**
 * Find invitation by ID with team or partnership details
 */
const findById = async (id) => {
  const sql = `
    SELECT 
      ti.*,
      t.name as team_name,
      t.logo as team_logo,
      t.sport_id,
      p.partnership_name,
      initiator.first_name as initiator_first_name,
      initiator.last_name as initiator_last_name,
      invitee.first_name as invitee_first_name,
      invitee.last_name as invitee_last_name,
      invitee.email as invitee_email
    FROM team_invitations ti
    LEFT JOIN teams t ON ti.team_id = t.id
    LEFT JOIN partnerships p ON ti.partnership_id = p.id
    LEFT JOIN users initiator ON ti.initiated_by = initiator.id
    LEFT JOIN users invitee ON ti.user_id = invitee.id
    WHERE ti.id = ?
  `;

  const invitations = await query(sql, [id]);
  return invitations.length > 0 ? invitations[0] : null;
}

/**
 * Get invitations for a team
 */
const findByTeam = async (teamId, status = null) => {
  let sql = `
    SELECT 
      ti.*,
      invitee.first_name,
      invitee.last_name,
      invitee.email,
      invitee.profile_image,
      inviter.first_name as inviter_first_name,
      inviter.last_name as inviter_last_name
    FROM team_invitations ti
    JOIN users invitee ON ti.user_id = invitee.id
    JOIN users inviter ON ti.initiated_by = inviter.id
    WHERE ti.team_id = ?
  `;

  const params = [teamId];

  if (status) {
    sql += ' AND ti.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY ti.created_at DESC';

  return await query(sql, params);
}

/**
 * Get invitations/requests for a user
 */
const findByUser = async (userId, status = null) => {
  let sql = `
    SELECT 
      ti.*,
      t.name as team_name,
      t.logo as team_logo,
      t.sport_id,
      t.max_players,
      s.name as sport_name,
      CONCAT(creator.first_name, ' ', creator.last_name) as creator_name,
      CONCAT(captain.first_name, ' ', captain.last_name) as captain_name,
      p.partnership_name,
      initiator.first_name as initiator_first_name,
      initiator.last_name as initiator_last_name,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND is_active = 1) as member_count
    FROM team_invitations ti
    LEFT JOIN teams t ON ti.team_id = t.id
    LEFT JOIN sports s ON t.sport_id = s.id
    LEFT JOIN users creator ON t.creator_id = creator.id
    LEFT JOIN users captain ON t.captain_id = captain.id
    LEFT JOIN partnerships p ON ti.partnership_id = p.id
    LEFT JOIN users initiator ON ti.initiated_by = initiator.id
    WHERE ti.user_id = ?
  `;

  const params = [userId];

  if (status) {
    sql += ' AND ti.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY ti.created_at DESC';

  return await query(sql, params);
}

/**
 * Accept invitation
 */
const accept = async (id) => {
  const invitation = await findById(id);
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer pending');
  }

  // Update invitation status
  await query(
    'UPDATE team_invitations SET status = "accepted", responded_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );

  return invitation;
}

/**
 * Reject invitation
 */
const reject = async (id) => {
  const invitation = await findById(id);
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer pending');
  }

  await query(
    'UPDATE team_invitations SET status = "rejected", responded_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );

  return invitation;
}

/**
 * Cancel invitation
 */
const cancel = async (id) => {
  const invitation = await findById(id);
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Can only cancel pending invitations');
  }

  await query(
    'UPDATE team_invitations SET status = "cancelled", responded_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
}

/**
 * Get pending invitation count for team
 */
const getPendingCount = async (teamId) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM team_invitations WHERE team_id = ? AND status = "pending"',
    [teamId]
  );

  return result[0].count;
}

/**
 * Get count of pending invitations for user
 */
const getUserPendingCount = async (userId) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM team_invitations WHERE user_id = ? AND status = "pending"',
    [userId]
  );

  return result[0].count;
}

/**
 * Check if user has pending invitation for team
 */
const hasPendingInvitation = async (teamId, userId) => {
  const result = await query(
    'SELECT id FROM team_invitations WHERE team_id = ? AND user_id = ? AND status = "pending"',
    [teamId, userId]
  );

  return result.length > 0;
}

/**
 * Find invitation by team and user
 */
const findByTeamAndUser = async (teamId, userId) => {
  const sql = `
    SELECT * FROM team_invitations 
    WHERE team_id = ? AND user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  
  const result = await query(sql, [teamId, userId]);
  return result.length > 0 ? result[0] : null;
};

/**
 * Get invitations for a team and specific users (batch query)
 * Returns all invitations for given team and user IDs in a single query
 */
const findByTeamAndUsers = async (teamId, userIds) => {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  const placeholders = userIds.map(() => '?').join(',');
  const sql = `
    SELECT 
      id,
      team_id,
      user_id,
      status,
      created_at,
      responded_at
    FROM team_invitations
    WHERE team_id = ? AND user_id IN (${placeholders})
  `;

  const params = [teamId, ...userIds];
  return await query(sql, params);
};

/**
 * Delete invitation by ID
 */
const deleteById = async (id) => {
  const sql = 'DELETE FROM team_invitations WHERE id = ?';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
};

/**
 * Delete old invitations (cleanup)
 */
const deleteOldInvitations = async (daysOld = 30) => {
  const sql = `
    DELETE FROM team_invitations 
    WHERE status IN ('rejected', 'cancelled') 
      AND responded_at < DATE_SUB(NOW(), INTERVAL ? DAY)
  `;

  const result = await query(sql, [daysOld]);
  return result.affectedRows;
}
module.exports = {
  create,
  findById,
  findByTeam,
  findByUser,
  findByTeamAndUser,
  findByTeamAndUsers,
  accept,
  reject,
  cancel,
  getPendingCount,
  getUserPendingCount,
  hasPendingInvitation,
  deleteById,
  deleteOldInvitations
};

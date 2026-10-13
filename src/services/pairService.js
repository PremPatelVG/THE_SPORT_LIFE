const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * PAIR SERVICE
 * Handles player-created reusable pairs (like player teams)
 * Pairs are for doubles sports (Badminton, Tennis, etc.)
 */

/**
 * Create a new pair (simple - just name and sport)
 * @param {number} creatorId - Creator ID (user creating the pair)
 * @param {number} sportId - Sport ID
 * @param {string} name - Pair name
 * @returns {Promise<Object>} Created pair
 */
const createPair = async (creatorId, sportId, name) => {
  try {
    // Validate required fields
    if (!name || !sportId) {
      throw new Error('Pair name and sport are required');
    }

    // Create pair with creator as player1
    const result = await query(`
      INSERT INTO pairs (
        tournament_id, 
        sport_id, 
        is_tournament_specific, 
        pair_type, 
        name, 
        player1_id, 
        player2_id, 
        status, 
        created_by
      ) VALUES (NULL, ?, 0, 'reusable', ?, ?, NULL, 'draft', ?)
    `, [sportId, name, creatorId, creatorId]);

    const pairId = result.insertId;

    logger.info(`Pair ${pairId} created by user ${creatorId}: ${name} (creator added as player1)`);

    return {
      id: pairId,
      sport_id: sportId,
      name: name,
      player1_id: creatorId,
      player2_id: null,
      status: 'draft',
      pair_type: 'reusable',
      created_by: creatorId
    };

  } catch (error) {
    logger.error('Create pair error:', error);
    throw error;
  }
};

/**
 * Get all pairs for a user
 * @param {number} userId - User ID
 * @param {string} filter - Filter: 'all', 'tournament', 'reusable'
 * @returns {Promise<Array>} List of pairs
 */
const getMyPairs = async (userId, filter = 'all') => {
  try {
    let whereClause = '((p.player1_id = ? OR p.player2_id = ?) OR p.created_by = ?) AND p.deleted_at IS NULL';
    const params = [userId, userId, userId];

    // Always exclude temporary pairs
    if (filter === 'tournament') {
      whereClause += " AND p.pair_type = 'tournament'";
    } else if (filter === 'reusable') {
      whereClause += " AND p.pair_type = 'reusable'";
    } else {
      // For 'all', exclude temporary pairs
      whereClause += " AND p.pair_type IN ('tournament', 'reusable')";
    }

    const pairs = await query(`
      SELECT 
        p.*,
        s.name as sport_name,
        u1.first_name as player1_first_name,
        u1.last_name as player1_last_name,
        CONCAT(u1.first_name, ' ', u1.last_name) as player1_name,
        u1.profile_image as player1_image,
        u1.phone as player1_phone,
        u2.first_name as player2_first_name,
        u2.last_name as player2_last_name,
        CONCAT(u2.first_name, ' ', u2.last_name) as player2_name,
        u2.profile_image as player2_image,
        u2.phone as player2_phone,
        t.name as tournament_name,
        CASE 
          WHEN p.created_by = ? THEN 'owner'
          WHEN p.player1_id = ? OR p.player2_id = ? THEN 'member'
          ELSE 'viewer'
        END as user_role
      FROM pairs p
      LEFT JOIN sports s ON p.sport_id = s.id
      LEFT JOIN users u1 ON p.player1_id = u1.id
      LEFT JOIN users u2 ON p.player2_id = u2.id
      LEFT JOIN tournaments t ON p.tournament_id = t.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
    `, [...params, userId, userId, userId]);

    return pairs;

  } catch (error) {
    logger.error('Get my pairs error:', error);
    throw error;
  }
};

/**
 * Get pair details
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object>} Pair details
 */
const getPairDetails = async (pairId, userId) => {
  try {
    const pair = await query(`
      SELECT 
        p.*,
        s.name as sport_name,
        u1.first_name as player1_first_name,
        u1.last_name as player1_last_name,
        CONCAT(u1.first_name, ' ', u1.last_name) as player1_name,
        u1.profile_image as player1_image,
        u1.phone as player1_phone,
        u1.email as player1_email,
        u2.first_name as player2_first_name,
        u2.last_name as player2_last_name,
        CONCAT(u2.first_name, ' ', u2.last_name) as player2_name,
        u2.profile_image as player2_image,
        u2.phone as player2_phone,
        u2.email as player2_email,
        t.name as tournament_name,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name
      FROM pairs p
      LEFT JOIN sports s ON p.sport_id = s.id
      LEFT JOIN users u1 ON p.player1_id = u1.id
      LEFT JOIN users u2 ON p.player2_id = u2.id
      LEFT JOIN tournaments t ON p.tournament_id = t.id
      LEFT JOIN users creator ON p.created_by = creator.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `, [pairId]);

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is part of pair OR is the creator
    if (pair[0].player1_id !== userId && pair[0].player2_id !== userId && pair[0].created_by !== userId) {
      throw new Error('You are not authorized to view this pair');
    }

    // Get invitation status for both players
    const invitations = await query(`
      SELECT invitee_id, status, metadata
      FROM pair_invitations
      WHERE pair_id = ?
      ORDER BY invited_at DESC
    `, [pairId]);

    // Map invitation status
    let player1InvitationStatus = 'accepted'; // Default if player is set
    let player2InvitationStatus = 'accepted';

    if (!pair[0].player1_id) {
      // Player 1 not set yet, check invitation
      const p1Invitation = invitations.find(inv => {
        const metadata = typeof inv.metadata === 'string' 
          ? JSON.parse(inv.metadata) 
          : (inv.metadata || {});
        return metadata.position === 'player1';
      });
      player1InvitationStatus = p1Invitation ? p1Invitation.status : 'not_invited';
    }

    if (!pair[0].player2_id) {
      // Player 2 not set yet, check invitation
      const p2Invitation = invitations.find(inv => {
        const metadata = typeof inv.metadata === 'string' 
          ? JSON.parse(inv.metadata) 
          : (inv.metadata || {});
        return metadata.position === 'player2';
      });
      player2InvitationStatus = p2Invitation ? p2Invitation.status : 'not_invited';
    }

    return {
      ...pair[0],
      player1_invitation_status: player1InvitationStatus,
      player2_invitation_status: player2InvitationStatus
    };

  } catch (error) {
    logger.error('Get pair details error:', error);
    throw error;
  }
};

/**
 * Send pair invitation
 * @param {number} inviterId - Inviter user ID
 * @param {number} inviteeId - Invitee user ID
 * @param {number} sportId - Sport ID
 * @returns {Promise<Object>} Invitation details
 */
const invitePlayer = async (inviterId, inviteeId, sportId) => {
  try {
    // Validate different users
    if (inviterId === inviteeId) {
      throw new Error('Cannot invite yourself');
    }

    // Check if invitation already exists
    const existing = await query(`
      SELECT id FROM partnership_invitations
      WHERE inviter_id = ? AND invitee_id = ? AND status = 'pending'
    `, [inviterId, inviteeId]);

    if (existing && existing.length > 0) {
      throw new Error('Invitation already sent to this player');
    }

    // Check if pair already exists
    const existingPair = await query(`
      SELECT id FROM pairs 
      WHERE sport_id = ? 
        AND ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))
        AND tournament_id IS NULL
        AND deleted_at IS NULL
    `, [sportId, inviterId, inviteeId, inviteeId, inviterId]);

    if (existingPair && existingPair.length > 0) {
      throw new Error('You already have a pair with this player');
    }

    // Create invitation
    const result = await query(`
      INSERT INTO partnership_invitations (
        tournament_id,
        inviter_id,
        invitee_id,
        status
      ) VALUES (NULL, ?, ?, 'pending')
    `, [inviterId, inviteeId]);

    logger.info(`Pair invitation sent: ${result.insertId} from ${inviterId} to ${inviteeId}`);

    // Send SMS notification
    try {
      const invitee = await query('SELECT first_name, phone FROM users WHERE id = ?', [inviteeId]);
      const inviter = await query('SELECT first_name, last_name FROM users WHERE id = ?', [inviterId]);
      const sport = await query('SELECT name FROM sports WHERE id = ?', [sportId]);

      if (invitee && invitee.length > 0 && invitee[0].phone && sport && sport.length > 0) {
        const inviterName = inviter && inviter.length > 0 
          ? `${inviter[0].first_name} ${inviter[0].last_name}` 
          : 'Someone';
        
        const invitationLink = `${process.env.FRONTEND_URL}/pairs/invitations`;
        
        // Use MSG91 service for SMS
        const msg91Service = require('../utils/msg91Service');
        const formattedMobile = msg91Service.formatMobileNumber(invitee[0].phone, '91');
        
        const smsResult = await msg91Service.sendPairInvitation(
          formattedMobile,
          invitee[0].first_name,
          inviterName,
          sport[0].name,
          invitationLink
        );
        
        if (smsResult.success) {
          logger.info(`Pair invitation SMS sent successfully to ${formattedMobile}`);
        } else {
          logger.warn(`Failed to send pair invitation SMS: ${smsResult.message}`);
        }
      }
    } catch (smsError) {
      logger.error('Failed to send pair invitation SMS:', smsError);
    }

    return {
      id: result.insertId,
      inviter_id: inviterId,
      invitee_id: inviteeId,
      status: 'pending'
    };

  } catch (error) {
    logger.error('Invite player error:', error);
    throw error;
  }
};

/**
 * Send invitation to join an existing pair
 * @param {number} pairId - Pair ID
 * @param {number} inviterId - Inviter user ID (must be owner)
 * @param {number} inviteeId - Invitee user ID
 * @returns {Promise<Object>} Invitation details
 */
const sendPairInvitation = async (pairId, inviterId, inviteeId) => {
  try {
    // Get pair
    const pair = await query('SELECT * FROM pairs WHERE id = ? AND deleted_at IS NULL', [pairId]);
    
    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is owner
    if (pair[0].created_by !== inviterId) {
      throw new Error('Only the owner can send invitations');
    }

    // FIRST: Check if invitee is already in the pair (actual member)
    if (pair[0].player1_id === inviteeId || pair[0].player2_id === inviteeId) {
      throw new Error('User is already a member of this pair');
    }

    // SECOND: Check for existing invitations
    const existingInvitation = await query(`
      SELECT * FROM pair_invitations
      WHERE pair_id = ? AND invitee_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [pairId, inviteeId]);

    if (existingInvitation && existingInvitation.length > 0) {
      const invitation = existingInvitation[0];
      
      // If invitation is accepted but user is not in pair, delete the old invitation
      if (invitation.status === 'accepted') {
        await query('DELETE FROM pair_invitations WHERE id = ?', [invitation.id]);
      }
      // If invitation is pending, user already has a pending invitation
      else if (invitation.status === 'pending') {
        throw new Error('Invitation already sent to this player');
      }
      // If invitation is rejected or expired, delete it and send a new one
      else {
        await query('DELETE FROM pair_invitations WHERE id = ?', [invitation.id]);
      }
    }

    // Check for pending invitations to determine which positions are reserved
    const pendingInvitations = await query(`
      SELECT metadata FROM pair_invitations
      WHERE pair_id = ? AND status = 'pending'
    `, [pairId]);

    const reservedPositions = new Set();
    for (const inv of pendingInvitations) {
      const metadata = typeof inv.metadata === 'string' 
        ? JSON.parse(inv.metadata) 
        : (inv.metadata || {});
      if (metadata.position) {
        reservedPositions.add(metadata.position);
      }
    }

    // Determine which position is available (considering both filled and reserved positions)
    let position = null;
    if (!pair[0].player1_id && !reservedPositions.has('player1')) {
      position = 'player1';
    } else if (!pair[0].player2_id && !reservedPositions.has('player2')) {
      position = 'player2';
    } else {
      throw new Error('Pair is full or all positions have pending invitations');
    }

    // Create invitation
    const result = await query(`
      INSERT INTO pair_invitations (pair_id, inviter_id, invitee_id, status, metadata)
      VALUES (?, ?, ?, 'pending', ?)
    `, [pairId, inviterId, inviteeId, JSON.stringify({ 
      type: 'join_pair',
      position: position
    })]);

    logger.info(`Invitation sent to user ${inviteeId} to join pair ${pairId} as ${position}`);

    return {
      id: result.insertId,
      pair_id: pairId,
      invitee_id: inviteeId,
      position: position,
      status: 'pending'
    };

  } catch (error) {
    logger.error('Send pair invitation error:', error);
    throw error;
  }
};

/**
 * Get my pair invitations
 * @param {number} userId - User ID
 * @returns {Promise<Array>} List of invitations
 */
const getMyInvitations = async (userId) => {
  try {
    // Get partnership invitations (for creating new pairs)
    const partnershipInvitations = await query(`
      SELECT 
        pi.*,
        'partnership' as invitation_type,
        u.first_name as inviter_first_name,
        u.last_name as inviter_last_name,
        u.profile_image as inviter_image,
        u.phone as inviter_phone,
        NULL as pair_name,
        NULL as sport_name
      FROM partnership_invitations pi
      LEFT JOIN users u ON pi.inviter_id = u.id
      WHERE pi.invitee_id = ? AND pi.status = 'pending'
    `, [userId]);

    // Get pair invitations (for joining existing pairs / replacement)
    const pairInvitations = await query(`
      SELECT 
        pi.*,
        'pair' as invitation_type,
        u.first_name as inviter_first_name,
        u.last_name as inviter_last_name,
        u.profile_image as inviter_image,
        u.phone as inviter_phone,
        p.name as pair_name,
        s.name as sport_name
      FROM pair_invitations pi
      LEFT JOIN users u ON pi.inviter_id = u.id
      LEFT JOIN pairs p ON pi.pair_id = p.id
      LEFT JOIN sports s ON p.sport_id = s.id
      WHERE pi.invitee_id = ? AND pi.status = 'pending'
    `, [userId]);

    // Combine both types and sort by date
    const allInvitations = [...partnershipInvitations, ...pairInvitations]
      .sort((a, b) => new Date(b.invited_at) - new Date(a.invited_at));

    return allInvitations;

  } catch (error) {
    logger.error('Get my invitations error:', error);
    throw error;
  }
};

/**
 * Accept pair invitation
 * @param {number} invitationId - Invitation ID
 * @param {number} userId - User ID (invitee)
 * @param {number} sportId - Sport ID (optional for replacement invitations)
 * @param {string} pairName - Optional pair name (optional for replacement invitations)
 * @returns {Promise<Object>} Created or updated pair
 */
const acceptInvitation = async (invitationId, userId, sportId = null, pairName = null) => {
  try {
    // First check if it's a pair_invitation (for replacement)
    const pairInvitation = await query(`
      SELECT * FROM pair_invitations
      WHERE id = ? AND invitee_id = ? AND status = 'pending'
    `, [invitationId, userId]);

    if (pairInvitation && pairInvitation.length > 0) {
      const pairId = pairInvitation[0].pair_id;
      // metadata is already an object if stored as JSON type, otherwise parse it
      const metadata = typeof pairInvitation[0].metadata === 'string' 
        ? JSON.parse(pairInvitation[0].metadata) 
        : (pairInvitation[0].metadata || {});
      const invitationType = metadata.type;

      // Get pair
      const pair = await query('SELECT * FROM pairs WHERE id = ?', [pairId]);
      
      if (!pair || pair.length === 0) {
        throw new Error('Pair not found');
      }

      if (invitationType === 'join_pair') {
        // This is an invitation to join an existing pair
        const position = metadata.position; // 'player1' or 'player2'
        
        // Verify the position is still available
        if (position === 'player1' && pair[0].player1_id !== null) {
          throw new Error('Position player1 is already filled. This invitation is no longer valid.');
        }
        if (position === 'player2' && pair[0].player2_id !== null) {
          throw new Error('Position player2 is already filled. This invitation is no longer valid.');
        }
        
        // Set the player in their position
        if (position === 'player1') {
          await query('UPDATE pairs SET player1_id = ? WHERE id = ?', [userId, pairId]);
        } else if (position === 'player2') {
          await query('UPDATE pairs SET player2_id = ? WHERE id = ?', [userId, pairId]);
        }

        // Update invitation status
        await query(`
          UPDATE pair_invitations
          SET status = 'accepted', responded_at = NOW()
          WHERE id = ?
        `, [invitationId]);

        logger.info(`User ${userId} accepted invitation ${invitationId} to join pair ${pairId} as ${position}`);

        return { id: pairId, type: 'join_pair', position };

      } else if (invitationType === 'pair_creation') {
        // This is a pair creation invitation (old flow - deprecated)
        const position = metadata.position; // 'player1' or 'player2'
        
        // Set the player in their position
        if (position === 'player1') {
          await query('UPDATE pairs SET player1_id = ? WHERE id = ?', [userId, pairId]);
        } else if (position === 'player2') {
          await query('UPDATE pairs SET player2_id = ? WHERE id = ?', [userId, pairId]);
        }

        // Update invitation status
        await query(`
          UPDATE pair_invitations
          SET status = 'accepted', responded_at = NOW()
          WHERE id = ?
        `, [invitationId]);

        // Check if both players have accepted
        const updatedPair = await query('SELECT * FROM pairs WHERE id = ?', [pairId]);
        if (updatedPair[0].player1_id && updatedPair[0].player2_id) {
          // Both accepted - change status to draft
          await query('UPDATE pairs SET status = ? WHERE id = ?', ['draft', pairId]);
          logger.info(`Both players accepted for pair ${pairId}, status changed to draft`);
        }

        logger.info(`User ${userId} accepted pair creation invitation ${invitationId} as ${position}`);

        return { id: pairId, type: 'pair_creation', position };

      } else if (invitationType === 'replacement') {
        // This is a replacement invitation
        const replacingPlayerId = metadata.replacing_player_id;

        if (!replacingPlayerId) {
          throw new Error('Invalid replacement invitation');
        }

        // Replace the player
        if (pair[0].player1_id === replacingPlayerId) {
          await query('UPDATE pairs SET player1_id = ? WHERE id = ?', [userId, pairId]);
        } else if (pair[0].player2_id === replacingPlayerId) {
          await query('UPDATE pairs SET player2_id = ? WHERE id = ?', [userId, pairId]);
        } else {
          throw new Error('Player to replace not found in pair');
        }

        // Update invitation status
        await query(`
          UPDATE pair_invitations
          SET status = 'accepted', responded_at = NOW()
          WHERE id = ?
        `, [invitationId]);

        logger.info(`User ${userId} accepted replacement invitation ${invitationId} and replaced player ${replacingPlayerId} in pair ${pairId}`);

        return { id: pairId, type: 'replacement' };
      }

      throw new Error('Unknown invitation type');
    }

    // Otherwise, check partnership_invitations (for new pair creation)
    const partnershipInvitation = await query(`
      SELECT * FROM partnership_invitations
      WHERE id = ? AND invitee_id = ? AND status = 'pending'
    `, [invitationId, userId]);

    if (!partnershipInvitation || partnershipInvitation.length === 0) {
      throw new Error('Invitation not found or already responded');
    }

    const inviterId = partnershipInvitation[0].inviter_id;

    // Create pair
    const pair = await createPair(inviterId, userId, sportId, pairName);

    // Update invitation status
    await query(`
      UPDATE partnership_invitations
      SET status = 'accepted', responded_at = NOW()
      WHERE id = ?
    `, [invitationId]);

    logger.info(`User ${userId} accepted invitation ${invitationId} and created pair ${pair.id}`);

    return pair;

  } catch (error) {
    logger.error('Accept invitation error:', error);
    throw error;
  }
};

/**
 * Reject pair invitation
 * @param {number} invitationId - Invitation ID
 * @param {number} userId - User ID (invitee)
 * @returns {Promise<void>}
 */
const rejectInvitation = async (invitationId, userId) => {
  try {
    // Get invitation
    const invitation = await query(`
      SELECT * FROM partnership_invitations
      WHERE id = ? AND invitee_id = ? AND status = 'pending'
    `, [invitationId, userId]);

    if (!invitation || invitation.length === 0) {
      throw new Error('Invitation not found or already responded');
    }

    // Update invitation status
    await query(`
      UPDATE partnership_invitations
      SET status = 'rejected', responded_at = NOW()
      WHERE id = ?
    `, [invitationId]);

    logger.info(`User ${userId} rejected invitation ${invitationId}`);

  } catch (error) {
    logger.error('Reject invitation error:', error);
    throw error;
  }
};

/**
 * Delete pair (soft delete)
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID (must be creator)
 * @returns {Promise<void>}
 */
const deletePair = async (pairId, userId) => {
  try {
    // Get pair
    const pair = await query(`
      SELECT * FROM pairs
      WHERE id = ? AND deleted_at IS NULL
    `, [pairId]);

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is part of pair
    if (pair[0].player1_id !== userId && pair[0].player2_id !== userId) {
      throw new Error('You are not part of this pair');
    }

    // Check if tournament pair
    if (pair[0].tournament_id) {
      throw new Error('Cannot delete tournament pairs');
    }

    // Soft delete
    await query(`
      UPDATE pairs
      SET deleted_at = NOW()
      WHERE id = ?
    `, [pairId]);

    logger.info(`Pair ${pairId} deleted by user ${userId}`);

  } catch (error) {
    logger.error('Delete pair error:', error);
    throw error;
  }
};

/**
 * Leave pair
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
const leavePair = async (pairId, userId) => {
  try {
    // Get pair
    const pair = await query(`
      SELECT * FROM pairs
      WHERE id = ? AND deleted_at IS NULL
    `, [pairId]);

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is part of pair
    if (pair[0].player1_id !== userId && pair[0].player2_id !== userId) {
      throw new Error('You are not part of this pair');
    }

    // Check if tournament pair
    if (pair[0].tournament_id) {
      throw new Error('Cannot leave tournament pairs');
    }

    // Cannot leave if you're the owner (must delete instead)
    if (pair[0].created_by === userId) {
      throw new Error('Owner cannot leave pair. Please delete the pair instead.');
    }

    // Remove player from their slot (set to NULL)
    if (pair[0].player1_id === userId) {
      await query(`
        UPDATE pairs
        SET player1_id = NULL
        WHERE id = ?
      `, [pairId]);
      logger.info(`User ${userId} left pair ${pairId} as player1`);
    } else if (pair[0].player2_id === userId) {
      await query(`
        UPDATE pairs
        SET player2_id = NULL
        WHERE id = ?
      `, [pairId]);
      logger.info(`User ${userId} left pair ${pairId} as player2`);
    }

  } catch (error) {
    logger.error('Leave pair error:', error);
    throw error;
  }
};

/**
 * Lock pair (prevent editing)
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID (must be owner)
 */
const lockPair = async (pairId, userId) => {
  try {
    // Get pair
    const pair = await query(
      'SELECT * FROM pairs WHERE id = ? AND deleted_at IS NULL',
      [pairId]
    );

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is owner
    if (pair[0].created_by !== userId) {
      throw new Error('Only the owner can lock the pair');
    }

    // Lock pair
    await query(`
      UPDATE pairs
      SET status = 'locked'
      WHERE id = ?
    `, [pairId]);

    logger.info(`Pair ${pairId} locked by user ${userId}`);

  } catch (error) {
    logger.error('Lock pair error:', error);
    throw error;
  }
};

/**
 * Unlock pair (allow editing)
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID (must be owner)
 */
const unlockPair = async (pairId, userId) => {
  try {
    // Get pair
    const pair = await query(
      'SELECT * FROM pairs WHERE id = ? AND deleted_at IS NULL',
      [pairId]
    );

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is owner
    if (pair[0].created_by !== userId) {
      throw new Error('Only the owner can unlock the pair');
    }

    // Unlock pair
    await query(`
      UPDATE pairs
      SET status = 'draft'
      WHERE id = ?
    `, [pairId]);

    logger.info(`Pair ${pairId} unlocked by user ${userId}`);

  } catch (error) {
    logger.error('Unlock pair error:', error);
    throw error;
  }
};

/**
 * Update pair details
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID (must be owner)
 * @param {string} name - New pair name
 */
const updatePair = async (pairId, userId, name) => {
  try {
    // Get pair
    const pair = await query(
      'SELECT * FROM pairs WHERE id = ? AND deleted_at IS NULL',
      [pairId]
    );

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is owner
    if (pair[0].created_by !== userId) {
      throw new Error('Only the owner can update the pair');
    }

    // Check if locked
    if (pair[0].status === 'locked') {
      throw new Error('Cannot update locked pair');
    }

    // Update pair
    await query(`
      UPDATE pairs
      SET name = ?
      WHERE id = ?
    `, [name, pairId]);

    logger.info(`Pair ${pairId} updated by user ${userId}`);

  } catch (error) {
    logger.error('Update pair error:', error);
    throw error;
  }
};

/**
 * Replace member in pair (sends invitation)
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID (must be owner)
 * @param {number} oldPlayerId - Player to replace
 * @param {number} newPlayerId - New player
 */
const replaceMember = async (pairId, userId, oldPlayerId, newPlayerId) => {
  try {
    // Get pair
    const pair = await query(
      'SELECT * FROM pairs WHERE id = ? AND deleted_at IS NULL',
      [pairId]
    );

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is owner
    if (pair[0].created_by !== userId) {
      throw new Error('Only the owner can replace members');
    }

    // Check if locked
    if (pair[0].status === 'locked') {
      throw new Error('Cannot replace members in locked pair');
    }

    // Validate old player is in pair
    if (pair[0].player1_id !== oldPlayerId && pair[0].player2_id !== oldPlayerId) {
      throw new Error('Player not found in pair');
    }

    // Check if new player is already in the pair
    if (pair[0].player1_id === newPlayerId || pair[0].player2_id === newPlayerId) {
      throw new Error('New player is already in this pair');
    }

    // Check if there's already a pending invitation for this pair and new player
    const existingInvitation = await query(
      'SELECT * FROM pair_invitations WHERE pair_id = ? AND invitee_id = ? AND status = ?',
      [pairId, newPlayerId, 'pending']
    );

    if (existingInvitation && existingInvitation.length > 0) {
      throw new Error('Invitation already sent to this player');
    }

    // Create invitation with replacement metadata
    const invitation = await query(`
      INSERT INTO pair_invitations (pair_id, inviter_id, invitee_id, status, metadata)
      VALUES (?, ?, ?, 'pending', ?)
    `, [pairId, userId, newPlayerId, JSON.stringify({ 
      type: 'replacement',
      replacing_player_id: oldPlayerId 
    })]);

    logger.info(`Replacement invitation sent to user ${newPlayerId} for pair ${pairId}, replacing ${oldPlayerId}`);

    return {
      invitation_id: invitation.insertId,
      message: 'Invitation sent to new player'
    };

  } catch (error) {
    logger.error('Replace member error:', error);
    throw error;
  }
};

/**
 * Remove member from pair
 * @param {number} pairId - Pair ID
 * @param {number} ownerId - Owner ID
 * @param {number} userId - User ID to remove
 */
const removeMember = async (pairId, ownerId, userId) => {
  try {
    // Get pair
    const pair = await query(
      'SELECT * FROM pairs WHERE id = ? AND deleted_at IS NULL',
      [pairId]
    );

    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }

    // Check if user is owner
    if (pair[0].created_by !== ownerId) {
      throw new Error('Only the owner can remove members');
    }

    // Check if locked
    if (pair[0].status === 'locked') {
      throw new Error('Cannot remove members from locked pair');
    }

    // Validate user is in pair
    if (pair[0].player1_id !== userId && pair[0].player2_id !== userId) {
      throw new Error('User is not a member of this pair');
    }

    // Remove the member by setting their player field to NULL
    let updateQuery = '';
    if (pair[0].player1_id === userId) {
      updateQuery = 'UPDATE pairs SET player1_id = NULL WHERE id = ?';
    } else if (pair[0].player2_id === userId) {
      updateQuery = 'UPDATE pairs SET player2_id = NULL WHERE id = ?';
    }

    await query(updateQuery, [pairId]);

    logger.info(`Member ${userId} removed from pair ${pairId}`);

  } catch (error) {
    logger.error('Remove member error:', error);
    throw error;
  }
};

/**
 * Get all invitations for a specific pair
 * @param {number} pairId - Pair ID
 * @param {number} userId - User ID (to check if they're the owner)
 * @returns {Promise<Array>} List of invitations
 */
const getPairInvitations = async (pairId, userId) => {
  try {
    // Check if user is the owner
    const pair = await query('SELECT created_by FROM pairs WHERE id = ?', [pairId]);
    if (!pair || pair.length === 0) {
      throw new Error('Pair not found');
    }
    if (pair[0].created_by !== userId) {
      throw new Error('Only the pair owner can view invitations');
    }

    // Get all invitations for this pair
    const invitations = await query(`
      SELECT 
        pi.id,
        pi.pair_id,
        pi.invitee_id,
        pi.status,
        pi.invited_at,
        pi.responded_at,
        pi.metadata,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image
      FROM pair_invitations pi
      LEFT JOIN users u ON pi.invitee_id = u.id
      WHERE pi.pair_id = ?
      ORDER BY pi.invited_at DESC
    `, [pairId]);

    // Parse metadata
    return invitations.map(inv => ({
      ...inv,
      metadata: typeof inv.metadata === 'string' 
        ? JSON.parse(inv.metadata) 
        : (inv.metadata || {})
    }));

  } catch (error) {
    logger.error('Get pair invitations error:', error);
    throw error;
  }
};

module.exports = {
  createPair,
  getMyPairs,
  getPairDetails,
  invitePlayer,
  sendPairInvitation,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  deletePair,
  leavePair,
  lockPair,
  unlockPair,
  updatePair,
  replaceMember,
  removeMember,
  getPairInvitations
};

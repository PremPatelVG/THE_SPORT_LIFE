const pairService = require('../services/pairService');
const logger = require('../utils/logger');

/**
 * PAIR CONTROLLER
 * Handles HTTP requests for player-created reusable pairs
 */

/**
 * Create a new pair (simple - just name and sport)
 * POST /api/v1/pairs/create
 */
const createPair = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { sport_id, name } = req.body;

    // Validate required fields
    if (!sport_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'sport_id and name are required'
      });
    }

    const pair = await pairService.createPair(creatorId, sport_id, name);

    res.status(201).json({
      success: true,
      message: 'Pair created successfully',
      data: pair
    });

  } catch (error) {
    logger.error('Create pair controller error:', error);
    res.status(error.message.includes('already exists') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to create pair'
    });
  }
};

/**
 * Get my pairs
 * GET /api/v1/pairs/my-pairs?filter=all|tournament|reusable
 */
const getMyPairs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter = 'all' } = req.query;

    const pairs = await pairService.getMyPairs(userId, filter);

    res.status(200).json({
      success: true,
      data: pairs,
      count: pairs.length
    });

  } catch (error) {
    logger.error('Get my pairs controller error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pairs'
    });
  }
};

/**
 * Get pair details
 * GET /api/v1/pairs/:pairId
 */
const getPairDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairId } = req.params;

    const pair = await pairService.getPairDetails(pairId, userId);
    
    // Add current user ID to response
    pair.current_user_id = userId;

    res.status(200).json({
      success: true,
      data: pair
    });

  } catch (error) {
    logger.error('Get pair details controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to fetch pair details'
    });
  }
};

/**
 * Invite player to form a pair (partnership invitation - deprecated)
 * POST /api/v1/pairs/invite
 */
const invitePlayer = async (req, res) => {
  try {
    const inviterId = req.user.id;
    const { invitee_id, sport_id } = req.body;

    // Validate required fields
    if (!invitee_id || !sport_id) {
      return res.status(400).json({
        success: false,
        message: 'invitee_id and sport_id are required'
      });
    }

    const invitation = await pairService.invitePlayer(inviterId, invitee_id, sport_id);

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: invitation
    });

  } catch (error) {
    logger.error('Invite player controller error:', error);
    res.status(error.message.includes('already') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to send invitation'
    });
  }
};

/**
 * Send invitation to join existing pair
 * POST /api/v1/pairs/:pairId/invite
 */
const sendPairInvitation = async (req, res) => {
  try {
    const inviterId = req.user.id;
    const { pairId } = req.params;
    const { user_id } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const invitation = await pairService.sendPairInvitation(pairId, inviterId, user_id);

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: invitation
    });

  } catch (error) {
    logger.error('Send pair invitation controller error:', error);
    res.status(error.message.includes('already') || error.message.includes('full') || error.message.includes('Only') ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to send invitation'
    });
  }
};

/**
 * Get my pair invitations
 * GET /api/v1/pairs/my-invitations
 */
const getMyInvitations = async (req, res) => {
  try {
    const userId = req.user.id;

    const invitations = await pairService.getMyInvitations(userId);

    res.status(200).json({
      success: true,
      data: invitations,
      count: invitations.length
    });

  } catch (error) {
    logger.error('Get my invitations controller error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invitations'
    });
  }
};

/**
 * Accept pair invitation
 * POST /api/v1/pairs/invitations/:invitationId/accept
 */
const acceptInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;
    const { sport_id, pair_name } = req.body;

    // sport_id is optional - only required for partnership invitations (old flow)
    // For join_pair invitations, the pair already exists with sport_id set

    const pair = await pairService.acceptInvitation(invitationId, userId, sport_id, pair_name);

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: pair
    });

  } catch (error) {
    logger.error('Accept invitation controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to accept invitation'
    });
  }
};

/**
 * Reject pair invitation
 * POST /api/v1/pairs/invitations/:invitationId/reject
 */
const rejectInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    await pairService.rejectInvitation(invitationId, userId);

    res.status(200).json({
      success: true,
      message: 'Invitation rejected'
    });

  } catch (error) {
    logger.error('Reject invitation controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to reject invitation'
    });
  }
};

/**
 * Delete pair
 * DELETE /api/v1/pairs/:pairId
 */
const deletePair = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairId } = req.params;

    await pairService.deletePair(pairId, userId);

    res.status(200).json({
      success: true,
      message: 'Pair deleted successfully'
    });

  } catch (error) {
    logger.error('Delete pair controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to delete pair'
    });
  }
};

/**
 * Leave pair
 * POST /api/v1/pairs/:pairId/leave
 */
const leavePair = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairId } = req.params;

    await pairService.leavePair(pairId, userId);

    res.status(200).json({
      success: true,
      message: 'You have left the pair'
    });

  } catch (error) {
    logger.error('Leave pair controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to leave pair'
    });
  }
};

/**
 * Lock pair
 * PUT /api/v1/pairs/:pairId/lock
 */
const lockPair = async (req, res) => {
  try {
    logger.info(`Lock pair called for pairId: ${req.params.pairId}, userId: ${req.user.id}`);
    const userId = req.user.id;
    const { pairId } = req.params;
    console.log("dtete----------------", pairId);
    

    await pairService.lockPair(pairId, userId);

    res.status(200).json({
      success: true,
      message: 'Pair locked successfully'
    });

  } catch (error) {
    logger.error('Lock pair controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to lock pair'
    });
  }
};

/**
 * Unlock pair
 * PUT /api/v1/pairs/:pairId/unlock
 */
const unlockPair = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairId } = req.params;

    await pairService.unlockPair(pairId, userId);

    res.status(200).json({
      success: true,
      message: 'Pair unlocked successfully'
    });

  } catch (error) {
    logger.error('Unlock pair controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to unlock pair'
    });
  }
};

/**
 * Update pair
 * PUT /api/v1/pairs/:pairId
 */
const updatePair = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'name is required'
      });
    }

    await pairService.updatePair(pairId, userId, name);

    res.status(200).json({
      success: true,
      message: 'Pair updated successfully'
    });

  } catch (error) {
    logger.error('Update pair controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to update pair'
    });
  }
};

/**
 * Replace member
 * POST /api/v1/pairs/:pairId/replace-member
 */
const replaceMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairId } = req.params;
    const { old_player_id, new_player_id } = req.body;

    if (!old_player_id || !new_player_id) {
      return res.status(400).json({
        success: false,
        message: 'old_player_id and new_player_id are required'
      });
    }

    await pairService.replaceMember(pairId, userId, old_player_id, new_player_id);

    res.status(200).json({
      success: true,
      message: 'Invitation sent to new player'
    });

  } catch (error) {
    logger.error('Replace member controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to replace member'
    });
  }
};

/**
 * Remove member
 * DELETE /api/v1/pairs/:pairId/members/:userId
 */
const removeMember = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { pairId, userId } = req.params;

    await pairService.removeMember(pairId, ownerId, parseInt(userId));

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    logger.error('Remove member controller error:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      message: error.message || 'Failed to remove member'
    });
  }
};

/**
 * Get invitations for a specific pair
 * GET /api/v1/pairs/:pairId/invitations
 */
const getPairInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairId } = req.params;

    const invitations = await pairService.getPairInvitations(pairId, userId);

    res.status(200).json({
      success: true,
      data: invitations
    });

  } catch (error) {
    logger.error('Get pair invitations controller error:', error);
    res.status(error.message.includes('not found') ? 404 : error.message.includes('owner') ? 403 : 500).json({
      success: false,
      message: error.message || 'Failed to get pair invitations'
    });
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

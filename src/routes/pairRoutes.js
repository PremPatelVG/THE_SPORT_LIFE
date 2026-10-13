const express = require('express');
const router = express.Router();
const pairController = require('../controllers/pairController');
const { auth } = require('../middleware/auth');

/**
 * PAIR ROUTES
 * All routes for player-created reusable pairs
 * All routes require authentication
 */

/**
 * @route   POST /api/v1/pairs/create
 * @desc    Create a new reusable pair
 * @access  Private
 * @body    { player2_id, sport_id, name? }
 */
router.post('/create', auth, pairController.createPair);

/**
 * @route   GET /api/v1/pairs/my-pairs
 * @desc    Get all pairs user is part of
 * @access  Private
 * @query   filter=all|tournament|reusable
 */
router.get('/my-pairs', auth, pairController.getMyPairs);

/**
 * @route   GET /api/v1/pairs/my-invitations
 * @desc    Get my pending pair invitations
 * @access  Private
 */
router.get('/my-invitations', auth, pairController.getMyInvitations);

/**
 * @route   POST /api/v1/pairs/invite
 * @desc    Invite a player to form a pair (partnership - deprecated)
 * @access  Private
 * @body    { invitee_id, sport_id }
 */
router.post('/invite', auth, pairController.invitePlayer);

/**
 * @route   POST /api/v1/pairs/:pairId/invite
 * @desc    Send invitation to join pair
 * @access  Private
 */
router.post('/:pairId/invite', auth, pairController.sendPairInvitation);

/**
 * @route   GET /api/v1/pairs/:pairId/invitations
 * @desc    Get all invitations for a specific pair
 * @access  Private (Owner only)
 */
router.get('/:pairId/invitations', auth, pairController.getPairInvitations);

/**
 * @route   POST /api/v1/pairs/invitations/:invitationId/accept
 * @desc    Accept a pair invitation
 * @access  Private
 * @body    { sport_id, pair_name? }
 */
router.post('/invitations/:invitationId/accept', auth, pairController.acceptInvitation);

/**
 * @route   POST /api/v1/pairs/invitations/:invitationId/reject
 * @desc    Reject a pair invitation
 * @access  Private
 */
router.post('/invitations/:invitationId/reject', auth, pairController.rejectInvitation);

/**
 * @route   PUT /api/v1/pairs/:pairId/lock
 * @desc    Lock a pair (prevent editing)
 * @access  Private (must be owner)
 */
router.put('/:pairId/lock', auth, pairController.lockPair);

/**
 * @route   PUT /api/v1/pairs/:pairId/unlock
 * @desc    Unlock a pair (allow editing)
 * @access  Private (must be owner)
 */
router.put('/:pairId/unlock', auth, pairController.unlockPair);

/**
 * @route   POST /api/v1/pairs/:pairId/leave
 * @desc    Leave a pair
 * @access  Private (must be part of pair)
 */
router.post('/:pairId/leave', auth, pairController.leavePair);

/**
 * @route   POST /api/v1/pairs/:pairId/replace-member
 * @desc    Replace a member in the pair
 * @access  Private (must be owner)
 * @body    { old_player_id, new_player_id }
 */
router.post('/:pairId/replace-member', auth, pairController.replaceMember);

/**
 * @route   DELETE /api/v1/pairs/:pairId/members/:userId
 * @desc    Remove a member from pair
 * @access  Private (must be owner)
 */
router.delete('/:pairId/members/:userId', auth, pairController.removeMember);

/**
 * @route   GET /api/v1/pairs/:pairId
 * @desc    Get pair details
 * @access  Private (must be part of pair)
 */
router.get('/:pairId', auth, pairController.getPairDetails);

/**
 * @route   PUT /api/v1/pairs/:pairId
 * @desc    Update pair details (name)
 * @access  Private (must be owner)
 */
router.put('/:pairId', auth, pairController.updatePair);

/**
 * @route   DELETE /api/v1/pairs/:pairId
 * @desc    Delete a pair (soft delete)
 * @access  Private (must be part of pair)
 */
router.delete('/:pairId', auth, pairController.deletePair);

module.exports = router;

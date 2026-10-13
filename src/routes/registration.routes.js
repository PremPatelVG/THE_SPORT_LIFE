const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  requestToJoin,
  invitePlayers,
  getRegistrations,
  acceptRegistration,
  rejectRegistration,
  lockPlayer,
  unlockPlayer,
  respondToInvitation,
  getMyInvitations,
  getMyRegistrations,
  organizerSelfRegister,
  bulkAcceptRegistrations,
  bulkRejectRegistrations,
  bulkLockPlayers,
  bulkUnlockPlayers
} = require('../controllers/registrationController');

/**
 * @route   POST /api/v1/registrations/tournaments/:tournamentId/request
 * @desc    Player requests to join an OPEN tournament
 * @access  Private
 */
router.post('/tournaments/:tournamentId/request', auth, requestToJoin);

/**
 * @route   POST /api/v1/registrations/tournaments/:tournamentId/invite
 * @desc    Organizer invites players to CLOSED tournament
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/invite', auth, invitePlayers);

/**
 * @route   GET /api/v1/registrations/tournaments/:tournamentId
 * @desc    Get all registrations for a tournament
 * @access  Private (Organizer only)
 */
router.get('/tournaments/:tournamentId', auth, getRegistrations);

/**
 * @route   PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/accept
 * @desc    Organizer accepts a registration request
 * @access  Private (Organizer only)
 */
router.put('/tournaments/:tournamentId/:registrationId/accept', auth, acceptRegistration);

/**
 * @route   PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/reject
 * @desc    Organizer rejects a registration request
 * @access  Private (Organizer only)
 */
router.put('/tournaments/:tournamentId/:registrationId/reject', auth, rejectRegistration);

/**
 * @route   PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/lock
 * @desc    Organizer locks a player (finalizes for tournament)
 * @access  Private (Organizer only)
 */
router.put('/tournaments/:tournamentId/:registrationId/lock', auth, lockPlayer);

/**
 * @route   PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/unlock
 * @desc    Organizer unlocks a player
 * @access  Private (Organizer only)
 */
router.put('/tournaments/:tournamentId/:registrationId/unlock', auth, unlockPlayer);

/**
 * @route   PUT /api/v1/registrations/invitations/:invitationId/respond
 * @desc    Player accepts or declines an invitation
 * @access  Private
 */
router.put('/invitations/:invitationId/respond', auth, respondToInvitation);

/**
 * @route   GET /api/v1/registrations/my-invitations
 * @desc    Get player's invitations
 * @access  Private
 */
router.get('/my-invitations', auth, getMyInvitations);

/**
 * @route   GET /api/v1/registrations/my-registrations
 * @desc    Get player's registrations
 * @access  Private
 */
router.get('/my-registrations', auth, getMyRegistrations);

/**
 * @route   POST /api/v1/registrations/tournaments/:tournamentId/organizer-join
 * @desc    Organizer joins their own tournament
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/organizer-join', auth, organizerSelfRegister);

/**
 * @route   POST /api/v1/registrations/tournaments/:tournamentId/bulk-accept
 * @desc    Organizer accepts multiple registrations at once
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/bulk-accept', auth, bulkAcceptRegistrations);

/**
 * @route   POST /api/v1/registrations/tournaments/:tournamentId/bulk-reject
 * @desc    Organizer rejects multiple registrations at once
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/bulk-reject', auth, bulkRejectRegistrations);

/**
 * @route   POST /api/v1/registrations/tournaments/:tournamentId/bulk-lock
 * @desc    Organizer locks multiple players at once
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/bulk-lock', auth, bulkLockPlayers);

/**
 * @route   POST /api/v1/registrations/tournaments/:tournamentId/bulk-unlock
 * @desc    Organizer unlocks multiple players at once
 * @access  Private (Organizer only)
 */
router.post('/tournaments/:tournamentId/bulk-unlock', auth, bulkUnlockPlayers);

module.exports = router;

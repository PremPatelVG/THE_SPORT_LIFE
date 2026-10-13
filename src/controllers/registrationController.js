const { query } = require('../config/database');
const logger = require('../utils/logger');
const whatsappService = require('../services/whatsappService');
const msg91Service = require('../utils/msg91Service');

/**
 * Request to join tournament (OPEN tournaments)
 * Player requests to join a public tournament
 */
const requestToJoin = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const playerId = req.user.id;
    const { notes } = req.body;

    // Check if tournament exists and is OPEN
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND deleted_at IS NULL',
      [tournamentId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (tournament[0].tournament_type !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'This tournament is closed. You need an invitation to join.'
      });
    }

    // Check if registration is still open
    const now = new Date();
    const regEnd = new Date(tournament[0].registration_end);
    if (now > regEnd) {
      return res.status(400).json({
        success: false,
        message: 'Registration period has ended'
      });
    }

    // Check if player already registered
    const existing = await query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, playerId]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered for this tournament',
        data: existing[0]
      });
    }

    // Create registration request
    const result = await query(
      `INSERT INTO tournament_registrations 
       (tournament_id, user_id, registration_type, status, notes, created_by) 
       VALUES (?, ?, 'request', 'pending', ?, ?)`,
      [tournamentId, playerId, notes || null, playerId]
    );

    // Get organizer details for notification
    const organizer = await query(
      'SELECT email, first_name, phone FROM users WHERE id = ?',
      [tournament[0].organizer_id]
    );

    // Send SMS notification to organizer
    if (organizer && organizer.length > 0 && organizer[0].phone) {
      const smsMessage = `Hi ${organizer[0].first_name}, A player has requested to join your tournament "${tournament[0].name}". Please review the request.`;
      await sendSMS(organizer[0].phone, smsMessage);
    }

    res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully',
      data: {
        id: result.insertId,
        tournament_id: tournamentId,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Request to join error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit registration request',
      error: error.message
    });
  }
};

/**
 * Invite players to tournament
 * Organizer invites players by phone number (system users or external)
 */
const invitePlayers = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { phoneNumbers, message } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one phone number'
      });
    }

    // Check if tournament exists and user is organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    // Organizer can invite players to any tournament (open or closed)
    // No restriction based on tournament_type

    const invitations = [];
    const errors = [];

    // Create invitations for each phone number
    for (const phone of phoneNumbers) {
      try {
        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');

        // Normalize phone number - check both with and without +91 prefix
        const normalizedPhone = cleanPhone.startsWith('+91') ? cleanPhone.substring(3) : cleanPhone;
        const phoneWithPrefix = cleanPhone.startsWith('+91') ? cleanPhone : `+91${cleanPhone}`;

        // Check if user exists in system by phone (check both formats)
        const user = await query(
          'SELECT id, phone, first_name, last_name FROM users WHERE (phone = ? OR phone = ?) AND deleted_at IS NULL LIMIT 1',
          [normalizedPhone, phoneWithPrefix]
        );

        let userId = null;
        let userName = 'Player';

        if (user && user.length > 0) {
          // User exists in system
          userId = user[0].id;
          userName = user[0].first_name || 'Player';

          // Check if already invited/registered
          const existing = await query(
            'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
            [tournamentId, userId]
          );

          if (existing && existing.length > 0) {
            errors.push({ phone: cleanPhone, error: 'Player already invited/registered' });
            continue;
          }
        } else {
          // User NOT in system - check if phone already invited (check both formats)
          const existing = await query(
            'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND (invited_phone = ? OR invited_phone = ?)',
            [tournamentId, normalizedPhone, phoneWithPrefix]
          );

          if (existing && existing.length > 0) {
            errors.push({ phone: cleanPhone, error: 'Phone number already invited' });
            continue;
          }
        }

        // Create invitation
        const result = await query(
          `INSERT INTO tournament_registrations 
           (tournament_id, user_id, invited_phone, registration_type, status, notes, created_by) 
           VALUES (?, ?, ?, 'invitation', 'pending', ?, ?)`,
          [tournamentId, userId, cleanPhone, message || null, organizerId]
        );

        const invitationId = result.insertId;
        
        
        invitations.push({
          id: invitationId,
          phone: cleanPhone,
          user_id: userId,
          in_system: userId !== null,
          status: 'pending'
        });

        // Build tournament and invitation links
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const tournamentLink = `${frontendUrl}/tournaments/${tournamentId}`;
        const invitationLink = `${frontendUrl}/tournaments/invitations/${invitationId}`;
        
        // Send SMS invitation via MSG91
        try {
          // Format mobile number with country code
          const formattedMobile = msg91Service.formatMobileNumber(cleanPhone, '91');
          
          // Send tournament invitation SMS
          const smsResult = await msg91Service.sendTournamentInvitation(
            formattedMobile,
            userName,
            tournament[0].name,
            tournamentLink,
            invitationLink
          );
          
          if (smsResult.success) {
            logger.info(`✅ Tournament invitation SMS sent to ${cleanPhone}`);
          } else {
            logger.error(`❌ Failed to send invitation SMS to ${cleanPhone}:`, smsResult.message);
          }
        } catch (smsError) {
          logger.error('SMS send error:', smsError);
          // Don't fail the invitation if SMS fails
        }
        
        // Send WhatsApp
        // try {
        //   await whatsappService.sendTournamentInvitation(
        //     cleanPhone,
        //     userName,
        //     tournament[0].name,
        //     tournamentId,
        //     invitationId
        //   );
        //   logger.info(`Invitation WhatsApp sent to ${cleanPhone}`);
        // } catch (whatsappError) {
        //   logger.error('WhatsApp send error:', whatsappError);
        // }
        
      } catch (error) {
        errors.push({ phone, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Invitations sent to ${invitations.length} player(s)`,
      data: {
        invitations,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Invite players error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitations',
      error: error.message
    });
  }
};

/**
 * Get all registrations for a tournament
 * Organizer views all registrations (pending, accepted, rejected, locked)
 */
const getRegistrations = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status, type } = req.query;
    const userId = req.user.id;

    // Check if user is organizer
    const tournament = await query(
      'SELECT organizer_id FROM tournaments WHERE id = ? AND deleted_at IS NULL',
      [tournamentId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (tournament[0].organizer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the organizer can view registrations'
      });
    }

    // Build query with filters
    let sql = `
      SELECT 
        tr.*,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        us.skill_level,
        CASE 
          WHEN tr.user_id IS NULL THEN tr.invited_phone
          ELSE u.phone
        END as phone
      FROM tournament_registrations tr
      LEFT JOIN users u ON tr.user_id = u.id
      LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = (
        SELECT sport_id FROM tournaments WHERE id = ?
      )
      WHERE tr.tournament_id = ?
    `;
    
    const params = [tournamentId, tournamentId];

    if (status) {
      sql += ' AND tr.status = ?';
      params.push(status);
    }

    if (type) {
      sql += ' AND tr.registration_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY tr.created_at DESC';

    const registrations = await query(sql, params);

    // Group by status for easier frontend handling
    const grouped = {
      locked: registrations.filter(r => r.status === 'locked'),
      accepted: registrations.filter(r => r.status === 'accepted'),
      pending: registrations.filter(r => r.status === 'pending'),
      rejected: registrations.filter(r => r.status === 'rejected'),
      declined: registrations.filter(r => r.status === 'declined')
    };

    res.status(200).json({
      success: true,
      data: {
        all: registrations,
        grouped,
        counts: {
          total: registrations.length,
          locked: grouped.locked.length,
          accepted: grouped.accepted.length,
          pending: grouped.pending.length,
          rejected: grouped.rejected.length,
          declined: grouped.declined.length
        }
      }
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations',
      error: error.message
    });
  }
};

/**
 * Accept registration request
 * Organizer accepts a player's request to join
 */
const acceptRegistration = async (req, res) => {
  try {
    const { tournamentId, registrationId } = req.params;
    const organizerId = req.user.id;

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    // Get registration
    const registration = await query(
      'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
      [registrationId, tournamentId]
    );

    if (!registration || registration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept registration with status: ${registration[0].status}`
      });
    }

    // Update status to accepted
    await query(
      'UPDATE tournament_registrations SET status = ?, responded_at = NOW() WHERE id = ?',
      ['accepted', registrationId]
    );

    // Get player details for notification
    const player = await query(
      'SELECT email, first_name, phone FROM users WHERE id = ?',
      [registration[0].user_id]
    );

    // Send SMS notification via MSG91
    if (player && player.length > 0 && player[0].phone) {
      try {
        const mobile = msg91Service.formatMobileNumber(player[0].phone);
        const smsResult = await msg91Service.sendPlayerAcceptance(
          mobile,
          player[0].first_name,
          tournament[0].name
        );
        
        if (smsResult.success) {
          logger.info(`Player acceptance SMS sent to ${mobile}`);
        } else {
          logger.error(`Failed to send acceptance SMS: ${smsResult.message}`);
        }
      } catch (smsError) {
        logger.error('SMS send error:', smsError);
      }
      
      // Send WhatsApp
      try {
        await whatsappService.sendRegistrationAcceptance(
          player[0].phone,
          player[0].first_name,
          tournament[0].name
        );
        logger.info(`WhatsApp sent to ${player[0].phone}`);
      } catch (whatsappError) {
        logger.error('WhatsApp send error:', whatsappError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Registration accepted successfully',
      data: {
        id: registrationId,
        status: 'accepted'
      }
    });
  } catch (error) {
    console.error('Accept registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept registration',
      error: error.message
    });
  }
};

/**
 * Reject registration request
 * Organizer rejects a player's request to join
 */
const rejectRegistration = async (req, res) => {
  try {
    const { tournamentId, registrationId } = req.params;
    const organizerId = req.user.id;
    const { reason } = req.body;

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    // Get registration
    const registration = await query(
      'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
      [registrationId, tournamentId]
    );

    if (!registration || registration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject registration with status: ${registration[0].status}`
      });
    }

    // Update status to rejected
    await query(
      'UPDATE tournament_registrations SET status = ?, responded_at = NOW(), notes = ? WHERE id = ?',
      ['rejected', reason || null, registrationId]
    );

    // Get player details for notification
    const player = await query(
      'SELECT email, first_name, phone FROM users WHERE id = ?',
      [registration[0].user_id]
    );

    // Send SMS notification via MSG91
    if (player && player.length > 0 && player[0].phone) {
      try {
        const mobile = msg91Service.formatMobileNumber(player[0].phone);
        const smsResult = await msg91Service.sendPlayerRejection(
          mobile,
          player[0].first_name,
          tournament[0].name,
          reason
        );
        
        if (smsResult.success) {
          logger.info(`Player rejection SMS sent to ${mobile}`);
        } else {
          logger.error(`Failed to send rejection SMS: ${smsResult.message}`);
        }
      } catch (smsError) {
        logger.error('SMS send error:', smsError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Registration rejected',
      data: {
        id: registrationId,
        status: 'rejected'
      }
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject registration',
      error: error.message
    });
  }
};

/**
 * Lock player (finalize for tournament)
 * Organizer locks an accepted player
 */
const lockPlayer = async (req, res) => {
  try {
    const { tournamentId, registrationId } = req.params;
    const organizerId = req.user.id;

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    // Get registration
    const registration = await query(
      'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
      [registrationId, tournamentId]
    );

    if (!registration || registration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration[0].status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Can only lock accepted registrations'
      });
    }

    // Update status to locked
    await query(
      'UPDATE tournament_registrations SET status = ?, locked_at = NOW() WHERE id = ?',
      ['locked', registrationId]
    );

    // Get player details for notification
    const player = await query(
      'SELECT email, first_name, phone FROM users WHERE id = ?',
      [registration[0].user_id]
    );

    // Send SMS notification via MSG91
    if (player && player.length > 0 && player[0].phone) {
      try {
        const mobile = msg91Service.formatMobileNumber(player[0].phone);
        const tournamentDate = tournament[0].start_date ? new Date(tournament[0].start_date).toLocaleDateString('en-IN') : 'TBD';
        
        const smsResult = await msg91Service.sendPlayerLockConfirmation(
          mobile,
          player[0].first_name,
          tournament[0].name,
          tournamentDate
        );
        
        if (smsResult.success) {
          logger.info(`Player lock confirmation SMS sent to ${mobile}`);
        } else {
          logger.error(`Failed to send lock confirmation SMS: ${smsResult.message}`);
        }
      } catch (smsError) {
        logger.error('SMS send error:', smsError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Player locked successfully',
      data: {
        id: registrationId,
        status: 'locked'
      }
    });
  } catch (error) {
    console.error('Lock player error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock player',
      error: error.message
    });
  }
};

/**
 * Unlock player
 * Organizer unlocks a locked player
 */
const unlockPlayer = async (req, res) => {
  try {
    const { tournamentId, registrationId } = req.params;
    const organizerId = req.user.id;

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    // Get registration
    const registration = await query(
      'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
      [registrationId, tournamentId]
    );

    if (!registration || registration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration[0].status !== 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Can only unlock locked registrations'
      });
    }

    // Check if player is already in a team
    const inTeam = await query(
      `SELECT tm.* FROM team_members tm
       INNER JOIN teams t ON tm.team_id = t.id
       WHERE t.tournament_id = ? AND tm.user_id = ?`,
      [tournamentId, registration[0].user_id]
    );

    if (inTeam && inTeam.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unlock player who is already assigned to a team'
      });
    }

    // Update status back to accepted
    await query(
      'UPDATE tournament_registrations SET status = ?, locked_at = NULL WHERE id = ?',
      ['accepted', registrationId]
    );

    res.status(200).json({
      success: true,
      message: 'Player unlocked successfully',
      data: {
        id: registrationId,
        status: 'accepted'
      }
    });
  } catch (error) {
    console.error('Unlock player error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock player',
      error: error.message
    });
  }
};

/**
 * Respond to invitation (Player accepts/declines)
 */
const respondToInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { accept } = req.body;
    const playerId = req.user.id;

    // Get invitation
    const invitation = await query(
      'SELECT * FROM tournament_registrations WHERE id = ? AND user_id = ?',
      [invitationId, playerId]
    );

    if (!invitation || invitation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    if (invitation[0].registration_type !== 'invitation') {
      return res.status(400).json({
        success: false,
        message: 'This is not an invitation'
      });
    }

    if (invitation[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Invitation already ${invitation[0].status}`
      });
    }

    const newStatus = accept ? 'accepted' : 'declined';

    // Update status
    await query(
      'UPDATE tournament_registrations SET status = ?, responded_at = NOW() WHERE id = ?',
      [newStatus, invitationId]
    );

    // Get tournament and organizer details
    const tournament = await query(
      `SELECT t.*, u.phone as organizer_phone, u.first_name as organizer_name
       FROM tournaments t
       INNER JOIN users u ON t.organizer_id = u.id
       WHERE t.id = ?`,
      [invitation[0].tournament_id]
    );

    // Notify organizer via SMS
    if (tournament && tournament.length > 0 && tournament[0].organizer_phone) {
      try {
        const mobile = msg91Service.formatMobileNumber(tournament[0].organizer_phone);
        const smsMessage = `Hi ${tournament[0].organizer_name}, A player has ${accept ? 'accepted' : 'declined'} your invitation to "${tournament[0].name}".`;
        
        // Use simple SMS for invitation response notification
        const smsResult = await msg91Service.sendSimpleSMS(mobile, smsMessage);
        
        if (smsResult.success) {
          logger.info(`Invitation response SMS sent to organizer ${mobile}`);
        } else {
          logger.error(`Failed to send invitation response SMS: ${smsResult.message}`);
        }
      } catch (smsError) {
        logger.error('SMS send error:', smsError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Invitation ${accept ? 'accepted' : 'declined'} successfully`,
      data: {
        id: invitationId,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to invitation',
      error: error.message
    });
  }
};

/**
 * Get player's invitations
 */
const getMyInvitations = async (req, res) => {
  try {
    const playerId = req.user.id;
    const { status } = req.query;

    let sql = `
      SELECT 
        tr.*,
        t.name as tournament_name,
        t.start_date,
        t.end_date,
        t.logo_url,
        s.name as sport_name,
        v.name as venue_name,
        u.first_name as organizer_name
      FROM tournament_registrations tr
      INNER JOIN tournaments t ON tr.tournament_id = t.id
      INNER JOIN sports s ON t.sport_id = s.id
      LEFT JOIN venues v ON t.venue_id = v.id
      INNER JOIN users u ON t.organizer_id = u.id
      WHERE tr.user_id = ? AND tr.registration_type = 'invitation'
    `;

    const params = [playerId];

    if (status) {
      sql += ' AND tr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY tr.created_at DESC';

    const invitations = await query(sql, params);

    res.status(200).json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Get my invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invitations',
      error: error.message
    });
  }
};

/**
 * Get player's registrations
 */
const getMyRegistrations = async (req, res) => {
  try {
    const playerId = req.user.id;
    const { status } = req.query;

    let sql = `
      SELECT 
        tr.*,
        t.name as tournament_name,
        t.start_date,
        t.end_date,
        t.logo_url,
        t.tournament_type,
        s.name as sport_name,
        v.name as venue_name
      FROM tournament_registrations tr
      INNER JOIN tournaments t ON tr.tournament_id = t.id
      INNER JOIN sports s ON t.sport_id = s.id
      LEFT JOIN venues v ON t.venue_id = v.id
      WHERE tr.user_id = ?
    `;

    const params = [playerId];

    if (status) {
      sql += ' AND tr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY tr.created_at DESC';

    const registrations = await query(sql, params);

    res.status(200).json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations',
      error: error.message
    });
  }
};

/**
 * Organizer joins their own tournament
 * POST /api/v1/registrations/tournaments/:tournamentId/organizer-join
 */
const organizerSelfRegister = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;

    // Verify user is the organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only the organizer can use this feature'
      });
    }

    // Check if already registered
    const existing = await query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, organizerId]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this tournament'
      });
    }

    // Auto-register organizer with locked status
    const result = await query(
      `INSERT INTO tournament_registrations 
       (tournament_id, user_id, registration_type, status, created_by) 
       VALUES (?, ?, 'self', 'locked', ?)`,
      [tournamentId, organizerId, organizerId]
    );

    res.status(201).json({
      success: true,
      message: 'Successfully joined your tournament as a participant',
      data: {
        id: result.insertId,
        tournament_id: tournamentId,
        user_id: organizerId,
        status: 'locked'
      }
    });
  } catch (error) {
    console.error('Organizer self-register error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join tournament',
      error: error.message
    });
  }
};

/**
 * Bulk accept registrations
 * Organizer accepts multiple registrations at once
 */
const bulkAcceptRegistrations = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { registrationIds } = req.body;

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one registration ID'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    const results = {
      accepted: [],
      failed: []
    };

    // Process each registration
    for (const registrationId of registrationIds) {
      try {
        // Get registration
        const registration = await query(
          'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
          [registrationId, tournamentId]
        );

        if (!registration || registration.length === 0) {
          results.failed.push({ id: registrationId, reason: 'Registration not found' });
          continue;
        }

        if (registration[0].status !== 'pending') {
          results.failed.push({ id: registrationId, reason: `Status is ${registration[0].status}, not pending` });
          continue;
        }

        // Update status to accepted
        await query(
          'UPDATE tournament_registrations SET status = ?, responded_at = NOW() WHERE id = ?',
          ['accepted', registrationId]
        );

        results.accepted.push(registrationId);

        // Send notification (async, don't wait)
        if (registration[0].user_id) {
          const player = await query(
            'SELECT email, first_name, phone FROM users WHERE id = ?',
            [registration[0].user_id]
          );

          if (player && player.length > 0 && player[0].phone) {
            const message = `Hi ${player[0].first_name}, Your registration for "${tournament[0].name}" has been accepted! We look forward to seeing you at the tournament.`;
            
            sendSMS(player[0].phone, message).catch(err => 
              logger.error('SMS send error:', err)
            );

            whatsappService.sendRegistrationAcceptance(
              player[0].phone,
              player[0].first_name,
              tournament[0].name
            ).catch(err => 
              logger.error('WhatsApp send error:', err)
            );
          }
        }
      } catch (error) {
        results.failed.push({ id: registrationId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Accepted ${results.accepted.length} registration(s)`,
      data: results
    });
  } catch (error) {
    console.error('Bulk accept error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept registrations',
      error: error.message
    });
  }
};

/**
 * Bulk reject registrations
 * Organizer rejects multiple registrations at once
 */
const bulkRejectRegistrations = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { registrationIds, reason } = req.body;

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one registration ID'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    const results = {
      rejected: [],
      failed: []
    };

    // Process each registration
    for (const registrationId of registrationIds) {
      try {
        // Get registration
        const registration = await query(
          'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
          [registrationId, tournamentId]
        );

        if (!registration || registration.length === 0) {
          results.failed.push({ id: registrationId, reason: 'Registration not found' });
          continue;
        }

        if (registration[0].status !== 'pending') {
          results.failed.push({ id: registrationId, reason: `Status is ${registration[0].status}, not pending` });
          continue;
        }

        // Update status to rejected
        await query(
          'UPDATE tournament_registrations SET status = ?, responded_at = NOW(), notes = ? WHERE id = ?',
          ['rejected', reason || null, registrationId]
        );

        results.rejected.push(registrationId);

        // Send notification (async, don't wait)
        if (registration[0].user_id) {
          const player = await query(
            'SELECT email, first_name, phone FROM users WHERE id = ?',
            [registration[0].user_id]
          );

          if (player && player.length > 0 && player[0].phone) {
            const smsMessage = `Hi ${player[0].first_name}, Your registration for "${tournament[0].name}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`;
            sendSMS(player[0].phone, smsMessage).catch(err => 
              logger.error('SMS send error:', err)
            );
          }
        }
      } catch (error) {
        results.failed.push({ id: registrationId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Rejected ${results.rejected.length} registration(s)`,
      data: results
    });
  } catch (error) {
    console.error('Bulk reject error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject registrations',
      error: error.message
    });
  }
};

/**
 * Bulk lock players
 * Organizer locks multiple accepted players at once
 */
const bulkLockPlayers = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { registrationIds } = req.body;

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one registration ID'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    const results = {
      locked: [],
      failed: []
    };

    // Process each registration
    for (const registrationId of registrationIds) {
      try {
        // Get registration
        const registration = await query(
          'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
          [registrationId, tournamentId]
        );

        if (!registration || registration.length === 0) {
          results.failed.push({ id: registrationId, reason: 'Registration not found' });
          continue;
        }

        if (registration[0].status !== 'accepted') {
          results.failed.push({ id: registrationId, reason: `Status is ${registration[0].status}, must be accepted` });
          continue;
        }

        // Update status to locked
        await query(
          'UPDATE tournament_registrations SET status = ?, locked_at = NOW() WHERE id = ?',
          ['locked', registrationId]
        );

        results.locked.push(registrationId);
      } catch (error) {
        results.failed.push({ id: registrationId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Locked ${results.locked.length} player(s)`,
      data: results
    });
  } catch (error) {
    console.error('Bulk lock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock players',
      error: error.message
    });
  }
};

/**
 * Bulk unlock players
 * Organizer unlocks multiple locked players at once
 */
const bulkUnlockPlayers = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { registrationIds } = req.body;

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one registration ID'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    const results = {
      unlocked: [],
      failed: []
    };

    // Process each registration
    for (const registrationId of registrationIds) {
      try {
        // Get registration
        const registration = await query(
          'SELECT * FROM tournament_registrations WHERE id = ? AND tournament_id = ?',
          [registrationId, tournamentId]
        );

        if (!registration || registration.length === 0) {
          results.failed.push({ id: registrationId, reason: 'Registration not found' });
          continue;
        }

        if (registration[0].status !== 'locked') {
          results.failed.push({ id: registrationId, reason: `Status is ${registration[0].status}, must be locked` });
          continue;
        }

        // Update status to accepted (unlock)
        await query(
          'UPDATE tournament_registrations SET status = ?, locked_at = NULL WHERE id = ?',
          ['accepted', registrationId]
        );

        results.unlocked.push(registrationId);
      } catch (error) {
        results.failed.push({ id: registrationId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Unlocked ${results.unlocked.length} player(s)`,
      data: results
    });
  } catch (error) {
    console.error('Bulk unlock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock players',
      error: error.message
    });
  }
};

module.exports = {
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
};

const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const SportMatchConfig = require('../models/SportMatchConfig');
const bracketService = require('./bracketService');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a new tournament
 */
const createTournament = async (tournamentData, organizerId) => {
  try {
    // Validate dates
    validateTournamentDates(tournamentData);

    // Validate sport and category compatibility
    if (tournamentData.sport_id && tournamentData.category) {
      const isSupported = await SportMatchConfig.isCategorySupported(
        tournamentData.sport_id,
        tournamentData.category
      );
      
      if (!isSupported) {
        throw new Error(`Category '${tournamentData.category}' is not supported for this sport`);
      }
    }

    // If match_config not provided, use default for the sport
    if (!tournamentData.match_config && tournamentData.sport_id) {
      try {
        const defaultConfig = await SportMatchConfig.getDefaultConfig(tournamentData.sport_id);
        tournamentData.match_config = defaultConfig;
      } catch (error) {
        logger.warn(`Could not load default match config for sport ${tournamentData.sport_id}:`, error.message);
      }
    }

    // Validate match configuration if provided
    if (tournamentData.match_config) {
      const sportConfig = await SportMatchConfig.getBySportId(tournamentData.sport_id);
      if (sportConfig) {
        const validation = SportMatchConfig.validateMatchConfig(
          tournamentData.match_config,
          sportConfig.match_structure
        );
        
        if (!validation.valid) {
          throw new Error(`Invalid match configuration: ${validation.errors.join(', ')}`);
        }
      }
    }

    // Add organizer ID
    tournamentData.organizer_id = organizerId;

    // Create tournament
    const tournamentId = await Tournament.create(tournamentData);

    // Create wallet for organizer if doesn't exist
    await ensureOrganizerWallet(organizerId);

    logger.info(`Tournament created: ${tournamentId} by user ${organizerId}`);

    return await Tournament.findById(tournamentId);
  } catch (error) {
    logger.error('Create tournament error:', error);
    throw error;
  }
};

/**
 * Update tournament
 */
const updateTournament = async (tournamentId, updateData, userId) => {
    try {
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can update this tournament');
      }

      // Get current tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Prevent date updates completely
      const restrictedDateFields = ['start_date', 'end_date', 'registration_start', 'registration_end'];
      const hasDateUpdate = Object.keys(updateData).some(key => restrictedDateFields.includes(key));
      
      if (hasDateUpdate) {
        throw new Error('Tournament dates cannot be updated');
      }

      // Prevent tournament settings updates
      const restrictedSettingsFields = ['max_participants', 'entry_fee', 'prize_money', 'sport_id', 'format_type', 'category', 'venue_id'];
      const hasSettingsUpdate = Object.keys(updateData).some(key => restrictedSettingsFields.includes(key));
      
      if (hasSettingsUpdate) {
        throw new Error('Tournament settings (max participants, entry fee, prize money, sport, format, category, venue) cannot be updated');
      }

      // Only allow specific fields to be updated - filter to only changed fields
      const allowedFields = ['name', 'description', 'logo_url', 'match_config'];
      const filteredUpdateData = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          // Only include if the value is different from current
          if (field === 'match_config') {
            // For match_config, always include if provided (JSON comparison is complex)
            filteredUpdateData[field] = updateData[field];
          } else if (updateData[field] !== tournament[field]) {
            // Only update if value changed
            filteredUpdateData[field] = updateData[field];
          }
        }
      });

      // If no fields to update, return current tournament
      if (Object.keys(filteredUpdateData).length === 0) {
        logger.info(`No changes detected for tournament ${tournamentId}`);
        return tournament;
      }

      logger.info(`Updating tournament ${tournamentId} with fields: ${Object.keys(filteredUpdateData).join(', ')}`);
      const updatedTournament = await Tournament.update(tournamentId, filteredUpdateData);
      
      logger.info(`Tournament updated: ${tournamentId}`);
      
      return updatedTournament;
    } catch (error) {
      logger.error('Update tournament error:', error);
      throw error;
    }
};

/**
 * Delete tournament
 */
const deleteTournament = async (tournamentId, userId) => {
    try {
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can delete this tournament');
      }

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Prevent deletion of ongoing or completed tournaments
      if (['ongoing', 'completed'].includes(tournament.status)) {
        throw new Error('Cannot delete ongoing or completed tournaments');
      }

      // Check if there are paid participants
      const participants = await TournamentParticipant.findByTournament(tournamentId, {
        payment_status: 'paid'
      });

      if (participants.length > 0) {
        throw new Error('Cannot delete tournament with paid participants. Please process refunds first.');
      }

      // Hard delete - permanently remove tournament and all related data
      // CASCADE will automatically delete:
      // - tournament_registrations
      // - teams (and team_members via CASCADE)
      // - pairs
      // - matches
      // - all other related records
      await Tournament.hardDelete(tournamentId);
      
      logger.info(`Tournament permanently deleted: ${tournamentId}`);
      
      return { success: true, message: 'Tournament and all related data deleted successfully' };
    } catch (error) {
      logger.error('Delete tournament error:', error);
      throw error;
    }
};

/**
 * Get tournament by ID
 */
const getTournament = async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Get additional data
    const [participants, statistics] = await Promise.all([
      Tournament.getParticipants(tournamentId),
      Tournament.getStatistics(tournamentId)
    ]);

    return {
      ...tournament,
      participants,
      statistics
    };
};

/**
 * Get all tournaments with filters
 */
const getTournaments = async (filters) => {
    return await Tournament.findAll(filters);
};

/**
 * Register for tournament
 * Supports singles, doubles (partnership), and team registrations
 */
const registerForTournament = async (tournamentId, userId, registrationData = {}) => {
    try {
      return await transaction(async (conn) => {
        // Get tournament
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        // Check tournament status
        if (tournament.status !== 'open') {
          throw new Error('Tournament registration is not open');
        }

        // Check registration dates
        const now = new Date();
        const regStart = new Date(tournament.registration_start);
        const regEnd = new Date(tournament.registration_end);

        if (now < regStart) {
          throw new Error('Registration has not started yet');
        }

        if (now > regEnd) {
          throw new Error('Registration has closed');
        }

        // Check participant limit
        const participantCount = await TournamentParticipant.getCount(tournamentId, 'confirmed');
        if (tournament.max_participants && participantCount >= tournament.max_participants) {
          throw new Error('Tournament is full');
        }

        // Handle different registration types based on tournament category
        let participantData = {
          tournament_id: tournamentId,
          payment_status: tournament.entry_fee > 0 ? 'pending' : 'paid'
        };

        // SINGLES TOURNAMENT
        if (tournament.category === 'singles') {
          // Check if user already registered
          const isRegistered = await TournamentParticipant.isRegistered(tournamentId, {
            user_id: userId
          });

          if (isRegistered) {
            throw new Error('Already registered for this tournament');
          }

          participantData.user_id = userId;
        }
        
        // DOUBLES TOURNAMENT
        else if (tournament.category === 'doubles') {
          const { partnership_id } = registrationData;

          if (!partnership_id) {
            throw new Error('Partnership ID is required for doubles tournaments');
          }

          // Validate partnership
          await validatePartnership(partnership_id, tournamentId, userId);

          // Check if partnership already registered
          const isRegistered = await TournamentParticipant.isRegistered(tournamentId, {
            partnership_id
          });

          if (isRegistered) {
            throw new Error('This partnership is already registered for this tournament');
          }

          participantData.partnership_id = partnership_id;
        }
        
        // TEAM TOURNAMENT
        else if (tournament.category === 'teams') {
          // For OPEN tournaments, players register as individuals (no team_id needed)
          // Organizer will create teams later from accepted players
          if (tournament.tournament_type === 'open') {
            // Skip team validation for OPEN tournaments
            // Player is requesting to join as an individual
          } else {
            // For CLOSED tournaments, team_id might be required
            const { team_id } = registrationData;

            if (team_id) {
              // Validate team
              await validateTeamForTournament(team_id, tournamentId, userId);

              // Check if team already registered
              const isRegistered = await TournamentParticipant.isRegistered(tournamentId, {
                team_id
              });

              if (isRegistered) {
                throw new Error('This team is already registered for this tournament');
              }

              participantData.team_id = team_id;
            }
          }
        }

        // For OPEN tournaments, create request in tournament_registrations table
        // This allows organizer to review and approve
        if (tournament.tournament_type === 'open') {
          // Check if already requested
          const existing = await query(
            'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
            [tournamentId, userId]
          );
          
          if (existing && existing.length > 0) {
            throw new Error('You have already requested to join this tournament');
          }
          
          // Create registration request
          const result = await query(
            `INSERT INTO tournament_registrations 
             (tournament_id, user_id, registration_type, status, created_by) 
             VALUES (?, ?, 'request', 'pending', ?)`,
            [tournamentId, userId, userId]
          );
          
          // Send notification to organizer
          const organizer = await query(
            'SELECT first_name, phone FROM users WHERE id = ?',
            [tournament.organizer_id]
          );
          
          if (organizer && organizer.length > 0 && organizer[0].phone) {
            const player = await query('SELECT first_name FROM users WHERE id = ?', [userId]);
            const playerName = player && player.length > 0 ? player[0].first_name : 'A player';
            const smsMessage = `Hi ${organizer[0].first_name}, ${playerName} has requested to join your tournament "${tournament.name}". Please review the request.`;
            
            // Send SMS notification
            // try {
            //   // Import at top or use inline require
            //   const twilio = require('twilio');
            //   if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            //     const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            //     await client.messages.create({
            //       body: smsMessage,
            //       from: process.env.TWILIO_PHONE_NUMBER,
            //       to: organizer[0].phone
            //     });
            //   } else {
            //     console.log(`📱 SMS to ${organizer[0].phone}:\n${smsMessage}`);
            //   }
            // } catch (e) {
            //   logger.warn('Failed to send SMS notification:', e);
            // }
          }
          
          logger.info(`Registration request created for OPEN tournament ${tournamentId} by user ${userId}`);
          
          // Return registration data
          return {
            id: result.insertId,
            tournament_id: tournamentId,
            user_id: userId,
            status: 'pending',
            registration_type: 'request',
            tournament_name: tournament.name,
            message: 'Registration request submitted. Waiting for organizer approval.'
          };
        }
        
        // For CLOSED tournaments, use tournament_participants table
        const participantId = await TournamentParticipant.create(participantData);

        // If no entry fee, auto-confirm
        if (tournament.entry_fee === 0 || tournament.entry_fee === '0.00') {
          await TournamentParticipant.updateStatus(participantId, 'confirmed');
        }

        logger.info(`Registration created for tournament ${tournamentId}: ${JSON.stringify(participantData)}`);

        return await TournamentParticipant.findById(participantId);
      });
    } catch (error) {
      logger.error('Register for tournament error:', error);
      throw error;
    }
};

/**
 * Withdraw from tournament
 */
const withdrawFromTournament = async (tournamentId, userId, reason = null) => {
    try {
      // Find user's participation
      const participation = await TournamentParticipant.findUserParticipation(tournamentId, userId);
      
      if (!participation) {
        throw new Error('Not registered for this tournament');
      }

      // Check if tournament has started
      const tournament = await Tournament.findById(tournamentId);
      if (tournament.status === 'ongoing') {
        throw new Error('Cannot withdraw from ongoing tournament');
      }

      // Withdraw
      await TournamentParticipant.withdraw(participation.id, reason);

      // Handle refund if paid
      if (participation.payment_status === 'paid') {
        // TODO: Process refund based on refund policy
        logger.info(`Refund needed for participant ${participation.id}`);
      }

      logger.info(`User ${userId} withdrew from tournament ${tournamentId}`);

      return { success: true, message: 'Successfully withdrawn from tournament' };
    } catch (error) {
      logger.error('Withdraw from tournament error:', error);
      throw error;
    }
};

/**
 * Preview tournament matches before generation
 * Returns exact match structure without saving to database
 */
const previewMatches = async (tournamentId, userId, scheduleConfig = null) => {
    try {
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can preview matches');
      }

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      logger.info(`Generating match preview for tournament ${tournamentId} (category: ${tournament.category})`);

      // Get seeded participants from tournament_seeds table
      let participants = await getSeededParticipants(tournamentId);
      
      // If no seeds assigned, get locked participants directly
      if (!participants || participants.length === 0) {
        logger.info('No seeds found, getting locked participants directly');
        participants = await Tournament.getParticipants(tournamentId);
        
        // Filter only locked participants
        participants = participants.filter(p => p.status === 'locked');
      }

      logger.info(`Found ${participants.length} participants for match preview`);

      if (participants.length < 2) {
        throw new Error('Need at least 2 participants to preview matches');
      }

      // Generate match preview using bracket service
      const result = await bracketService.previewMatches(tournamentId, participants, scheduleConfig);

      logger.info(`Match preview generated successfully for tournament ${tournamentId}`);

      return result;
    } catch (error) {
      logger.error('Preview matches error:', error);
      throw error;
    }
};

/**
 * Generate tournament brackets using seeded participants
 */
const generateBrackets = async (tournamentId, userId, scheduleConfig = null) => {
    try {
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can generate brackets');
      }

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      logger.info(`Generating brackets for tournament ${tournamentId} (category: ${tournament.category})`);

      // Get seeded participants from tournament_seeds table
      let participants = await getSeededParticipants(tournamentId);
      
      // If no seeds assigned, get locked participants directly
      if (!participants || participants.length === 0) {
        logger.info('No seeds found, getting locked participants directly');
        participants = await Tournament.getParticipants(tournamentId);
        
        // Filter only locked participants
        participants = participants.filter(p => p.status === 'locked');
      }

      logger.info(`Found ${participants.length} participants for bracket generation`);

      if (participants.length < 2) {
        throw new Error('Need at least 2 participants to generate brackets');
      }

      // Generate brackets based on format with schedule configuration
      const result = await bracketService.generateBrackets(tournamentId, participants, scheduleConfig);

      // Update tournament status
      await Tournament.updateStatus(tournamentId, 'ongoing');

      logger.info(`Brackets generated successfully for tournament ${tournamentId}`);

      return result;
    } catch (error) {
      logger.error('Generate brackets error:', error);
      throw error;
    }
};

/**
 * Publish tournament (open for registration)
 */
const publishTournament = async (tournamentId, userId) => {
    try {
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can publish this tournament');
      }

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Validate tournament is ready to publish
      if (tournament.status !== 'draft') {
        throw new Error('Tournament is already published');
      }

      // Check if admin has approved the tournament
      if (!tournament.admin_approved) {
        throw new Error('Tournament cannot be published. Admin approval is pending.');
      }

      // Validate required fields
      if (!tournament.sport_id || !tournament.start_date || !tournament.end_date) {
        throw new Error('Tournament is missing required information');
      }

      // Update status to open
      await Tournament.updateStatus(tournamentId, 'open');

      logger.info(`Tournament published: ${tournamentId}`);

      return await Tournament.findById(tournamentId);
    } catch (error) {
      logger.error('Publish tournament error:', error);
      throw error;
    }
};

/**
 * Close registration
 */
const closeRegistration = async (tournamentId, userId) => {
    try {
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can close registration');
      }

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.status !== 'open') {
        throw new Error('Tournament registration is not open');
      }

      // Update status to closed
      await Tournament.updateStatus(tournamentId, 'closed');

      logger.info(`Registration closed for tournament ${tournamentId}`);

      return await Tournament.findById(tournamentId);
    } catch (error) {
      logger.error('Close registration error:', error);
      throw error;
    }
};

/**
 * Complete tournament
 */
const completeTournament = async (tournamentId, userId) => {
    try {
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can complete this tournament');
      }

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.status !== 'ongoing') {
        throw new Error('Tournament is not ongoing');
      }

      // Check if all matches are completed
      const matches = await Tournament.getMatches(tournamentId);
      const incompleteMatches = matches.filter(m => m.status !== 'completed');

      if (incompleteMatches.length > 0) {
        throw new Error(`${incompleteMatches.length} matches are still incomplete`);
      }

      // Determine and set tournament winner
      logger.info(`🏆 [TOURNAMENT] Determining winner for tournament ${tournamentId}`);
      const tournamentWinnerService = require('./tournamentWinnerService');
      
      try {
        const winnerResult = await tournamentWinnerService.determineAndSetWinner(tournamentId);
        
        if (winnerResult.success) {
          logger.info(`🏆 [TOURNAMENT] Winner determined: ${winnerResult.winner.participant_name} (ID: ${winnerResult.winner.participant_id})`);
        } else {
          logger.warn(`⚠️ [TOURNAMENT] Could not determine winner: ${winnerResult.message}`);
        }
      } catch (winnerError) {
        logger.error(`❌ [TOURNAMENT] Error determining winner:`, winnerError);
        // Continue with tournament completion even if winner determination fails
      }

      // Update status to completed
      await Tournament.updateStatus(tournamentId, 'completed');

      // Process payouts
      await processTournamentPayouts(tournamentId);

      logger.info(`✅ [TOURNAMENT] Tournament completed: ${tournamentId}`);

      return await Tournament.findById(tournamentId);
    } catch (error) {
      logger.error('Complete tournament error:', error);
      throw error;
    }
};

/**
 * Get tournament standings (enhanced with comprehensive statistics)
 */
const getStandings = async (tournamentId, groupId = null) => {
  console.log("------------------", tournamentId, groupId);
  
    return await Tournament.getStandings(tournamentId, groupId);
};

/**
 * Get formatted points table
 */
const getPointsTable = async (tournamentId, groupId = null) => {
    return await Tournament.getPointsTable(tournamentId, groupId);
};

/**
 * Get tournament matches with optional participant details
 */
const getMatches = async (tournamentId, filters = {}) => {
    const matches = await Tournament.getMatches(tournamentId, filters);
    
    // If include_participants is requested, format matches with participant details
    if (filters.include_participants === 'true' || filters.include_participants === true) {
      const bracketService = require('./bracketService');
      const formattedMatches = await Promise.all(
        matches.map(match => bracketService.formatMatchForDisplay(match))
      );
      return formattedMatches;
    }
    
    return matches;
};

/**
 * Get user's tournaments
 */
const getUserTournaments = async (userId) => {
    return await Tournament.getUserTournaments(userId);
};

/**
 * Get upcoming tournaments
 */
const getUpcomingTournaments = async (limit = 10) => {
    return await Tournament.getUpcoming(limit);
};

/**
 * Get ongoing tournaments
 */
const getOngoingTournaments = async (limit = 10) => {
    return await Tournament.getOngoing(limit);
};

/**
 * Validate tournament dates
 * @param {Object} data - Tournament data with dates
 * @param {boolean} isEdit - Whether this is an edit (allows past dates)
 */
const validateTournamentDates = (data, isEdit = false) => {
    const { start_date, end_date, registration_start, registration_end } = data;

    // Parse dates properly (handle both DATE and DATETIME formats)
    const start = new Date(start_date);
    const end = new Date(end_date);
    const regStart = registration_start ? new Date(registration_start) : null;
    const regEnd = registration_end ? new Date(registration_end) : null;

    // Validate start and end dates
    if (start >= end) {
      throw new Error('End date must be after start date');
    }

    // Validate registration dates if provided
    if (regStart && regEnd) {
      if (regStart >= regEnd) {
        throw new Error('Registration end must be after registration start');
      }

      if (regEnd > start) {
        throw new Error('Registration must end before tournament starts');
      }
    }

    // No past date validation - users can select any date/time for registration
};

/**
 * Ensure organizer has a wallet
 */
const ensureOrganizerWallet = async (userId) => {
    const sql = 'SELECT id FROM tournament_creator_wallets WHERE user_id = ?';
    const wallets = await query(sql, [userId]);

    if (wallets.length === 0) {
      await query(
        'INSERT INTO tournament_creator_wallets (user_id, balance, total_earned, total_withdrawn) VALUES (?, 0, 0, 0)',
        [userId]
      );
      logger.info(`Created wallet for organizer ${userId}`);
    }
};

/**
 * Process tournament payouts
 */
const processTournamentPayouts = async (tournamentId) => {
    try {
      const tournament = await Tournament.findById(tournamentId);
      
      if (tournament.total_collected === 0) {
        return;
      }

      // Calculate platform commission
      const commission = (tournament.total_collected * tournament.platform_commission_percent) / 100;
      const organizerPayout = tournament.total_collected - commission - tournament.prize_money;

      if (organizerPayout > 0) {
        // Credit organizer wallet
        await query(
          `UPDATE tournament_creator_wallets 
           SET balance = balance + ?,
               total_earned = total_earned + ?
           WHERE user_id = ?`,
          [organizerPayout, organizerPayout, tournament.organizer_id]
        );

        // Record transaction
        const [wallet] = await query(
          'SELECT id, balance FROM tournament_creator_wallets WHERE user_id = ?',
          [tournament.organizer_id]
        );

        await query(
          `INSERT INTO wallet_transactions 
           (wallet_id, tournament_id, transaction_type, amount, commission_percentage, description, balance_after)
           VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
          [
            wallet.id,
            tournamentId,
            organizerPayout,
            tournament.platform_commission_percent,
            `Tournament ${tournament.name} payout`,
            wallet.balance
          ]
        );

        logger.info(`Processed payout for tournament ${tournamentId}: ${organizerPayout}`);
      }

      // Update tournament payout status
      await Tournament.updateFinancials(tournamentId, {
        organizer_payout_status: 'completed'
      });

    } catch (error) {
      logger.error('Process tournament payouts error:', error);
      throw error;
    }
};

/**
 * Assign seeds to participants using centralized tournament_seeds table
 */
const assignSeeds = async (tournamentId, userId, seedAssignments) => {
    try {
      logger.info(`Assign seeds called for tournament ${tournamentId}`);
      logger.info(`Seed assignments:`, seedAssignments);
      
      // Check if user is organizer
      const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
      if (!isOrganizer) {
        throw new Error('Only the organizer can assign seeds');
      }

      // Get tournament to determine category
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      logger.info(`Tournament category: ${tournament.category}`);

      // Validate seed assignments
      const seeds = seedAssignments.map(s => s.seed_number);
      const uniqueSeeds = new Set(seeds);
      
      if (seeds.length !== uniqueSeeds.size) {
        throw new Error('Duplicate seed numbers found');
      }

      // Delete existing seeds for this tournament
      await query('DELETE FROM tournament_seeds WHERE tournament_id = ?', [tournamentId]);
      logger.info('Cleared existing seeds');

      // Determine participant type based on tournament category
      let participantType;
      let participantIdField;
      
      if (tournament.category === 'singles') {
        participantType = 'player';
        participantIdField = 'player_registration_id';
      } else if (tournament.category === 'pairs' || tournament.category === 'doubles') {
        participantType = 'pair';
        participantIdField = 'pair_id';
      } else if (tournament.category === 'teams') {
        participantType = 'team';
        participantIdField = 'team_id';
      } else {
        throw new Error(`Unknown tournament category: ${tournament.category}`);
      }

      // Insert new seeds into tournament_seeds table
      for (const assignment of seedAssignments) {
        const seedData = {
          tournament_id: tournamentId,
          seed_number: assignment.seed_number,
          participant_type: participantType,
          [participantIdField]: assignment.participant_id,
          assigned_by: userId
        };
        
        await query('INSERT INTO tournament_seeds SET ?', [seedData]);
        logger.info(`Assigned seed ${assignment.seed_number} to ${participantType} ${assignment.participant_id}`);
      }

      logger.info(`Seeds assigned successfully for tournament ${tournamentId} (category: ${tournament.category})`);

      return { success: true, message: 'Seeds assigned successfully' };
    } catch (error) {
      logger.error('Assign seeds error:', error);
      throw error;
    }
};

/**
 * Get seeded participants for a tournament (for bracket generation)
 */
const getSeededParticipants = async (tournamentId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    let sql;
    
    if (tournament.category === 'singles') {
      // Get seeded players from tournament_registrations
      sql = `
        SELECT 
          ts.seed_number,
          ts.participant_type,
          tr.id as participant_id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.id as user_id,
          tr.status
        FROM tournament_seeds ts
        JOIN tournament_registrations tr ON ts.player_registration_id = tr.id
        JOIN users u ON tr.user_id = u.id
        WHERE ts.tournament_id = ? AND ts.participant_type = 'player'
        ORDER BY ts.seed_number
      `;
    } else if (tournament.category === 'pairs' || tournament.category === 'doubles') {
      // Get seeded pairs from pairs table
      sql = `
        SELECT 
          ts.seed_number,
          ts.participant_type,
          p.id as participant_id,
          p.name as name,
          p.status
        FROM tournament_seeds ts
        JOIN pairs p ON ts.pair_id = p.id
        WHERE ts.tournament_id = ? AND ts.participant_type = 'pair'
        ORDER BY ts.seed_number
      `;
    } else if (tournament.category === 'teams') {
      // Get seeded teams from teams table
      sql = `
        SELECT 
          ts.seed_number,
          ts.participant_type,
          t.id as participant_id,
          t.name as name,
          t.status
        FROM tournament_seeds ts
        JOIN teams t ON ts.team_id = t.id
        WHERE ts.tournament_id = ? AND ts.participant_type = 'team'
        ORDER BY ts.seed_number
      `;
    }

    const seededParticipants = await query(sql, [tournamentId]);
    logger.info(`Retrieved ${seededParticipants.length} seeded participants for tournament ${tournamentId}`);
    
    return seededParticipants;
  } catch (error) {
    logger.error('Get seeded participants error:', error);
    throw error;
  }
};

/**
 * Get locked participants for a tournament (all participants ready for bracket generation)
 * Returns participants based on tournament category
 */
const getLockedParticipants = async (tournamentId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    let sql;
    
    if (tournament.category === 'singles') {
      // Get locked players from tournament_registrations
      sql = `
        SELECT 
          tr.id as participant_id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.id as user_id,
          u.profile_image,
          us.skill_level,
          tr.status,
          tr.locked_at
        FROM tournament_registrations tr
        JOIN users u ON tr.user_id = u.id
        LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
        WHERE tr.tournament_id = ? AND tr.status = 'locked'
        ORDER BY tr.locked_at
      `;
      return await query(sql, [tournament.sport_id, tournamentId]);
      
    } else if (tournament.category === 'pairs' || tournament.category === 'doubles') {
      // Get locked pairs
      sql = `
        SELECT 
          p.id as participant_id,
          p.name,
          p.player1_id,
          p.player2_id,
          CONCAT(u1.first_name, ' ', u1.last_name) as player1_name,
          CONCAT(u2.first_name, ' ', u2.last_name) as player2_name,
          p.status,
          p.locked_at
        FROM pairs p
        JOIN users u1 ON p.player1_id = u1.id
        JOIN users u2 ON p.player2_id = u2.id
        WHERE p.tournament_id = ? AND p.status = 'locked'
        ORDER BY p.locked_at
      `;
      return await query(sql, [tournamentId]);
      
    } else if (tournament.category === 'teams') {
      // Get locked teams
      sql = `
        SELECT 
          t.id as participant_id,
          t.name,
          t.logo,
          t.captain_id,
          CONCAT(u.first_name, ' ', u.last_name) as captain_name,
          COUNT(tm.id) as member_count,
          t.status,
          t.locked_at
        FROM teams t
        JOIN users u ON t.captain_id = u.id
        LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
        WHERE t.tournament_id = ? AND t.status = 'locked'
        GROUP BY t.id
        ORDER BY t.locked_at
      `;
      return await query(sql, [tournamentId]);
    }

    return [];
  } catch (error) {
    logger.error('Get locked participants error:', error);
    throw error;
  }
};

/**
 * Validate team for tournament registration
 * Supports both tournament-specific and reusable teams
 */
const validateTeamForTournament = async (teamId, tournamentId, userId) => {
  const Team = require('../models/Team');
  
  // Get team details
  const team = await Team.findById(teamId);
  
  if (!team) {
    throw new Error('Team not found');
  }

  // Get tournament details
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Check team type and validate accordingly
  if (team.is_tournament_specific) {
    // Tournament-specific team must belong to this tournament
    if (team.tournament_id !== tournamentId) {
      throw new Error('Team does not belong to this tournament');
    }
  } else {
    // Reusable team must match tournament sport
    if (team.sport_id !== tournament.sport_id) {
      throw new Error('Team sport does not match tournament sport');
    }
    
    // Check if team is already registered for this tournament
    const regCheckSql = `
      SELECT id FROM team_tournament_registrations 
      WHERE team_id = ? AND tournament_id = ? 
      AND status NOT IN ('withdrawn', 'rejected')
    `;
    const existingReg = await query(regCheckSql, [teamId, tournamentId]);
    if (existingReg && existingReg.length > 0) {
      throw new Error('Team is already registered for this tournament');
    }
  }

  // Check if user is captain or creator
  const isCaptain = await Team.isCaptain(teamId, userId);
  const isCreator = await Team.isCreator(teamId, userId);
  
  if (!isCaptain && !isCreator) {
    throw new Error('Only team captain or creator can register the team');
  }

  // Check if team has minimum members (all slots filled)
  const memberCountSql = `
    SELECT COUNT(*) as count FROM team_members 
    WHERE team_id = ? AND is_active = TRUE
  `;
  const memberResult = await query(memberCountSql, [teamId]);
  const memberCount = memberResult[0]?.count || 0;
  
  if (memberCount < team.max_players) {
    throw new Error(`Team must have all ${team.max_players} members (currently has ${memberCount})`);
  }

  return true;
};

/**
 * Validate partnership for tournament registration
 */
const validatePartnership = async (partnershipId, tournamentId, userId) => {
  const sql = `
    SELECT p.*, 
           u1.first_name as player1_first_name,
           u2.first_name as player2_first_name
    FROM partnerships p
    LEFT JOIN users u1 ON p.player1_id = u1.id
    LEFT JOIN users u2 ON p.player2_id = u2.id
    WHERE p.id = ? AND p.deleted_at IS NULL
  `;
  
  const result = await query(sql, [partnershipId]);
  const partnerships = Array.isArray(result) ? result : result[0] ? [result[0]] : [];
  
  if (partnerships.length === 0) {
    throw new Error('Partnership not found');
  }

  const partnership = partnerships[0];

  // Check if partnership belongs to this tournament
  if (partnership.tournament_id !== tournamentId) {
    throw new Error('Partnership does not belong to this tournament');
  }

  // Check if partnership is confirmed
  if (partnership.status !== 'confirmed') {
    throw new Error('Partnership must be confirmed before registration');
  }

  // Check if user is part of the partnership
  if (partnership.player1_id !== userId && partnership.player2_id !== userId) {
    throw new Error('You are not part of this partnership');
  }

  return true;
};

/**
 * Get eligible teams for tournament registration
 * Returns both tournament-specific teams and reusable teams created by the user
 */
const getEligibleTeams = async (tournamentId, userId) => {
  try {
    const Team = require('../models/Team');
    
    // Get tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Only applicable for team tournaments
    if (tournament.category !== 'teams') {
      return [];
    }

    // Get user's teams - only tournament-specific teams
    const sql = `
      SELECT 
        t.*,
        COUNT(DISTINCT tm.id) as member_count,
        CASE WHEN t.captain_id = ? THEN TRUE ELSE FALSE END as is_captain,
        CASE WHEN t.creator_id = ? THEN TRUE ELSE FALSE END as is_creator,
        MAX(CASE WHEN tp.id IS NOT NULL THEN 1 ELSE 0 END) as is_registered_in_tournament
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
      LEFT JOIN tournament_participants tp ON t.id = tp.team_id 
        AND tp.tournament_id = ?
        AND tp.status NOT IN ('withdrawn', 'disqualified')
      WHERE t.tournament_id = ?
        AND (t.captain_id = ? OR t.creator_id = ?)
        AND t.deleted_at IS NULL
      GROUP BY t.id, t.name, t.description, t.tournament_id, t.max_players, 
               t.creator_id, t.captain_id, t.logo, t.status,
               t.created_at, t.updated_at, t.deleted_at
      ORDER BY t.created_at DESC
    `;

    const teams = await query(sql, [userId, userId, tournamentId, tournamentId, userId, userId]);
    const teamList = Array.isArray(teams) ? teams : teams[0] ? [teams[0]] : [];

    // Add eligibility information
    return teamList.map(team => {
      // Require FULL team (all max_players slots filled)
      const requiredMembers = team.max_players;
      const isRegistered = team.is_registered_in_tournament;
      
      const canRegister = !isRegistered && 
                         (team.is_captain || team.is_creator) && 
                         team.member_count >= requiredMembers;
      
      const reasons = [];
      if (isRegistered) reasons.push('Team already registered for this tournament');
      if (!team.is_captain && !team.is_creator) reasons.push('Only captain or creator can register');
      if (team.member_count < requiredMembers) {
        reasons.push(`Team must have all ${requiredMembers} members (currently has ${team.member_count})`);
      }

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        tournament_id: team.tournament_id,
        member_count: team.member_count,
        max_players: team.max_players,
        is_captain: team.is_captain,
        is_creator: team.is_creator,
        is_registered: isRegistered,
        min_members_required: requiredMembers,
        can_register: canRegister,
        reasons: reasons,
        logo: team.logo,
        status: team.status,
        created_at: team.created_at
      };
    });

  } catch (error) {
    logger.error('Get eligible teams error:', error);
    throw error;
  }
};

/**
 * Get tournament join options for a user
 */
const getTournamentJoinOptions = async (tournamentId, userId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const options = {
      can_join: false,
      reasons: [],
      tournament_category: tournament.category,
      options: {}
    };

    // Check basic eligibility
    if (tournament.status !== 'open') {
      options.reasons.push('Tournament registration is not open');
      return options;
    }

    const now = new Date();
    const regStart = new Date(tournament.registration_start);
    const regEnd = new Date(tournament.registration_end);

    if (now < regStart) {
      options.reasons.push('Registration has not started yet');
      return options;
    }

    if (now > regEnd) {
      options.reasons.push('Registration has closed');
      return options;
    }

    // Check if tournament is full
    const participantCount = await TournamentParticipant.getCount(tournamentId, 'confirmed');
    if (tournament.max_participants && participantCount >= tournament.max_participants) {
      options.reasons.push('Tournament is full');
      return options;
    }

    // Check if user is organizer
    const isOrganizer = await Tournament.isOrganizer(tournamentId, userId);
    options.is_organizer = isOrganizer;
    
    // Organizers can participate, but we'll mark it specially
    // Remove the restriction - organizers can join their own tournament

    // Category-specific options
    if (tournament.category === 'singles') {
      // Check both tournament_participants and tournament_registrations tables
      const isRegistered = await TournamentParticipant.isRegistered(tournamentId, { user_id: userId });
      
      // Also check tournament_registrations for OPEN tournaments
      const registrationCheck = await query(
        `SELECT * FROM tournament_registrations 
         WHERE tournament_id = ? AND user_id = ? 
         AND status IN ('pending', 'accepted', 'locked')`,
        [tournamentId, userId]
      );
      
      const hasRegistrationRequest = registrationCheck && registrationCheck.length > 0;
      const isAlreadyInSystem = isRegistered || hasRegistrationRequest;
      
      options.options.singles = {
        available: !isAlreadyInSystem,
        is_registered: isAlreadyInSystem,
        registration_status: hasRegistrationRequest ? registrationCheck[0].status : null
      };
      
      options.can_join = !isAlreadyInSystem;
      if (isAlreadyInSystem) {
        if (hasRegistrationRequest) {
          const status = registrationCheck[0].status;
          if (status === 'pending') {
            options.reasons.push('Registration request pending approval');
          } else if (status === 'accepted') {
            options.reasons.push('Registration accepted, waiting to be locked');
          } else if (status === 'locked') {
            options.reasons.push('Already registered for this tournament');
          }
        } else {
          options.reasons.push('Already registered for this tournament');
        }
      }
    }
    else if (tournament.category === 'doubles') {
      // Get user's partnerships for this tournament
      const partnershipsSql = `
        SELECT p.*, 
               CONCAT(u1.first_name, ' ', u1.last_name) as partner1_name,
               CONCAT(u2.first_name, ' ', u2.last_name) as partner2_name,
               CASE WHEN tp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered
        FROM partnerships p
        LEFT JOIN users u1 ON p.player1_id = u1.id
        LEFT JOIN users u2 ON p.player2_id = u2.id
        LEFT JOIN tournament_participants tp ON p.id = tp.partnership_id 
          AND tp.tournament_id = p.tournament_id
          AND tp.status NOT IN ('withdrawn', 'disqualified')
        WHERE p.tournament_id = ?
          AND (p.player1_id = ? OR p.player2_id = ?)
          AND p.deleted_at IS NULL
          AND p.status = 'confirmed'
      `;
      
      const partnerships = await query(partnershipsSql, [tournamentId, userId, userId]);
      const partnershipList = Array.isArray(partnerships) ? partnerships : partnerships[0] ? [partnerships[0]] : [];
      
      const availablePartnerships = partnershipList.filter(p => !p.is_registered);
      
      options.options.doubles = {
        available: availablePartnerships.length > 0,
        existing_partnerships: partnershipList,
        can_create_partnership: true
      };
      
      options.can_join = availablePartnerships.length > 0;
      if (availablePartnerships.length === 0 && partnershipList.length > 0) {
        options.reasons.push('All your partnerships are already registered');
      } else if (partnershipList.length === 0) {
        options.reasons.push('You need to create or join a partnership first');
      }
    }
    else if (tournament.category === 'teams') {
      const eligibleTeams = await getEligibleTeams(tournamentId, userId);
      const canRegisterTeams = eligibleTeams.filter(t => t.can_register);
      
      options.options.teams = {
        available: canRegisterTeams.length > 0,
        existing_teams: eligibleTeams,
        can_create_team: true,
        min_members_required: eligibleTeams.length > 0 ? eligibleTeams[0].min_members_required : Math.ceil(11 / 2)
      };
      
      options.can_join = canRegisterTeams.length > 0;
      if (canRegisterTeams.length === 0 && eligibleTeams.length > 0) {
        options.reasons.push('None of your teams meet the requirements for registration');
      } else if (eligibleTeams.length === 0) {
        options.reasons.push('You need to create or join a team first');
      }
    }

    return options;

  } catch (error) {
    logger.error('Get tournament join options error:', error);
    throw error;
  }
};

/**
 * Check if a team is eligible to join a tournament
 * Returns detailed validation information
 */
const checkTeamEligibility = async (teamId, tournamentId) => {
  try {
    const Team = require('../models/Team');
    
    // Get team details
    const team = await Team.findById(teamId);
    if (!team) {
      return {
        eligible: false,
        reasons: ['Team not found']
      };
    }

    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return {
        eligible: false,
        reasons: ['Tournament not found']
      };
    }

    const reasons = [];
    let eligible = true;

    // Check tournament category
    if (tournament.category !== 'teams') {
      reasons.push('Tournament is not a team tournament');
      eligible = false;
    }

    // Check tournament status
    if (tournament.status !== 'open') {
      reasons.push('Tournament registration is not open');
      eligible = false;
    }

    // Check registration dates
    const now = new Date();
    const regStart = new Date(tournament.registration_start);
    const regEnd = new Date(tournament.registration_end);

    if (now < regStart) {
      reasons.push('Registration has not started yet');
      eligible = false;
    }

    if (now > regEnd) {
      reasons.push('Registration has closed');
      eligible = false;
    }

    // Check if tournament is full
    const participantCount = await TournamentParticipant.getCount(tournamentId, 'confirmed');
    if (tournament.max_participants && participantCount >= tournament.max_participants) {
      reasons.push('Tournament is full');
      eligible = false;
    }

    // Check team type and sport match
    if (team.is_tournament_specific) {
      if (team.tournament_id !== tournamentId) {
        reasons.push('Team is specific to a different tournament');
        eligible = false;
      }
    } else {
      if (team.sport_id !== tournament.sport_id) {
        reasons.push('Team sport does not match tournament sport');
        eligible = false;
      }
    }

    // Check if team is already registered
    const isRegisteredSql = `
      SELECT 
        CASE 
          WHEN tp.id IS NOT NULL THEN TRUE
          WHEN ttr.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END as is_registered
      FROM teams t
      LEFT JOIN tournament_participants tp ON t.id = tp.team_id 
        AND tp.tournament_id = ?
        AND tp.status NOT IN ('withdrawn', 'disqualified')
      LEFT JOIN team_tournament_registrations ttr ON t.id = ttr.team_id 
        AND ttr.tournament_id = ?
        AND ttr.status NOT IN ('withdrawn', 'rejected')
      WHERE t.id = ?
    `;
    const regResult = await query(isRegisteredSql, [tournamentId, tournamentId, teamId]);
    if (regResult && regResult.length > 0 && regResult[0].is_registered) {
      reasons.push('Team is already registered for this tournament');
      eligible = false;
    }

    // Check team member count
    const memberCountSql = `
      SELECT COUNT(*) as count FROM team_members 
      WHERE team_id = ? AND is_active = TRUE
    `;
    const memberResult = await query(memberCountSql, [teamId]);
    const memberCount = memberResult[0]?.count || 0;
    
    if (memberCount < team.max_players) {
      reasons.push(`Team must have all ${team.max_players} members (currently has ${memberCount})`);
      eligible = false;
    }

    return {
      eligible,
      reasons: reasons.length > 0 ? reasons : ['Team is eligible to register'],
      team_info: {
        id: team.id,
        name: team.name,
        is_tournament_specific: team.is_tournament_specific,
        sport_id: team.sport_id,
        member_count: memberCount,
        max_players: team.max_players
      },
      tournament_info: {
        id: tournament.id,
        name: tournament.name,
        sport_id: tournament.sport_id,
        category: tournament.category,
        status: tournament.status
      }
    };

  } catch (error) {
    logger.error('Check team eligibility error:', error);
    throw error;
  }
};

module.exports = {
  createTournament,
  updateTournament,
  deleteTournament,
  getTournament,
  getTournaments,
  registerForTournament,
  withdrawFromTournament,
  previewMatches,
  generateBrackets,
  publishTournament,
  closeRegistration,
  completeTournament,
  getStandings,
  getPointsTable,
  getMatches,
  getUserTournaments,
  getUpcomingTournaments,
  getOngoingTournaments,
  validateTournamentDates,
  ensureOrganizerWallet,
  processTournamentPayouts,
  assignSeeds,
  getSeededParticipants,
  getLockedParticipants,
  validateTeamForTournament,
  validatePartnership,
  getEligibleTeams,
  getTournamentJoinOptions,
  checkTeamEligibility
};

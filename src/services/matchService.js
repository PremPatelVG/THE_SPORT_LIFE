const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a new match
 */
const createMatch = async (matchData, userId) => {
    try {
      // Verify user is tournament organizer (only for tournament matches)
      if (matchData.tournament_id) {
        const isOrganizer = await Tournament.isOrganizer(matchData.tournament_id, userId);
        if (!isOrganizer) {
          throw new Error('Only tournament organizer can create matches');
        }
      }

      // Validate participants
      if (matchData.participant1_id && matchData.participant2_id) {
        if (matchData.participant1_id === matchData.participant2_id) {
          throw new Error('Participants must be different');
        }
      }

      // Check court availability if specified
      if (matchData.court_id && matchData.match_date && matchData.match_time) {
        const isAvailable = await Match.isCourtAvailable(
          matchData.court_id,
          matchData.match_date,
          matchData.match_time,
          matchData.scheduled_duration || 120
        );

        if (!isAvailable) {
          throw new Error('Court is not available at the specified time');
        }
      }

      const matchId = await Match.create(matchData);
      logger.info(`Match created: ${matchId} by user ${userId}`);

      return await Match.findById(matchId);
    } catch (error) {
      logger.error('Create match error:', error);
      throw error;
    }
};

/**
 * Update match
 */
const updateMatch = async (matchId, updateData, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is tournament organizer or match referee
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      const isReferee = match.referee_id === userId;
      
      if (!isOrganizer && !isReferee) {
        throw new Error('Only tournament organizer or match referee can update matches');
      }

      // Prevent updates to completed matches (except when declaring winner)
      if (match.status === 'completed' && updateData.status !== 'completed') {
        throw new Error('Cannot update completed match');
      }

      // Check court availability if changing schedule
      if (updateData.court_id || updateData.match_date || updateData.match_time) {
        const courtId = updateData.court_id || match.court_id;
        const date = updateData.match_date || match.match_date;
        const time = updateData.match_time || match.match_time;
        const duration = updateData.scheduled_duration || match.scheduled_duration;

        if (courtId && date && time) {
          const isAvailable = await Match.isCourtAvailable(courtId, date, time, duration, matchId);
          if (!isAvailable) {
            throw new Error('Court is not available at the specified time');
          }
        }
      }

      // Auto-update status to 'scheduled' when date/time is assigned
      if (updateData.match_date && !updateData.status) {
        // If match_date is being set and status is not explicitly provided
        // AND current status is 'pending', change it to 'scheduled'
        if (match.status === 'pending') {
          updateData.status = 'scheduled';
          logger.info(`Auto-updating match ${matchId} status from 'pending' to 'scheduled'`);
        }
      }

      logger.info(`\n========== MATCH UPDATE START ==========`);
      logger.info(`Match ID: ${matchId}`);
      logger.info(`Update Data:`, JSON.stringify(updateData, null, 2));
      logger.info(`Previous Status: ${match.status}`);
      logger.info(`New Status: ${updateData.status}`);
      
      const updatedMatch = await Match.update(matchId, updateData);
      logger.info(`✅ Match updated in database: ${matchId}`);

      // If match is being completed, process tournament progression (standings/brackets)
      if (updateData.status === 'completed' && match.status !== 'completed') {
        logger.info(`\n🚀 [MATCH UPDATE] Match ${matchId} completed - processing tournament progression`);
        logger.info(`Tournament ID: ${match.tournament_id}`);
        logger.info(`Winner Participant ID: ${updateData.winner_participant_id || 'NULL'}`);
        logger.info(`Live Score Data: ${updateData.live_score || 'NULL'}`);
        
        // Update standings/brackets based on tournament format
        const winnerId = updateData.winner_participant_id || null;
        logger.info(`\n📞 Calling processTournamentAfterMatch(tournamentId: ${match.tournament_id}, matchId: ${matchId}, winnerId: ${winnerId})`);
        
        await processTournamentAfterMatch(match.tournament_id, matchId, winnerId);
        
        logger.info(`✅ processTournamentAfterMatch completed successfully`);
        
        // Check if all tournament matches are done
        await checkAndCompleteTournament(match.tournament_id);
        
        logger.info(`========== MATCH UPDATE END ==========\n`);
      }

      return updatedMatch;
    } catch (error) {
      logger.error('Update match error:', error);
      throw error;
    }
};

/**
 * Delete match
 */
const deleteMatch = async (matchId, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is tournament organizer
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      if (!isOrganizer) {
        throw new Error('Only tournament organizer can delete matches');
      }

      // Cannot delete completed matches
      if (match.status === 'completed') {
        throw new Error('Cannot delete completed match');
      }

      await Match.cancelMatch(matchId, 'Deleted by organizer');
      logger.info(`Match deleted: ${matchId}`);

      return { success: true, message: 'Match deleted successfully' };
    } catch (error) {
      logger.error('Delete match error:', error);
      throw error;
    }
};

/**
 * Get match by ID
 */
const getMatch = async (matchId) => {
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    return match;
};

/**
 * Get all matches with filters
 */
const getMatches = async (filters) => {
    return await Match.findAll(filters);
};

/**
 * Check-in for match
 * Handles singles, doubles, and teams properly
 */
const checkIn = async (matchId, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Check if match is ready for check-in
      if (match.status !== 'scheduled') {
        throw new Error('Match is not available for check-in');
      }

      // Get tournament category
      const tournaments = await query(
        'SELECT category FROM tournaments WHERE id = ?',
        [match.tournament_id]
      );
      
      if (tournaments.length === 0) {
        throw new Error('Tournament not found');
      }
      
      const category = tournaments[0].category;

      // Find participant ID for this user
      const participantId = await getUserParticipantId(match, userId);
      if (!participantId) {
        throw new Error('You are not a participant in this match');
      }

      // Check if user already checked in
      const existingCheckin = await query(
        'SELECT * FROM match_participant_checkins WHERE match_id = ? AND user_id = ?',
        [matchId, userId]
      );
      
      if (existingCheckin.length > 0) {
        throw new Error('You have already checked in for this match');
      }

      // Record individual check-in
      await query(
        'INSERT INTO match_participant_checkins (match_id, participant_id, user_id) VALUES (?, ?, ?)',
        [matchId, participantId, userId]
      );

      // Now check if all required participants have checked in
      let allCheckedIn = false;
      
      if (category === 'singles') {
        // Singles: Just mark the participant as checked in
        await Match.checkInParticipant(matchId, participantId);
        
        // Check if both participants checked in
        const updatedMatch = await Match.findById(matchId);
        allCheckedIn = updatedMatch.participant1_checkin && updatedMatch.participant2_checkin;
        
      } else if (category === 'doubles') {
        // Doubles: Both players in the pair must check in
        const pair = await query('SELECT player1_id, player2_id FROM pairs WHERE id = ?', [participantId]);
        
        if (pair.length > 0) {
          const player1Id = pair[0].player1_id;
          const player2Id = pair[0].player2_id;
          
          // Check if both players have checked in
          const checkins = await query(
            'SELECT user_id FROM match_participant_checkins WHERE match_id = ? AND participant_id = ?',
            [matchId, participantId]
          );
          
          const checkedInUsers = checkins.map(c => c.user_id);
          const bothCheckedIn = checkedInUsers.includes(player1Id) && checkedInUsers.includes(player2Id);
          
          if (bothCheckedIn) {
            // Mark the pair as checked in
            await Match.checkInParticipant(matchId, participantId);
          }
          
          // Check if both pairs (participant1 and participant2) are fully checked in
          const updatedMatch = await Match.findById(matchId);
          allCheckedIn = updatedMatch.participant1_checkin && updatedMatch.participant2_checkin;
        }
        
      } else if (category === 'teams') {
        // Teams: Team captain checks in for the entire team
        const team = await query('SELECT captain_id FROM teams WHERE id = ?', [participantId]);
        
        if (team.length > 0 && team[0].captain_id === userId) {
          // Captain can check in for the team
          await Match.checkInParticipant(matchId, participantId);
          
          // Check if both teams checked in
          const updatedMatch = await Match.findById(matchId);
          allCheckedIn = updatedMatch.participant1_checkin && updatedMatch.participant2_checkin;
        } else {
          throw new Error('Only the team captain can check in for the team');
        }
      }

      logger.info(`User ${userId} checked in for match ${matchId} (category: ${category})`);

      const finalMatch = await Match.findById(matchId);
      return finalMatch;
      
    } catch (error) {
      logger.error('Check-in error:', error);
      throw error;
    }
};

/**
 * Start match
 */
const startMatch = async (matchId, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is organizer or referee
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      const isReferee = match.referee_id === userId;

      if (!isOrganizer && !isReferee) {
        throw new Error('Only organizer or referee can start the match');
      }

      // Check if both participants are assigned
      if (!match.participant1_id || !match.participant2_id) {
        throw new Error('Both participants must be assigned before starting the match');
      }

      // Check if both participants checked in
      if (!match.participant1_checkin || !match.participant2_checkin) {
        throw new Error('Both participants must check in before starting');
      }

      const updatedMatch = await Match.startMatch(matchId);
      logger.info(`Match started: ${matchId} by user ${userId}`);

      return updatedMatch;
    } catch (error) {
      logger.error('Start match error:', error);
      throw error;
    }
};

/**
 * Complete match
 */
const completeMatch = async (matchId, winnerId, score, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is organizer or referee
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      const isReferee = match.referee_id === userId;

      if (!isOrganizer && !isReferee) {
        throw new Error('Only organizer or referee can complete the match');
      }

      // Validate winner is a participant
      if (winnerId !== match.participant1_id && winnerId !== match.participant2_id) {
        throw new Error('Winner must be one of the match participants');
      }

      const updatedMatch = await Match.completeMatch(matchId, winnerId, score);
      logger.info(`✅ Match completed: ${matchId}, winner: ${winnerId}`);
      logger.info(`🚀 [MATCH COMPLETE] Starting tournament progression for match ${matchId}, tournament ${match.tournament_id}`);

      // Process tournament progression (standings/brackets) based on format
      await processTournamentAfterMatch(match.tournament_id, matchId, winnerId);
      
      logger.info(`✅ [MATCH COMPLETE] Tournament progression completed for match ${matchId}`);

      // Check if all tournament matches are completed
      await checkAndCompleteTournament(match.tournament_id);

      return updatedMatch;
    } catch (error) {
      logger.error('Complete match error:', error);
      throw error;
    }
};

/**
 * Cancel match
 */
const cancelMatch = async (matchId, reason, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is organizer
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      if (!isOrganizer) {
        throw new Error('Only organizer can cancel matches');
      }

      const updatedMatch = await Match.cancelMatch(matchId, reason);
      logger.info(`Match cancelled: ${matchId}, reason: ${reason}`);

      return updatedMatch;
    } catch (error) {
      logger.error('Cancel match error:', error);
      throw error;
    }
};

/**
 * Postpone match
 */
const postponeMatch = async (matchId, newDate, newTime, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is organizer
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      if (!isOrganizer) {
        throw new Error('Only organizer can postpone matches');
      }

      // Check court availability for new time
      if (match.court_id && newDate && newTime) {
        const isAvailable = await Match.isCourtAvailable(
          match.court_id,
          newDate,
          newTime,
          match.scheduled_duration,
          matchId
        );

        if (!isAvailable) {
          throw new Error('Court is not available at the new time');
        }
      }

      const updatedMatch = await Match.postponeMatch(matchId, newDate, newTime);
      logger.info(`Match postponed: ${matchId} to ${newDate} ${newTime}`);

      return updatedMatch;
    } catch (error) {
      logger.error('Postpone match error:', error);
      throw error;
    }
};

/**
 * Assign referee
 */
const assignReferee = async (matchId, refereeId, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is organizer
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      if (!isOrganizer) {
        throw new Error('Only organizer can assign referees');
      }

      // Verify referee exists and has referee role
      const referee = await query('SELECT role FROM users WHERE id = ?', [refereeId]);
      if (referee.length === 0) {
        throw new Error('Referee not found');
      }

      const updatedMatch = await Match.assignReferee(matchId, refereeId);
      logger.info(`Referee ${refereeId} assigned to match ${matchId}`);

      return updatedMatch;
    } catch (error) {
      logger.error('Assign referee error:', error);
      throw error;
    }
};

/**
 * Get matches by tournament with optional participant details
 */
const getTournamentMatches = async (tournamentId, filters = {}) => {
    const matches = await Match.getByTournament(tournamentId, filters);
    
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
 * Get all matches for a specific participant in a tournament
 */
const getParticipantMatches = async (tournamentId, participantId) => {
    console.log('getParticipantMatches called with:', { tournamentId, participantId });
    
    const matches = await query(
      `SELECT 
        m.*,
        s.name as sport_name,
        t.name as tournament_name,
        t.category as tournament_category,
        v.name as venue_name,
        
        -- Participant 1 name (try all tables, use whichever matches)
        -- First try through tournament_participants, then try direct joins
        COALESCE(
          CONCAT(u1.first_name, ' ', u1.last_name),
          pair1.name,
          tm1.name,
          CONCAT(direct_user1.first_name, ' ', direct_user1.last_name),
          direct_team1.name,
          direct_pair1.name,
          'Unknown'
        ) as participant1_name,
        
        -- Participant 2 name (try all tables, use whichever matches)
        COALESCE(
          CONCAT(u2.first_name, ' ', u2.last_name),
          pair2.name,
          tm2.name,
          CONCAT(direct_user2.first_name, ' ', direct_user2.last_name),
          direct_team2.name,
          direct_pair2.name,
          'Unknown'
        ) as participant2_name
        
       FROM matches m
       INNER JOIN tournaments t ON m.tournament_id = t.id
       INNER JOIN sports s ON t.sport_id = s.id
       LEFT JOIN venues v ON m.venue_id = v.id
       
       -- Participant 1 joins through tournament_registrations (for singles)
       LEFT JOIN tournament_registrations reg1 ON m.participant1_id = reg1.id AND t.category = 'singles'
       LEFT JOIN users u1 ON reg1.user_id = u1.id
       
       -- Participant 1 joins through tournament_participants (for doubles/teams - if used)
       LEFT JOIN tournament_participants tp1 ON m.participant1_id = tp1.id AND t.category IN ('doubles', 'teams')
       LEFT JOIN pairs pair1 ON tp1.partnership_id = pair1.id
       LEFT JOIN teams tm1 ON tp1.team_id = tm1.id
       
       -- Participant 1 direct joins (fallback if participant_id is actually user_id/team_id/pair_id)
       LEFT JOIN users direct_user1 ON m.participant1_id = direct_user1.id AND t.category = 'singles' AND u1.id IS NULL
       LEFT JOIN teams direct_team1 ON m.participant1_id = direct_team1.id AND t.category = 'teams' AND tm1.id IS NULL
       LEFT JOIN pairs direct_pair1 ON m.participant1_id = direct_pair1.id AND t.category = 'doubles' AND pair1.id IS NULL
       
       -- Participant 2 joins through tournament_registrations (for singles)
       LEFT JOIN tournament_registrations reg2 ON m.participant2_id = reg2.id AND t.category = 'singles'
       LEFT JOIN users u2 ON reg2.user_id = u2.id
       
       -- Participant 2 joins through tournament_participants (for doubles/teams - if used)
       LEFT JOIN tournament_participants tp2 ON m.participant2_id = tp2.id AND t.category IN ('doubles', 'teams')
       LEFT JOIN pairs pair2 ON tp2.partnership_id = pair2.id
       LEFT JOIN teams tm2 ON tp2.team_id = tm2.id
       
       -- Participant 2 direct joins (fallback if participant_id is actually user_id/team_id/pair_id)
       LEFT JOIN users direct_user2 ON m.participant2_id = direct_user2.id AND t.category = 'singles' AND u2.id IS NULL
       LEFT JOIN teams direct_team2 ON m.participant2_id = direct_team2.id AND t.category = 'teams' AND tm2.id IS NULL
       LEFT JOIN pairs direct_pair2 ON m.participant2_id = direct_pair2.id AND t.category = 'doubles' AND pair2.id IS NULL
       
       WHERE m.tournament_id = ?
       AND (m.participant1_id = ? OR m.participant2_id = ?)
       ORDER BY m.match_date ASC, m.match_time ASC, m.round_number ASC`,
      [tournamentId, participantId, participantId]
    );
    
    console.log('getParticipantMatches found', matches.length, 'matches');
    if (matches.length > 0) {
      console.log('First match participant names:', {
        participant1_name: matches[0].participant1_name,
        participant2_name: matches[0].participant2_name,
        participant1_id: matches[0].participant1_id,
        participant2_id: matches[0].participant2_id,
        tournament_category: matches[0].tournament_category
      });
    }
    
    return matches;
};

/**
 * Get user's matches with enhanced details
 */
const getUserMatches = async (userId, statusFilter = null) => {
    // Find all participant IDs for this user across different tournament categories
    // Singles: tournament_registrations
    // Doubles: pairs
    // Teams: teams (via team_members)
    
    const participants = await query(
      `SELECT 
        tr.id as participant_id,
        tr.tournament_id,
        'individual' as participation_type,
        tr.user_id,
        NULL as pair_id,
        NULL as team_id
       FROM tournament_registrations tr
       WHERE tr.user_id = ? AND tr.status = 'locked'
       
       UNION ALL
       
       SELECT 
        p.id as participant_id,
        p.tournament_id,
        'pair' as participation_type,
        NULL as user_id,
        p.id as pair_id,
        NULL as team_id
       FROM pairs p
       WHERE (p.player1_id = ? OR p.player2_id = ?) AND p.status = 'locked'
       
       UNION ALL
       
       SELECT 
        t.id as participant_id,
        t.tournament_id,
        'team' as participation_type,
        NULL as user_id,
        NULL as pair_id,
        t.id as team_id
       FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = ? AND tm.is_active = TRUE AND t.status = 'locked'`,
      [userId, userId, userId, userId]
    );

    const participantIds = participants.length > 0 ? participants.map(p => p.participant_id) : [];
    
    // Build the SQL query with enhanced details (includes both tournament and standalone matches)
    let sql = `
      SELECT DISTINCT
        m.*,
        COALESCE(t.name, 'Standalone Match') as tournament_name,
        COALESCE(t.sport_id, m.sport_id) as sport_id,
        COALESCE(t.category, m.category) as tournament_category,
        s.name as sport_name,
        v.name as venue_name,
        c.name as court_name,
        
        -- Participant 1 details (based on category)
        CASE 
          WHEN COALESCE(t.category, m.category) = 'singles' THEN CONCAT(u1.first_name, ' ', u1.last_name)
          WHEN COALESCE(t.category, m.category) = 'doubles' THEN p1.name
          WHEN COALESCE(t.category, m.category) = 'teams' THEN t1.name
        END as participant1_name,
        
        -- Participant 2 details (based on category)
        CASE 
          WHEN COALESCE(t.category, m.category) = 'singles' THEN CONCAT(u2.first_name, ' ', u2.last_name)
          WHEN COALESCE(t.category, m.category) = 'doubles' THEN p2.name
          WHEN COALESCE(t.category, m.category) = 'teams' THEN t2.name
        END as participant2_name,
        
        -- Referee details
        CONCAT(r.first_name, ' ', r.last_name) as referee_name,
        
        -- Winner details
        m.winner_participant_id as winner_id
        
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(t.sport_id, m.sport_id) = s.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN courts c ON m.court_id = c.id
      
      -- Participant 1 joins (tournament singles)
      LEFT JOIN tournament_registrations tr1 ON m.participant1_id = tr1.id AND t.category = 'singles'
      LEFT JOIN users u1_tournament ON tr1.user_id = u1_tournament.id
      
      -- Participant 1 joins (standalone singles - direct user_id)
      LEFT JOIN users u1_standalone ON m.participant1_id = u1_standalone.id AND m.is_standalone = TRUE AND COALESCE(m.category, 'singles') = 'singles'
      
      -- Combine participant 1 user data
      LEFT JOIN users u1 ON u1.id = COALESCE(u1_tournament.id, u1_standalone.id)
      
      -- Participant 1 joins (doubles)
      LEFT JOIN pairs p1 ON m.participant1_id = p1.id AND COALESCE(t.category, m.category) = 'doubles'
      
      -- Participant 1 joins (teams)
      LEFT JOIN teams t1 ON m.participant1_id = t1.id AND COALESCE(t.category, m.category) = 'teams'
      
      -- Participant 2 joins (tournament singles)
      LEFT JOIN tournament_registrations tr2 ON m.participant2_id = tr2.id AND t.category = 'singles'
      LEFT JOIN users u2_tournament ON tr2.user_id = u2_tournament.id
      
      -- Participant 2 joins (standalone singles - direct user_id)
      LEFT JOIN users u2_standalone ON m.participant2_id = u2_standalone.id AND m.is_standalone = TRUE AND COALESCE(m.category, 'singles') = 'singles'
      
      -- Combine participant 2 user data
      LEFT JOIN users u2 ON u2.id = COALESCE(u2_tournament.id, u2_standalone.id)
      
      -- Participant 2 joins (doubles)
      LEFT JOIN pairs p2 ON m.participant2_id = p2.id AND COALESCE(t.category, m.category) = 'doubles'
      
      -- Participant 2 joins (teams)
      LEFT JOIN teams t2 ON m.participant2_id = t2.id AND COALESCE(t.category, m.category) = 'teams'
      
      LEFT JOIN users r ON m.referee_id = r.id
      
      WHERE (
        -- Tournament matches where user is a participant
        ${participantIds.length > 0 ? '(m.participant1_id IN (?) OR m.participant2_id IN (?))' : '1=0'}
        OR
        -- Standalone matches where user is participant1 or participant2 (as user_id directly)
        (m.is_standalone = TRUE AND (m.participant1_id = ? OR m.participant2_id = ?))
      )
      AND m.is_active = TRUE`;
    
    const params = participantIds.length > 0 
      ? [participantIds, participantIds, userId, userId]
      : [userId, userId];
    
    // Add status filter if provided
    if (statusFilter) {
      sql += ' AND m.status = ?';
      params.push(statusFilter);
    }
    
    sql += ' ORDER BY m.match_date DESC, m.match_time DESC';
    
    const matches = await query(sql, params);
    
    // Enhance each match with user-specific details
    const enhancedMatches = await Promise.all(matches.map(async (match) => {
      // ========================================
      // GET ACTUAL USER IDs FOR PARTICIPANTS
      // ========================================
      const getParticipantUserIds = async (participantId, category, isStandalone) => {
        if (!participantId) return [];
        
        // SINGLES
        if (category === 'singles') {
          if (isStandalone) {
            // Standalone singles: participant_id IS the user_id
            return [participantId];
          } else {
            // Tournament singles: participant_id is tournament_registration id
            const reg = await query('SELECT user_id FROM tournament_registrations WHERE id = ?', [participantId]);
            return reg.length > 0 ? [reg[0].user_id] : [];
          }
        }
        
        // DOUBLES
        if (category === 'doubles') {
          // Both standalone and tournament: participant_id is pair_id
          const pair = await query('SELECT player1_id, player2_id FROM pairs WHERE id = ?', [participantId]);
          return pair.length > 0 ? [pair[0].player1_id, pair[0].player2_id] : [];
        }
        
        // TEAMS
        if (category === 'teams') {
          // Both standalone and tournament: participant_id is team_id
          const members = await query('SELECT user_id FROM team_members WHERE team_id = ? AND is_active = TRUE', [participantId]);
          return members.map(m => m.user_id);
        }
        
        return [];
      };
      
      // Get actual user IDs for both participants
      const participant1_user_ids = await getParticipantUserIds(
        match.participant1_id, 
        match.tournament_category, 
        match.is_standalone
      );
      
      const participant2_user_ids = await getParticipantUserIds(
        match.participant2_id, 
        match.tournament_category, 
        match.is_standalone
      );
      
      // Find which participant is the current user
      const userParticipant = participants.find(p => 
        p.participant_id === match.participant1_id || 
        p.participant_id === match.participant2_id
      );
      
      // Determine if user is participant 1 or 2
      const isParticipant1 = userParticipant?.participant_id === match.participant1_id;
      
      // Set opponent details
      const opponent = isParticipant1 ? {
        id: match.participant2_id,
        name: match.participant2_name,
        type: match.tournament_category
      } : {
        id: match.participant1_id,
        name: match.participant1_name,
        type: match.tournament_category
      };
      
      // Set user's participation details
      const myParticipation = isParticipant1 ? {
        id: match.participant1_id,
        name: match.participant1_name,
        type: match.tournament_category
      } : {
        id: match.participant2_id,
        name: match.participant2_name,
        type: match.tournament_category
      };
      
      // Determine match result for user
      let result = null;
      if (match.status === 'completed') {
        if (!match.winner_id) {
          // No winner means draw
          result = 'draw';
        } else {
          // Check if user is part of the winning participant
          let isWinner = false;
          
          if (match.tournament_category === 'singles') {
            // For singles: winner_id is tournament_registration id
            // Check if this registration belongs to current user
            const winnerReg = await query(
              'SELECT user_id FROM tournament_registrations WHERE id = ?',
              [match.winner_id]
            );
            isWinner = winnerReg.length > 0 && winnerReg[0].user_id === userId;
            
          } else if (match.tournament_category === 'doubles') {
            // For doubles: winner_id is pair id
            // Check if user is player1 or player2 in the winning pair
            const winnerPair = await query(
              'SELECT player1_id, player2_id FROM pairs WHERE id = ?',
              [match.winner_id]
            );
            isWinner = winnerPair.length > 0 && 
                      (winnerPair[0].player1_id === userId || winnerPair[0].player2_id === userId);
            
          } else if (match.tournament_category === 'teams') {
            // For teams: winner_id is team id
            // Check if user is a member of the winning team
            const winnerTeamMember = await query(
              'SELECT user_id FROM team_members WHERE team_id = ? AND user_id = ? AND is_active = TRUE',
              [match.winner_id, userId]
            );
            isWinner = winnerTeamMember.length > 0;
          }
          
          result = isWinner ? 'won' : 'lost';
        }
      }
      
      // Check if current user has checked in
      const isCheckedIn = isParticipant1 
        ? match.participant1_checkin === 1 
        : match.participant2_checkin === 1;
      
      // Check if user is team captain (for teams tournaments)
      let isCaptain = false;
      if (match.tournament_category === 'teams') {
        const participantId = isParticipant1 ? match.participant1_id : match.participant2_id;
        const teams = await query(
          'SELECT captain_id FROM teams WHERE id = ?',
          [participantId]
        );
        if (teams.length > 0) {
          isCaptain = teams[0].captain_id === userId;
        }
      }
      
      return {
        ...match,
        participant1_user_ids: participant1_user_ids,
        participant2_user_ids: participant2_user_ids,
        my_participation: myParticipation,
        opponent: opponent,
        result: result,
        participation_type: userParticipant?.participation_type,
        is_checked_in: isCheckedIn,
        is_captain: isCaptain
      };
    }));
    
    return enhancedMatches;
};

/**
 * Get user's upcoming matches (scheduled status)
 */
const getUserUpcomingMatches = async (userId) => {
    return await getUserMatches(userId, 'scheduled');
};

/**
 * Get user's completed matches
 */
const getUserCompletedMatches = async (userId) => {
    return await getUserMatches(userId, 'completed');
};

/**
 * Get match details with full participant information
 */
const getMatchDetails = async (matchId) => {
    // Get basic match info - handle both tournament and standalone matches
    const matchSql = `
      SELECT 
        m.*,
        t.name as tournament_name,
        t.category as tournament_category,
        t.format_type as tournament_format,
        COALESCE(t.sport_id, m.sport_id) as sport_id,
        COALESCE(t.match_config, m.match_config) as tournament_match_config,
        s.name as sport_name,
        v.name as venue_name,
        c.name as court_name,
        CONCAT(r.first_name, ' ', r.last_name) as referee_name,
        m.is_standalone,
        m.category as standalone_category
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(t.sport_id, m.sport_id) = s.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN courts c ON m.court_id = c.id
      LEFT JOIN users r ON m.referee_id = r.id
      WHERE m.id = ?
    `;
    
    const matches = await query(matchSql, [matchId]);
    if (matches.length === 0) {
      throw new Error('Match not found');
    }
    
    const match = matches[0];
    
    // For standalone matches, use standalone_category instead of tournament_category
    if (match.is_standalone) {
      match.tournament_category = match.standalone_category || match.category;
    }
    
    // Fetch participant details based on category
    if (match.tournament_category === 'singles') {
      // Get user details for singles
      let p1, p2;
      
      if (match.is_standalone) {
        // For standalone matches, participant IDs are user IDs directly
        const userSql = `SELECT id, id as user_id, first_name, last_name, email, phone FROM users WHERE id = ?`;
        [p1] = await query(userSql, [match.participant1_id]);
        [p2] = match.participant2_id ? await query(userSql, [match.participant2_id]) : [null];
      } else {
        // For tournament matches, use tournament_registrations
        const p1Sql = `
          SELECT tr.id, tr.user_id, u.first_name, u.last_name, u.email, u.phone
          FROM tournament_registrations tr
          JOIN users u ON tr.user_id = u.id
          WHERE tr.id = ?
        `;
        [p1] = await query(p1Sql, [match.participant1_id]);
        [p2] = match.participant2_id ? await query(p1Sql, [match.participant2_id]) : [null];
      }
      
      match.participant1_details = p1 ? { user: p1 } : null;
      match.participant2_details = p2 ? { user: p2 } : null;
      
      // Set participant names for display
      match.participant1_name = p1 ? `${p1.first_name} ${p1.last_name}` : null;
      match.participant2_name = p2 ? `${p2.first_name} ${p2.last_name}` : null;
      
    } else if (match.tournament_category === 'doubles') {
      // Get pair details with both players
      const pairSql = `
        SELECT 
          p.id, p.name, p.player1_id, p.player2_id,
          u1.first_name as p1_first_name, u1.last_name as p1_last_name, u1.email as p1_email,
          u2.first_name as p2_first_name, u2.last_name as p2_last_name, u2.email as p2_email
        FROM pairs p
        LEFT JOIN users u1 ON p.player1_id = u1.id
        LEFT JOIN users u2 ON p.player2_id = u2.id
        WHERE p.id = ?
      `;
      
      const [p1] = await query(pairSql, [match.participant1_id]);
      const [p2] = match.participant2_id ? await query(pairSql, [match.participant2_id]) : [null];
      
      if (p1) {
        match.participant1_details = {
          id: p1.id,
          name: p1.name,
          player1: {
            id: p1.player1_id,
            first_name: p1.p1_first_name,
            last_name: p1.p1_last_name,
            email: p1.p1_email
          },
          player2: {
            id: p1.player2_id,
            first_name: p1.p2_first_name,
            last_name: p1.p2_last_name,
            email: p1.p2_email
          }
        };
      }
      
      if (p2) {
        match.participant2_details = {
          id: p2.id,
          name: p2.name,
          player1: {
            id: p2.player1_id,
            first_name: p2.p1_first_name,
            last_name: p2.p1_last_name,
            email: p2.p1_email
          },
          player2: {
            id: p2.player2_id,
            first_name: p2.p2_first_name,
            last_name: p2.p2_last_name,
            email: p2.p2_email
          }
        };
      }
      
      // Set participant names for display (pair names)
      match.participant1_name = p1 ? p1.name : null;
      match.participant2_name = p2 ? p2.name : null;
      
    } else if (match.tournament_category === 'teams') {
      // Get team details with squad information
      const teamSql = `
        SELECT 
          t.id, t.name,
          tm.user_id, tm.is_captain, tm.position as default_position, tm.jersey_number as default_jersey,
          u.first_name, u.last_name, u.email,
          ms.position_label, ms.jersey_number, ms.is_starting, ms.is_captain as squad_captain
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
        LEFT JOIN users u ON tm.user_id = u.id
        LEFT JOIN match_squads ms ON ms.match_id = ? AND ms.team_id = t.id AND ms.user_id = tm.user_id
        WHERE t.id = ?
        ORDER BY ms.is_starting DESC, ms.position_label ASC, u.first_name ASC
      `;
      
      const p1Members = await query(teamSql, [matchId, match.participant1_id]);
      const p2Members = match.participant2_id ? await query(teamSql, [matchId, match.participant2_id]) : [];
      
      const formatTeamDetails = (members) => {
        if (members.length === 0) return null;
        
        const allMembers = members.filter(m => m.user_id).map(m => ({
          id: m.user_id,
          first_name: m.first_name,
          last_name: m.last_name,
          email: m.email,
          is_captain: m.is_captain,
          default_position: m.default_position,
          default_jersey: m.default_jersey,
          // Squad info (null if not in squad)
          in_squad: m.position_label !== null,
          position_label: m.position_label,
          jersey_number: m.jersey_number,
          is_starting: m.is_starting,
          squad_captain: m.squad_captain
        }));
        
        // Separate into categories
        const startingLineup = allMembers.filter(m => m.in_squad && m.is_starting);
        const substitutes = allMembers.filter(m => m.in_squad && !m.is_starting);
        const notInSquad = allMembers.filter(m => !m.in_squad);
        
        return {
          id: members[0].id,
          name: members[0].name,
          members: allMembers,
          squad: {
            starting_lineup: startingLineup,
            substitutes: substitutes,
            not_in_squad: notInSquad
          }
        };
      };
      
      match.participant1_details = formatTeamDetails(p1Members);
      match.participant2_details = formatTeamDetails(p2Members);
      
      // Set participant names for display (team names)
      match.participant1_name = match.participant1_details ? match.participant1_details.name : null;
      match.participant2_name = match.participant2_details ? match.participant2_details.name : null;
    }
    
    // Use tournament's match_config if match doesn't have its own
    if (!match.match_config && match.tournament_match_config) {
      match.match_config = match.tournament_match_config;
    }
    
    return match;
};

/**
 * Get matches where user is referee (includes both tournament and standalone matches)
 */
const getRefereeMatches = async (userId, statusFilter = null) => {
  
    let sql = `
      SELECT DISTINCT
        m.*,
        m.is_standalone,
        t.name as tournament_name,
        COALESCE(t.sport_id, m.sport_id) as sport_id,
        COALESCE(t.category, m.category) as tournament_category,
        s.name as sport_name,
        v.name as venue_name,
        c.name as court_name,
        
        -- Participant 1 details (handles both tournament and standalone)
        CASE 
          -- Tournament matches
          WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(u1.first_name, ' ', u1.last_name)
          WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN p1.name
          WHEN m.is_standalone = 0 AND t.category = 'teams' THEN t1.name
          -- Standalone matches
          WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su1.first_name, ' ', su1.last_name)
          WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp1.name
          WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st1.name
        END as participant1_name,
        
        -- Participant 2 details (handles both tournament and standalone)
        CASE 
          -- Tournament matches
          WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(u2.first_name, ' ', u2.last_name)
          WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN p2.name
          WHEN m.is_standalone = 0 AND t.category = 'teams' THEN t2.name
          -- Standalone matches
          WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su2.first_name, ' ', su2.last_name)
          WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp2.name
          WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st2.name
        END as participant2_name
        
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(t.sport_id, m.sport_id) = s.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN courts c ON m.court_id = c.id
      
      -- Tournament Participant 1 joins (singles)
      LEFT JOIN tournament_registrations tr1 ON m.participant1_id = tr1.id AND m.is_standalone = 0 AND t.category = 'singles'
      LEFT JOIN users u1 ON tr1.user_id = u1.id
      
      -- Tournament Participant 1 joins (doubles)
      LEFT JOIN pairs p1 ON m.participant1_id = p1.id AND m.is_standalone = 0 AND t.category = 'doubles'
      
      -- Tournament Participant 1 joins (teams)
      LEFT JOIN teams t1 ON m.participant1_id = t1.id AND m.is_standalone = 0 AND t.category = 'teams'
      
      -- Tournament Participant 2 joins (singles)
      LEFT JOIN tournament_registrations tr2 ON m.participant2_id = tr2.id AND m.is_standalone = 0 AND t.category = 'singles'
      LEFT JOIN users u2 ON tr2.user_id = u2.id
      
      -- Tournament Participant 2 joins (doubles)
      LEFT JOIN pairs p2 ON m.participant2_id = p2.id AND m.is_standalone = 0 AND t.category = 'doubles'
      
      -- Tournament Participant 2 joins (teams)
      LEFT JOIN teams t2 ON m.participant2_id = t2.id AND m.is_standalone = 0 AND t.category = 'teams'
      
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
      
      WHERE m.referee_id = ? AND m.is_active = TRUE`;
    
    const params = [userId];
    
    // Add status filter if provided
    if (statusFilter) {
      sql += ' AND m.status = ?';
      params.push(statusFilter);
    }
    
    sql += ' ORDER BY m.match_date DESC, m.match_time DESC, m.id DESC';
    
    const matches = await query(sql, params);
    
    logger.info(`getRefereeMatches: Found ${matches.length} matches for user ${userId}`);
    logger.info(`Standalone matches: ${matches.filter(m => m.is_standalone).length}`);
    logger.info(`Tournament matches: ${matches.filter(m => !m.is_standalone).length}`);
    
    // Log sample match data for debugging
    if (matches.length > 0) {
      logger.info(`Sample match data:`, {
        id: matches[0].id,
        is_standalone: matches[0].is_standalone,
        tournament_id: matches[0].tournament_id,
        category: matches[0].category,
        participant1_name: matches[0].participant1_name,
        participant2_name: matches[0].participant2_name
      });
    }
    
    return matches;
};

/**
 * Get upcoming matches
 */
const getUpcomingMatches = async (limit = 20) => {
    return await Match.getUpcoming(limit);
};

/**
 * Get live matches
 */
const getLiveMatches = async () => {
    return await Match.getLive();
};

/**
 * Get live matches for dashboard (with live_score and participant names)
 */
const getLiveMatchesForDashboard = async () => {
    return await Match.getLiveForDashboard();
};

/**
 * Verify match result
 */
const verifyResult = async (matchId, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is organizer
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      if (!isOrganizer) {
        throw new Error('Only organizer can verify results');
      }

      if (match.status !== 'completed') {
        throw new Error('Can only verify completed matches');
      }

      const updatedMatch = await Match.verifyResult(matchId, userId);
      logger.info(`Match result verified: ${matchId} by user ${userId}`);

      return updatedMatch;
    } catch (error) {
      logger.error('Verify result error:', error);
      throw error;
    }
};

/**
 * Record walkover
 */
const recordWalkover = async (matchId, winnerId, userId) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is organizer or referee
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      const isReferee = match.referee_id === userId;

      if (!isOrganizer && !isReferee) {
        throw new Error('Only organizer or referee can record walkover');
      }

      // Validate winner is a participant
      if (winnerId !== match.participant1_id && winnerId !== match.participant2_id) {
        throw new Error('Winner must be one of the match participants');
      }

      const updatedMatch = await Match.recordWalkover(matchId, winnerId);
      logger.info(`✅ Walkover recorded for match ${matchId}, winner: ${winnerId}`);
      logger.info(`🚀 [WALKOVER] Starting tournament progression for match ${matchId}, tournament ${match.tournament_id}`);

      // Process tournament progression (standings/brackets) based on format
      await processTournamentAfterMatch(match.tournament_id, matchId, winnerId);
      
      logger.info(`✅ [WALKOVER] Tournament progression completed for match ${matchId}`);

      return updatedMatch;
    } catch (error) {
      logger.error('Record walkover error:', error);
      throw error;
    }
};

/**
 * Get match statistics
 */
const getMatchStatistics = async (matchId) => {
    return await Match.getStatistics(matchId);
};

/**
 * Helper: Get user's participant ID in a match
 * Handles singles, doubles, and teams tournaments
 */
const getUserParticipantId = async (match, userId) => {
    // Get tournament to determine category
    const tournaments = await query(
      'SELECT category FROM tournaments WHERE id = ?',
      [match.tournament_id]
    );
    
    if (tournaments.length === 0) return null;
    const category = tournaments[0].category;
    
    // SINGLES: participant_id = tournament_registrations.id
    if (category === 'singles') {
      // Check if user is participant1
      if (match.participant1_id) {
        const p1 = await query(
          `SELECT * FROM tournament_registrations WHERE id = ? AND user_id = ?`,
          [match.participant1_id, userId]
        );
        if (p1.length > 0) return match.participant1_id;
      }

      // Check if user is participant2
      if (match.participant2_id) {
        const p2 = await query(
          `SELECT * FROM tournament_registrations WHERE id = ? AND user_id = ?`,
          [match.participant2_id, userId]
        );
        if (p2.length > 0) return match.participant2_id;
      }
    }
    
    // DOUBLES: participant_id = pairs.id
    else if (category === 'doubles') {
      // Check if user is in participant1 pair
      if (match.participant1_id) {
        const p1 = await query(
          `SELECT * FROM pairs WHERE id = ? AND (player1_id = ? OR player2_id = ?)`,
          [match.participant1_id, userId, userId]
        );
        if (p1.length > 0) return match.participant1_id;
      }

      // Check if user is in participant2 pair
      if (match.participant2_id) {
        const p2 = await query(
          `SELECT * FROM pairs WHERE id = ? AND (player1_id = ? OR player2_id = ?)`,
          [match.participant2_id, userId, userId]
        );
        if (p2.length > 0) return match.participant2_id;
      }
    }
    
    // TEAMS: participant_id = teams.id
    else if (category === 'teams') {
      // Check if user is in participant1 team
      if (match.participant1_id) {
        const p1 = await query(
          `SELECT t.* FROM teams t
           INNER JOIN team_members tm ON t.id = tm.team_id
           WHERE t.id = ? AND tm.user_id = ? AND tm.is_active = TRUE`,
          [match.participant1_id, userId]
        );
        if (p1.length > 0) return match.participant1_id;
      }

      // Check if user is in participant2 team
      if (match.participant2_id) {
        const p2 = await query(
          `SELECT t.* FROM teams t
           INNER JOIN team_members tm ON t.id = tm.team_id
           WHERE t.id = ? AND tm.user_id = ? AND tm.is_active = TRUE`,
          [match.participant2_id, userId]
        );
        if (p2.length > 0) return match.participant2_id;
      }
    }

    return null;
};

/**
 * Helper: Process tournament progression after match completion
 * Determines action based on tournament format (standings update, bracket advancement, etc.)
 */
const processTournamentAfterMatch = async (tournamentId, matchId, winnerId) => {
    try {
      logger.info(`\n========== PROCESS TOURNAMENT AFTER MATCH ==========`);
      logger.info(`🔔 [MATCH SERVICE] Processing tournament progression for match ${matchId}`);
      logger.info(`Tournament ID: ${tournamentId}`);
      logger.info(`Winner ID: ${winnerId}`);
      
      const bracketService = require('./bracketService');
      const match = await Match.findById(matchId);
      
      logger.info(`Match Details:`, {
        id: match.id,
        tournament_id: match.tournament_id,
        round_number: match.round_number,
        round_name: match.round_name,
        participant1_id: match.participant1_id,
        participant2_id: match.participant2_id,
        winner_participant_id: match.winner_participant_id,
        group_id: match.group_id,
        depends_on_match1_id: match.depends_on_match1_id,
        depends_on_match2_id: match.depends_on_match2_id
      });

      // Get tournament format
      const tournament = await Tournament.findById(tournamentId);
      
      logger.info(`📋 [MATCH SERVICE] Tournament ${tournamentId} format: ${tournament.format_type}`);

      if (tournament.format_type === 'knockout') {
        logger.info(`\n🏆 [MATCH SERVICE] KNOCKOUT FORMAT - Advancing winner to next round`);
        logger.info(`Calling bracketService.advanceWinner(matchId: ${matchId}, winnerId: ${winnerId})`);
        
        // Advance winner to next round
        await bracketService.advanceWinner(matchId, winnerId);
        
        logger.info(`✅ [MATCH SERVICE] advanceWinner completed successfully`);
      } else if (tournament.format_type === 'round_robin' || tournament.format_type === 'league') {
        logger.info(`\n📊 [MATCH SERVICE] League/Round-robin format detected - updating standings`);
        // Update standings for league/round-robin formats
        // If winnerId is null, it's a draw
        const isDraw = winnerId === null;
        logger.info(`🎯 [MATCH SERVICE] Match result: ${isDraw ? 'DRAW' : 'Winner: ' + winnerId}`);
        logger.info(`Calling bracketService.updateStandings(matchId: ${matchId}, winnerId: ${winnerId}, isDraw: ${isDraw})`);
        
        await bracketService.updateStandings(matchId, winnerId, isDraw);
      } else if (tournament.format_type === 'groups_knockout') {
        // GROUPS + KNOCKOUT: Check if this is a group stage match or knockout match
        if (match.group_id) {
          // GROUP STAGE MATCH - Update standings only
          logger.info(`\n📊 [MATCH SERVICE] Groups+Knockout: GROUP STAGE match - updating standings`);
          const isDraw = winnerId === null;
          logger.info(`🎯 [MATCH SERVICE] Match result: ${isDraw ? 'DRAW' : 'Winner: ' + winnerId}`);
          logger.info(`Calling bracketService.updateStandings(matchId: ${matchId}, winnerId: ${winnerId}, isDraw: ${isDraw})`);
          
          await bracketService.updateStandings(matchId, winnerId, isDraw);
          
          // Check if group stage is complete
          logger.info(`Checking if group stage is complete for tournament ${tournamentId}`);
          
          const isComplete = await bracketService.isGroupStageComplete(tournamentId);
          console.log("dev======", isComplete);
          
          
          if (isComplete) {
            logger.info(`Group stage complete! Automatically finalizing and advancing to knockout stage...`);
            
            try {
              const result = await bracketService.finalizeGroupStage(tournamentId);
              logger.info(`Group stage finalized successfully:`, result);
            } catch (finalizeError) {
              logger.error('Auto-finalize group stage error:', finalizeError);
              // Don't throw - this is a background operation
              // Organizer can manually finalize if automatic fails
            }
          }
        } else {
          // KNOCKOUT STAGE MATCH - Advance winner to next round
          logger.info(`\n🏆 [MATCH SERVICE] Groups+Knockout: KNOCKOUT STAGE match - advancing winner to next round`);
          logger.info(`Calling bracketService.advanceWinner(matchId: ${matchId}, winnerId: ${winnerId})`);
          
          await bracketService.advanceWinner(matchId, winnerId);
          
          logger.info(`✅ [MATCH SERVICE] advanceWinner completed successfully`);
        }
      }
    } catch (error) {
      logger.error('Update standings error:', error);
      // Don't throw - this is a background operation
    }
};

/**
 * Check if all tournament matches are completed and update tournament status
 * Also determines tournament winner based on standings
 */
const checkAndCompleteTournament = async (tournamentId) => {
  try {
    // Check if there are any pending/scheduled/in_progress matches
    const pendingMatchesSql = `
      SELECT COUNT(*) as pending_count
      FROM matches
      WHERE tournament_id = ?
        AND status IN ('pending', 'scheduled', 'in_progress')
    `;
    
    const [result] = await query(pendingMatchesSql, [tournamentId]);
    
    if (result.pending_count === 0) {
      logger.info(`🏁 [TOURNAMENT] All matches completed for tournament ${tournamentId}`);
      
      // Get tournament format to determine if we need standings-based winner
      const tournamentSql = `SELECT format_type FROM tournaments WHERE id = ?`;
      const [tournament] = await query(tournamentSql, [tournamentId]);
      
      // For league/round-robin formats, determine winner from standings
      if (tournament && (tournament.format_type === 'league' || tournament.format_type === 'round_robin')) {
        logger.info(`📊 [TOURNAMENT] League/Round-robin format - determining winner from standings`);
        
        try {
          const tournamentWinnerService = require('./tournamentWinnerService');
          const winnerResult = await tournamentWinnerService.determineAndSetWinner(tournamentId);
          
          if (winnerResult.success) {
            logger.info(`🏆 [TOURNAMENT] Winner determined: ${winnerResult.winner.participant_name}`);
            logger.info(`📊 [TOURNAMENT] Final standings: ${winnerResult.standings.length} participants`);
            
            if (winnerResult.tiebreaker) {
              logger.info(`🔍 [TOURNAMENT] Tiebreaker applied: ${winnerResult.tiebreaker.tiedCount} participants tied`);
            }
          } else {
            logger.warn(`⚠️ [TOURNAMENT] Could not determine winner: ${winnerResult.message}`);
          }
        } catch (winnerError) {
          logger.error('❌ [TOURNAMENT] Error determining winner:', winnerError);
          // Continue anyway - tournament will be marked as completed
        }
      } else {
        // For knockout/groups_knockout formats, determine winner from final match
        logger.info(`🏆 [TOURNAMENT] Knockout/Groups+Knockout format - determining winner from final match`);
        
        try {
          const tournamentWinnerService = require('./tournamentWinnerService');
          const winnerResult = await tournamentWinnerService.determineAndSetWinner(tournamentId);
          
          if (winnerResult.success) {
            logger.info(`🏆 [TOURNAMENT] Winner determined: ${winnerResult.winner.participant_name} (ID: ${winnerResult.winner.participant_id})`);
          } else {
            logger.warn(`⚠️ [TOURNAMENT] Could not determine winner: ${winnerResult.message}`);
          }
        } catch (winnerError) {
          logger.error('❌ [TOURNAMENT] Error determining winner:', winnerError);
          // Continue anyway - tournament will be marked as completed
        }
        
        // Mark tournament as completed
        const updateTournamentSql = `
          UPDATE tournaments
          SET status = 'completed',
              updated_at = NOW()
          WHERE id = ?
            AND status != 'completed'
        `;
        
        await query(updateTournamentSql, [tournamentId]);
      }
      
      logger.info(`✅ [TOURNAMENT] Tournament ${tournamentId} marked as completed`);
      
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Check and complete tournament error:', error);
    // Don't throw - this is a background operation
    return false;
  }
};

/**
 * Get available participants for a match (locked participants in tournament)
 * Based on tournament category (singles/doubles)
 */
const getAvailableParticipantsForMatch = async (matchId, userId) => {
  try {
    // Get match details
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is tournament organizer
    const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
    if (!isOrganizer) {
      throw new Error('Only tournament organizer can view available participants');
    }

    // Get tournament details
    const tournament = await Tournament.findById(match.tournament_id);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    let participants = [];

    if (tournament.category === 'singles') {
      // Get locked players from tournament_registrations
      const sql = `
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
      participants = await query(sql, [tournament.sport_id, match.tournament_id]);
      
    } else if (tournament.category === 'pairs' || tournament.category === 'doubles') {
      // Get locked pairs
      const sql = `
        SELECT 
          p.id as participant_id,
          p.name,
          p.player1_id,
          p.player2_id,
          CONCAT(u1.first_name, ' ', u1.last_name) as player1_name,
          CONCAT(u2.first_name, ' ', u2.last_name) as player2_name,
          u1.profile_image as player1_image,
          u2.profile_image as player2_image,
          p.status,
          p.locked_at
        FROM pairs p
        JOIN users u1 ON p.player1_id = u1.id
        JOIN users u2 ON p.player2_id = u2.id
        WHERE p.tournament_id = ? AND p.status = 'locked'
        ORDER BY p.locked_at
      `;
      participants = await query(sql, [match.tournament_id]);
      
    } else if (tournament.category === 'teams') {
      // Get locked teams
      const sql = `
        SELECT 
          t.id as participant_id,
          t.name,
          t.logo,
          t.captain_id,
          CONCAT(captain.first_name, ' ', captain.last_name) as captain_name,
          captain.profile_image as captain_image,
          (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND is_active = TRUE) as member_count,
          t.max_players,
          t.status,
          t.locked_at
        FROM teams t
        LEFT JOIN users captain ON t.captain_id = captain.id
        WHERE t.tournament_id = ? AND t.status = 'locked' AND t.deleted_at IS NULL
        ORDER BY t.locked_at
      `;
      participants = await query(sql, [match.tournament_id]);
    }

    return {
      match_id: matchId,
      tournament_id: match.tournament_id,
      tournament_name: match.tournament_name,
      category: tournament.category,
      current_participant1_id: match.participant1_id,
      current_participant2_id: match.participant2_id,
      current_participant1_name: match.participant1_name,
      current_participant2_name: match.participant2_name,
      available_participants: participants
    };
  } catch (error) {
    logger.error('Get available participants for match error:', error);
    throw error;
  }
};

/**
 * Update match participants
 * Allows tournament organizer to change participants in a match
 */
const updateMatchParticipants = async (matchId, participantData, userId) => {
  try {
    const { participant1_id, participant2_id } = participantData;

    // Get match details
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is tournament organizer
    const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
    if (!isOrganizer) {
      throw new Error('Only tournament organizer can update match participants');
    }

    // Validate that participants are different
    if (participant1_id && participant2_id && participant1_id === participant2_id) {
      throw new Error('Participants must be different');
    }

    // Validate that participants are locked in the tournament
    const tournament = await Tournament.findById(match.tournament_id);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Verify participants are locked
    if (participant1_id) {
      const isLocked = await verifyParticipantLocked(participant1_id, match.tournament_id, tournament.category);
      if (!isLocked) {
        throw new Error('Participant 1 is not locked in this tournament');
      }
    }

    if (participant2_id) {
      const isLocked = await verifyParticipantLocked(participant2_id, match.tournament_id, tournament.category);
      if (!isLocked) {
        throw new Error('Participant 2 is not locked in this tournament');
      }
    }

    // Update match with new participants
    const updateData = {};
    if (participant1_id !== undefined) updateData.participant1_id = participant1_id;
    if (participant2_id !== undefined) updateData.participant2_id = participant2_id;

    await Match.update(matchId, updateData);
    logger.info(`Match participants updated: ${matchId} by user ${userId}`);

    // Return updated match
    return await Match.findById(matchId);
  } catch (error) {
    logger.error('Update match participants error:', error);
    throw error;
  }
};

/**
 * Helper function to verify if a participant is locked in a tournament
 */
const verifyParticipantLocked = async (participantId, tournamentId, category) => {
  try {
    let sql;
    
    if (category === 'singles') {
      sql = `
        SELECT COUNT(*) as count
        FROM tournament_registrations
        WHERE id = ? AND tournament_id = ? AND status = 'locked'
      `;
    } else if (category === 'pairs' || category === 'doubles') {
      sql = `
        SELECT COUNT(*) as count
        FROM pairs
        WHERE id = ? AND tournament_id = ? AND status = 'locked'
      `;
    } else if (category === 'teams') {
      sql = `
        SELECT COUNT(*) as count
        FROM teams
        WHERE id = ? AND tournament_id = ? AND status = 'locked' AND deleted_at IS NULL
      `;
    } else {
      return false;
    }

    const result = await query(sql, [participantId, tournamentId]);
    return result[0].count > 0;
  } catch (error) {
    logger.error('Verify participant locked error:', error);
    return false;
  }
};

/**
 * Create rematch (duplicate match with reset scores)
 * Only for standalone matches (not tournament matches)
 */
const createRematch = async (matchId, userId) => {
  try {
    // Get original match
    const originalMatch = await Match.findById(matchId);
    
    if (!originalMatch) {
      throw new Error('Original match not found');
    }
    
    // Check if it's a tournament match
    if (originalMatch.tournament_id) {
      throw new Error('Cannot create rematch for tournament matches');
    }
    
    // Check if match is completed
    if (originalMatch.status !== 'completed') {
      throw new Error('Can only create rematch for completed matches');
    }
    
    // Get sport_id (handle legacy matches where sport_id might be NULL)
    let sportId = originalMatch.sport_id;
    
    if (!sportId) {
      // Fallback 1: Try to get from live_score.sport field
      if (originalMatch.live_score && originalMatch.live_score.sport) {
        const sportName = originalMatch.live_score.sport;
        const [sport] = await query('SELECT id FROM sports WHERE name = ?', [sportName]);
        if (sport) {
          sportId = sport.id;
          logger.info(`Sport ID resolved from live_score: ${sportName} -> ${sportId}`);
        }
      }
      
      // Fallback 2: If still no sport_id, throw error
      if (!sportId) {
        throw new Error('Cannot determine sport_id for rematch. Original match may be corrupted.');
      }
    }
    
    // Create new match with EXACT same details but reset scores
    // Follow the same structure as standalone match creation
    const newMatchData = {
      // Core match info
      is_standalone: true, // Always true for standalone matches
      sport_id: sportId,
      category: originalMatch.category,
      match_config: originalMatch.match_config,
      
      // Participants (same as original)
      participant1_id: originalMatch.participant1_id,
      participant2_id: originalMatch.participant2_id,
      
      // Match details (same as original)
      referee_id: originalMatch.referee_id || userId,
      venue_id: originalMatch.venue_id,
      court_id: originalMatch.court_id,
      estimated_duration: originalMatch.estimated_duration || 90,
      
      // Date/Time (new - current date/time)
      match_date: new Date().toISOString().split('T')[0], // Today's date
      match_time: new Date().toTimeString().split(' ')[0].substring(0, 5), // Current time
      
      // Match numbering (same as standalone matches)
      round_number: 1,
      match_number: 1,
      
      // Status and creator
      status: 'scheduled',
      created_by: userId
    };
    
    const newMatch = await createMatch(newMatchData, userId);
    
    logger.info(`Rematch created: ${newMatch.id} from original match: ${matchId}`);
    
    return newMatch;
  } catch (error) {
    logger.error('Create rematch service error:', error);
    throw error;
  }
};

/**
 * Reset match - Clear all scores, events, and timings
 * Only organizer or referee can reset a match
 */
const resetMatch = async (matchId, userId) => {
  try {
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is organizer or referee
    let isAuthorized = false;
    
    if (match.tournament_id) {
      const isOrganizer = await Tournament.isOrganizer(match.tournament_id, userId);
      isAuthorized = isOrganizer;
    }
    
    const isReferee = match.referee_id === userId;
    isAuthorized = isAuthorized || isReferee;

    if (!isAuthorized) {
      throw new Error('Only match organizer or referee can reset the match');
    }

    // Prevent resetting cancelled matches
    if (match.status === 'cancelled') {
      throw new Error('Cannot reset a cancelled match');
    }

    // Use transaction to ensure all operations succeed or fail together
    await transaction(async (connection) => {
      // Reset match data
      await connection.query(
        `UPDATE matches 
         SET status = 'scheduled',
             live_score = NULL,
             is_paused = 0,
             pause_reason = '',
             winner_participant_id = NULL,
             actual_start_time = NULL,
             actual_end_time = NULL,
             match_timer = NULL,
             total_duration_seconds = NULL,
             total_duration_formatted = NULL
         WHERE id = ?`,
        [matchId]
      );

      // Delete related data
      await connection.query('DELETE FROM match_segment_timings WHERE match_id = ?', [matchId]);
      await connection.query('DELETE FROM match_events WHERE match_id = ?', [matchId]);
      await connection.query('DELETE FROM match_timing_events WHERE match_id = ?', [matchId]);
    });

    logger.info(`Match ${matchId} reset by user ${userId}`);

    return await Match.findById(matchId);
  } catch (error) {
    logger.error('Reset match service error:', error);
    throw error;
  }
};

module.exports = {
  createMatch,
  updateMatch,
  deleteMatch,
  getMatch,
  getMatches,
  checkIn,
  startMatch,
  completeMatch,
  cancelMatch,
  postponeMatch,
  assignReferee,
  getTournamentMatches,
  getParticipantMatches,
  getUserMatches,
  getUserUpcomingMatches,
  getUserCompletedMatches,
  getMatchDetails,
  getRefereeMatches,
  getUpcomingMatches,
  getLiveMatches,
  getLiveMatchesForDashboard,
  verifyResult,
  recordWalkover,
  getMatchStatistics,
  getUserParticipantId,
  processTournamentAfterMatch,
  getAvailableParticipantsForMatch,
  updateMatchParticipants,
  createRematch,
  resetMatch
};

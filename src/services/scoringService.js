const { query, callProcedure } = require('../config/database');
const logger = require('../utils/logger');
const { validateEventType, validateEventData, getEventCategory } = require('../utils/eventTypeValidator');
const scoreCalculators = require('../utils/scoreCalculators');

/**
 * Start a match with automatic score initialization
 */
const startMatch = async (matchId, sportId) => {
    try {
      logger.info(`Starting match ${matchId} for sport ${sportId}`);
      
      // Get match info including tournament match_config
      const matchInfo = await query(
        `SELECT m.id, s.name as sport_name, t.match_config 
         FROM matches m 
         JOIN sports s ON m.sport_id = s.id 
         JOIN tournaments t ON m.tournament_id = t.id
         WHERE m.id = ?`,
        [matchId]
      );
      
      if (!matchInfo || matchInfo.length === 0) {
        throw new Error('Match not found');
      }
      
      const sportName = matchInfo[0].sport_name;
      // Use tournament's match_config instead of sport's default config
      const matchConfig = matchInfo[0].match_config ? JSON.parse(matchInfo[0].match_config) : {};
      
      // Initialize score for this sport with tournament config
      const initialScore = scoreCalculators.initializeScore(sportName, matchConfig);
      logger.info(`Initialized score for ${sportName} with config: ${JSON.stringify(matchConfig)}`);
      
      // Call stored procedure to start match
      await callProcedure('sp_start_match', [matchId, sportId]);
      
      // Update live_match_state with initialized score
      await query(
        `UPDATE live_match_state 
         SET participant1_score = ?,
             participant2_score = ?
         WHERE match_id = ?`,
        [
          JSON.stringify(initialScore),
          JSON.stringify(initialScore),
          matchId
        ]
      );
      
      // Get live state
      const liveState = await query(
        'SELECT * FROM live_match_state WHERE match_id = ?',
        [matchId]
      );

      if (!liveState || liveState.length === 0) {
        throw new Error('Failed to create live match state');
      }

      logger.info(`Match ${matchId} started successfully with automatic scoring`);
      return {
        ...liveState[0],
        initial_score: initialScore
      };
    } catch (error) {
      logger.error('Error starting match:', error);
      throw error;
    }
};

/**
 * Record a scoring event with automatic score calculation
 */
const recordEvent = async (matchId, eventType, participantId, eventData) => {
    try {
      logger.info(`Recording event ${eventType} for match ${matchId}`);
      
      // Get match info including tournament match_config
      const matchInfo = await query(
        `SELECT m.sport_id, s.name as sport_name, t.match_config 
         FROM matches m 
         JOIN sports s ON m.sport_id = s.id 
         JOIN tournaments t ON m.tournament_id = t.id
         WHERE m.id = ?`,
        [matchId]
      );
      
      if (!matchInfo || matchInfo.length === 0) {
        throw new Error('Match not found');
      }
      
      const sportName = matchInfo[0].sport_name;
      // Use tournament's match_config instead of sport's default config
      const matchConfig = matchInfo[0].match_config ? JSON.parse(matchInfo[0].match_config) : {};
      
      // Validate event type
      validateEventType(sportName, eventType);
      
      // Validate event data has required fields
      validateEventData(sportName, eventType, eventData || {});
      
      // Get current live state
      const currentState = await query(
        'SELECT * FROM live_match_state WHERE match_id = ?',
        [matchId]
      );
      
      if (!currentState || currentState.length === 0) {
        throw new Error('Match not started. Please start the match first.');
      }
      
      // Parse current scores
      const currentScore = JSON.parse(currentState[0].participant1_score || '{}');
      
      // Prepare event data with participant info
      const enrichedEventData = {
        ...eventData,
        participant_id: participantId,
        scoring_player: eventData.scoring_player || `participant_${participantId}`,
        scoring_team: eventData.scoring_team || `team_${participantId}`
      };
      
      // Calculate new score automatically with tournament config
      logger.info(`Calculating score for ${sportName}...`);
      const newScore = scoreCalculators.calculateScore(
        sportName,
        currentScore,
        eventType,
        enrichedEventData,
        matchConfig
      );
      
      logger.info(`New score calculated: ${JSON.stringify(newScore)}`);
      
      // Store event with score_before and score_after
      const eventResult = await query(
        `INSERT INTO scoring_events 
         (match_id, sport_id, event_type, participant_id, event_data, 
          period_number, score_before, score_after, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          matchId,
          matchInfo[0].sport_id,
          eventType,
          participantId,
          JSON.stringify(enrichedEventData),
          currentState[0].current_period,
          JSON.stringify(currentScore),
          JSON.stringify(newScore)
        ]
      );
      
      const eventId = eventResult.insertId;
      
      // Update live_match_state with new score
      await query(
        `UPDATE live_match_state 
         SET participant1_score = ?,
             participant2_score = ?,
             last_event_id = ?,
             last_event_time = NOW(),
             current_server = ?
         WHERE match_id = ?`,
        [
          JSON.stringify(newScore),
          JSON.stringify(newScore), // Same structure for both participants
          eventId,
          newScore.serving_player || newScore.serving_team || currentState[0].current_server,
          matchId
        ]
      );
      
      // Add to match_timeline
      const seqResult = await query(
        'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM match_timeline WHERE match_id = ?',
        [matchId]
      );
      
      const eventCategory = getEventCategory(sportName, eventType);
      const eventDescription = newScore.message || `${eventType} by participant ${participantId}`;
      
      await query(
        `INSERT INTO match_timeline 
         (match_id, sequence_number, event_time, event_category, event_type, 
          event_description, score_after, participant_id)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [
          matchId,
          seqResult[0].next_seq,
          eventCategory,
          eventType,
          eventDescription,
          JSON.stringify(newScore),
          participantId
        ]
      );
      
      // Check if match is complete
      if (newScore.match_complete) {
        await query(
          `UPDATE matches 
           SET status = 'completed',
               winner_id = ?
           WHERE id = ?`,
          [newScore.match_winner, matchId]
        );
        
        await query(
          `UPDATE live_match_state 
           SET is_live = FALSE
           WHERE match_id = ?`,
          [matchId]
        );
      }
      
      // Get updated live state
      const updatedState = await query(
        'SELECT * FROM live_match_state WHERE match_id = ?',
        [matchId]
      );

      logger.info(`Event ${eventType} recorded successfully with automatic score calculation`);
      return {
        ...updatedState[0],
        calculated_score: newScore,
        event_id: eventId
      };
    } catch (error) {
      logger.error('Error recording event:', error);
      throw error;
    }
};

/**
 * Get live match state
 */
const getLiveState = async (matchId) => {
    try {
      const liveState = await query(
        'SELECT * FROM live_match_state WHERE match_id = ?',
        [matchId]
      );

      if (!liveState || liveState.length === 0) {
        throw new Error('Match not found or not started');
      }

      return liveState[0];
    } catch (error) {
      logger.error('Error getting live state:', error);
      throw error;
    }
};

/**
 * Get match timeline
 */
const getMatchTimeline = async (matchId, limit = 50, offset = 0) => {
    try {
      const timeline = await query(
        `SELECT * FROM match_timeline 
         WHERE match_id = ? 
         ORDER BY sequence_number ASC 
         LIMIT ? OFFSET ?`,
        [matchId, limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*) as total FROM match_timeline WHERE match_id = ?',
        [matchId]
      );

      return {
        events: timeline,
        total: countResult[0].total,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error getting match timeline:', error);
      throw error;
    }
};

/**
 * Get match statistics
 */
const getMatchStatistics = async (matchId) => {
    try {
      const stats = await query(
        `SELECT ms.*, u.name as player_name
         FROM match_statistics ms
         LEFT JOIN tournament_participants tp ON ms.participant_id = tp.id
         LEFT JOIN users u ON tp.user_id = u.id
         WHERE ms.match_id = ?`,
        [matchId]
      );

      return stats;
    } catch (error) {
      logger.error('Error getting match statistics:', error);
      throw error;
    }
};

/**
 * Complete a match
 */
const completeMatch = async (matchId, winnerParticipantId, finalScore) => {
    try {
      logger.info(`Completing match ${matchId}`);
      
      // Call stored procedure to complete match
      await callProcedure('sp_complete_match_scoring', [
        matchId,
        winnerParticipantId,
        JSON.stringify(finalScore)
      ]);

      logger.info(`Match ${matchId} completed successfully`);
      return { success: true, matchId, winnerParticipantId };
    } catch (error) {
      logger.error('Error completing match:', error);
      throw error;
    }
};

/**
 * Get all live matches
 */
const getAllLiveMatches = async (sportId = null) => {
    try {
      let sql = `
        SELECT 
          m.id as match_id,
          m.sport_id,
          s.name as sport_name,
          t.name as tournament_name,
          lms.participant1_score,
          lms.participant2_score,
          lms.is_live,
          lms.last_event_time
        FROM matches m
        JOIN live_match_state lms ON m.id = lms.match_id
        JOIN sports s ON m.sport_id = s.id
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE lms.is_live = TRUE
      `;

      const params = [];
      if (sportId) {
        sql += ' AND m.sport_id = ?';
        params.push(sportId);
      }

      sql += ' ORDER BY lms.last_event_time DESC';

      const matches = await query(sql, params);
      return matches;
    } catch (error) {
      logger.error('Error getting live matches:', error);
      throw error;
    }
};

/**
 * Undo last scoring event
 */
const undoLastEvent = async (matchId) => {
    try {
      logger.info(`Undoing last event for match ${matchId}`);
      
      // Get last event
      const lastEvent = await query(
        `SELECT id, event_type, score_before, period_number 
         FROM scoring_events 
         WHERE match_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [matchId]
      );
      
      if (!lastEvent || lastEvent.length === 0) {
        throw new Error('No events to undo');
      }
      
      const eventId = lastEvent[0].id;
      const scoreBefore = lastEvent[0].score_before;
      
      // Delete the event
      await query('DELETE FROM scoring_events WHERE id = ?', [eventId]);
      
      // Get previous event for last_event_id
      const previousEvent = await query(
        `SELECT id FROM scoring_events 
         WHERE match_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [matchId]
      );
      
      const lastEventId = previousEvent.length > 0 ? previousEvent[0].id : null;
      
      // Revert live_match_state
      if (scoreBefore) {
        await query(
          `UPDATE live_match_state 
           SET last_event_id = ?,
               last_event_time = NOW()
           WHERE match_id = ?`,
          [lastEventId, matchId]
        );
      }
      
      // Mark timeline entry as undone
      await query(
        `UPDATE match_timeline 
         SET event_description = CONCAT('[UNDONE] ', event_description)
         WHERE match_id = ? 
         ORDER BY sequence_number DESC 
         LIMIT 1`,
        [matchId]
      );
      
      logger.info(`Event undone successfully for match ${matchId}`);
      
      // Return updated state
      const liveState = await getLiveState(matchId);
      return liveState;
    } catch (error) {
      logger.error('Error undoing event:', error);
      throw error;
    }
};

/**
 * Pause match
 */
const pauseMatch = async (matchId, reason = 'Manual pause') => {
    try {
      logger.info(`Pausing match ${matchId}`);
      
      await query(
        `UPDATE live_match_state 
         SET is_paused = TRUE, pause_reason = ? 
         WHERE match_id = ?`,
        [reason, matchId]
      );
      
      // Get current sequence number
      const seqResult = await query(
        'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM match_timeline WHERE match_id = ?',
        [matchId]
      );
      
      // Insert timeline event
      await query(
        `INSERT INTO match_timeline 
         (match_id, sequence_number, event_time, event_type, event_description, event_category)
         VALUES (?, ?, NOW(), 'pause', ?, 'other')`,
        [matchId, seqResult[0].next_seq, reason]
      );
      
      logger.info(`Match ${matchId} paused`);
      return { success: true, message: 'Match paused', reason };
    } catch (error) {
      logger.error('Error pausing match:', error);
      throw error;
    }
};

/**
 * Resume match
 */
const resumeMatch = async (matchId) => {
    try {
      logger.info(`Resuming match ${matchId}`);
      
      await query(
        `UPDATE live_match_state 
         SET is_paused = FALSE, pause_reason = NULL 
         WHERE match_id = ?`,
        [matchId]
      );
      
      // Get current sequence number
      const seqResult = await query(
        'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM match_timeline WHERE match_id = ?',
        [matchId]
      );
      
      // Insert timeline event
      await query(
        `INSERT INTO match_timeline 
         (match_id, sequence_number, event_time, event_type, event_description, event_category)
         VALUES (?, ?, NOW(), 'resume', 'Match resumed', 'other')`,
        [matchId, seqResult[0].next_seq]
      );
      
      logger.info(`Match ${matchId} resumed`);
      return { success: true, message: 'Match resumed' };
    } catch (error) {
      logger.error('Error resuming match:', error);
      throw error;
    }
};

module.exports = {
  startMatch,
  recordEvent,
  getLiveState,
  getMatchTimeline,
  getMatchStatistics,
  completeMatch,
  getAllLiveMatches,
  undoLastEvent,
  pauseMatch,
  resumeMatch
};

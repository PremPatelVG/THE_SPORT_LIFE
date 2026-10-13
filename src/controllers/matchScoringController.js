/**
 * Match Scoring Controller
 * Handles API requests for live match scoring
 */

const matchScoringService = require('../services/matchScoringService');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Start match
 * POST /api/v1/matches/:id/start
 * Body: { firstServer?: 'participant1' | 'participant2' }
 */
const startMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstServer } = req.body; // Optional: 'participant1' or 'participant2'
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.startMatch(id, refereeId, io, firstServer);
    
    logger.info('🎮 Controller received from service:', JSON.stringify(result));
    logger.info('🎮 Returning live_score:', JSON.stringify(result.live_score));
    
    res.json({
      success: true,
      message: result.message,
      data: result.live_score
    });
  } catch (error) {
    logger.error('Start match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Pause match
 * POST /api/v1/matches/:id/pause
 */
const pauseMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.pauseMatch(id, refereeId, reason, io);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score
      }
    });
  } catch (error) {
    logger.error('Pause match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Resume match
 * POST /api/v1/matches/:id/resume
 */
const resumeMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.resumeMatch(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score
      }
    });
  } catch (error) {
    logger.error('Resume match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add point
 * POST /api/v1/matches/:id/score/point
 */
const addPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_side, event_type = 'point', player_id } = req.body;
    const refereeId = req.user.id;
    
    // Validate required fields
    if (!participant_side) {
      return res.status(400).json({
        success: false,
        error: 'participant_side is required'
      });
    }
    
    if (!['participant1', 'participant2'].includes(participant_side)) {
      return res.status(400).json({
        success: false,
        error: 'participant_side must be participant1 or participant2'
      });
    }
    
    const io = req.app.get('io');
    const result = await matchScoringService.addPoint(
      id,
      refereeId,
      participant_side,
      event_type,
      player_id,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score,
        event: result.event
      }
    });
  } catch (error) {
    logger.error('Add point controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Confirm Match End
 * POST /api/v1/matches/:id/score/confirm-end
 */
const confirmMatchEnd = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed } = req.body;
    const refereeId = req.user.id;
    
    // Validate required fields
    if (typeof confirmed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'confirmed (boolean) is required'
      });
    }
    
    const io = req.app.get('io');
    const result = await matchScoringService.confirmMatchEnd(
      id,
      refereeId,
      confirmed,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: {
        match_complete: result.match_complete,
        winner: result.winner,
        winner_participant_id: result.winner_participant_id,
        live_score: result.live_score
      }
    });
  } catch (error) {
    logger.error('Confirm match end controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add goal (Football-specific)
 * POST /api/v1/matches/:id/score/goal
 */
const addGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_side, player_id, minute, goal_type = 'open_play', assist_player_id } = req.body;
    const refereeId = req.user.id;
    
    // Validate required fields
    if (!participant_side) {
      return res.status(400).json({
        success: false,
        error: 'participant_side is required'
      });
    }
    
    if (!['participant1', 'participant2'].includes(participant_side)) {
      return res.status(400).json({
        success: false,
        error: 'participant_side must be participant1 or participant2'
      });
    }
    
    // player_id and minute are optional for quick scoring
    // If not provided, use defaults
    const finalPlayerId = player_id || null;
    const finalMinute = minute || Math.floor(Date.now() / 1000); // Use current timestamp if not provided
    
    const io = req.app.get('io');
    const result = await matchScoringService.addGoal(
      id,
      refereeId,
      participant_side,
      finalPlayerId,
      finalMinute,
      goal_type,
      assist_player_id,
      null,  // elapsed_seconds - NOT USED, timer managed by server
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score,
        event: result.event
      }
    });
  } catch (error) {
    logger.error('Add goal controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add yellow card
 * POST /api/v1/matches/:id/score/yellow-card
 */
const addYellowCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_side, player_id, minute, reason = '' } = req.body;
    const refereeId = req.user.id;
    
    // Validate required fields
    if (!participant_side) {
      return res.status(400).json({
        success: false,
        error: 'participant_side is required'
      });
    }
    
    if (!['participant1', 'participant2'].includes(participant_side)) {
      return res.status(400).json({
        success: false,
        error: 'participant_side must be participant1 or participant2'
      });
    }
    
    // player_id and minute are optional for quick scoring
    const finalPlayerId = player_id || null;
    const finalMinute = minute || Math.floor(Date.now() / 1000);
    
    const io = req.app.get('io');
    const result = await matchScoringService.addYellowCard(
      id,
      refereeId,
      participant_side,
      finalPlayerId,
      finalMinute,
      reason,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score,
        event: result.event
      }
    });
  } catch (error) {
    logger.error('Add yellow card controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add red card
 * POST /api/v1/matches/:id/score/red-card
 */
const addRedCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_side, player_id, minute, reason = '' } = req.body;
    const refereeId = req.user.id;
    
    // Validate required fields
    if (!participant_side) {
      return res.status(400).json({
        success: false,
        error: 'participant_side is required'
      });
    }
    
    if (!['participant1', 'participant2'].includes(participant_side)) {
      return res.status(400).json({
        success: false,
        error: 'participant_side must be participant1 or participant2'
      });
    }
    
    // player_id and minute are optional for quick scoring
    const finalPlayerId = player_id || null;
    const finalMinute = minute || Math.floor(Date.now() / 1000);
    
    const io = req.app.get('io');
    const result = await matchScoringService.addRedCard(
      id,
      refereeId,
      participant_side,
      finalPlayerId,
      finalMinute,
      reason,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score,
        event: result.event
      }
    });
  } catch (error) {
    logger.error('Add red card controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Undo last point
 * POST /api/v1/matches/:id/score/undo
 */
const undoLastPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    const result = await matchScoringService.undoLastPoint(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score,
        undone_event: result.undone_event
      }
    });
  } catch (error) {
    logger.error('Undo point controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Record event
 * POST /api/v1/matches/:id/events
 */
const recordEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { event_type, participant_side, player_id, notes, score_snapshot, metadata } = req.body;
    
    // Validate required fields
    if (!event_type || !participant_side) {
      return res.status(400).json({
        success: false,
        error: 'event_type and participant_side are required'
      });
    }
    
    const eventData = {
      event_type,
      participant_side,
      player_id,
      notes,
      score_snapshot,
      metadata
    };
    
    const io = req.app.get('io');
    const result = await matchScoringService.recordEvent(id, eventData, io);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        event_id: result.event_id
      }
    });
  } catch (error) {
    logger.error('Record event controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete event
 * DELETE /api/v1/matches/:id/events/:eventId
 */
const deleteEvent = async (req, res) => {
  try {
    const { id, eventId } = req.params;
    const refereeId = req.user.id;
    
    const result = await matchScoringService.deleteEvent(eventId, id, refereeId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete event controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * End match
 * POST /api/v1/matches/:id/end
 */
const endMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    
    const result = await matchScoringService.endMatch(id, refereeId);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        winner_id: result.winner_id,
        final_score: result.final_score
      }
    });
  } catch (error) {
    logger.error('End match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get live score
 * GET /api/v1/matches/:id/live-score
 */
const getLiveScore = async (req, res) => {
  try {
    const { id } = req.params;
    
    const liveScore = await matchScoringService.getLiveScore(id);
    
    res.json({
      success: true,
      data: liveScore
    });
  } catch (error) {
    logger.error('Get live score controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get match events
 * GET /api/v1/matches/:id/events
 */
const getMatchEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const events = await matchScoringService.getMatchEvents(id, parseInt(limit));
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    logger.error('Get match events controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get score details
 * GET /api/v1/matches/:id/score-details
 */
const getScoreDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const details = await matchScoringService.getScoreDetails(id);
    
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    logger.error('Get score details controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update match timer
 * POST /api/v1/matches/:id/timer
 */
const updateMatchTimer = async (req, res) => {
  try {
    const { id } = req.params;
    const { elapsed_seconds, current_half } = req.body;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.updateMatchTimer(id, refereeId, elapsed_seconds, current_half, io);
    
    res.json({
      success: true,
      data: result.live_score
    });
  } catch (error) {
    logger.error('Update match timer controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add additional time (injury time) to current segment
 * @route POST /api/v1/matches/:id/additional-time
 * 
 * This adds time to the CURRENT segment (period/break) by extending its duration.
 * Uses match_segment_timings table for dynamic period tracking.
 * 
 * Example: Period 1 is 1 min, 15 sec remaining, referee adds 1 min
 * Result: Period 1 will now run for 1:15 total (not just 1:00)
 */
const addAdditionalTime = async (req, res) => {
  try {
    const matchId = req.params.id;
    const { additional_seconds } = req.body;

    // Validation
    if (!additional_seconds) {
      return res.status(400).json({
        success: false,
        error: 'additional_seconds is required'
      });
    }

    if (additional_seconds <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Additional seconds must be greater than 0'
      });
    }

    // Get current live score from matches table
    const matches = await db.query(
      'SELECT live_score FROM matches WHERE id = ?',
      [matchId]
    );
    
    if (!matches || matches.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    let liveScore = matches[0].live_score;
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    
    if (!liveScore) {
      return res.status(404).json({
        success: false,
        error: 'Live score not found'
      });
    }

    // Determine current segment
    const currentPeriod = liveScore.current_half || 1;
    const isOnBreak = liveScore.is_on_break || false;
    
    const segmentType = isOnBreak ? 'break' : 'half'; // or 'period' based on sport
    const segmentNumber = currentPeriod;

    // ✅ Update in match_segment_timings (dynamic table)
    const result = await db.query(
      `UPDATE match_segment_timings 
       SET additional_time_seconds = COALESCE(additional_time_seconds, 0) + ?
       WHERE match_id = ? AND segment_number = ? AND segment_type = ?`,
      [additional_seconds, matchId, segmentNumber, segmentType]
    );

    // If segment doesn't exist yet, create it
    if (result.affectedRows === 0) {
      await db.query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, additional_time_seconds, status)
         VALUES (?, ?, ?, NOW(), ?, 'in_progress')`,
        [matchId, segmentType, segmentNumber, additional_seconds]
      );
    }

    // Get updated segment info
    const segments = await db.query(
      `SELECT additional_time_seconds 
       FROM match_segment_timings 
       WHERE match_id = ? AND segment_number = ? AND segment_type = ?`,
      [matchId, segmentNumber, segmentType]
    );

    const totalSegmentAdditionalTime = segments[0]?.additional_time_seconds || additional_seconds;

    // Get updated live score
    const updatedMatches = await db.query(
      'SELECT live_score FROM matches WHERE id = ?',
      [matchId]
    );
    let updatedLiveScore = updatedMatches[0].live_score;
    if (typeof updatedLiveScore === 'string') {
      updatedLiveScore = JSON.parse(updatedLiveScore);
    }

    // Emit WebSocket event to all viewers
    const io = req.app.get('io');
    if (io) {
      io.to(`match_${matchId}`).emit('additional_time_added', {
        matchId,
        segmentType,
        segmentNumber,
        period: currentPeriod,
        isOnBreak,
        additionalSeconds: additional_seconds,
        totalSegmentAdditionalTime,
        liveScore: updatedLiveScore
      });
    }

    logger.info(`⏱️ Additional time added: +${additional_seconds}s to ${segmentType} ${segmentNumber} (Period ${currentPeriod}) for Match ${matchId}`);

    res.json({
      success: true,
      message: `Additional time added to ${segmentType} ${segmentNumber}`,
      data: {
        live_score: updatedLiveScore,
        segment_type: segmentType,
        segment_number: segmentNumber,
        additional_seconds,
        total_segment_additional_time: totalSegmentAdditionalTime
      }
    });
  } catch (error) {
    logger.error('Error adding additional time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add additional time'
    });
  }
};

/**
 * Record penalty kick
 * POST /api/v1/matches/:id/penalty-kick
 */
const recordPenaltyKick = async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_side, player_id, result } = req.body;
    const refereeId = req.user.id;
    
    // Validate input
    if (!participant_side || !['participant1', 'participant2'].includes(participant_side)) {
      return res.status(400).json({
        success: false,
        error: 'Valid participant_side is required (participant1 or participant2)'
      });
    }
    
    if (!result || !['scored', 'missed', 'saved'].includes(result)) {
      return res.status(400).json({
        success: false,
        error: 'Valid result is required (scored, missed, or saved)'
      });
    }
    
    if (!player_id) {
      return res.status(400).json({
        success: false,
        error: 'player_id is required'
      });
    }
    
    const io = req.app.get('io');
    const response = await matchScoringService.recordPenaltyKick(
      id,
      refereeId,
      participant_side,
      player_id,
      result,
      io
    );
    
    res.json({
      success: true,
      message: response.message,
      data: {
        live_score: response.live_score,
        match_complete: response.match_complete,
        winner: response.winner,
        event: response.event
      }
    });
  } catch (error) {
    logger.error('Record penalty kick controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Toggle server (Racket sports)
 * POST /api/v1/matches/:id/score/toggle-server
 * @body {number} player_id - Optional player ID for doubles matches
 * @body {boolean} keep_same_pair - If true, only change player within same pair
 */
const toggleServer = async (req, res) => {
  try {
    const { id } = req.params;
    const { player_id, keep_same_pair } = req.body;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.toggleServer(id, refereeId, io, player_id, keep_same_pair);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        live_score: result.live_score,
        server: result.server
      }
    });
  } catch (error) {
    logger.error('Toggle server controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * End current half (1st or 2nd)
 * POST /api/v1/matches/:id/end-half
 */
const endHalf = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    const result = await matchScoringService.endHalf(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('End half controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start break period
 * POST /api/v1/matches/:id/start-break
 */
const startBreak = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    const result = await matchScoringService.startBreak(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('Start break controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * End break period
 * POST /api/v1/matches/:id/end-break
 */
const endBreak = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    const result = await matchScoringService.endBreak(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('End break controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start second half
 * POST /api/v1/matches/:id/start-second-half
 */
const startSecondHalf = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    const result = await matchScoringService.startSecondHalf(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('Start second half controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start penalty shootout
 * POST /api/v1/matches/:id/start-penalty-shootout
 */
const startPenaltyShootout = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    const result = await matchScoringService.startPenaltyShootout(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    console.error('Start penalty shootout error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start penalty shootout'
    });
  }
};

/**
 * Declare match as draw
 * POST /api/v1/matches/:id/declare-draw
 */
const declareMatchDraw = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    const result = await matchScoringService.declareMatchDraw(id, refereeId, io);
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    console.error('Declare draw error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to declare draw'
    });
  }
};

/**
 * Start extra time
 * POST /api/v1/matches/:id/start-extra-time
 * Body: { extraTimeMinutes: number }
 */
const startExtraTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { extraTimeMinutes } = req.body;
    const refereeId = req.user.id;
    const io = req.app.get('io');
    
    if (!extraTimeMinutes || extraTimeMinutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Extra time duration is required and must be greater than 0'
      });
    }
    
    const result = await matchScoringService.startExtraTime(id, refereeId, extraTimeMinutes, io);
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    console.error('Start extra time error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start extra time'
    });
  }
};

/**
 * Initialize Extra Time with user-provided configuration
 * POST /api/v1/matches/:id/extra-time/initialize
 * @body {number} half_duration - Duration of each half in minutes (e.g., 15)
 * @body {number} break_duration - Duration of break in minutes (e.g., 5)
 */
const initializeExtraTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { half_duration, break_duration } = req.body;
    const refereeId = req.user.id;
    
    // Validate input
    if (!half_duration || !break_duration) {
      return res.status(400).json({
        success: false,
        error: 'Both half_duration and break_duration are required'
      });
    }
    
    const io = req.app.get('io');
    const result = await matchScoringService.initializeExtraTime(
      id,
      refereeId,
      half_duration,
      break_duration,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('Initialize extra time controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start Extra Time 1st Half
 * POST /api/v1/matches/:id/extra-time/start-first-half
 */
const startExtraTimeFirstHalf = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.startExtraTimeFirstHalf(
      id,
      refereeId,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('Start extra time first half controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * End Extra Time 1st Half
 * POST /api/v1/matches/:id/extra-time/end-first-half
 */
const endExtraTimeFirstHalf = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.endExtraTimeFirstHalf(
      id,
      refereeId,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('End extra time first half controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start Extra Time Break
 * POST /api/v1/matches/:id/extra-time/start-break
 */
const startExtraTimeBreak = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.startExtraTimeBreak(
      id,
      refereeId,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('Start extra time break controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start Extra Time 2nd Half
 * POST /api/v1/matches/:id/extra-time/start-second-half
 */
const startExtraTimeSecondHalf = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.startExtraTimeSecondHalf(
      id,
      refereeId,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: result.liveScore
    });
  } catch (error) {
    logger.error('Start extra time second half controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * End Extra Time 2nd Half
 * POST /api/v1/matches/:id/extra-time/end-second-half
 */
const endExtraTimeSecondHalf = async (req, res) => {
  try {
    const { id } = req.params;
    const refereeId = req.user.id;
    
    const io = req.app.get('io');
    const result = await matchScoringService.endExtraTimeSecondHalf(
      id,
      refereeId,
      io
    );
    
    res.json({
      success: true,
      message: result.message,
      data: {
        liveScore: result.liveScore,
        match_complete: result.match_complete
      }
    });
  } catch (error) {
    logger.error('End extra time second half controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  startMatch,
  pauseMatch,
  resumeMatch,
  addPoint,
  confirmMatchEnd,
  addGoal,
  addYellowCard,
  addRedCard,
  undoLastPoint,
  recordEvent,
  deleteEvent,
  endMatch,
  getLiveScore,
  getMatchEvents,
  getScoreDetails,
  updateMatchTimer,
  addAdditionalTime,
  recordPenaltyKick,
  toggleServer,
  endHalf,
  startBreak,
  endBreak,
  startSecondHalf,
  declareMatchDraw,
  startExtraTime,
  startPenaltyShootout,
  // Extra Time controllers
  initializeExtraTime,
  startExtraTimeFirstHalf,
  endExtraTimeFirstHalf,
  startExtraTimeBreak,
  startExtraTimeSecondHalf,
  endExtraTimeSecondHalf
};

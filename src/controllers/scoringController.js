const scoringService = require('../services/scoringService');
const logger = require('../utils/logger');
const { broadcastMatchStarted, broadcastMatchUpdate, broadcastMatchCompleted } = require('../websocket/scoringSocket');

  /**
   * Start a match
   * POST /api/v1/scoring/:matchId/start
   */
const startMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { sport_id } = req.body;

    if (!sport_id) {
      return res.status(400).json({
        success: false,
        error: 'sport_id is required'
      });
    }

    const result = await scoringService.startMatch(matchId, sport_id);

    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
      broadcastMatchStarted(io, matchId, result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Match started successfully'
    });
  } catch (error) {
    logger.error('Start match error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Record a scoring event
 * POST /api/v1/scoring/:matchId/events
 */
const recordEvent = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { event_type, player_id, team_id, event_data } = req.body;

    if (!event_type) {
      return res.status(400).json({
        success: false,
        error: 'event_type is required'
      });
    }

    const participantId = player_id || team_id;
    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: 'player_id or team_id is required'
      });
    }

    const result = await scoringService.recordEvent(
      matchId,
      event_type,
      participantId,
      event_data || {}
    );

    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
      broadcastMatchUpdate(io, matchId, event_type, result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Event recorded successfully'
    });
  } catch (error) {
    logger.error('Record event error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get live match state
 * GET /api/v1/scoring/:matchId/live
 */
const getLiveState = async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await scoringService.getLiveState(matchId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get live state error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get match timeline
 * GET /api/v1/scoring/:matchId/timeline
 */
const getTimeline = async (req, res) => {
  try {
    const { matchId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await scoringService.getMatchTimeline(matchId, limit, offset);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get match statistics
 * GET /api/v1/scoring/:matchId/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await scoringService.getMatchStatistics(matchId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Complete a match
 * POST /api/v1/scoring/:matchId/complete
 */
const completeMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { winner_participant_id, final_score } = req.body;

    if (!winner_participant_id || !final_score) {
      return res.status(400).json({
        success: false,
        error: 'winner_participant_id and final_score are required'
      });
    }

    const result = await scoringService.completeMatch(
      matchId,
      winner_participant_id,
      final_score
    );

    // Broadcast
    const io = req.app.get('io');
    if (io) {
      broadcastMatchCompleted(io, matchId, winner_participant_id, final_score);
    }

    res.json({
      success: true,
      data: result,
      message: 'Match completed successfully'
    });
  } catch (error) {
    logger.error('Complete match error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all live matches
 * GET /api/v1/scoring/live
 */
const getAllLive = async (req, res) => {
  try {
    const sportId = req.query.sport_id ? parseInt(req.query.sport_id) : null;
    const result = await scoringService.getAllLiveMatches(sportId);

    res.json({
      success: true,
      data: result,
      total: result.length
    });
  } catch (error) {
    logger.error('Get all live matches error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
/**
 * Undo last event
 * POST /api/v1/scoring/:matchId/undo
 */
const undoLastEvent = async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await scoringService.undoLastEvent(matchId);

    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
      broadcastMatchUpdate(io, matchId, 'undo', result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Last event undone successfully'
    });
  } catch (error) {
    logger.error('Undo event error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Pause match
 * POST /api/v1/scoring/:matchId/pause
 */
const pauseMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { reason } = req.body;
    
    const result = await scoringService.pauseMatch(matchId, reason);

    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
      broadcastMatchUpdate(io, matchId, 'pause', result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Pause match error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Resume match
 * POST /api/v1/scoring/:matchId/resume
 */
const resumeMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await scoringService.resumeMatch(matchId);

    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
      broadcastMatchUpdate(io, matchId, 'resume', result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Resume match error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  startMatch,
  recordEvent,
  getLiveState,
  getTimeline,
  getStatistics,
  completeMatch,
  getAllLive,
  undoLastEvent,
  pauseMatch,
  resumeMatch
};

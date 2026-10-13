const matchService = require('../services/matchService');
const logger = require('../utils/logger');

  /**
   * Create match
   * POST /api/v1/matches
   */
const createMatch = async (req, res) => {
  try {
    const match = await matchService.createMatch(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: match
    });
  } catch (error) {
    logger.error('Create match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all matches
 * GET /api/v1/matches
 */
const getMatches = async (req, res) => {
  try {
    const filters = {
      tournament_id: req.query.tournament_id,
      venue_id: req.query.venue_id,
      court_id: req.query.court_id,
      status: req.query.status,
      match_date: req.query.match_date,
      round_number: req.query.round_number,
      participant_id: req.query.participant_id,
      referee_id: req.query.referee_id,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const matches = await matchService.getMatches(filters);
    
    res.json({
      success: true,
      data: matches,
      pagination: {
        limit: parseInt(filters.limit),
        offset: parseInt(filters.offset),
        total: matches.length
      }
    });
  } catch (error) {
    logger.error('Get matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches'
    });
  }
}

/**
 * Get match by ID
 * GET /api/v1/matches/:id
 */
const getMatch = async (req, res) => {
  try {
    const match = await matchService.getMatch(req.params.id);
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    logger.error('Get match controller error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Update match
 * PUT /api/v1/matches/:id
 */
const updateMatch = async (req, res) => {
  try {
    const match = await matchService.updateMatch(
      req.params.id,
      req.body,
      req.user.id
    );
    
    // If match status is being set to completed, broadcast WebSocket event
    if (req.body.status === 'completed') {
      const liveScore = req.body.live_score 
        ? (typeof req.body.live_score === 'string' 
            ? JSON.parse(req.body.live_score) 
            : req.body.live_score)
        : null;
      
      // Broadcast match completion to all connected clients (same format as automatic completion)
      if (req.io) {
        req.io.of('/scoring').to(`match_${req.params.id}`).emit('match_completed', {
          matchId: req.params.id,
          status: 'completed',
          winner_participant_id: req.body.winner_participant_id,
          participant1_name: match.participant1_name,
          participant2_name: match.participant2_name,
          liveScore: liveScore,
          timestamp: new Date().toISOString()
        });
        
        logger.info(`Match ${req.params.id} completed - WebSocket event broadcast to all clients`);
      }
    }
    
    res.json({
      success: true,
      message: 'Match updated successfully',
      data: match
    });
  } catch (error) {
    logger.error('Update match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Delete match
 * DELETE /api/v1/matches/:id
 */
const deleteMatch = async (req, res) => {
  try {
    const result = await matchService.deleteMatch(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Check-in for match
 * POST /api/v1/matches/:id/check-in
 */
const checkIn = async (req, res) => {
  try {
    const match = await matchService.checkIn(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Checked in successfully',
      data: match
    });
  } catch (error) {
    logger.error('Check-in controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Start match
 * POST /api/v1/matches/:id/start
 */
const startMatch = async (req, res) => {
  try {
    const match = await matchService.startMatch(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Match started successfully',
      data: match
    });
  } catch (error) {
    logger.error('Start match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Complete match
 * POST /api/v1/matches/:id/complete
 */
const completeMatch = async (req, res) => {
  try {
    const { winner_id, score } = req.body;
    const match = await matchService.completeMatch(
      req.params.id,
      winner_id,
      score,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Match completed successfully',
      data: match
    });
  } catch (error) {
    logger.error('Complete match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Cancel match
 * POST /api/v1/matches/:id/cancel
 */
const cancelMatch = async (req, res) => {
  try {
    const { reason } = req.body;
    const match = await matchService.cancelMatch(
      req.params.id,
      reason,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Match cancelled successfully',
      data: match
    });
  } catch (error) {
    logger.error('Cancel match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Postpone match
 * POST /api/v1/matches/:id/postpone
 */
const postponeMatch = async (req, res) => {
  try {
    const { new_date, new_time } = req.body;
    const match = await matchService.postponeMatch(
      req.params.id,
      new_date,
      new_time,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Match postponed successfully',
      data: match
    });
  } catch (error) {
    logger.error('Postpone match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Assign referee
 * POST /api/v1/matches/:id/assign-referee
 */
const assignReferee = async (req, res) => {
  try {
    const { referee_id } = req.body;
    const match = await matchService.assignReferee(
      req.params.id,
      referee_id,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Referee assigned successfully',
      data: match
    });
  } catch (error) {
    logger.error('Assign referee controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get my matches
 * GET /api/v1/matches/my-matches
 */
const getMyMatches = async (req, res) => {
  try {
    const matches = await matchService.getUserMatches(req.user.id);
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get my matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches'
    });
  }
}

/**
 * Get my upcoming matches
 * GET /api/v1/matches/my/upcoming
 */
const getMyUpcomingMatches = async (req, res) => {
  try {
    const matches = await matchService.getUserUpcomingMatches(req.user.id);
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get my upcoming matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming matches'
    });
  }
}

/**
 * Get my completed matches
 * GET /api/v1/matches/my/completed
 */
const getMyCompletedMatches = async (req, res) => {
  try {
    const matches = await matchService.getUserCompletedMatches(req.user.id);
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get my completed matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completed matches'
    });
  }
}

/**
 * Get upcoming matches
 * GET /api/v1/matches/upcoming
 */
const getUpcomingMatches = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const matches = await matchService.getUpcomingMatches(limit);
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get upcoming matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming matches'
    });
  }
}

/**
 * Get live matches
 * GET /api/v1/matches/live
 */
const getLiveMatches = async (req, res) => {
  try {
    const matches = await matchService.getLiveMatches();
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get live matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live matches'
    });
  }
};

/**
 * Get live matches for dashboard (with live_score and participant names)
 * GET /api/v1/matches/dashboard/live
 */
const getLiveMatchesForDashboard = async (req, res) => {
  try {
    const matches = await matchService.getLiveMatchesForDashboard();
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get live matches for dashboard controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live matches for dashboard'
    });
  }
};

/**
 * Get my referee matches
 * GET /api/v1/matches/my/referee-matches
 */
const getMyRefereeMatches = async (req, res) => {
  try {
    const statusFilter = req.query.status || null;
    const matches = await matchService.getRefereeMatches(req.user.id, statusFilter);
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get my referee matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch referee matches'
    });
  }
}

/**
 * Get match details with full participant info
 * GET /api/v1/matches/:id/details
 */
const getMatchDetailsController = async (req, res) => {
  try {
    const match = await matchService.getMatchDetails(req.params.id);
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    logger.error('Get match details controller error:', error);
    res.status(error.message === 'Match not found' ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to fetch match details'
    });
  }
}

/**
 * Verify match result
 * POST /api/v1/matches/:id/verify
 */
const verifyResult = async (req, res) => {
  try {
    const match = await matchService.verifyResult(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Match result verified successfully',
      data: match
    });
  } catch (error) {
    logger.error('Verify result controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Record walkover
 * POST /api/v1/matches/:id/walkover
 */
const recordWalkover = async (req, res) => {
  try {
    const { winner_id } = req.body;
    const match = await matchService.recordWalkover(
      req.params.id,
      winner_id,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Walkover recorded successfully',
      data: match
    });
  } catch (error) {
    logger.error('Record walkover controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get match statistics
 * GET /api/v1/matches/:id/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const statistics = await matchService.getMatchStatistics(req.params.id);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get statistics controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
}

/**
 * Get tournament matches
 * GET /api/v1/matches/tournament/:tournamentId
 */
const getTournamentMatches = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      round_number: req.query.round_number,
      limit: req.query.limit || 5000,
      offset: req.query.offset || 0,
      include_participants: req.query.include_participants
    };

    const matches = await matchService.getTournamentMatches(
      req.params.tournamentId,
      filters
    );
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get tournament matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament matches'
    });
  }
}

/**
 * Get participant matches
 * GET /api/v1/matches/tournament/:tournamentId/participant/:participantId
 */
const getParticipantMatches = async (req, res) => {
  try {
    const { tournamentId, participantId } = req.params;
    
    const matches = await matchService.getParticipantMatches(
      tournamentId,
      participantId
    );
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get participant matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participant matches'
    });
  }
};

/**
 * Get available participants for a match
 * GET /api/v1/matches/:id/available-participants
 */
const getAvailableParticipants = async (req, res) => {
  try {
    const data = await matchService.getAvailableParticipantsForMatch(
      req.params.id,
      req.user.id
    );
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Get available participants controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update match participants
 * PUT /api/v1/matches/:id/participants
 */
const updateMatchParticipants = async (req, res) => {
  try {
    const match = await matchService.updateMatchParticipants(
      req.params.id,
      req.body,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Match participants updated successfully',
      data: match
    });
  } catch (error) {
    logger.error('Update match participants controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create rematch (duplicate match with reset scores)
 * POST /api/v1/matches/:id/rematch
 */
const createRematch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const newMatch = await matchService.createRematch(id, userId);
    
    res.status(201).json({
      success: true,
      message: 'Rematch created successfully',
      data: {
        match: newMatch
      }
    });
  } catch (error) {
    logger.error('Create rematch controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reset match - Clear all scores, events, and timings
 * POST /api/v1/matches/:id/reset
 */
const resetMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const match = await matchService.resetMatch(id, userId);
    
    res.json({
      success: true,
      message: 'Match reset successfully. You can now start fresh scoring.',
      data: match
    });
  } catch (error) {
    logger.error('Reset match controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createMatch,
  getMatches,
  getMatch,
  updateMatch,
  deleteMatch,
  checkIn,
  startMatch,
  completeMatch,
  cancelMatch,
  postponeMatch,
  assignReferee,
  getMyMatches,
  getMyUpcomingMatches,
  getMyCompletedMatches,
  getMyRefereeMatches,
  getMatchDetailsController,
  getUpcomingMatches,
  getLiveMatches,
  getLiveMatchesForDashboard,
  verifyResult,
  recordWalkover,
  getStatistics,
  getTournamentMatches,
  getParticipantMatches,
  getAvailableParticipants,
  updateMatchParticipants,
  createRematch,
  resetMatch
};

const MatchTiming = require('../models/MatchTiming');

/**
 * Match Timing Controller
 * Handles HTTP requests for match timing operations
 * This is a NEW controller that doesn't affect existing functionality
 */

/**
 * Start match timing
 * POST /api/v1/matches/:id/timing/start
 */
const startMatchTiming = async (req, res) => {
  try {
    const matchId = req.params.id;
    
    const match = await MatchTiming.startMatch(matchId);
    
    res.json({
      success: true,
      message: 'Match timing started',
      data: {
        match_id: match.id,
        actual_start_time: match.actual_start_time,
        status: match.status
      }
    });
  } catch (error) {
    console.error('Error starting match timing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start match timing'
    });
  }
};

/**
 * End match timing
 * POST /api/v1/matches/:id/timing/end
 */
const endMatchTiming = async (req, res) => {
  try {
    const matchId = req.params.id;
    
    const match = await MatchTiming.endMatch(matchId);
    
    // ❌ REMOVED: Standings update is already handled by matchScoringService
    // when the match completes via scoring. No need to duplicate here.
    // The timing endpoint is just for recording start/end times.
    
    res.json({
      success: true,
      message: 'Match timing ended',
      data: {
        match_id: match.id,
        actual_start_time: match.actual_start_time,
        actual_end_time: match.actual_end_time,
        total_duration_seconds: match.total_duration_seconds,
        total_duration_formatted: match.total_duration_formatted,
        status: match.status
      }
    });
  } catch (error) {
    console.error('Error ending match timing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end match timing'
    });
  }
};

/**
 * Start a segment (set/game/half)
 * POST /api/v1/matches/:id/segments/start
 * Body: { segment_type: 'set'|'game'|'half', segment_number: 1 }
 */
const startSegment = async (req, res) => {
  try {
    const matchId = req.params.id;
    const { segment_type, segment_number } = req.body;
    console.log("dev value======",matchId,segment_type,segment_number );
    
    
    // Validation
    if (!segment_type || !segment_number) {
      return res.status(400).json({
        success: false,
        error: 'segment_type and segment_number are required'
      });
    }
    
    const validTypes = ['set', 'game', 'half', 'period', 'quarter'];
    if (!validTypes.includes(segment_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid segment_type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    const segment = await MatchTiming.startSegment(matchId, segment_type, segment_number);
    
    res.json({
      success: true,
      message: 'Segment started',
      data: {
        segment_id: segment.id,
        match_id: segment.match_id,
        segment_type: segment.segment_type,
        segment_number: segment.segment_number,
        start_time: segment.start_time,
        status: segment.status
      }
    });
  } catch (error) {
    console.error('Error starting segment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start segment'
    });
  }
};

/**
 * End a segment (set/game/half)
 * POST /api/v1/matches/:id/segments/end
 * Body: { segment_type: 'set'|'game'|'half', segment_number: 1 }
 */
const endSegment = async (req, res) => {
  try {
    const matchId = req.params.id;
    const { segment_type, segment_number } = req.body;
    console.log("dev value end======",matchId,segment_type,segment_number );
    
    // Validation
    if (!segment_type || !segment_number) {
      return res.status(400).json({
        success: false,
        error: 'segment_type and segment_number are required'
      });
    }
    
    const segment = await MatchTiming.endSegment(matchId, segment_type, segment_number);
    
    res.json({
      success: true,
      message: 'Segment ended',
      data: {
        segment_id: segment.id,
        match_id: segment.match_id,
        segment_type: segment.segment_type,
        segment_number: segment.segment_number,
        start_time: segment.start_time,
        end_time: segment.end_time,
        duration_seconds: segment.duration_seconds,
        duration_formatted: segment.duration_formatted,
        status: segment.status
      }
    });
  } catch (error) {
    console.error('Error ending segment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end segment'
    });
  }
};

/**
 * Add injury/additional time to a segment
 * POST /api/v1/matches/:id/segments/injury-time
 * Body: { segment_type: 'half', segment_number: 1, additional_minutes: 2.5 }
 */
const addInjuryTime = async (req, res) => {
  try {
    const matchId = req.params.id;
    const { segment_type, segment_number, additional_minutes } = req.body;
    
    // Validation
    if (!segment_type || !segment_number || additional_minutes === undefined) {
      return res.status(400).json({
        success: false,
        error: 'segment_type, segment_number, and additional_minutes are required'
      });
    }
    
    // Convert minutes to seconds
    const additionalSeconds = Math.round(additional_minutes * 60);
    
    const segment = await MatchTiming.addInjuryTime(
      matchId, 
      segment_type, 
      segment_number, 
      additionalSeconds
    );
    
    res.json({
      success: true,
      message: 'Injury time added',
      data: {
        segment_id: segment.id,
        match_id: segment.match_id,
        segment_type: segment.segment_type,
        segment_number: segment.segment_number,
        additional_time_seconds: segment.additional_time_seconds,
        additional_time_minutes: (segment.additional_time_seconds / 60).toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error adding injury time:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add injury time'
    });
  }
};

/**
 * Get match timing summary
 * GET /api/v1/matches/:id/timing
 */
const getMatchTimingSummary = async (req, res) => {
  try {
    const matchId = req.params.id;
    
    const summary = await MatchTiming.getMatchTimingSummary(matchId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting match timing summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get match timing summary'
    });
  }
};

/**
 * Get segment timing
 * GET /api/v1/matches/:id/segments/:type/:number
 */
const getSegmentTiming = async (req, res) => {
  try {
    const matchId = req.params.id;
    const segmentType = req.params.type;
    const segmentNumber = parseInt(req.params.number);
    
    const segment = await MatchTiming.getSegmentTiming(matchId, segmentType, segmentNumber);
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }
    
    res.json({
      success: true,
      data: segment
    });
  } catch (error) {
    console.error('Error getting segment timing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get segment timing'
    });
  }
};

/**
 * Get match timing events (audit trail)
 * GET /api/v1/matches/:id/timing/events
 */
const getMatchTimingEvents = async (req, res) => {
  try {
    const matchId = req.params.id;
    
    const events = await MatchTiming.getMatchTimingEvents(matchId);
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error getting timing events:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get timing events'
    });
  }
};

/**
 * Pause a segment
 * POST /api/v1/matches/:id/segments/pause
 * Body: { segment_type: 'set', segment_number: 1, notes: 'Medical timeout' }
 */
const pauseSegment = async (req, res) => {
  try {
    const matchId = req.params.id;
    const { segment_type, segment_number, notes } = req.body;
    
    if (!segment_type || !segment_number) {
      return res.status(400).json({
        success: false,
        error: 'segment_type and segment_number are required'
      });
    }
    
    const result = await MatchTiming.pauseSegment(matchId, segment_type, segment_number, notes);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error pausing segment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pause segment'
    });
  }
};

/**
 * Resume a segment
 * POST /api/v1/matches/:id/segments/resume
 * Body: { segment_type: 'set', segment_number: 1 }
 */
const resumeSegment = async (req, res) => {
  try {
    const matchId = req.params.id;
    const { segment_type, segment_number } = req.body;
    
    if (!segment_type || !segment_number) {
      return res.status(400).json({
        success: false,
        error: 'segment_type and segment_number are required'
      });
    }
    
    const result = await MatchTiming.resumeSegment(matchId, segment_type, segment_number);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error resuming segment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resume segment'
    });
  }
};

module.exports = {
  startMatchTiming,
  endMatchTiming,
  startSegment,
  endSegment,
  addInjuryTime,
  getMatchTimingSummary,
  getSegmentTiming,
  getMatchTimingEvents,
  pauseSegment,
  resumeSegment
};

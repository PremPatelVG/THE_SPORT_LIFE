const { query, callProcedure } = require('../config/database');

/**
 * MatchTiming Model
 * Handles match timing operations (start/end times, segment timings)
 * This is a NEW module that doesn't affect existing functionality
 */

/**
 * Start match timing
 * Records actual start time and updates match status
 */
const startMatch = async (matchId) => {
  try {
    // Call stored procedure
    await callProcedure('sp_start_match', [matchId]);
    
    // Return updated match data
    const [match] = await query(
      'SELECT id, actual_start_time, status FROM matches WHERE id = ?',
      [matchId]
    );
    
    return match;
  } catch (error) {
    console.error('Error starting match timing:', error);
    throw error;
  }
};

/**
 * End match timing
 * Records actual end time and calculates total duration
 */
const endMatch = async (matchId) => {
  try {
    // Call stored procedure
    await callProcedure('sp_end_match', [matchId]);
    
    // Return updated match data
    const [match] = await query(
      `SELECT 
        id, 
        actual_start_time, 
        actual_end_time, 
        total_duration_seconds, 
        total_duration_formatted,
        status 
      FROM matches 
      WHERE id = ?`,
      [matchId]
    );
    
    return match;
  } catch (error) {
    console.error('Error ending match timing:', error);
    throw error;
  }
};

/**
 * Start a segment (set/game/half)
 */
const startSegment = async (matchId, segmentType, segmentNumber) => {
  try {
    // Call stored procedure
    await callProcedure('sp_start_segment', [matchId, segmentType, segmentNumber]);
    
    // Return segment data
    const [segment] = await query(
      `SELECT * FROM match_segment_timings 
       WHERE match_id = ? 
         AND segment_type = ? 
         AND segment_number = ?`,
      [matchId, segmentType, segmentNumber]
    );
    
    return segment;
  } catch (error) {
    console.error('Error starting segment:', error);
    throw error;
  }
};

/**
 * End a segment (set/game/half)
 */
const endSegment = async (matchId, segmentType, segmentNumber) => {
  try {
    // Check if segment exists first
    const [existingSegment] = await query(
      `SELECT * FROM match_segment_timings 
       WHERE match_id = ? 
         AND segment_type = ? 
         AND segment_number = ?`,
      [matchId, segmentType, segmentNumber]
    );
    
    if (!existingSegment) {
      // Segment doesn't exist (e.g., Tennis/Padel don't use segment timings)
      // Return a mock segment object to avoid errors
      return {
        id: null,
        match_id: matchId,
        segment_type: segmentType,
        segment_number: segmentNumber,
        start_time: null,
        end_time: null,
        duration_seconds: 0,
        duration_formatted: '00:00:00',
        status: 'not_tracked'
      };
    }
    
    // Call stored procedure to end the segment
    await callProcedure('sp_end_segment', [matchId, segmentType, segmentNumber]);
    
    // Return updated segment data
    const [segment] = await query(
      `SELECT * FROM match_segment_timings 
       WHERE match_id = ? 
         AND segment_type = ? 
         AND segment_number = ?`,
      [matchId, segmentType, segmentNumber]
    );
    
    return segment;
  } catch (error) {
    console.error('Error ending segment:', error);
    throw error;
  }
};

/**
 * Add injury/additional time to a segment
 */
const addInjuryTime = async (matchId, segmentType, segmentNumber, additionalSeconds) => {
  try {
    // Call stored procedure
    await callProcedure('sp_add_injury_time', [
      matchId, 
      segmentType, 
      segmentNumber, 
      additionalSeconds
    ]);
    
    // Return updated segment data
    const [segment] = await query(
      `SELECT * FROM match_segment_timings 
       WHERE match_id = ? 
         AND segment_type = ? 
         AND segment_number = ?`,
      [matchId, segmentType, segmentNumber]
    );
    
    return segment;
  } catch (error) {
    console.error('Error adding injury time:', error);
    throw error;
  }
};

/**
 * Get match timing summary
 * Returns overall match timing + all segment timings
 */
const getMatchTimingSummary = async (matchId) => {
  try {
    // Get match-level timing
    const [match] = await query(
      `SELECT 
        id,
        actual_start_time,
        actual_end_time,
        total_duration_seconds,
        total_duration_formatted,
        status
      FROM matches 
      WHERE id = ?`,
      [matchId]
    );
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Get all segment timings
    const segments = await query(
      `SELECT 
        id,
        segment_type,
        segment_number,
        start_time,
        end_time,
        duration_seconds,
        duration_formatted,
        additional_time_seconds,
        status,
        notes,
        created_at
      FROM match_segment_timings 
      WHERE match_id = ?
      ORDER BY created_at ASC, segment_number ASC`,
      [matchId]
    );
    
    return {
      match_id: match.id,
      actual_start_time: match.actual_start_time,
      actual_end_time: match.actual_end_time,
      total_duration_seconds: match.total_duration_seconds,
      total_duration_formatted: match.total_duration_formatted,
      status: match.status,
      segments: segments || []
    };
  } catch (error) {
    console.error('Error getting match timing summary:', error);
    throw error;
  }
};

/**
 * Get segment timing details
 */
const getSegmentTiming = async (matchId, segmentType, segmentNumber) => {
  try {
    const [segment] = await query(
      `SELECT * FROM match_segment_timings 
       WHERE match_id = ? 
         AND segment_type = ? 
         AND segment_number = ?`,
      [matchId, segmentType, segmentNumber]
    );
    
    return segment || null;
  } catch (error) {
    console.error('Error getting segment timing:', error);
    throw error;
  }
};

/**
 * Get all timing events for a match (audit trail)
 */
const getMatchTimingEvents = async (matchId) => {
  try {
    const events = await query(
      `SELECT 
        id,
        match_id,
        segment_timing_id,
        event_type,
        event_time,
        event_data,
        created_by,
        created_at
      FROM match_timing_events 
      WHERE match_id = ?
      ORDER BY event_time ASC`,
      [matchId]
    );
    
    return events || [];
  } catch (error) {
    console.error('Error getting timing events:', error);
    throw error;
  }
};

/**
 * Pause a segment (for future use)
 */
const pauseSegment = async (matchId, segmentType, segmentNumber, notes = null) => {
  try {
    await query(
      `UPDATE match_segment_timings 
       SET status = 'paused', notes = ?
       WHERE match_id = ? 
         AND segment_type = ? 
         AND segment_number = ?`,
      [notes, matchId, segmentType, segmentNumber]
    );
    
    // Log event
    await query(
      `INSERT INTO match_timing_events (match_id, event_type, event_time, event_data)
       VALUES (?, 'pause', NOW(), ?)`,
      [matchId, JSON.stringify({ segment_type: segmentType, segment_number: segmentNumber, notes })]
    );
    
    return { success: true, message: 'Segment paused' };
  } catch (error) {
    console.error('Error pausing segment:', error);
    throw error;
  }
};

/**
 * Resume a segment (for future use)
 */
const resumeSegment = async (matchId, segmentType, segmentNumber) => {
  try {
    await query(
      `UPDATE match_segment_timings 
       SET status = 'in_progress'
       WHERE match_id = ? 
         AND segment_type = ? 
         AND segment_number = ?`,
      [matchId, segmentType, segmentNumber]
    );
    
    // Log event
    await query(
      `INSERT INTO match_timing_events (match_id, event_type, event_time, event_data)
       VALUES (?, 'resume', NOW(), ?)`,
      [matchId, JSON.stringify({ segment_type: segmentType, segment_number: segmentNumber })]
    );
    
    return { success: true, message: 'Segment resumed' };
  } catch (error) {
    console.error('Error resuming segment:', error);
    throw error;
  }
};

module.exports = {
  startMatch,
  endMatch,
  startSegment,
  endSegment,
  addInjuryTime,
  getMatchTimingSummary,
  getSegmentTiming,
  getMatchTimingEvents,
  pauseSegment,
  resumeSegment
};

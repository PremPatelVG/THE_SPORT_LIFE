import api from '../config/api';

/**
 * Match Timing Service
 * Handles API calls for match timing operations
 * This is a NEW service that doesn't affect existing functionality
 */

/**
 * Start match timing
 */
export const startMatchTiming = async (matchId) => {
  try {
    const response = await api.post(`/matches/${matchId}/timing/start`);
    return response.data;
  } catch (error) {
    console.error('Error starting match timing:', error);
    throw error;
  }
};

/**
 * End match timing
 */
export const endMatchTiming = async (matchId) => {
  try {
    const response = await api.post(`/matches/${matchId}/timing/end`);
    return response.data;
  } catch (error) {
    console.error('Error ending match timing:', error);
    throw error;
  }
};

/**
 * Start a segment (set/game/half)
 */
export const startSegment = async (matchId, segmentType, segmentNumber) => {
  try {
    const response = await api.post(`/matches/${matchId}/segments/start`, {
      segment_type: segmentType,
      segment_number: segmentNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error starting segment:', error);
    throw error;
  }
};

/**
 * End a segment (set/game/half)
 */
export const endSegment = async (matchId, segmentType, segmentNumber) => {
  try {
    const response = await api.post(`/matches/${matchId}/segments/end`, {
      segment_type: segmentType,
      segment_number: segmentNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error ending segment:', error);
    throw error;
  }
};

/**
 * Add injury time (for football)
 */
export const addInjuryTime = async (matchId, segmentType, segmentNumber, additionalMinutes) => {
  try {
    const response = await api.post(`/matches/${matchId}/segments/injury-time`, {
      segment_type: segmentType,
      segment_number: segmentNumber,
      additional_minutes: additionalMinutes
    });
    return response.data;
  } catch (error) {
    console.error('Error adding injury time:', error);
    throw error;
  }
};

/**
 * Get match timing summary
 */
export const getMatchTimingSummary = async (matchId) => {
  try {
    const response = await api.get(`/matches/${matchId}/timing`);
    return response.data;
  } catch (error) {
    console.error('Error getting match timing summary:', error);
    throw error;
  }
};

/**
 * Get segment timing
 */
export const getSegmentTiming = async (matchId, segmentType, segmentNumber) => {
  try {
    const response = await api.get(`/matches/${matchId}/segments/${segmentType}/${segmentNumber}`);
    return response.data;
  } catch (error) {
    console.error('Error getting segment timing:', error);
    throw error;
  }
};

/**
 * Get match timing events (audit trail)
 */
export const getMatchTimingEvents = async (matchId) => {
  try {
    const response = await api.get(`/matches/${matchId}/timing/events`);
    return response.data;
  } catch (error) {
    console.error('Error getting timing events:', error);
    throw error;
  }
};

/**
 * Pause a segment
 */
export const pauseSegment = async (matchId, segmentType, segmentNumber, notes = null) => {
  try {
    const response = await api.post(`/matches/${matchId}/segments/pause`, {
      segment_type: segmentType,
      segment_number: segmentNumber,
      notes: notes
    });
    return response.data;
  } catch (error) {
    console.error('Error pausing segment:', error);
    throw error;
  }
};

/**
 * Resume a segment
 */
export const resumeSegment = async (matchId, segmentType, segmentNumber) => {
  try {
    const response = await api.post(`/matches/${matchId}/segments/resume`, {
      segment_type: segmentType,
      segment_number: segmentNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error resuming segment:', error);
    throw error;
  }
};

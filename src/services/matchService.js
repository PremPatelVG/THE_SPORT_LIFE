import api from '../config/api';

/**
 * Match Service
 * Handles all match-related API calls
 */

// Get all matches with filters
export const getMatches = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.tournament_id) params.append('tournament_id', filters.tournament_id);
  if (filters.venue_id) params.append('venue_id', filters.venue_id);
  if (filters.court_id) params.append('court_id', filters.court_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.match_date) params.append('match_date', filters.match_date);
  if (filters.round_number) params.append('round_number', filters.round_number);
  if (filters.participant_id) params.append('participant_id', filters.participant_id);
  if (filters.referee_id) params.append('referee_id', filters.referee_id);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await api.get(`/matches?${params.toString()}`);
  return response.data.data;
};

// Get match by ID
export const getMatch = async (id) => {
  const response = await api.get(`/matches/${id}`);
  return response.data.data;
};

// Create match
export const createMatch = async (matchData) => {
  const response = await api.post('/matches', matchData);
  return response.data.data;
};

// Update match
export const updateMatch = async (id, matchData) => {
  const response = await api.put(`/matches/${id}`, matchData);
  return response.data.data;
};

// Delete match
export const deleteMatch = async (id) => {
  const response = await api.delete(`/matches/${id}`);
  return response.data;
};

// Reschedule match (update date/time)
export const rescheduleMatch = async (id, newDate, newTime) => {
  const response = await api.put(`/matches/${id}`, {
    match_date: newDate,
    match_time: newTime
  });
  return response.data.data;
};

// Cancel match
export const cancelMatch = async (id, reason) => {
  const response = await api.post(`/matches/${id}/cancel`, { reason });
  return response.data.data;
};

// Postpone match
export const postponeMatch = async (id, newDate, newTime) => {
  const response = await api.post(`/matches/${id}/postpone`, { 
    new_date: newDate, 
    new_time: newTime 
  });
  return response.data.data;
};

// Start match
export const startMatch = async (id) => {
  const response = await api.post(`/matches/${id}/start`);
  return response.data.data;
};

// Complete match
export const completeMatch = async (id, winnerId, score) => {
  const response = await api.post(`/matches/${id}/complete`, {
    winner_id: winnerId,
    score
  });
  return response.data.data;
};

// Assign referee
export const assignReferee = async (id, refereeId) => {
  const response = await api.post(`/matches/${id}/assign-referee`, {
    referee_id: refereeId
  });
  return response.data.data;
};

// Get tournament matches
export const getTournamentMatches = async (tournamentId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.round_number) params.append('round_number', filters.round_number);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  // Always include participant details for proper display
  params.append('include_participants', 'true');

  const response = await api.get(`/matches/tournament/${tournamentId}?${params.toString()}`);
  return response.data.data;
};

// Get participant matches
export const getParticipantMatches = async (tournamentId, participantId) => {
  const response = await api.get(`/matches/tournament/${tournamentId}/participant/${participantId}`);
  return response.data.data;
};

// Get my matches
export const getMyMatches = async () => {
  const response = await api.get('/matches/my/matches');
  return response.data.data;
};

// Get upcoming matches
export const getUpcomingMatches = async (limit = 20) => {
  const response = await api.get(`/matches/upcoming?limit=${limit}`);
  return response.data.data;
};

// Get live matches
export const getLiveMatches = async () => {
  const response = await api.get('/matches/live');
  return response.data.data;
};

// Check-in for match
export const checkInMatch = async (id) => {
  const response = await api.post(`/matches/${id}/check-in`);
  return response.data.data;
};

// Verify match result
export const verifyMatchResult = async (id) => {
  const response = await api.post(`/matches/${id}/verify`);
  return response.data.data;
};

// Record walkover
export const recordWalkover = async (id, winnerId) => {
  const response = await api.post(`/matches/${id}/walkover`, {
    winner_id: winnerId
  });
  return response.data.data;
};

// Get available participants for match (locked participants)
export const getAvailableParticipants = async (matchId) => {
  const response = await api.get(`/matches/${matchId}/available-participants`);
  return response.data.data;
};

// Update match participants
export const updateMatchParticipants = async (matchId, participantData) => {
  const response = await api.put(`/matches/${matchId}/participants`, participantData);
  return response.data.data;
};

// Reset match - Clear all scores, events, and timings
export const resetMatch = async (id) => {
  const response = await api.post(`/matches/${id}/reset`);
  return response.data.data;
};

export default {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  rescheduleMatch,
  cancelMatch,
  postponeMatch,
  startMatch,
  completeMatch,
  assignReferee,
  getTournamentMatches,
  getMyMatches,
  getUpcomingMatches,
  getLiveMatches,
  checkInMatch,
  verifyMatchResult,
  recordWalkover,
  getAvailableParticipants,
  updateMatchParticipants,
  resetMatch
};

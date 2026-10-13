import api from '../config/api';

/**
 * Tournament Service
 * Handles all tournament-related API calls
 */

// Get all tournaments with filters
export const getTournaments = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.sport_id) params.append('sport_id', filters.sport_id);
  if (filters.category) params.append('category', filters.category);
  if (filters.format_type) params.append('format_type', filters.format_type);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset !== undefined) params.append('offset', filters.offset);

  const response = await api.get(`/tournaments?${params.toString()}`);
  return {
    data: response.data.data,
    pagination: response.data.pagination
  };
};

// Get tournament by ID
export const getTournament = async (id) => {
  const response = await api.get(`/tournaments/${id}`);
  return response.data.data;
};

// Alias for getTournament (for consistency)
export const getTournamentById = getTournament;

// Get participant by ID (for performance page)
export const getParticipantById = async (tournamentId, participantId) => {
  // For now, return basic info - the matches API will provide the name
  return {
    id: participantId,
    tournament_id: tournamentId,
    is_winner: false
  };
};

// Create tournament
export const createTournament = async (tournamentData) => {
  const response = await api.post('/tournaments', tournamentData);
  return response.data.data;
};

// Update tournament
export const updateTournament = async (id, tournamentData) => {
  const response = await api.put(`/tournaments/${id}`, tournamentData);
  return response.data.data;
};

// Delete tournament
export const deleteTournament = async (id) => {
  const response = await api.delete(`/tournaments/${id}`);
  return response.data;
};

// Publish tournament
export const publishTournament = async (id) => {
  const response = await api.post(`/tournaments/${id}/publish`);
  return response.data.data;
};

// Close registration
export const closeRegistration = async (id) => {
  const response = await api.post(`/tournaments/${id}/close-registration`);
  return response.data.data;
};

// Register for tournament
export const registerForTournament = async (id, data = {}) => {
  const response = await api.post(`/tournaments/${id}/register`, data);
  return response.data.data;
};

// Withdraw from tournament
export const withdrawFromTournament = async (id, reason) => {
  const response = await api.post(`/tournaments/${id}/withdraw`, { reason });
  return response.data;
};

// Generate brackets
export const generateBrackets = async (id) => {
  const response = await api.post(`/tournaments/${id}/generate-brackets`);
  return response.data.data;
};

// Assign seeds
export const assignSeeds = async (id, seeds) => {
  const response = await api.post(`/tournaments/${id}/assign-seeds`, { seeds });
  return response.data;
};

// Complete tournament
export const completeTournament = async (id) => {
  const response = await api.post(`/tournaments/${id}/complete`);
  return response.data.data;
};

// Get tournament participants
export const getParticipants = async (id) => {
  const response = await api.get(`/tournaments/${id}/participants`);
  return response.data.data;
};

// Get tournament standings
export const getStandings = async (id, groupId = null) => {
  const url = groupId 
    ? `/tournaments/${id}/standings?group_id=${groupId}`
    : `/tournaments/${id}/standings`;
  const response = await api.get(url);
  return response.data.data;
};

// Get tournament matches
export const getMatches = async (id, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.round) params.append('round', filters.round);
  if (filters.status) params.append('status', filters.status);
  
  // Always include participant details for proper display
  params.append('include_participants', 'true');
  
  const response = await api.get(`/tournaments/${id}/matches?${params.toString()}`);
  return response.data.data;
};

// Update match score
export const updateMatchScore = async (matchId, data) => {
  const response = await api.put(`/matches/${matchId}`, data);
  return response.data.data;
};

// Get tournament statistics
export const getStatistics = async (id) => {
  const response = await api.get(`/tournaments/${id}/statistics`);
  return response.data.data;
};

// Get my tournaments
export const getMyTournaments = async () => {
  const response = await api.get('/tournaments/my/tournaments');
  return response.data.data;
};

// Get upcoming tournaments
export const getUpcomingTournaments = async (limit = 10) => {
  const response = await api.get(`/tournaments/upcoming?limit=${limit}`);
  return response.data.data;
};

// Get ongoing tournaments
export const getOngoingTournaments = async (limit = 10) => {
  const response = await api.get(`/tournaments/ongoing?limit=${limit}`);
  return response.data.data;
};

// Get tournament join options
export const getJoinOptions = async (id) => {
  const response = await api.get(`/tournaments/${id}/join-options`);
  return response.data.data;
};

// Get eligible teams for tournament
export const getEligibleTeams = async (id) => {
  const response = await api.get(`/tournaments/${id}/eligible-teams`);
  return response.data.data;
};

export default {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  publishTournament,
  closeRegistration,
  registerForTournament,
  withdrawFromTournament,
  generateBrackets,
  assignSeeds,
  completeTournament,
  getParticipants,
  getStandings,
  getMatches,
  updateMatchScore,
  getStatistics,
  getMyTournaments,
  getUpcomingTournaments,
  getOngoingTournaments,
  getJoinOptions,
  getEligibleTeams
};

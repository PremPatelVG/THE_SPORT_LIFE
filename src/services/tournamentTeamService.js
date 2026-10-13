import api from '../config/api';

/**
 * Tournament Team Management Service
 * Handles team/pair creation for tournaments
 */

// ==========================================
// TEAM MANAGEMENT (For TEAMS category)
// ==========================================

/**
 * Get available locked players for team assignment
 */
export const getAvailablePlayers = async (tournamentId) => {
  const response = await api.get(`/tournaments/${tournamentId}/available-players`);
  return response.data.data;
};

/**
 * Create a new team
 */
export const createTournamentTeam = async (tournamentId, teamData) => {
  const response = await api.post(`/tournaments/${tournamentId}/teams`, teamData);
  return response.data.data;
};

/**
 * Get all teams for a tournament
 */
export const getTournamentTeams = async (tournamentId) => {
  const response = await api.get(`/tournaments/${tournamentId}/teams`);
  return response.data.data;
};

/**
 * Update team details
 */
export const updateTournamentTeam = async (teamId, teamData) => {
  const response = await api.put(`/teams/${teamId}`, teamData);
  return response.data;
};

/**
 * Add player to team
 */
export const addTeamMember = async (teamId, memberData) => {
  const response = await api.post(`/teams/${teamId}/members`, memberData);
  return response.data;
};

/**
 * Add multiple players to team (bulk operation)
 */
export const addTeamMembersBulk = async (teamId, members) => {
  const response = await api.post(`/teams/${teamId}/members/bulk`, { members });
  return response.data;
};

/**
 * Remove player from team
 */
export const removeTeamMember = async (teamId, userId) => {
  const response = await api.delete(`/teams/${teamId}/members/${userId}`);
  return response.data;
};

/**
 * Set team captain
 */
export const setTeamCaptain = async (teamId, userId) => {
  const response = await api.put(`/teams/${teamId}/captain/${userId}`);
  return response.data;
};

/**
 * Lock team (finalize)
 */
export const lockTeam = async (teamId) => {
  const response = await api.put(`/teams/${teamId}/lock`);
  return response.data;
};

/**
 * Unlock team
 */
export const unlockTeam = async (teamId) => {
  const response = await api.put(`/teams/${teamId}/unlock`);
  return response.data;
};

/**
 * Delete team
 */
export const deleteTournamentTeam = async (teamId) => {
  const response = await api.delete(`/teams/${teamId}`);
  return response.data;
};

// ==========================================
// PAIR MANAGEMENT (For DOUBLES category)
// ==========================================

/**
 * Create a new pair
 */
export const createPair = async (tournamentId, pairData) => {
  const response = await api.post(`/tournaments/${tournamentId}/pairs`, pairData);
  return response.data.data;
};

/**
 * Get all pairs for a tournament
 */
export const getTournamentPairs = async (tournamentId) => {
  const response = await api.get(`/tournaments/${tournamentId}/pairs`);
  return response.data.data;
};

/**
 * Update pair name
 */
export const updatePair = async (pairId, pairData) => {
  const response = await api.put(`/pairs/${pairId}`, pairData);
  return response.data;
};

/**
 * Lock pair (finalize)
 */
export const lockPair = async (pairId) => {
  const response = await api.put(`/pairs/${pairId}/lock`);
  return response.data;
};

/**
 * Unlock pair
 */
export const unlockPair = async (pairId) => {
  const response = await api.put(`/pairs/${pairId}/unlock`);
  return response.data;
};

/**
 * Delete pair
 */
export const deletePair = async (pairId) => {
  const response = await api.delete(`/pairs/${pairId}`);
  return response.data;
};

export default {
  // Team Management
  getAvailablePlayers,
  createTournamentTeam,
  getTournamentTeams,
  updateTournamentTeam,
  addTeamMember,
  addTeamMembersBulk,
  removeTeamMember,
  setTeamCaptain,
  lockTeam,
  unlockTeam,
  deleteTournamentTeam,
  
  // Pair Management
  createPair,
  getTournamentPairs,
  updatePair,
  lockPair,
  unlockPair,
  deletePair
};

// ==========================================
// BULK OPERATIONS
// ==========================================

/**
 * Bulk lock teams
 */
export const bulkLockTeams = async (tournamentId, teamIds) => {
  const response = await api.post(`/tournaments/${tournamentId}/teams/bulk-lock`, { teamIds });
  return response.data;
};

/**
 * Bulk unlock teams
 */
export const bulkUnlockTeams = async (tournamentId, teamIds) => {
  const response = await api.post(`/tournaments/${tournamentId}/teams/bulk-unlock`, { teamIds });
  return response.data;
};

/**
 * Bulk lock pairs
 */
export const bulkLockPairs = async (tournamentId, pairIds) => {
  const response = await api.post(`/tournaments/${tournamentId}/pairs/bulk-lock`, { pairIds });
  return response.data;
};

/**
 * Bulk unlock pairs
 */
export const bulkUnlockPairs = async (tournamentId, pairIds) => {
  const response = await api.post(`/tournaments/${tournamentId}/pairs/bulk-unlock`, { pairIds });
  return response.data;
};

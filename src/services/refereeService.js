import api from '../config/api';

/**
 * Assign referee to match
 */
export const assignReferee = async (matchId, refereeId) => {
  const response = await api.post('/referees/assign', {
    match_id: matchId,
    referee_id: refereeId
  });
  return response.data;
};

/**
 * Get referee assignment requests
 */
export const getRefereeRequests = async (refereeId, status = null) => {
  const params = status ? { status } : {};
  const response = await api.get(`/referees/${refereeId}/requests`, { params });
  return response.data.data;
};

/**
 * Respond to assignment request (accept/decline)
 */
export const respondToAssignment = async (requestId, response, reason = null) => {
  const res = await api.post(`/referees/requests/${requestId}/respond`, {
    response,
    reason
  });
  return res.data;
};

/**
 * Get referee assignments (accepted matches)
 */
export const getRefereeAssignments = async (refereeId, filters = {}) => {
  const response = await api.get(`/referees/${refereeId}/assignments`, { params: filters });
  return response.data.data;
};

/**
 * Cancel referee assignment
 */
export const cancelAssignment = async (matchId) => {
  const response = await api.delete(`/referees/assign/${matchId}`);
  return response.data;
};

/**
 * Get all available referees
 */
export const getAvailableReferees = async (tournamentId = null) => {
  const params = tournamentId ? { tournament_id: tournamentId } : {};
  const response = await api.get('/referees', { params });
  return response.data.data;
};

/**
 * Get referee profile
 */
export const getRefereeProfile = async (refereeId) => {
  const response = await api.get(`/referees/${refereeId}`);
  return response.data.data;
};

/**
 * Get pending assignment requests for a match
 */
export const getPendingRequestsForMatch = async (matchId) => {
  const response = await api.get(`/referees/match/${matchId}/pending`);
  return response.data.data;
};

/**
 * Get pending assignment requests for multiple matches (batch)
 * @param {Array<number>} matchIds - Array of match IDs
 * @returns {Object} Map of matchId -> status
 */
export const getBatchPendingRequestsForMatches = async (matchIds) => {
  const response = await api.post('/referees/matches/pending/batch', { matchIds });
  return response.data.data;
};

export default {
  assignReferee,
  getRefereeRequests,
  respondToAssignment,
  getRefereeAssignments,
  cancelAssignment,
  getAvailableReferees,
  getRefereeProfile,
  getPendingRequestsForMatch,
  getBatchPendingRequestsForMatches
};

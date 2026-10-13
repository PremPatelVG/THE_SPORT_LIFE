import api from '../config/api';

/**
 * Partnership Service
 * Handles all partnership-related API calls
 */

// Create partnership
export const createPartnership = async (partnershipData) => {
  const response = await api.post('/partnerships', partnershipData);
  return response.data.data;
};

// Get user's partnerships
export const getMyPartnerships = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.sport_id) params.append('sport_id', filters.sport_id);
  if (filters.tournament_id) params.append('tournament_id', filters.tournament_id);
  if (filters.status) params.append('status', filters.status);

  const response = await api.get(`/partnerships/my/partnerships?${params.toString()}`);
  return response.data.data;
};

// Get partnership by ID
export const getPartnership = async (id) => {
  const response = await api.get(`/partnerships/${id}`);
  return response.data.data;
};

// Update partnership
export const updatePartnership = async (id, updateData) => {
  const response = await api.put(`/partnerships/${id}`, updateData);
  return response.data.data;
};

// Delete partnership
export const deletePartnership = async (id) => {
  const response = await api.delete(`/partnerships/${id}`);
  return response.data;
};

// Get eligible partnerships for tournament
export const getEligiblePartnerships = async (tournamentId) => {
  const response = await api.get(`/tournaments/${tournamentId}/eligible-partnerships`);
  return response.data.data;
};

export default {
  createPartnership,
  getMyPartnerships,
  getPartnership,
  updatePartnership,
  deletePartnership,
  getEligiblePartnerships
};

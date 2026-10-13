import api from '../config/api';

/**
 * Sport Service
 * Handles all sport-related API calls
 */

// Get all sports
export const getSports = async () => {
  const response = await api.get('/sports');
  return response.data;
};

// Get sport by ID
export const getSport = async (id) => {
  const response = await api.get(`/sports/${id}`);
  return response.data;
};

export default {
  getSports,
  getSport
};

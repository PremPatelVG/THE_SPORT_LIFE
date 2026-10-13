import api from '../config/api';

/**
 * Venue Service
 * Handles all venue-related API calls
 */

// Get all venues
export const getVenues = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.city) params.append('city', filters.city);
  if (filters.state) params.append('state', filters.state);
  if (filters.country) params.append('country', filters.country);
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await api.get(`/venues?${params.toString()}`);
  return response.data;
};

// Get venue by ID
export const getVenue = async (id) => {
  const response = await api.get(`/venues/${id}`);
  return response.data;
};

// Check venue availability
export const checkVenueAvailability = async (venueId, startDate, endDate) => {
  const response = await api.get(`/venues/${venueId}/check-availability`, {
    params: {
      start_date: startDate,
      end_date: endDate
    }
  });
  return response.data;
};

// Get available venues for date range
export const getAvailableVenues = async (startDate, endDate, filters = {}) => {
  const params = new URLSearchParams();
  params.append('start_date', startDate);
  params.append('end_date', endDate);
  
  if (filters.city) params.append('city', filters.city);
  if (filters.state) params.append('state', filters.state);

  const response = await api.get(`/venues/available?${params.toString()}`);
  return response.data;
};

export default {
  getVenues,
  getVenue,
  checkVenueAvailability,
  getAvailableVenues
};

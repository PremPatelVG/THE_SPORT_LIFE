import api from '../config/api';

/**
 * Get team members for squad selection
 */
export const getTeamMembersForSquad = async (matchId, teamId) => {
  try {
    const response = await api.get(`/matches/${matchId}/squads/${teamId}/members`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching team members for squad:', error);
    throw error;
  }
};

/**
 * Save match squad
 */
export const saveMatchSquad = async (matchId, teamId, squadMembers) => {
  try {
    const response = await api.post(`/matches/${matchId}/squads/${teamId}`, {
      squad_members: squadMembers
    });
    return response.data;
  } catch (error) {
    console.error('Error saving match squad:', error);
    throw error;
  }
};

/**
 * Get match squads (both teams)
 */
export const getMatchSquads = async (matchId) => {
  try {
    const response = await api.get(`/matches/${matchId}/squads`);
    return response.data;
  } catch (error) {
    console.error('Error fetching match squads:', error);
    throw error;
  }
};

/**
 * Check squads status
 */
export const checkSquadsStatus = async (matchId) => {
  try {
    const response = await api.get(`/matches/${matchId}/squads/status`);
    return response.data.data;
  } catch (error) {
    console.error('Error checking squads status:', error);
    throw error;
  }
};

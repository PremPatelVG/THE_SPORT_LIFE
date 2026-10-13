import api from '../config/api';

/**
 * Team Service
 * Handles all team-related API calls
 */

// Get all teams with filters
export const getTeams = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.tournament_id) params.append('tournament_id', filters.tournament_id);
  if (filters.creator_id) params.append('creator_id', filters.creator_id);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await api.get(`/teams?${params.toString()}`);
  return response.data.data;
};

// Get teams for a specific tournament
export const getTournamentTeams = async (tournamentId) => {
  const response = await api.get(`/teams/tournament/${tournamentId}`);
  return response.data.data;
};

// Get team by ID
export const getTeam = async (id) => {
  const response = await api.get(`/teams/${id}`);
  return response.data.data;
};

// Get team members
export const getTeamMembers = async (id) => {
  const response = await api.get(`/teams/${id}/members`);
  return response.data.data;
};

// Create team
export const createTeam = async (teamData) => {
  const response = await api.post('/teams', teamData);
  return response.data.data;
};

// Get user's teams
export const getMyTeams = async () => {
  const response = await api.get('/teams/my/teams');
  return response.data.data;
};

// Update team
export const updateTeam = async (id, teamData) => {
  const response = await api.put(`/teams/${id}`, teamData);
  return response.data.data;
};

// Delete team
export const deleteTeam = async (id) => {
  const response = await api.delete(`/teams/${id}`);
  return response.data;
};

// Invite user to team
export const inviteUser = async (teamId, userData) => {
  const response = await api.post(`/teams/${teamId}/invite`, userData);
  return response.data.data;
};

// Get team invitations
export const getTeamInvitations = async (teamId) => {
  const response = await api.get(`/teams/${teamId}/invitations`);
  return response.data.data;
};

// Get user's invitations
export const getMyInvitations = async (status = null) => {
  const params = status ? `?status=${status}` : '';
  const response = await api.get(`/teams/invitations/my${params}`);
  return response.data.data;
};

// Accept invitation
export const acceptInvitation = async (invitationId) => {
  const response = await api.post(`/teams/invitations/${invitationId}/accept`);
  return response.data.data;
};

// Reject invitation
export const rejectInvitation = async (invitationId) => {
  const response = await api.post(`/teams/invitations/${invitationId}/reject`);
  return response.data;
};

// Cancel invitation
export const cancelInvitation = async (invitationId) => {
  const response = await api.delete(`/teams/invitations/${invitationId}`);
  return response.data;
};

// Remove team member
export const removeMember = async (teamId, memberId) => {
  const response = await api.delete(`/teams/${teamId}/members/${memberId}`);
  return response.data;
};

// Update member details
export const updateMember = async (teamId, memberId, memberData) => {
  const response = await api.put(`/teams/${teamId}/members/${memberId}`, memberData);
  return response.data.data;
};

// Change team captain
export const changeCaptain = async (teamId, newCaptainId) => {
  const response = await api.post(`/teams/${teamId}/change-captain`, { new_captain_id: newCaptainId });
  return response.data.data;
};

// Leave team
export const leaveTeam = async (teamId) => {
  const response = await api.post(`/teams/${teamId}/leave`);
  return response.data;
};

// Get available jersey numbers
export const getAvailableJerseys = async (teamId) => {
  const response = await api.get(`/teams/${teamId}/available-jerseys`);
  return response.data.data;
};

export default {
  getTeams,
  getTournamentTeams,
  getTeam,
  getTeamMembers,
  createTeam,
  getMyTeams,
  updateTeam,
  deleteTeam,
  inviteUser,
  getTeamInvitations,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  removeMember,
  updateMember,
  changeCaptain,
  leaveTeam,
  getAvailableJerseys
};

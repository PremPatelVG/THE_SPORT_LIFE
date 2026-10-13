import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as teamService from '../../services/teamService';

// Async thunks
export const fetchTeams = createAsyncThunk(
  'team/fetchTeams',
  async (filters, { rejectWithValue }) => {
    try {
      const data = await teamService.getTeams(filters);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch teams');
    }
  }
);

export const fetchTournamentTeams = createAsyncThunk(
  'team/fetchTournamentTeams',
  async (tournamentId, { rejectWithValue }) => {
    try {
      const data = await teamService.getTournamentTeams(tournamentId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tournament teams');
    }
  }
);

export const fetchTeam = createAsyncThunk(
  'team/fetchTeam',
  async (id, { rejectWithValue }) => {
    try {
      const data = await teamService.getTeam(id);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch team');
    }
  }
);

export const fetchTeamMembers = createAsyncThunk(
  'team/fetchTeamMembers',
  async (id, { rejectWithValue }) => {
    try {
      const data = await teamService.getTeamMembers(id);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch team members');
    }
  }
);

export const createTeam = createAsyncThunk(
  'team/createTeam',
  async (teamData, { rejectWithValue }) => {
    try {
      const data = await teamService.createTeam(teamData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create team');
    }
  }
);

export const fetchMyTeams = createAsyncThunk(
  'team/fetchMyTeams',
  async (_, { rejectWithValue }) => {
    try {
      const data = await teamService.getMyTeams();
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch your teams');
    }
  }
);

export const updateTeam = createAsyncThunk(
  'team/updateTeam',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const result = await teamService.updateTeam(id, data);
      return result;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update team');
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'team/deleteTeam',
  async (id, { rejectWithValue }) => {
    try {
      await teamService.deleteTeam(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete team');
    }
  }
);

export const inviteUser = createAsyncThunk(
  'team/inviteUser',
  async ({ teamId, userData }, { rejectWithValue }) => {
    try {
      const data = await teamService.inviteUser(teamId, userData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send invitation');
    }
  }
);

export const fetchTeamInvitations = createAsyncThunk(
  'team/fetchTeamInvitations',
  async (teamId, { rejectWithValue }) => {
    try {
      const data = await teamService.getTeamInvitations(teamId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch invitations');
    }
  }
);

export const fetchMyInvitations = createAsyncThunk(
  'team/fetchMyInvitations',
  async (status, { rejectWithValue }) => {
    try {
      const data = await teamService.getMyInvitations(status);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch your invitations');
    }
  }
);

export const acceptInvitation = createAsyncThunk(
  'team/acceptInvitation',
  async (invitationId, { rejectWithValue }) => {
    try {
      const data = await teamService.acceptInvitation(invitationId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to accept invitation');
    }
  }
);

export const rejectInvitation = createAsyncThunk(
  'team/rejectInvitation',
  async (invitationId, { rejectWithValue }) => {
    try {
      await teamService.rejectInvitation(invitationId);
      return invitationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to reject invitation');
    }
  }
);

export const removeMember = createAsyncThunk(
  'team/removeMember',
  async ({ teamId, memberId }, { rejectWithValue }) => {
    try {
      await teamService.removeMember(teamId, memberId);
      return memberId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove member');
    }
  }
);

export const leaveTeam = createAsyncThunk(
  'team/leaveTeam',
  async (teamId, { rejectWithValue }) => {
    try {
      await teamService.leaveTeam(teamId);
      return teamId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to leave team');
    }
  }
);

const initialState = {
  teams: [],
  currentTeam: null,
  myTeams: [],
  teamMembers: [],
  teamInvitations: [],
  myInvitations: [],
  loading: false,
  error: null,
  success: null
};

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    clearCurrentTeam: (state) => {
      state.currentTeam = null;
      state.teamMembers = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch teams
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch tournament teams
      .addCase(fetchTournamentTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTournamentTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTournamentTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch team
      .addCase(fetchTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTeam = action.payload;
      })
      .addCase(fetchTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch team members
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers = action.payload;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create team
      .addCase(createTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Team created successfully';
        state.currentTeam = action.payload;
        state.myTeams.unshift(action.payload);
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch my teams
      .addCase(fetchMyTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.myTeams = action.payload;
      })
      .addCase(fetchMyTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update team
      .addCase(updateTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Team updated successfully';
        state.currentTeam = action.payload;
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete team
      .addCase(deleteTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Team deleted successfully';
        state.teams = state.teams.filter(t => t.id !== action.payload);
        state.myTeams = state.myTeams.filter(t => t.id !== action.payload);
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Invite user
      .addCase(inviteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(inviteUser.fulfilled, (state) => {
        state.loading = false;
        state.success = 'Invitation sent successfully';
      })
      .addCase(inviteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch team invitations
      .addCase(fetchTeamInvitations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamInvitations.fulfilled, (state, action) => {
        state.loading = false;
        state.teamInvitations = action.payload;
      })
      .addCase(fetchTeamInvitations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch my invitations
      .addCase(fetchMyInvitations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyInvitations.fulfilled, (state, action) => {
        state.loading = false;
        state.myInvitations = action.payload;
      })
      .addCase(fetchMyInvitations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Accept invitation
      .addCase(acceptInvitation.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(acceptInvitation.fulfilled, (state) => {
        state.loading = false;
        state.success = 'Invitation accepted successfully';
      })
      .addCase(acceptInvitation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Reject invitation
      .addCase(rejectInvitation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectInvitation.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Invitation rejected';
        state.myInvitations = state.myInvitations.filter(inv => inv.id !== action.payload);
      })
      .addCase(rejectInvitation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove member
      .addCase(removeMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Member removed successfully';
        state.teamMembers = state.teamMembers.filter(m => m.id !== action.payload);
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Leave team
      .addCase(leaveTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(leaveTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Left team successfully';
        state.myTeams = state.myTeams.filter(t => t.id !== action.payload);
      })
      .addCase(leaveTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearSuccess, clearCurrentTeam } = teamSlice.actions;
export default teamSlice.reducer;

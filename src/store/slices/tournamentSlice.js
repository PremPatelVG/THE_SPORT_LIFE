import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as tournamentService from '../../services/tournamentService';

// Async thunks
export const fetchTournaments = createAsyncThunk(
  'tournament/fetchTournaments',
  async (filters, { rejectWithValue }) => {
    try {
      const result = await tournamentService.getTournaments(filters);
      return result;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tournaments');
    }
  }
);

export const loadMoreTournaments = createAsyncThunk(
  'tournament/loadMoreTournaments',
  async (filters, { rejectWithValue }) => {
    try {
      const result = await tournamentService.getTournaments(filters);
      return result;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to load more tournaments');
    }
  }
);

export const fetchTournament = createAsyncThunk(
  'tournament/fetchTournament',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentService.getTournament(id);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tournament');
    }
  }
);

export const createTournament = createAsyncThunk(
  'tournament/createTournament',
  async (tournamentData, { rejectWithValue }) => {
    try {
      const data = await tournamentService.createTournament(tournamentData);
      return data;
    } catch (error) {
      // Handle structured validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        return rejectWithValue(error.response.data.errors);
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to create tournament');
    }
  }
);

export const updateTournament = createAsyncThunk(
  'tournament/updateTournament',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const result = await tournamentService.updateTournament(id, data);
      return result;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update tournament');
    }
  }
);

export const deleteTournament = createAsyncThunk(
  'tournament/deleteTournament',
  async (id, { rejectWithValue }) => {
    try {
      await tournamentService.deleteTournament(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete tournament');
    }
  }
);

export const registerForTournament = createAsyncThunk(
  'tournament/register',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const result = await tournamentService.registerForTournament(id, data);
      return result;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to register for tournament');
    }
  }
);

export const withdrawFromTournament = createAsyncThunk(
  'tournament/withdraw',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      await tournamentService.withdrawFromTournament(id, reason);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to withdraw from tournament');
    }
  }
);

export const fetchMyTournaments = createAsyncThunk(
  'tournament/fetchMyTournaments',
  async (_, { rejectWithValue }) => {
    try {
      const data = await tournamentService.getMyTournaments();
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch your tournaments');
    }
  }
);

export const fetchUpcomingTournaments = createAsyncThunk(
  'tournament/fetchUpcoming',
  async (limit = 10, { rejectWithValue }) => {
    try {
      const data = await tournamentService.getUpcomingTournaments(limit);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch upcoming tournaments');
    }
  }
);

export const fetchOngoingTournaments = createAsyncThunk(
  'tournament/fetchOngoing',
  async (limit = 10, { rejectWithValue }) => {
    try {
      const data = await tournamentService.getOngoingTournaments(limit);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch ongoing tournaments');
    }
  }
);

export const fetchTournamentParticipants = createAsyncThunk(
  'tournament/fetchParticipants',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentService.getParticipants(id);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch participants');
    }
  }
);

export const fetchTournamentMatches = createAsyncThunk(
  'tournament/fetchMatches',
  async ({ id, filters }, { rejectWithValue }) => {
    try {
      const data = await tournamentService.getMatches(id, filters);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch matches');
    }
  }
);

export const fetchTournamentStandings = createAsyncThunk(
  'tournament/fetchStandings',
  async ({ id, groupId }, { rejectWithValue }) => {
    try {
      const data = await tournamentService.getStandings(id, groupId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch standings');
    }
  }
);

const initialState = {
  tournaments: [],
  currentTournament: null,
  myTournaments: [],
  upcomingTournaments: [],
  ongoingTournaments: [],
  participants: [],
  matches: [],
  standings: [],
  loading: false,
  loadingMore: false,
  error: null,
  success: null,
  pagination: {
    limit: 20,
    offset: 0,
    total: 0
  },
  hasMore: true
};

const tournamentSlice = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    clearCurrentTournament: (state) => {
      state.currentTournament = null;
    },
    resetTournaments: (state) => {
      state.tournaments = [];
      state.pagination = {
        limit: 20,
        offset: 0,
        total: 0
      };
      state.hasMore = true;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch tournaments
      .addCase(fetchTournaments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTournaments.fulfilled, (state, action) => {
        state.loading = false;
        state.tournaments = action.payload.data;
        state.pagination = action.payload.pagination;
        state.hasMore = action.payload.data.length >= state.pagination.limit;
      })
      .addCase(fetchTournaments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Load more tournaments
      .addCase(loadMoreTournaments.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(loadMoreTournaments.fulfilled, (state, action) => {
        state.loadingMore = false;
        state.tournaments = [...state.tournaments, ...action.payload.data];
        state.pagination = action.payload.pagination;
        state.hasMore = action.payload.data.length >= state.pagination.limit;
      })
      .addCase(loadMoreTournaments.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      })
      
      // Fetch tournament
      .addCase(fetchTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTournament.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTournament = action.payload;
      })
      .addCase(fetchTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create tournament
      .addCase(createTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createTournament.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Tournament created successfully';
        state.tournaments.unshift(action.payload);
      })
      .addCase(createTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update tournament
      .addCase(updateTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateTournament.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Tournament updated successfully';
        state.currentTournament = action.payload;
      })
      .addCase(updateTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete tournament
      .addCase(deleteTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTournament.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Tournament deleted successfully';
        state.tournaments = state.tournaments.filter(t => t.id !== action.payload);
      })
      .addCase(deleteTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Register for tournament
      .addCase(registerForTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(registerForTournament.fulfilled, (state) => {
        state.loading = false;
        state.success = 'Successfully registered for tournament';
      })
      .addCase(registerForTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Withdraw from tournament
      .addCase(withdrawFromTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(withdrawFromTournament.fulfilled, (state) => {
        state.loading = false;
        state.success = 'Successfully withdrawn from tournament';
      })
      .addCase(withdrawFromTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch my tournaments
      .addCase(fetchMyTournaments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyTournaments.fulfilled, (state, action) => {
        state.loading = false;
        state.myTournaments = action.payload;
      })
      .addCase(fetchMyTournaments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch upcoming tournaments
      .addCase(fetchUpcomingTournaments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUpcomingTournaments.fulfilled, (state, action) => {
        state.loading = false;
        state.upcomingTournaments = action.payload;
      })
      .addCase(fetchUpcomingTournaments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch ongoing tournaments
      .addCase(fetchOngoingTournaments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOngoingTournaments.fulfilled, (state, action) => {
        state.loading = false;
        state.ongoingTournaments = action.payload;
      })
      .addCase(fetchOngoingTournaments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch participants
      .addCase(fetchTournamentParticipants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTournamentParticipants.fulfilled, (state, action) => {
        state.loading = false;
        state.participants = action.payload;
      })
      .addCase(fetchTournamentParticipants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch matches
      .addCase(fetchTournamentMatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTournamentMatches.fulfilled, (state, action) => {
        state.loading = false;
        state.matches = action.payload;
      })
      .addCase(fetchTournamentMatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch standings
      .addCase(fetchTournamentStandings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTournamentStandings.fulfilled, (state, action) => {
        state.loading = false;
        state.standings = action.payload;
      })
      .addCase(fetchTournamentStandings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearSuccess, clearCurrentTournament, resetTournaments } = tournamentSlice.actions;
export default tournamentSlice.reducer;

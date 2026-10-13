import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Swords,
  Calendar,
  MapPin,
  Trophy,
  Loader,
  CheckCircle,
  Clock,
  Target,
  XCircle,
  Award,
  Users,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import api from '../config/api';

const Matches = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSport, setFilterSport] = useState('all'); // New: Sport filter
  const [filterResult, setFilterResult] = useState('all'); // New: Result filter (win/loss)
  const [searchQuery, setSearchQuery] = useState(''); // New: Search query
  const [showFilters, setShowFilters] = useState(false); // New: Toggle filters visibility
  const [viewMode, setViewMode] = useState('player'); // 'player' or 'referee'
  const [matchTypeFilter, setMatchTypeFilter] = useState(searchParams.get('tab') || 'all'); // 'all', 'tournament', 'standalone'
  const [checkingIn, setCheckingIn] = useState(null);

  useEffect(() => {
    if (viewMode === 'player') {
      fetchMyMatches();
    } else {
      fetchRefereeMatches();
    }
  }, [viewMode]);

  const fetchMyMatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/matches/my/matches');
      setMatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch my matches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if current user is actually a participant in the match
  const isUserParticipant = (match) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    const userId = user.id;
    
    // Check if user ID exists in participant1_user_ids or participant2_user_ids
    const participant1Ids = match.participant1_user_ids || [];
    const participant2Ids = match.participant2_user_ids || [];
    
    return participant1Ids.includes(userId) || participant2Ids.includes(userId);
  };

  const fetchRefereeMatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/matches/my/referee-matches');
      setMatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch referee matches:', error);
      setMatches([]); // Fallback to empty for now
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (matchId) => {
    try {
      setCheckingIn(matchId);
      await api.post(`/matches/${matchId}/check-in`);
      
      // Refresh matches after check-in
      if (viewMode === 'player') {
        await fetchMyMatches();
      } else {
        await fetchRefereeMatches();
      }
      
      alert('✅ Checked in successfully!');
    } catch (error) {
      console.error('Check-in failed:', error);
      alert(error.response?.data?.error || 'Failed to check in. Please try again.');
    } finally {
      setCheckingIn(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending', icon: Clock },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled', icon: Calendar },
      ready: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ready', icon: CheckCircle },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Progress', icon: Target },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled', icon: XCircle },
      postponed: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Postponed', icon: Clock },
      walkover: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Walkover', icon: Award }
    };

    const statusInfo = config[status] || config.pending;
    const Icon = statusInfo.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
        <Icon className="w-4 h-4" />
        {statusInfo.label}
      </span>
    );
  };

  // Filter matches by status, sport, result, match type, and search query
  const filteredMatches = matches.filter(m => {
    const statusMatch = filterStatus === 'all' || m.status === filterStatus;
    const sportMatch = filterSport === 'all' || m.sport_name === filterSport;
    const resultMatch = viewMode === 'referee' || filterResult === 'all' || m.result === filterResult;
    
    // Match type filter (works for both player and referee modes)
    const matchTypeMatch = matchTypeFilter === 'all' || 
      (matchTypeFilter === 'standalone' && m.is_standalone) ||
      (matchTypeFilter === 'tournament' && !m.is_standalone);
    
    // Search filter (tournament name, opponent name, sport)
    const searchMatch = searchQuery === '' || 
      m.tournament_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.opponent?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sport_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.participant1_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.participant2_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && sportMatch && resultMatch && matchTypeMatch && searchMatch;
  });

  // Get unique sports list (only for player mode)
  const uniqueSports = viewMode === 'player' 
    ? ['all', ...new Set(matches.map(m => m.sport_name).filter(Boolean))]
    : [];

  // Calculate statistics based on FILTERED matches
  const stats = {
    upcoming: filteredMatches.filter(m => m.status === 'scheduled').length,
    inProgress: filteredMatches.filter(m => m.status === 'in_progress').length,
    completed: filteredMatches.filter(m => m.status === 'completed').length,
    total: filteredMatches.length,
    wins: viewMode === 'player' ? filteredMatches.filter(m => m.status === 'completed' && m.result === 'won').length : 0,
    losses: viewMode === 'player' ? filteredMatches.filter(m => m.status === 'completed' && m.result === 'lost').length : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Swords className="w-8 h-8 text-primary-500" />
                My Matches
              </h1>
              <p className="text-gray-600 mt-2">
                View all your upcoming and past matches
              </p>
            </div>
            
            {/* Create Standalone Match Button */}
            <button
              onClick={() => navigate('/standalone-matches/create')}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create & Start Match
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-1 border border-gray-200 mb-6">
            <button
              onClick={() => setViewMode('player')}
              className={`px-6 py-2.5 rounded-md font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'player'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              As Player
            </button>
            <button
              onClick={() => setViewMode('referee')}
              className={`px-6 py-2.5 rounded-md font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'referee'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Award className="w-4 h-4" />
              As Match official
            </button>
          </div>

          {/* Match Type Filter Tabs (For Both Player and Referee Modes) */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-1 border border-gray-200 mb-6">
            <button
              onClick={() => setMatchTypeFilter('all')}
              className={`flex-1 px-6 py-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-2 ${
                matchTypeFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              All Matches
            </button>
            <button
              onClick={() => setMatchTypeFilter('tournament')}
              className={`flex-1 px-6 py-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-2 ${
                matchTypeFilter === 'tournament'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Tournament
            </button>
            <button
              onClick={() => setMatchTypeFilter('standalone')}
              className={`flex-1 px-6 py-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-2 ${
                matchTypeFilter === 'standalone'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Swords className="w-4 h-4" />
              Standalone
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-6">
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              
              {/* Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  showFilters
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              
              {/* Search Button */}
              <button className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                Search
              </button>
            </div>

            {/* Filter Dropdowns - Show when Filters button is clicked */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                {/* Sport Filter - Only in player mode */}
                {viewMode === 'player' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sport</label>
                    <select
                      value={filterSport}
                      onChange={(e) => setFilterSport(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                    >
                      <option value="all">All Sports</option>
                      {uniqueSports.filter(s => s !== 'all').map((sport) => (
                        <option key={sport} value={sport}>{sport}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                {/* Result Filter - Only in player mode */}
                {viewMode === 'player' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Result</label>
                    <select
                      value={filterResult}
                      onChange={(e) => setFilterResult(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                    >
                      <option value="all">All Results</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="draw">Draw</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${viewMode === 'player' ? '6' : '4'} gap-4 mb-8`}>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.upcoming}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.inProgress}
                </p>
              </div>
              <Target className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Swords className="w-10 h-10 text-gray-500" />
            </div>
          </div>

          {/* Total Wins - Only show in player mode */}
          {viewMode === 'player' && (
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Wins</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.wins}
                  </p>
                </div>
                <Trophy className="w-10 h-10 text-primary-500" />
              </div>
            </div>
          )}

          {/* Total Losses - Only show in player mode */}
          {viewMode === 'player' && (
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Loss</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.losses}
                  </p>
                </div>
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>
          )}
        </div>

        {/* Matches List */}
        {filteredMatches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Swords className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No matches found' : filterStatus === 'all' ? 'No Matches Yet' : `No ${filterStatus.replace('_', ' ')} Matches`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === 'all' 
                ? "You don't have any matches scheduled yet" 
                : `You don't have any ${filterStatus.replace('_', ' ')} matches`
              }
            </p>
            <button
              onClick={() => navigate('/tournaments')}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              Browse Tournaments
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 duration-200 flex flex-col"
              >
                {/* Header */}
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold line-clamp-2">{match.tournament_name || 'Standalone Match'}</h3>
                      {match.is_standalone === 1 && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded">
                          🎮 Standalone
                        </span>
                      )}
                    </div>
                    {getStatusBadge(match.status)}
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <span>{match.sport_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {match.match_date ? new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                        {match.match_time && ` • ${match.match_time.slice(0, 5)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Upper Content - grows to fill space */}
                  <div className="flex-grow">
                    {/* Match Details */}
                    <div className="mb-4">
                      <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 mb-1">
                              {viewMode === 'referee' ? 'Participant 1' : `You (${match.my_participation?.type || 'singles'})`}
                            </p>
                            <p className="font-semibold text-primary-500 text-sm truncate">
                              {viewMode === 'referee' 
                                ? (match.participant1_name || match.my_participation?.name || 'TBD')
                                : (match.my_participation?.name || 'You')
                              }
                            </p>
                          </div>
                          <span className="text-lg font-bold text-gray-400 px-2">VS</span>
                          <div className="flex-1 text-right">
                            <p className="text-xs text-gray-600 mb-1">
                              {viewMode === 'referee' ? 'Participant 2' : 'Opponent'}
                            </p>
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {viewMode === 'referee'
                                ? (match.participant2_name || match.opponent?.name || 'TBD')
                                : (match.opponent?.name || 'TBD')
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Match Result Badge - Only show if user is actually a participant */}
                      {match.result && isUserParticipant(match) && (
                        <div className={`mt-2 p-2 rounded-lg text-center text-sm font-semibold ${
                          match.result === 'won' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : match.result === 'lost'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {match.result === 'won' && '🏆 You Won!'}
                          {match.result === 'lost' && '❌ You Lost'}
                          {match.result === 'draw' && '🤝 Draw'}
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-700">{match.round_name || `Round ${match.round_number}`}</span>
                      </div>

                      {match.venue_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700 truncate">
                            {match.venue_name}
                            {match.court_name && ` - ${match.court_name}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Match officials Info */}
                    {match.referee_name && (
                      <div className="mb-3 flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-700">Match officials: {match.referee_name}</span>
                      </div>
                    )}

                    {/* Match Score */}
                    {match.status === 'completed' && match.score && (
                      <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                        <p className="font-semibold text-blue-900">Score: {typeof match.score === 'string' ? match.score : JSON.stringify(match.score)}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - always at bottom */}
                  <div className="space-y-2 mt-auto">
                    
                    {/* {viewMode === 'player' && match.status === 'scheduled' && !match.is_checked_in && (
                      <>
                        <button
                          onClick={() => handleCheckIn(match.id)}
                          disabled={checkingIn === match.id || (match.tournament_category === 'teams' && !match.is_captain)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {checkingIn === match.id ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Checking in...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Check In
                            </>
                          )}
                        </button>
                        
                        
                        {match.tournament_category === 'teams' && !match.is_captain && (
                          <p className="text-xs text-amber-600 text-center bg-amber-50 py-1 px-2 rounded">
                            ⚠️ Only team captain can check in. Waiting for captain...
                          </p>
                        )}
                        {match.tournament_category === 'teams' && match.is_captain && (
                          <p className="text-xs text-blue-600 text-center">
                            👑 You are the captain - Check in for your team
                          </p>
                        )}
                        {match.tournament_category === 'doubles' && (
                          <p className="text-xs text-gray-500 text-center">
                            ℹ️ Both players must check in
                          </p>
                        )}
                      </>
                    )} */}
                    
                    
                    {/* {viewMode === 'player' && match.status === 'scheduled' && match.is_checked_in && (
                      <div className="w-full px-4 py-2 bg-green-50 text-green-700 font-semibold rounded-lg text-sm text-center border border-green-200">
                        ✅ Checked In
                      </div>
                    )} */}
                    
                    {/* View Match Details Button */}
                    <button
                      onClick={() => navigate(`/matches/${match.id}?tab=${matchTypeFilter}`)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all text-sm"
                    >
                      View Match Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;

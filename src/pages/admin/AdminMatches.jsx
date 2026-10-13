import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Search,
  Loader,
  AlertCircle,
  Eye,
  Trophy,
  CheckCircle,
  PlayCircle,
  XCircle,
  Link as LinkIcon,
  Youtube,
  Filter,
  X,
  Copy,
  ExternalLink,
  User,
  Power
} from 'lucide-react';
import adminApi from '../../config/adminApi';
import api from '../../config/api';
import Pagination from '../../components/Pagination';
import toast from 'react-hot-toast';

const AdminMatches = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showLiveLinkModal, setShowLiveLinkModal] = useState(false);
  const [liveLink, setLiveLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [endingMatch, setEndingMatch] = useState(false);
  
  const [filters, setFilters] = useState({
    sport_id: '',
    status: '',
    date_from: '',
    date_to: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 12;

  // Handle search term debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchSports();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [filters, debouncedSearch, currentPage]);

  const fetchSports = async () => {
    try {
      const response = await api.get('/sports');
      setSports(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch sports:', err);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.sport_id) params.append('sport_id', filters.sport_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (debouncedSearch) params.append('search', debouncedSearch);

      params.append('limit', itemsPerPage);
      params.append('offset', (currentPage - 1) * itemsPerPage);

      const response = await adminApi.get(`/matches?${params.toString()}`);
      setMatches(response.data.data || []);
      setTotalItems(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      sport_id: '',
      status: '',
      date_from: '',
      date_to: ''
    });
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const hasActiveFilters = filters.sport_id || filters.status || filters.date_from || filters.date_to || searchTerm;

  const openLiveLinkModal = (match) => {
    setSelectedMatch(match);
    setLiveLink(match.match_live_link || '');
    setShowLiveLinkModal(true);
  };

  const closeLiveLinkModal = () => {
    setShowLiveLinkModal(false);
    setSelectedMatch(null);
    setLiveLink('');
  };

  const handleSaveLiveLink = async () => {
    if (!selectedMatch) return;

    // Validate YouTube link
    if (liveLink && !liveLink.includes('youtube.com') && !liveLink.includes('youtu.be')) {
      toast.error('Please provide a valid YouTube link');
      return;
    }

    try {
      setSavingLink(true);
      await adminApi.put(`/matches/${selectedMatch.id}/live-link`, {
        live_link: liveLink
      });

      toast.success('Live link updated successfully');
      closeLiveLinkModal();
      fetchMatches(); // Refresh matches
    } catch (err) {
      console.error('Failed to update live link:', err);
      toast.error(err.response?.data?.error || 'Failed to update live link');
    } finally {
      setSavingLink(false);
    }
  };

  const generateLiveUrl = (matchId) => {
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    return `${frontendUrl}/matches/${matchId}/live`;
  };

  const copyLiveUrl = (matchId) => {
    const liveUrl = generateLiveUrl(matchId);
    navigator.clipboard.writeText(liveUrl).then(() => {
      toast.success('Live URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const openEndMatchModal = (match) => {
    setSelectedMatch(match);
    setSelectedWinner(null);
    setShowEndMatchModal(true);
  };

  const closeEndMatchModal = () => {
    setShowEndMatchModal(false);
    setSelectedMatch(null);
    setSelectedWinner(null);
  };

  const handleEndMatch = async () => {
    if (!selectedMatch || !selectedWinner) {
      toast.error('Please select a winner');
      return;
    }

    try {
      setEndingMatch(true);
      await adminApi.put(`/matches/${selectedMatch.id}/end`, {
        winner_participant_id: selectedWinner
      });

      toast.success('Match ended and winner declared successfully');
      closeEndMatchModal();
      fetchMatches(); // Refresh matches
    } catch (err) {
      console.error('Failed to end match:', err);
      toast.error(err.response?.data?.error || 'Failed to end match');
    } finally {
      setEndingMatch(false);
    }
  };

  const toggleMatchActive = async (matchId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await adminApi.put(`/matches/${matchId}/toggle-active`, {
        is_active: newStatus
      });
      
      toast.success(`Match ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchMatches(); // Refresh list
    } catch (err) {
      console.error('Failed to toggle match status:', err);
      toast.error(err.response?.data?.error || 'Failed to update match status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock, label: 'Pending' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar, label: 'Scheduled' },
      ready: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: CheckCircle, label: 'Ready' },
      in_progress: { bg: 'bg-green-100', text: 'text-green-700', icon: PlayCircle, label: 'In Progress' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: CheckCircle, label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Cancelled' },
      postponed: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock, label: 'Postponed' },
      walkover: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Trophy, label: 'Walkover' }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 ${badge.bg} ${badge.text} text-[10px] font-semibold rounded-full`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  if (error && matches.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-auto"
            >
              <X className="w-3 h-3" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters - Single Row with Labels */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tournament or participants..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Sport Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sport
            </label>
            <select
              value={filters.sport_id}
              onChange={(e) => handleFilterChange('sport_id', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              <option value="">All Sports</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="ready">Ready</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
              <option value="walkover">Walkover</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      {loading && matches.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-100">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Matches Found</h3>
          <p className="text-sm text-gray-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3 relative">
          {/* Subtle loading overlay when table/grid is fetching next page or filters */}
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg transition-all duration-150">
              <div className="flex flex-col items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-100">
                <Loader className="w-8 h-8 animate-spin text-primary-500" />
                <span className="text-xs font-semibold text-gray-500">Loading matches...</span>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Tournament Header with Gradient */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-3 text-white">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-1">
                      <Trophy className="w-4 h-4 flex-shrink-0" />
                      <h3 className="font-bold text-sm line-clamp-2">
                        {match.is_standalone ? 'Standalone Match' : (match.tournament_name || 'Match')}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-primary-100">
                    <span>{match.sport_name || 'Sport'}</span>
                    {match.tournament_category && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{match.tournament_category}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    {!match.is_standalone && match.match_number && (
                      <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded">
                        Match #{match.match_number} • Round {match.round_number}
                      </span>
                    )}
                    {match.is_standalone && (
                      <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded">
                        Standalone
                      </span>
                    )}
                    {getStatusBadge(match.status)}
                  </div>
                  
                  {/* Winner Info in Header - Always show to maintain consistent layout */}
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                      <Trophy className="w-3 h-3" />
                      {match.status === 'completed' && match.winner_participant_id ? (
                        <span className="text-xs font-semibold">
                          Winner: {match.winner_participant_id === match.participant1_id 
                            ? match.participant1_name 
                            : match.participant2_name}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold">
                          Not Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3">
                  {/* Playing Between - Modern Side-by-Side */}
                  <div className="mb-3 p-3 bg-gradient-to-br from-primary-600 to-teal-700 rounded-lg shadow-md">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-2 text-center">
                      Playing Between
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-emerald-900/40 backdrop-blur-sm rounded-lg border border-primary-500/30 p-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="font-bold text-white text-xs truncate flex-1 min-w-0">
                            {match.participant1_name || 'TBD'}
                          </p>
                          
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-block px-2 py-1 bg-white text-primary-600 text-[10px] font-bold rounded-lg shadow-md">
                          VS
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 bg-emerald-900/40 backdrop-blur-sm rounded-lg border border-primary-500/30 p-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="font-bold text-white text-xs truncate flex-1 min-w-0">
                            {match.participant2_name || 'TBD'}
                          </p>
                          
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match Details - Compact Layout */}
                  <div className="space-y-1.5 mb-3">
                    {/* Date & Time - Side by Side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-gray-500">Date</p>
                          <p className="font-medium text-gray-900 text-[10px] truncate">{formatDate(match.match_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-gray-500">Time</p>
                          <p className="font-medium text-gray-900 text-[10px]">{formatTime(match.match_time)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Venue, YouTube, Referee - Single Line */}
                    <div className="flex items-center gap-2 text-[10px] bg-gray-50 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">
                          {match.venue_name || 'TBD'}
                        </span>
                      </div>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1">
                        <Youtube className="w-3 h-3 text-red-600 flex-shrink-0" />
                        {match.match_live_link ? (
                          <a
                            href={match.match_live_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <User className="w-3 h-3 text-purple-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">
                          {match.referee_first_name && match.referee_last_name
                            ? `${match.referee_first_name} ${match.referee_last_name}`
                            : <span className="text-gray-400">-</span>
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live URL Section */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                      <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                        Live Match URL
                      </p>
                    </div>
                    <div className="flex items-stretch gap-1.5">
                      <div className="flex-1 bg-white rounded-lg border border-gray-300 px-2 py-1.5 flex items-center">
                        <input
                          type="text"
                          value={generateLiveUrl(match.id)}
                          readOnly
                          className="w-full bg-transparent text-[10px] text-gray-700 font-mono outline-none select-all"
                        />
                      </div>
                      <button
                        onClick={() => copyLiveUrl(match.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-[10px] whitespace-nowrap"
                        title="Copy Live URL"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></span>
                      Share this URL to view live match updates
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-1.5">
                    {/* Active/Inactive Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMatchActive(match.id, match.is_active);
                      }}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all duration-200 shadow-md hover:shadow-lg ${
                        match.is_active
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
                      }`}
                      title={match.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {match.is_active ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      onClick={() => openLiveLinkModal(match)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      {match.match_live_link ? 'Edit YouTube Link' : 'Add YouTube Link'}
                    </button>

                    {/* End Match Button - Show for scheduled, in_progress, or completed matches */}
                    {(match.status === 'scheduled' || match.status === 'in_progress' || match.status === 'completed') && (
                      <button
                        onClick={() => openEndMatchModal(match)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        {match.status === 'completed' ? 'Update Winner' : 'End Match & Declare Winner'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Live Link Modal */}
      {showLiveLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedMatch?.match_live_link ? 'Edit' : 'Add'} Live Link
              </h3>
              <button
                onClick={closeLiveLinkModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Match: <span className="font-medium text-gray-900">{selectedMatch?.tournament_name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {selectedMatch?.participant1_name || 'TBD'} vs {selectedMatch?.participant2_name || 'TBD'}
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube Live Link
              </label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-600" />
                <input
                  type="url"
                  value={liveLink}
                  onChange={(e) => setLiveLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter a valid YouTube link for the live stream
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeLiveLinkModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLiveLink}
                disabled={savingLink}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingLink ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Link'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Match Modal */}
      {showEndMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedMatch?.status === 'completed' ? 'Update Winner' : 'End Match & Declare Winner'}
              </h3>
              <button
                onClick={closeEndMatchModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Match: <span className="font-medium text-gray-900">
                  {selectedMatch?.is_standalone ? 'Standalone Match' : selectedMatch?.tournament_name}
                </span>
              </p>
              <p className="text-sm text-gray-600 mb-6">
                {selectedMatch?.participant1_name || 'TBD'} vs {selectedMatch?.participant2_name || 'TBD'}
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Winner
              </label>
              
              <div className="space-y-3">
                {/* Participant 1 Option */}
                <button
                  onClick={() => setSelectedWinner(selectedMatch?.participant1_id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedWinner === selectedMatch?.participant1_id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedWinner === selectedMatch?.participant1_id
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedWinner === selectedMatch?.participant1_id && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">
                        {selectedMatch?.participant1_name || 'TBD'}
                      </p>
                      <p className="text-xs text-gray-500">Participant 1</p>
                    </div>
                  </div>
                </button>

                {/* Participant 2 Option */}
                <button
                  onClick={() => setSelectedWinner(selectedMatch?.participant2_id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedWinner === selectedMatch?.participant2_id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedWinner === selectedMatch?.participant2_id
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedWinner === selectedMatch?.participant2_id && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">
                        {selectedMatch?.participant2_name || 'TBD'}
                      </p>
                      <p className="text-xs text-gray-500">Participant 2</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeEndMatchModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndMatch}
                disabled={endingMatch || !selectedWinner}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {endingMatch ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Confirm Winner'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMatches;

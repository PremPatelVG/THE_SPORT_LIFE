import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTournaments, loadMoreTournaments, clearError, resetTournaments } from '../store/slices/tournamentSlice';
import { getSports } from '../services/sportService';
import Navbar from '../components/Navbar';
import { formatDate } from '../utils/dateFormatter';
import { getImageUrl } from '../utils/imageUtils';
import {
  Trophy,
  Search,
  Filter,
  Plus,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowRight,
  Clock,
  Activity,
  ChevronDown,
  X
} from 'lucide-react';

const Tournaments = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { tournaments, loading, loadingMore, error, pagination, hasMore } = useSelector((state) => state.tournament);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    format_type: '',
    sport_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const observerRef = useRef();
  const lastTournamentRef = useRef();

  useEffect(() => {
    dispatch(resetTournaments());
    dispatch(fetchTournaments({ ...filters, limit: 20, offset: 0 }));
    
    // Fetch sports list
    const fetchSportsList = async () => {
      setLoadingSports(true);
      try {
        const response = await getSports();
        setSports(response.data || []);
      } catch (error) {
        console.error('Failed to fetch sports:', error);
      } finally {
        setLoadingSports(false);
      }
    };
    
    fetchSportsList();
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(resetTournaments());
    dispatch(fetchTournaments({ ...filters, limit: 20, offset: 0 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      category: '',
      format_type: '',
      sport_id: ''
    });
    dispatch(resetTournaments());
    dispatch(fetchTournaments({ limit: 20, offset: 0 }));
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && tournaments.length > 0) {
      const nextOffset = pagination.offset + pagination.limit;
      dispatch(loadMoreTournaments({ ...filters, limit: 20, offset: nextOffset }));
    }
  }, [dispatch, filters, loadingMore, hasMore, pagination, tournaments.length]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    });

    if (lastTournamentRef.current) {
      observerRef.current.observe(lastTournamentRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMore, hasMore, loadingMore]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      open: { bg: 'bg-primary-100', text: 'text-primary-700', label: 'Open' },
      closed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Closed' },
      ongoing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ongoing' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      singles: '👤',
      doubles: '👥',
      teams: '🏆'
    };
    return icons[category] || '🏆';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      {/* Navbar */}
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-2 shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                  Tournaments
                </h1>
                <p className="text-sm text-gray-600">Browse and join tournaments</p>
              </div>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => navigate('/tournaments/create')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Tournament</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  showFilters
                    ? 'border-primary-500 text-primary-500 bg-primary-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Search
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sport</label>
                  <select
                    value={filters.sport_id}
                    onChange={(e) => handleFilterChange('sport_id', e.target.value)}
                    disabled={loadingSports}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{loadingSports ? 'Loading...' : 'All Sports'}</option>
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="">All Categories</option>
                    <option value="singles">Singles</option>
                    <option value="doubles">Doubles</option>
                    <option value="teams">Teams</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Format</label>
                  <select
                    value={filters.format_type}
                    onChange={(e) => handleFilterChange('format_type', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="">All Formats</option>
                    <option value="knockout">Knockout</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="groups_knockout">Groups + Knockout</option>
                  </select>
                </div>

                <div className="md:col-span-4 flex justify-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading tournaments...</p>
          </div>
        )}

        {/* Tournaments Grid */}
        {!loading && tournaments.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament, index) => (
                <div
                  key={tournament.id}
                  ref={index === tournaments.length - 1 ? lastTournamentRef : null}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 group cursor-pointer flex flex-col"
                  onClick={() => navigate(`/tournaments/${tournament.id}`)}
                >
                {/* Tournament Header */}
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-6 text-white relative overflow-hidden min-h-[180px] flex flex-col">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      {/* Tournament Logo or Category Icon */}
                      {tournament.logo ? (
                        <img
                          src={getImageUrl(tournament.logo)}
                          alt={tournament.name}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-white/30 shadow-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <div className="text-3xl" style={{ display: tournament.logo ? 'none' : 'block' }}>
                        {getCategoryIcon(tournament.category)}
                      </div>
                      {getStatusBadge(tournament.status)}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-primary-100 transition-colors">
                        {tournament.name}
                      </h3>
                      <p className="text-primary-100 text-sm font-medium">{tournament.sport_name}</p>
                    </div>
                  </div>
                </div>

                {/* Tournament Details */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <span>{formatDate(tournament.start_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 min-h-[20px]">
                      {tournament.venue_name ? (
                        <>
                          <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          <span className="line-clamp-1">{tournament.venue_name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No venue specified</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <span>
                        {tournament.participant_count || 0}
                        {tournament.max_participants && ` / ${tournament.max_participants}`} participants
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 min-h-[20px]">
                      {tournament.entry_fee > 0 ? (
                        <>
                          <DollarSign className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          <span className="font-semibold">₹{tournament.entry_fee}</span>
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          <span className="text-primary-500 font-semibold">Free Entry</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-primary-500 text-primary-500 font-semibold rounded-lg hover:bg-primary-50 transition-all duration-200 group/btn">
                    View Details
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
                </div>
              ))}
            </div>
            
            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500 mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium">Loading more tournaments...</p>
              </div>
            )}
            
            {/* End of Results */}
            {!hasMore && tournaments.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 font-medium">You've reached the end of the list</p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && tournaments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Tournaments Found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filters.search || filters.status || filters.category || filters.format_type || filters.sport_id
                ? 'Try adjusting your filters to find tournaments'
                : 'Be the first to create a tournament!'}
            </p>
            {isAuthenticated && (
              <button
                onClick={() => navigate('/tournaments/create')}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Tournament
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tournaments;

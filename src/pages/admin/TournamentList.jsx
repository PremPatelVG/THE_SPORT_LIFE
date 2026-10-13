import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  Loader,
  AlertCircle,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Power
} from 'lucide-react';
import adminApi from '../../config/adminApi';
import Pagination from '../../components/Pagination';
import toast from 'react-hot-toast';

const TournamentList = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    admin_approved: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Handle search term debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchTournaments();
  }, [filters, debouncedSearch, currentPage]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.admin_approved !== '') params.append('admin_approved', filters.admin_approved);
      if (debouncedSearch) params.append('search', debouncedSearch);

      params.append('limit', itemsPerPage);
      params.append('offset', (currentPage - 1) * itemsPerPage);

      const response = await adminApi.get(`/tournaments?${params.toString()}`);
      setTournaments(response.data.data || []);
      setTotalItems(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch tournaments:', err);
      setError('Failed to load tournaments');
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const toggleTournamentActive = async (tournamentId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await adminApi.put(`/tournaments/${tournamentId}/toggle-active`, {
        is_active: newStatus
      });
      
      toast.success(`Tournament and all its matches ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchTournaments(); // Refresh list
    } catch (err) {
      console.error('Failed to toggle tournament status:', err);
      toast.error(err.response?.data?.error || 'Failed to update tournament status');
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

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      open: { bg: 'bg-green-100', text: 'text-green-700', label: 'Open' },
      closed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Closed' },
      ongoing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ongoing' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Completed' }
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-1.5 py-0.5 ${badge.bg} ${badge.text} text-[10px] font-semibold rounded-full`}>
        {badge.label}
      </span>
    );
  };

  if (error && tournaments.length === 0) {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>

          {/* Approval Filter */}
          <select
            value={filters.admin_approved}
            onChange={(e) => handleFilterChange('admin_approved', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Approvals</option>
            <option value="true">Approved</option>
            <option value="false">Not Approved</option>
          </select>
        </div>
      </div>

      {/* Tournaments List */}
      {loading && tournaments.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-100">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Tournaments Found</h3>
          <p className="text-sm text-gray-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3 relative">
          {/* Subtle loading overlay when fetching next page or filters */}
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg transition-all duration-150">
              <div className="flex flex-col items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-100">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-xs font-semibold text-gray-500">Loading tournaments...</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow"
              >
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-gray-900 mb-1.5 line-clamp-1">{tournament.name}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getStatusBadge(tournament.status)}
                    {tournament.admin_approved ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-semibold rounded-full">
                        <Clock className="w-2.5 h-2.5" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Tournament Details - Compact */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Trophy className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-600">Sport:</span>
                    <span className="font-medium text-gray-900 truncate">{tournament.sport_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Calendar className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span className="text-gray-600">Start:</span>
                    <span className="font-medium text-gray-900">{formatDate(tournament.start_date)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                    <span className="text-gray-600">Venue:</span>
                    <span className="font-medium text-gray-900 truncate flex-1">{tournament.venue_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Users className="w-3 h-3 text-purple-600 flex-shrink-0" />
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-medium text-gray-900">{tournament.participant_count || 0}</span>
                  </div>
                </div>

                {/* Organizer & Action */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] flex-1 min-w-0">
                      <p className="text-gray-600">Organizer</p>
                      <p className="font-medium text-gray-900 truncate">
                        {tournament.organizer_first_name} {tournament.organizer_last_name}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTournamentActive(tournament.id, tournament.is_active);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        tournament.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={tournament.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <Power className="w-3 h-3" />
                      {tournament.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      navigate(`/admin/tournaments/${tournament.id}`);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
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
    </div>
  );
};

export default TournamentList;

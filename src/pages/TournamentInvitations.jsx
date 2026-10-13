import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Mail,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Loader,
  AlertCircle,
  Clock,
  Info,
  Award,
  Search,
  Filter
} from 'lucide-react';
import api from '../config/api';

const TournamentInvitations = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(searchParams.get('mode') || 'tournament'); // 'tournament' or 'referee'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'accepted', 'declined', 'locked'

  useEffect(() => {
    if (viewMode === 'tournament') {
      fetchInvitations();
    } else {
      fetchRefereeInvitations();
    }
  }, [viewMode]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/registrations/my-invitations');
      setInvitations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefereeInvitations = async () => {
    try {
      setLoading(true);
      // Get current user ID from auth
      const authResponse = await api.get('/auth/profile');
      const userId = authResponse.data.data.id;

      // Fetch referee assignment requests
      const response = await api.get(`/referees/${userId}/requests`);
      setInvitations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch referee invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (invitationId) => {
    navigate(`/tournaments/invitations/${invitationId}?mode=${viewMode}`);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending', icon: Clock },
      accepted: { bg: 'bg-primary-100', text: 'text-primary-600', label: 'Accepted', icon: CheckCircle },
      declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Declined', icon: XCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected', icon: XCircle },
      locked: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed', icon: CheckCircle }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                {viewMode === 'tournament' ? (
                  <><Mail className="w-8 h-8 text-primary-500" />Tournament Invitations</>
                ) : (
                  <><Award className="w-8 h-8 text-primary-500" />Referee Invitations</>
                )}
              </h1>
              <p className="text-gray-600 mt-2">
                {viewMode === 'tournament'
                  ? 'Review and respond to tournament invitations'
                  : 'Review and respond to referee assignment requests'
                }
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('tournament')}
                className={`px-4 py-2 rounded-md font-semibold transition-all ${viewMode === 'tournament'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Tournament
                </div>
              </button>
              <button
                onClick={() => setViewMode('referee')}
                className={`px-4 py-2 rounded-md font-semibold transition-all ${viewMode === 'referee'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Match official
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by tournament name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white font-semibold text-gray-700"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                {viewMode === 'tournament' && <option value="locked">Confirmed</option>}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-gray-900">
                  {invitations.filter(i => i.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-3xl font-bold text-gray-900">
                  {invitations.filter(i => i.status === 'accepted' || i.status === 'locked').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {invitations.length}
                </p>
              </div>
              <Mail className="w-10 h-10 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Invitations List */}
        {(() => {
          // Apply filters
          let filteredInvitations = invitations;
          
          // Filter by search query
          if (searchQuery.trim()) {
            filteredInvitations = filteredInvitations.filter(inv =>
              inv.tournament_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          // Filter by status
          if (statusFilter !== 'all') {
            filteredInvitations = filteredInvitations.filter(inv => inv.status === statusFilter);
          }
          
          return filteredInvitations.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {invitations.length === 0 ? 'No Invitations' : 'No Matching Invitations'}
              </h3>
              <p className="text-gray-600 mb-6">
                {invitations.length === 0 
                  ? "You don't have any tournament invitations yet"
                  : 'No invitations match your search criteria. Try adjusting your filters.'
                }
              </p>
              {invitations.length === 0 && (
                <button
                  onClick={() => navigate('/tournaments')}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  Browse Tournaments
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow flex flex-col"
              >
                {/* Header */}
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold flex-1 line-clamp-2">{invitation.tournament_name}</h3>
                    {getStatusBadge(invitation.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <span>{invitation.sport_name}</span>
                    </div>
                    {viewMode === 'tournament' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(invitation.start_date).toLocaleDateString()} - {new Date(invitation.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        {invitation.venue_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{invitation.venue_name}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {invitation.match_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(invitation.match_date).toLocaleDateString()}</span>
                            {invitation.match_time && <span>• {invitation.match_time}</span>}
                          </div>
                        )}
                        {invitation.venue_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{invitation.venue_name}</span>
                            {invitation.court_name && <span>• {invitation.court_name}</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Invitation Message */}
                  {invitation.notes && (
                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-1">Message from Organizer:</p>
                          <p className="text-xs text-blue-800 line-clamp-3">{invitation.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-3 mb-4 flex-1">

                    {/* Referee mode: Participants FIRST (full width) */}
                    {viewMode === 'referee' && (
                      <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Users className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-600 mb-1">Match Participants</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {invitation.participant1_name || 'TBD'}
                            </span>
                            <span className="text-xs font-bold text-orange-500  px-1.5 py-0.5 rounded flex-shrink-0">
                              vs
                            </span>
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {invitation.participant2_name || 'TBD'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Referee mode: Sport + Date side by side */}
                    {viewMode === 'referee' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Sport */}
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-3.5 h-3.5 text-primary-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Sport</p>
                            <p className="text-xs font-semibold text-gray-900 truncate">{invitation.sport_name}</p>
                          </div>
                        </div>
                        {/* Match Date */}
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Match Date</p>
                            <p className="text-xs font-semibold text-gray-900">
                              {invitation.match_date
                                ? new Date(invitation.match_date).toLocaleDateString()
                                : 'TBD'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Tournament mode: stacked layout */
                      <>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-4 h-4 text-primary-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-600">Sport</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{invitation.sport_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-600">Start Date</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(invitation.start_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {invitation.venue_name && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-600">Venue</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{invitation.venue_name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Invitation Info */}
                  <div className="p-3 bg-gray-50 rounded-lg mb-3 text-xs text-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <span>{viewMode === 'tournament' ? 'Invited' : 'Assigned'}:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(viewMode === 'tournament' ? invitation.requested_at : invitation.assigned_at).toLocaleDateString()}
                      </span>
                    </div>
                    {(invitation.organizer_name || invitation.assigned_by_first_name) && (
                      <div className="flex items-center justify-between">
                        <span>{viewMode === 'tournament' ? 'Organizer' : 'By'}:</span>
                        <span className="font-semibold text-gray-900 truncate ml-2">
                          {viewMode === 'tournament'
                            ? invitation.organizer_name
                            : `${invitation.assigned_by_first_name} ${invitation.assigned_by_last_name}`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Messages */}
                  {invitation.status === 'accepted' && (
                    <div className="p-2 bg-primary-50 border border-primary-200 rounded-lg text-center mb-3">
                      <p className="text-primary-600 text-xs font-semibold">
                        ✓ You have accepted this invitation
                      </p>
                    </div>
                  )}

                  {invitation.status === 'locked' && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-center mb-3">
                      <p className="text-blue-800 text-xs font-semibold">
                        ✓ Your participation is confirmed
                      </p>
                    </div>
                  )}

                  {invitation.status === 'declined' && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-center mb-3">
                      <p className="text-red-800 text-xs font-semibold">
                        You declined this invitation
                      </p>
                    </div>
                  )}

                  {/* View Invitation Details Button */}
                  <button
                    onClick={() => handleViewDetails(invitation.id)}
                    className="w-full px-4 py-2.5 mt-auto bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
          );
        })()}
      </div>
    </div>
  );
};

export default TournamentInvitations;

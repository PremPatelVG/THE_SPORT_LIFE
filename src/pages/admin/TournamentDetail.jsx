import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Activity
} from 'lucide-react';
import adminApi from '../../config/adminApi';
import toast from 'react-hot-toast';

const AdminTournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('participants');

  useEffect(() => {
    fetchTournamentDetails();
  }, [id]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch tournament details - adminApi will send admin token automatically
      // Use regular tournament endpoints (backend accepts admin tokens via flexibleAuth)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
      
      const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
        adminApi.get(`${API_BASE_URL}/tournaments/${id}`),
        adminApi.get(`${API_BASE_URL}/tournaments/${id}/participants`).catch(() => ({ data: { data: [] } })),
        adminApi.get(`${API_BASE_URL}/tournaments/${id}/matches`).catch(() => ({ data: { data: [] } }))
      ]);

      setTournament(tournamentRes.data.data);
      setParticipants(participantsRes.data.data || []);
      setMatches(matchesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      toast.error('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      published: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Published' },
      ongoing: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ongoing' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getApprovalBadge = (approved) => {
    if (approved === true) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-4 h-4" />
          Approved
        </span>
      );
    } else if (approved === false) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <XCircle className="w-4 h-4" />
          Rejected
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-4 h-4" />
          Pending
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tournament not found</p>
        <button
          onClick={() => navigate('/admin/tournaments')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Tournaments
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/tournaments')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Tournaments
        </button>
      </div>

      {/* Tournament Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tournament Details</h2>
              <p className="text-sm text-gray-500">Complete information</p>
            </div>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(tournament.status)}
            {getApprovalBadge(tournament.admin_approved)}
          </div>
        </div>

        {tournament.description && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600">{tournament.description}</p>
          </div>
        )}

        {/* Tournament Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-primary-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Start Date</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(tournament.start_date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-primary-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">End Date</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(tournament.end_date)}</p>
            </div>
          </div>

          {tournament.venue_name && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-primary-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Venue</p>
                <p className="text-sm font-semibold text-gray-900">{tournament.venue_name}</p>
                {tournament.venue_city && (
                  <p className="text-xs text-gray-500">{tournament.venue_city}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Activity className="w-5 h-5 text-primary-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Format</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {tournament.format_type?.replace('_', ' ') || tournament.format}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-primary-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Category</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{tournament.category}</p>
            </div>
          </div>
        </div>

        {/* Organizer Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Organized By</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
              {tournament.organizer_first_name?.[0]}{tournament.organizer_last_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {tournament.organizer_first_name} {tournament.organizer_last_name}
              </p>
              <p className="text-xs text-gray-500">{tournament.organizer_email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6">
            {['participants', 'matches'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Participants ({participants.length})
              </h3>
              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No participants yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {participants.map((participant, index) => {
                        // Determine participant name based on category
                        let participantName = '';
                        let participantType = 'Player';
                        
                        // For SINGLES category
                        if (participant.first_name && participant.last_name) {
                          participantName = `${participant.first_name} ${participant.last_name}`;
                          participantType = 'Player';
                        }
                        // For DOUBLES category
                        else if (participant.pair_name) {
                          participantName = participant.pair_name;
                          participantType = 'Pair';
                          // Add player names if available
                          if (participant.player1_first_name && participant.player2_first_name) {
                            participantName += ` (${participant.player1_first_name} ${participant.player1_last_name} & ${participant.player2_first_name} ${participant.player2_last_name})`;
                          }
                        }
                        // For TEAMS category
                        else if (participant.team_name) {
                          participantName = participant.team_name;
                          participantType = 'Team';
                          // Add member count if available
                          if (participant.member_count) {
                            participantName += ` (${participant.member_count} members)`;
                          }
                        }
                        // Fallback
                        else {
                          participantName = `Participant ${index + 1}`;
                        }
                        
                        // Determine status
                        const status = participant.status || 'active';
                        const statusConfig = {
                          locked: { bg: 'bg-green-100', text: 'text-green-800', label: 'Locked' },
                          accepted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Accepted' },
                          pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
                          rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
                          declined: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Declined' }
                        };
                        const statusStyle = statusConfig[status] || statusConfig.locked;
                        
                        return (
                          <tr key={participant.registration_id || participant.pair_id || participant.team_id || index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {participantName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{participantType}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{participant.seed || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                {statusStyle.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Matches ({matches.length})
              </h3>
              {matches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No matches scheduled yet</p>
              ) : (
                <div className="space-y-4">
                  {matches.map((match, index) => {
                    // Get participant names from match data or find in participants array
                    const getParticipantName = (participantId, fallbackName) => {
                      if (!participantId) return fallbackName || 'TBD';
                      
                      // Try to find participant in the participants array by matching IDs
                      const participant = participants.find(p => {
                        // For singles: match registration_id
                        if (p.registration_id === participantId) return true;
                        // For doubles: match pair_id
                        if (p.pair_id === participantId) return true;
                        // For teams: match team_id
                        if (p.team_id === participantId) return true;
                        return false;
                      });
                      
                      if (participant) {
                        // For SINGLES
                        if (participant.first_name && participant.last_name) {
                          return `${participant.first_name} ${participant.last_name}`;
                        }
                        // For DOUBLES
                        if (participant.pair_name) {
                          return participant.pair_name;
                        }
                        // For TEAMS
                        if (participant.team_name) {
                          return participant.team_name;
                        }
                      }
                      
                      return fallbackName || 'TBD';
                    };
                    
                    const participant1Name = match.participant1_name || 
                                            getParticipantName(match.participant1_id, 'TBD');
                    const participant2Name = match.participant2_name || 
                                            getParticipantName(match.participant2_id, 'TBD');
                    
                    return (
                      <div key={match.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">
                              {match.round_name || (match.round_number ? `Round ${match.round_number}` : 'Group Stage')} - Match {match.match_number || index + 1}
                            </p>
                            <p className="font-medium text-gray-900 mt-1">
                              {participant1Name} vs {participant2Name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {match.match_date ? formatDate(match.match_date) : formatDate(match.scheduled_time)}
                            </p>
                            <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                              match.status === 'completed' ? 'bg-green-100 text-green-800' :
                              match.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {match.status || 'Scheduled'}
                            </span>
                          </div>
                        </div>
                        {match.winner_participant_id && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              Winner: <span className="font-medium text-gray-900">
                                {match.winner_participant_id === match.participant1_id ? participant1Name : participant2Name}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTournamentDetail;

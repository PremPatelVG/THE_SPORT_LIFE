import { useState, useEffect } from 'react';
import {
  Users,
  User,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Search,
  Filter,
  Loader
} from 'lucide-react';
import { getParticipants } from '../services/tournamentService';
import { formatDate } from '../utils/dateFormatter';
import { getImageUrl, getUserInitials } from '../utils/imageUtils';
import ParticipantDetailsModal from './ParticipantDetailsModal';

const TournamentParticipantsView = ({ tournamentId, category, tournament }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showParticipantDetails, setShowParticipantDetails] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  useEffect(() => {
    fetchParticipants();
  }, [tournamentId]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const data = await getParticipants(tournamentId);
      // console.log('TournamentParticipantsView - Fetched participants:', data);
      setParticipants(data || []);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pending' },
      confirmed: { bg: 'bg-primary-100', text: 'text-primary-600', icon: CheckCircle, label: 'Confirmed' },
      withdrawn: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Withdrawn' }
    };

    const { bg, text, icon: Icon, label } = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${bg} ${text}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Payment Pending' },
      paid: { bg: 'bg-primary-100', text: 'text-primary-600', label: 'Paid' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Refunded' }
    };

    const { bg, text, label } = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${bg} ${text}`}>
        <DollarSign className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const filteredParticipants = Array.isArray(participants) ? participants.filter(p => {
    // Filter by status
    if (filter !== 'all' && p.status !== filter) return false;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = category === 'teams' 
        ? p.team_name?.toLowerCase() 
        : `${p.first_name} ${p.last_name}`.toLowerCase();
      return name.includes(query);
    }
    
    return true;
  }) : [];

  const stats = {
    total: Array.isArray(participants) ? participants.length : 0,
    confirmed: Array.isArray(participants) ? participants.filter(p => p.status === 'confirmed').length : 0,
    pending: Array.isArray(participants) ? participants.filter(p => p.status === 'pending').length : 0,
    withdrawn: Array.isArray(participants) ? participants.filter(p => p.status === 'withdrawn').length : 0
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Participants</h3>
            <p className="text-sm text-gray-600">
              {stats.confirmed} confirmed, {stats.pending} pending
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-primary-50 rounded-lg p-3">
          <p className="text-xs text-primary-500 mb-1">Confirmed</p>
          <p className="text-2xl font-bold text-primary-600">{stats.confirmed}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <p className="text-xs text-yellow-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs text-red-600 mb-1">Withdrawn</p>
          <p className="text-2xl font-bold text-red-700">{stats.withdrawn}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${category === 'teams' ? 'teams' : 'participants'}...`}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {['all', 'confirmed', 'pending', 'withdrawn'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === status
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Participants List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading participants...</p>
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Participants</h3>
          <p className="text-gray-600">
            {searchQuery || filter !== 'all'
              ? 'No participants match your filters'
              : 'No one has registered yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredParticipants.map((participant) => (
            <div
              key={participant.id}
              onClick={() => {
                setSelectedParticipant(participant);
                setShowParticipantDetails(true);
              }}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Avatar/Icon with Profile Picture */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  {participant.participant_image ? (
                    <img 
                      src={getImageUrl(participant.participant_image)} 
                      alt={participant.participant_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ display: participant.participant_image ? 'none' : 'flex' }}
                  >
                    {category === 'teams' ? (
                      <Shield className="w-6 h-6" />
                    ) : participant.participant_type === 'doubles' ? (
                      <Users className="w-6 h-6" />
                    ) : participant.participant_name ? (
                      participant.participant_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {category === 'teams' ? participant.team_name : `${participant.participant_name}`}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                    {participant.seed_number && (
                      <span className="font-semibold">Seed #{participant.seed_number}</span>
                    )}
                    {participant.member_count && (
                      <span className="text-gray-500">• {participant.member_count} members</span>
                    )}
                    {participant.players && participant.players.length > 0 && (
                      <span className="text-gray-500">• {participant.players.length} players</span>
                    )}
                    <span>
                      Registered: {formatDate(participant.registration_date)}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-col gap-2 items-end">
                  {getStatusBadge(participant.status)}
                  {participant.payment_status && getPaymentBadge(participant.payment_status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Participant Details Modal */}
      {showParticipantDetails && selectedParticipant && (
        <ParticipantDetailsModal
          participant={selectedParticipant}
          tournament={tournament}
          onClose={() => {
            setShowParticipantDetails(false);
            setSelectedParticipant(null);
          }}
        />
      )}
    </div>
  );
};

export default TournamentParticipantsView;

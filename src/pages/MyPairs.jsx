import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import {
  Users,
  Trophy,
  Mail,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  LogOut,
  Search,
  Filter
} from 'lucide-react';

const MyPairs = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'tournament', 'reusable', 'invitations'
  const [pairs, setPairs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [sports, setSports] = useState([]);

  useEffect(() => {
    fetchPairs();
    fetchInvitations();
    fetchSports();
  }, []);

  const fetchPairs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pairs/my-pairs', {
        params: { filter: activeTab === 'invitations' ? 'all' : activeTab }
      });
      setPairs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pairs:', error);
      toast.error('Failed to load pairs');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/pairs/my-invitations');
      setInvitations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchSports = async () => {
    try {
      const response = await api.get('/sports');
      setSports(response.data.data || []);
    } catch (error) {
      console.error('Error fetching sports:', error);
    }
  };

  useEffect(() => {
    if (activeTab !== 'invitations') {
      fetchPairs();
    }
  }, [activeTab]);

  const handleAcceptInvitation = async (invitationId, sportId) => {
    try {
      await api.post(`/pairs/invitations/${invitationId}/accept`, {
        sport_id: sportId
      });
      toast.success('Invitation accepted! Pair created successfully.');
      fetchPairs();
      fetchInvitations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await api.post(`/pairs/invitations/${invitationId}/reject`);
      toast.success('Invitation rejected');
      fetchInvitations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject invitation');
    }
  };

  const handleDeletePair = async (pairId) => {
    if (!window.confirm('Are you sure you want to delete this pair?')) return;
    
    try {
      await api.delete(`/pairs/${pairId}`);
      toast.success('Pair deleted successfully');
      fetchPairs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete pair');
    }
  };

  const handleLeavePair = async (pairId) => {
    if (!window.confirm('Are you sure you want to leave this pair?')) return;
    
    try {
      await api.post(`/pairs/${pairId}/leave`);
      toast.success('You have left the pair');
      fetchPairs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave pair');
    }
  };

  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = pair.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pair.player1_first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pair.player2_first_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = selectedSport === 'all' || pair.sport_id === parseInt(selectedSport);
    return matchesSearch && matchesSport;
  });

  const allPairs = filteredPairs;
  const tournamentPairs = filteredPairs.filter(p => p.tournament_id !== null);
  const reusablePairs = filteredPairs.filter(p => p.tournament_id === null);

  const renderPairCard = (pair) => (
    <div
      key={pair.id}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
    >
      <div className="p-6">
        {/* Pair Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{pair.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Trophy className="w-4 h-4" />
              <span>{pair.sport_name}</span>
            </div>
          </div>
          {pair.pair_type === 'reusable' && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              Reusable
            </span>
          )}
          {pair.tournament_id && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              Tournament
            </span>
          )}
        </div>

        {/* Players */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {pair.player1_first_name?.[0]}{pair.player1_last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {pair.player1_first_name} {pair.player1_last_name}
              </p>
              <p className="text-xs text-gray-500">Player 1</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {pair.player2_first_name?.[0]}{pair.player2_last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {pair.player2_first_name} {pair.player2_last_name}
              </p>
              <p className="text-xs text-gray-500">Player 2</p>
            </div>
          </div>
        </div>

        {/* Tournament Info */}
        {pair.tournament_name && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Tournament:</span> {pair.tournament_name}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => navigate(`/pairs/${pair.id}`)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
          
          {pair.tournament_id === null && (
            <>
              <button
                onClick={() => handleLeavePair(pair.id)}
                className="px-4 py-2 bg-yellow-100 text-yellow-700 font-semibold rounded-lg hover:bg-yellow-200 transition-colors"
                title="Leave Pair"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDeletePair(pair.id)}
                className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-colors"
                title="Delete Pair"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderInvitationCard = (invitation) => (
    <div
      key={invitation.id}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white">
            <Mail className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Pair Invitation
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-semibold">{invitation.inviter_first_name} {invitation.inviter_last_name}</span>
              {' '}invited you to form a pair
            </p>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span>Invited {formatDate(invitation.invited_at)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Prompt for sport selection if needed
                  const sportId = prompt('Enter sport ID:');
                  if (sportId) {
                    handleAcceptInvitation(invitation.id, parseInt(sportId));
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => handleRejectInvitation(invitation.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-2 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  My Pairs
                </h1>
                <p className="text-sm text-gray-600">Manage your pairs and invitations</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/pairs/create')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Pair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6 p-1">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Pairs
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {allPairs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tournament')}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'tournament'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tournament Pairs
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {tournamentPairs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('reusable')}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'reusable'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Reusable Pairs
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {reusablePairs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'invitations'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Invitations
              {invitations.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                  {invitations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        {activeTab !== 'invitations' && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search pairs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="sm:w-48 relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Sports</option>
                  {sports.map(sport => (
                    <option key={sport.id} value={sport.id}>{sport.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'invitations' ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {invitations.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invitations</h3>
                    <p className="text-gray-600">You don't have any pending pair invitations</p>
                  </div>
                ) : (
                  invitations.map(renderInvitationCard)
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(activeTab === 'all' ? allPairs : activeTab === 'tournament' ? tournamentPairs : reusablePairs).length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pairs Found</h3>
                    <p className="text-gray-600 mb-4">
                      {activeTab === 'all' && "You don't have any pairs yet"}
                      {activeTab === 'tournament' && "You don't have any tournament pairs"}
                      {activeTab === 'reusable' && "You don't have any reusable pairs"}
                    </p>
                    <button
                      onClick={() => navigate('/pairs/create')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      Create Your First Pair
                    </button>
                  </div>
                ) : (
                  (activeTab === 'all' ? allPairs : activeTab === 'tournament' ? tournamentPairs : reusablePairs).map(renderPairCard)
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MyPairs;

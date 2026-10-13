import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  ArrowLeft, 
  Trophy, 
  Target,
  TrendingUp,
  Edit,
  Trash2,
  UserMinus,
  Crown,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  Lock,
  Unlock,
  X,
  Search,
  Eye
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PlayerProfileModal from '../components/PlayerProfileModal';
import api from '../config/api';
import toast from 'react-hot-toast';

const PairDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'pairs';
  const tabParam = searchParams.get('tab') || 'all';
  
  const [pair, setPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members'); // members, statistics
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [editedMemberData, setEditedMemberData] = useState({ jersey_number: '', position: '' });
  const [lockLoading, setLockLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedNewPlayer, setSelectedNewPlayer] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const response = await api.get(`/pairs/${id}/invitations`);
      setInvitations(response.data.data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchPairDetails();
    fetchInvitations();
  }, [id]);

  useEffect(() => {
    // Debounce search
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const fetchPairDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/pairs/${id}`);
      setPair(response.data.data);
      setEditedName(response.data.data.name);
    } catch (error) {
      toast.error('Failed to load pair details');
      navigate(`/my-teams?view=${viewParam}&tab=${tabParam}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePair = async () => {
    try {
      await api.put(`/pairs/${id}`, { name: editedName });
      toast.success('Pair updated successfully!');
      setShowEditModal(false);
      fetchPairDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update pair');
    }
  };

  const handleDeletePair = async () => {
    try {
      await api.delete(`/pairs/${id}`);
      toast.success('Pair deleted successfully!');
      navigate(`/my-teams?view=${viewParam}&tab=${tabParam}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete pair');
    }
  };

  const handleLockToggle = async () => {
    try {
      setLockLoading(true);
      const endpoint = pair.status === 'locked' ? 'unlock' : 'lock';
      await api.put(`/pairs/${id}/${endpoint}`);
      toast.success(`Pair ${pair.status === 'locked' ? 'unlocked' : 'locked'} successfully!`);
      fetchPairDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle lock');
    } finally {
      setLockLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    try {
      await api.delete(`/pairs/${id}/members/${selectedMember.id}`);
      toast.success('Member removed successfully!');
      setShowRemoveMemberModal(false);
      setSelectedMember(null);
      fetchPairDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedNewPlayer) {
      toast.error('Please select a new player');
      return;
    }

    try {
      // Replace member - send invitation to new player
      await api.post(`/pairs/${id}/replace-member`, {
        old_player_id: selectedMember.id,
        new_player_id: selectedNewPlayer.id
      });
      toast.success('Invitation sent to new player!');
      setShowEditMemberModal(false);
      setSelectedMember(null);
      setSelectedNewPlayer(null);
      setSearchTerm('');
      setUsers([]);
      fetchPairDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to replace member');
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedNewPlayer) {
      toast.error('Please select a player');
      return;
    }

    try {
      setSendingInvite(true);
      await api.post(`/pairs/${id}/invite`, {
        user_id: selectedNewPlayer.id
      });
      toast.success('Invitation sent successfully!');
      setShowInviteModal(false);
      setSelectedNewPlayer(null);
      setSearchTerm('');
      setUsers([]);
      fetchPairDetails();
      fetchInvitations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleLeavePair = async () => {
    if (!window.confirm('Are you sure you want to leave this pair?')) {
      return;
    }

    try {
      await api.post(`/pairs/${id}/leave`);
      toast.success('Left pair successfully!');
      navigate(`/my-teams?view=${viewParam}&tab=${tabParam}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave pair');
    }
  };

  const searchUsers = async () => {
    if (searchTerm.length < 2) {
      setUsers([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const response = await api.get('/users/search', {
        params: { q: searchTerm }
      });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    if (showEditMemberModal) {
      searchUsers();
    }
  }, [searchTerm, showEditMemberModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pair details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pair) {
    return null;
  }

  const isOwner = pair.created_by === pair.current_user_id;
  const isPlayer1 = pair.player1_id === pair.current_user_id;
  const isPlayer2 = pair.player2_id === pair.current_user_id;

  // Only show Invitations tab for pair owner
  const tabs = [
    { id: 'members', label: 'Members' },
    ...(isOwner ? [{ id: 'invitations', label: 'Invitations' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      <Navbar />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/my-teams?view=${viewParam}&tab=${tabParam}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-3 shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  {pair.name}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-gray-600">{pair.sport_name}</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    pair.pair_type === 'tournament'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {pair.pair_type === 'tournament' ? 'Tournament' : 'Reusable'}
                  </span>
                  {isOwner && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                      <Crown className="w-3 h-3" />
                      Owner
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {isOwner && (
                <>
                  <button
                    onClick={handleLockToggle}
                    disabled={lockLoading}
                    className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg transition-colors ${
                      pair.status === 'locked'
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    {lockLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : pair.status === 'locked' ? (
                      <Unlock className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {pair.status === 'locked' ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={() => setShowEditModal(true)}
                    disabled={pair.status === 'locked'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
              {!isOwner && (isPlayer1 || isPlayer2) && (
                <button
                  onClick={handleLeavePair}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  Leave Pair
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-semibold text-gray-500">MATCHES</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600 mt-1">Total Matches</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-green-600" />
              <span className="text-sm font-semibold text-gray-500">WINS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600 mt-1">Victories</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-sm font-semibold text-gray-500">WIN RATE</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">0.0%</p>
            <p className="text-sm text-gray-600 mt-1">Success Rate</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={` py-4 px-6  font-semibold transition-all duration-200 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'members' && (
              <div className="space-y-4">
                {/* Members Header */}
                <div className="flex items-center justify-between mb-4">
                  
                  {isOwner && pair.status !== 'locked' && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <UserCheck className="w-5 h-5" />
                      Invite Player
                    </button>
                  )}
                </div>

                {/* Check if no members */}
                {!pair.player1_id && !pair.player2_id ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Members Yet</h3>
                    <p className="text-gray-600 mb-6">Send invitations to players to join this pair</p>
                  </div>
                ) : (
                  <>
                    {/* Player 1 */}
                    {pair.player1_id ? (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {pair.player1_first_name?.charAt(0)}{pair.player1_last_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {pair.player1_name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {pair.player1_email && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  {pair.player1_email}
                                </div>
                              )}
                              {pair.player1_phone && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Phone className="w-3 h-3" />
                                  {pair.player1_phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pair.player1_id === pair.created_by && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                              <Crown className="w-3 h-3" />
                              Owner
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (pair.player1_id) {
                                setSelectedPlayerId(pair.player1_id);
                                setShowPlayerModal(true);
                              }
                            }}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View player profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedMember({ id: pair.player1_id, name: pair.player1_name });
                                  setEditedMemberData({ jersey_number: '', position: '' });
                                  setShowEditMemberModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit member"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMember({ id: pair.player1_id, name: pair.player1_name });
                                  setShowRemoveMemberModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove member"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-500">Player 1 - Empty Slot</p>
                            <p className="text-sm text-gray-400">Send invitation to fill this slot</p>
                          </div>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            Send Invitation
                          </button>
                        )}
                      </div>
                    )}

                    {/* Player 2 */}
                    {pair.player2_id ? (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {pair.player2_first_name?.charAt(0)}{pair.player2_last_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {pair.player2_name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {pair.player2_email && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  {pair.player2_email}
                                </div>
                              )}
                              {pair.player2_phone && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Phone className="w-3 h-3" />
                                  {pair.player2_phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pair.player2_id === pair.created_by && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                              <Crown className="w-3 h-3" />
                              Owner
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (pair.player2_id) {
                                setSelectedPlayerId(pair.player2_id);
                                setShowPlayerModal(true);
                              }
                            }}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View player profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedMember({ id: pair.player2_id, name: pair.player2_name });
                                  setEditedMemberData({ jersey_number: '', position: '' });
                                  setShowEditMemberModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit member"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMember({ id: pair.player2_id, name: pair.player2_name });
                                  setShowRemoveMemberModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove member"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-500">Player 2 - Empty Slot</p>
                            <p className="text-sm text-gray-400">Send invitation to fill this slot</p>
                          </div>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            Send Invitation
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'invitations' && (
              <div className="space-y-4">
                {loadingInvitations ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading invitations...</p>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Invitations Sent</h3>
                    <p className="text-gray-600">Send invitations to players to join this pair</p>
                  </div>
                ) : (
                  invitations.map((invitation) => (
                    <div 
                      key={invitation.id} 
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        
                        const userId = invitation.user_id || invitation.invited_user_id;
                        
                        if (userId) {
                          setSelectedPlayerId(userId);
                          setShowPlayerModal(true);
                        } else {
                          console.error('No user_id found in invitation:', invitation);
                        }
                      }}
                      title="Click to view player profile"
                    >
                      <div className="flex items-center gap-4">
                        {invitation.profile_image ? (
                          <img 
                            src={invitation.profile_image} 
                            alt={`${invitation.first_name} ${invitation.last_name}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {invitation.first_name?.charAt(0)}{invitation.last_name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {invitation.first_name} {invitation.last_name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {invitation.email && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Mail className="w-3 h-3" />
                                {invitation.email}
                              </div>
                            )}
                            {invitation.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Phone className="w-3 h-3" />
                                {invitation.phone}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Invited {new Date(invitation.invited_at).toLocaleDateString()}
                            {invitation.responded_at && ` • Responded ${new Date(invitation.responded_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                            Pending
                          </span>
                        )}
                        {invitation.status === 'accepted' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            ✓ Accepted
                          </span>
                        )}
                        {invitation.status === 'rejected' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            ✗ Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'statistics' && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Statistics Yet</h3>
                <p className="text-gray-600">Play matches to see statistics here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Pair</h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pair Name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                placeholder="Enter pair name"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePair}
                className="flex-1 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Pair?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this pair? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePair}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {showRemoveMemberModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Remove Member?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{selectedMember.name}</strong> from this pair?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setSelectedMember(null);
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Member Modal */}
      {showEditMemberModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Replace Member</h2>
              <button
                onClick={() => {
                  setShowEditMemberModal(false);
                  setSelectedMember(null);
                  setSelectedNewPlayer(null);
                  setSearchTerm('');
                  setUsers([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Replacing: <strong>{selectedMember.name}</strong>
            </p>
            
            {/* Search New Player */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search New Player
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Search Results */}
              {searchingUsers && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              )}

              {users.length > 0 && !searchingUsers && (
                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {users.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedNewPlayer(user);
                        setSearchTerm(`${user.first_name} ${user.last_name}`);
                        setUsers([]);
                      }}
                      className={`w-full p-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedNewPlayer?.id === user.id ? 'bg-purple-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && users.length === 0 && !searchingUsers && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                  No users found
                </div>
              )}

              {/* Selected New Player */}
              {selectedNewPlayer && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-2">New Player:</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedNewPlayer.first_name?.[0]}{selectedNewPlayer.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedNewPlayer.first_name} {selectedNewPlayer.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{selectedNewPlayer.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditMemberModal(false);
                  setSelectedMember(null);
                  setSelectedNewPlayer(null);
                  setSearchTerm('');
                  setUsers([]);
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={!selectedNewPlayer}
                className="flex-1 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Send Invitation</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedNewPlayer(null);
                  setSearchTerm('');
                  setUsers([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Search and select a player to invite to this pair
            </p>
            
            {/* Search Player */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Player
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Search Results */}
              {searchingUsers && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              )}

              {users.length > 0 && !searchingUsers && (
                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {users.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedNewPlayer(user);
                        setSearchTerm(`${user.first_name} ${user.last_name}`);
                        setUsers([]);
                      }}
                      className={`w-full p-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedNewPlayer?.id === user.id ? 'bg-purple-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && users.length === 0 && !searchingUsers && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                  No players found
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedNewPlayer(null);
                  setSearchTerm('');
                  setUsers([]);
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={!selectedNewPlayer || sendingInvite}
                className="flex-1 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingInvite ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {showPlayerModal && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

export default PairDetails;

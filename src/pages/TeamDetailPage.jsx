import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import PlayerProfileModal from '../components/PlayerProfileModal';
import api from '../config/api';
import toast from 'react-hot-toast';
import {
  Users,
  Trophy,
  Crown,
  Shield,
  Mail,
  Phone,
  Calendar,
  MapPin,
  TrendingUp,
  Target,
  Award,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Settings,
  CheckCircle,
  XCircle,
  Minus,
  X,
  Send,
  Lock,
  Unlock
} from 'lucide-react';

const TeamDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'teams';
  const tabParam = searchParams.get('tab') || 'all';
  const { user } = useSelector((state) => state.auth);
  
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members'); // members, statistics, pending, rejected
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [invitationStatuses, setInvitationStatuses] = useState({});
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [rejectedInvitations, setRejectedInvitations] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [locking, setLocking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    max_players: 11,
    description: ''
  });
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);

  useEffect(() => {
    fetchTeamDetails();
    fetchInvitations();
  }, [id]);

  const fetchTeamDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/teams/${id}`);
      setTeam(response.data.data);
    } catch (error) {
      toast.error('Failed to load team details');
      navigate(`/my-teams?view=${viewParam}&tab=${tabParam}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await api.get(`/teams/${id}/invitations`);
      const invitations = response.data.data || [];
      
      // Separate pending and rejected invitations
      setPendingInvitations(invitations.filter(inv => inv.status === 'pending'));
      setRejectedInvitations(invitations.filter(inv => inv.status === 'rejected'));
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setInvitationStatuses({});
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      const users = response.data.data || [];
      setSearchResults(users);
      
      // Fetch invitation statuses for all users
      if (users.length > 0) {
        const userIds = users.map(u => u.id).join(',');
        try {
          const statusResponse = await api.get(`/teams/${id}/invitation-statuses?userIds=${userIds}`);
          const statuses = {};
          statusResponse.data.data.forEach(item => {
            statuses[item.user_id] = item.status;
          });
          setInvitationStatuses(statuses);
        } catch (error) {
          console.error('Failed to fetch invitation statuses:', error);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setInvitationStatuses({});
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedUser(null);
    
    // Debounce search
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    window.searchTimeout = setTimeout(() => {
      searchUsers(query);
    }, 300);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchQuery(`${user.first_name} ${user.last_name}`);
    setSearchResults([]);
  };

  const handleInvitePlayer = async () => {
    if (!selectedUser) {
      toast.error('Please select a user to invite');
      return;
    }

    // Check if user already has a pending invitation or is a member
    const userStatus = invitationStatuses[selectedUser.id];
    if (userStatus === 'pending') {
      toast.error('This user already has a pending invitation');
      return;
    }
    if (userStatus === 'member' || team.members?.some(m => m.user_id === selectedUser.id)) {
      toast.error('This user is already a member of the team');
      return;
    }

    setInviting(true);
    try {
      await api.post(`/teams/${id}/invite`, { user_id: selectedUser.id });
      toast.success('Invitation sent successfully!');
      setShowInviteModal(false);
      setSearchQuery('');
      setSelectedUser(null);
      setSearchResults([]);
      setInvitationStatuses({});
      
      // Refresh both team details and invitations to update pending list in real-time
      await Promise.all([
        fetchTeamDetails(),
        fetchInvitations()
      ]);
      
      // Switch to pending tab to show the new invitation
      setActiveTab('pending');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleLockTeam = async () => {
    if (!window.confirm('Are you sure you want to lock this team? Once locked, no one can invite, remove, or request to join.')) {
      return;
    }

    setLocking(true);
    try {
      await api.put(`/teams/${id}/lock`);
      toast.success('Team locked successfully!');
      fetchTeamDetails(); // Refresh team data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock team');
    } finally {
      setLocking(false);
    }
  };

  const handleUnlockTeam = async () => {
    if (!window.confirm('Are you sure you want to unlock this team?')) {
      return;
    }

    setLocking(true);
    try {
      await api.put(`/teams/${id}/unlock`);
      toast.success('Team unlocked successfully!');
      fetchTeamDetails(); // Refresh team data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlock team');
    } finally {
      setLocking(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      await api.delete(`/teams/${id}/members/${memberId}`);
      toast.success('Member removed successfully');
      fetchTeamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm('Are you sure you want to leave this team?')) {
      return;
    }

    try {
      await api.post(`/teams/${id}/leave`);
      toast.success('You have left the team successfully');
      navigate(`/my-teams?view=${viewParam}&tab=${tabParam}`);
    } catch (error){
      toast.error(error.response?.data?.message || 'Failed to leave team');
    }
  };

  const handleOpenSettings = () => {
    // Populate form with current team data
    setTeamForm({
      name: team.name || '',
      max_players: team.max_players || 11,
      description: team.description || ''
    });
    setShowSettingsModal(true);
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.put(`/teams/${id}`, teamForm);
      toast.success('Team updated successfully!');
      setShowSettingsModal(false);
      fetchTeamDetails(); // Refresh team data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update team');
    } finally {
      setUpdating(false);
    }
  };

  const getWinRate = () => {
    if (!team?.matchStats || team.matchStats.total_matches === 0) return 0;
    return ((team.matchStats.wins / team.matchStats.total_matches) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading team details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const isCreator = team.creator_id === user?.id;
  const isCaptain = team.captain_id === user?.id;
  const canManage = isCreator || isCaptain;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(`/my-teams?view=${viewParam}&tab=${tabParam}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Teams</span>
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {team.logo ? (
                <div className="rounded-2xl shadow-lg overflow-hidden w-20 h-20">
                  <img 
                    src={team.logo} 
                    alt={`${team.name} logo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-4 shadow-lg w-20 h-20 flex items-center justify-center"><svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div>';
                    }}
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-4 shadow-lg">
                  <Users className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-gray-600">{team.sport_name || 'Unknown Sport'}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    team.team_type === 'tournament'
                      ? 'bg-purple-100 text-purple-700'
                      : team.team_type === 'temporary'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {team.team_type === 'tournament' ? 'Tournament Team' : team.team_type === 'temporary' ? 'Temporary' : 'Reusable'}
                  </span>
                  {team.status && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      team.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                    </span>
                  )}
                  {team.locked_at && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {canManage && (
                <>
                  {team.status !== 'locked' && (
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span>Invite Player</span>
                    </button>
                  )}
                  
                  {isCreator && (
                    team.status === 'locked' ? (
                      <button 
                        onClick={handleUnlockTeam}
                        disabled={locking}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {locking ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Unlocking...</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-5 h-5" />
                            <span>Unlock Team</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button 
                        onClick={handleLockTeam}
                        disabled={locking}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {locking ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Locking...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-5 h-5" />
                            <span>Lock Team</span>
                          </>
                        )}
                      </button>
                    )
                  )}
                  
                  {team.status !== 'locked' && (
                    <button 
                      onClick={handleOpenSettings}
                      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </button>
                  )}
                </>
              )}
              
              {/* Leave Team button for regular members (not owner/captain) */}
              {!canManage && team.members?.some(m => m.user_id === user?.id) && team.status !== 'locked' && (
                <button 
                  onClick={handleLeaveTeam}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  <UserMinus className="w-5 h-5" />
                  <span>Leave Team</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Members */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-semibold text-gray-500">MEMBERS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {team.statistics?.total_members || 0} / {team.max_players}
            </p>
          </div>

          {/* Matches Played */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-purple-600" />
              <span className="text-sm font-semibold text-gray-500">MATCHES</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {team.matchStats?.total_matches || 0}
            </p>
          </div>

          {/* Wins */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-yellow-600" />
              <span className="text-sm font-semibold text-gray-500">WINS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {team.matchStats?.wins || 0}
            </p>
          </div>

          {/* Win Rate */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-sm font-semibold text-gray-500">WIN RATE</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {getWinRate()}%
            </p>
          </div>
        </div>

        {/* Tournament Info (if applicable) */}
        {team.tournament_name && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary-600" />
              <div>
                <p className="text-sm text-gray-500">Tournament</p>
                <p className="text-lg font-semibold text-gray-900">{team.tournament_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === 'members'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Team Members ({team.members?.length || 0})
              </button>
              
              {/* Only show Pending and Rejected tabs to owner/captain */}
              {(isCreator || isCaptain) && (
                <>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 border-b-2 ${
                      activeTab === 'pending'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pending ({pendingInvitations.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('rejected')}
                    className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 border-b-2 ${
                      activeTab === 'rejected'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Rejected ({rejectedInvitations.length})
                  </button>
                </>
              )}
              
              <button
                onClick={() => setActiveTab('statistics')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === 'statistics'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Match Statistics
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'members' && (
              <div className="space-y-4">
                {team.members && team.members.length > 0 ? (
                  team.members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedPlayerId(member.user_id);
                          setShowPlayerProfile(true);
                        }}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            {member.user_id === team.creator_id && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <Crown className="w-3 h-3" />
                                Owner
                              </span>
                            )}
                            {member.user_id === team.captain_id && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                <Shield className="w-3 h-3" />
                                Captain
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            {member.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {member.email}
                              </span>
                            )}
                            {member.position && (
                              <span className="font-medium text-primary-600">
                                {member.position}
                              </span>
                            )}
                            {member.jersey_number && (
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded font-bold text-xs">
                                #{member.jersey_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {canManage && team.status !== 'locked' && member.user_id !== team.creator_id && (
                        <button 
                          onClick={() => handleRemoveMember(member.user_id, `${member.first_name} ${member.last_name}`)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No members yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="space-y-4">
                {pendingInvitations.length > 0 ? (
                  pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        if (invitation.user_id) {
                          setSelectedPlayerId(invitation.user_id);
                          setShowPlayerProfile(true);
                        }
                      }}
                      title={invitation.user_id ? 'Click to view player profile' : 'Player profile not available'}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {invitation.first_name?.charAt(0)}{invitation.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {invitation.first_name} {invitation.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{invitation.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Invited {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        Pending
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">No pending invitations</p>
                    <p className="text-gray-400 text-sm mt-2">All invitations have been responded to</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rejected' && (
              <div className="space-y-4">
                {rejectedInvitations.length > 0 ? (
                  rejectedInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        if (invitation.user_id) {
                          setSelectedPlayerId(invitation.user_id);
                          setShowPlayerProfile(true);
                        }
                      }}
                      title={invitation.user_id ? 'Click to view player profile' : 'Player profile not available'}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {invitation.first_name?.charAt(0)}{invitation.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {invitation.first_name} {invitation.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{invitation.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Rejected {new Date(invitation.responded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Rejected
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">No rejected invitations</p>
                    <p className="text-gray-400 text-sm mt-2">No one has declined to join yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'statistics' && (
              <div className="space-y-6">
                {/* Match Record */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Record</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <Target className="w-6 h-6 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700">TOTAL</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-900">
                        {team.matchStats?.total_matches || 0}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">Matches Played</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">WINS</span>
                      </div>
                      <p className="text-3xl font-bold text-green-900">
                        {team.matchStats?.wins || 0}
                      </p>
                      <p className="text-sm text-green-700 mt-1">Victories</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <XCircle className="w-6 h-6 text-red-600" />
                        <span className="text-xs font-semibold text-red-700">LOSSES</span>
                      </div>
                      <p className="text-3xl font-bold text-red-900">
                        {team.matchStats?.losses || 0}
                      </p>
                      <p className="text-sm text-red-700 mt-1">Defeats</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <Minus className="w-6 h-6 text-gray-600" />
                        <span className="text-xs font-semibold text-gray-700">DRAWS</span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">
                        {team.matchStats?.draws || 0}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">Tied Games</p>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Win Rate</span>
                        <span className="text-2xl font-bold text-primary-600">{getWinRate()}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-primary-600 to-primary-700 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${getWinRate()}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                {team.statistics && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Tournaments Participated</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {team.statistics.tournaments_participated || 0}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Pending Invitations</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {team.statistics.pending_invitations || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Player Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Invite Player</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery('');
                  setSelectedUser(null);
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Player by Name or Phone
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Enter name or phone number..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    autoComplete="off"
                  />
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {searchResults.map((result) => {
                        const status = invitationStatuses[result.id];
                        const isMember = team.members?.some(m => m.user_id === result.id);
                        
                        return (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleSelectUser(result)}
                            className="w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              {result.profile_image ? (
                                <img 
                                  src={result.profile_image} 
                                  alt={`${result.first_name} ${result.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {result.first_name?.charAt(0)}{result.last_name?.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                  {result.first_name} {result.last_name}
                                </p>
                              </div>
                              {isMember && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  Member
                                </span>
                              )}
                              {!isMember && status === 'pending' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                  Pending
                                </span>
                              )}
                              {!isMember && status === 'rejected' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                  Rejected
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Loading Indicator */}
                  {searching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    </div>
                  )}
                  
                  {/* No Results */}
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && !selectedUser && (
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500 text-sm">
                      No users found. Try a different search term.
                    </div>
                  )}
                </div>
                
                {/* Selected User Display */}
                {selectedUser && (
                  <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-3">
                    {selectedUser.profile_image ? (
                      <img 
                        src={selectedUser.profile_image} 
                        alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setSearchQuery('');
                      }}
                      className="p-1 hover:bg-primary-100 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
                
                <p className="mt-2 text-xs text-gray-500">
                  Search by name or phone number, then select a user to invite
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setSearchQuery('');
                    setSelectedUser(null);
                    setSearchResults([]);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvitePlayer}
                  disabled={inviting || !selectedUser}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary-600" />
                Team Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeam} className="space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  placeholder="Enter team name"
                  required
                />
              </div>

              {/* Max Players */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Maximum Players *
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={teamForm.max_players}
                  onChange={(e) => setTeamForm({ ...teamForm, max_players: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all resize-none"
                  rows="3"
                  placeholder="Enter team description (optional)"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Update Team
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {showPlayerProfile && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

export default TeamDetailPage;

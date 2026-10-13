import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PlayerProfileModal from '../components/PlayerProfileModal';
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Search,
  Filter,
  Send,
  ArrowLeft,
  Loader,
  AlertCircle,
  UserCheck,
  UserX,
  Clock,
  Check,
  Trophy,
  Play,
  Eye
} from 'lucide-react';
import api from '../config/api';
import { getImageUrl, getUserInitials } from '../utils/imageUtils';

const TournamentManage = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('locked');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notApproved, setNotApproved] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  useEffect(() => {
    // console.log('TournamentManage mounted with tournamentId:', tournamentId);
    if (tournamentId && tournamentId !== 'undefined') {
      fetchTournamentData();
    } else {
      console.error('Invalid tournament ID:', tournamentId);
      alert('Invalid tournament ID');
      navigate('/tournaments/my-tournaments');
    }
  }, [tournamentId]);

  // Refresh teams/pairs count when user navigates back to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && tournamentId && tournament) {
        // Refresh teams/pairs count when page becomes visible
        if (tournament.category === 'doubles') {
          getTournamentPairs(tournamentId)
            .then(pairsData => {
              const pairsArray = pairsData.pairs || [];
              setPairsCount(pairsArray.length);
            })
            .catch(error => {
              console.error('Failed to refresh pairs:', error);
            });
        } else if (tournament.category === 'teams') {
          getTournamentTeams(tournamentId)
            .then(teamsData => {
              const teamsArray = teamsData.teams || [];
              setTeamsCount(teamsArray.length);
            })
            .catch(error => {
              console.error('Failed to refresh teams:', error);
            });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tournamentId, tournament]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      // console.log('Fetching tournament with ID:', tournamentId);
      
      const [tournamentRes, registrationsRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}`),
        api.get(`/registrations/tournaments/${tournamentId}`)
      ]);

      // console.log('Tournament response:', tournamentRes.data);
      // console.log('Registrations response:', registrationsRes.data);

      const tournamentData = tournamentRes.data.data;
      
      // Check if tournament is approved by admin
      if (!tournamentData.admin_approved) {
        setTournament(tournamentData);
        setNotApproved(true);
        setLoading(false);
        return;
      }

      setTournament(tournamentData);
      setRegistrations(registrationsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch tournament data:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (registrationId) => {
    try {
      setProcessing(true);
      await api.put(`/registrations/tournaments/${tournamentId}/${registrationId}/accept`);
      await fetchTournamentData();
    } catch (error) {
      console.error('Failed to accept registration:', error);
      alert('Failed to accept registration');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (registrationId) => {
    const reason = prompt('Reason for rejection (optional):');
    try {
      setProcessing(true);
      await api.put(`/registrations/tournaments/${tournamentId}/${registrationId}/reject`, {
        reason
      });
      await fetchTournamentData();
    } catch (error) {
      console.error('Failed to reject registration:', error);
      alert('Failed to reject registration');
    } finally {
      setProcessing(false);
    }
  };

  const handleLock = async (registrationId) => {
    try {
      setProcessing(true);
      await api.put(`/registrations/tournaments/${tournamentId}/${registrationId}/lock`);
      await fetchTournamentData();
      setSelectedPlayers([]);
    } catch (error) {
      console.error('Failed to lock player:', error);
      alert('Failed to lock player');
    } finally {
      setProcessing(false);
    }
  };

  // Bulk Actions
  const handleBulkAccept = async () => {
    if (selectedPlayers.length === 0) {
      alert('Please select at least one player');
      return;
    }

    if (!confirm(`Accept ${selectedPlayers.length} player(s)?`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/registrations/tournaments/${tournamentId}/bulk-accept`, {
        registrationIds: selectedPlayers
      });
      
      alert(response.data.message);
      await fetchTournamentData();
      setSelectedPlayers([]);
    } catch (error) {
      console.error('Failed to accept players:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedPlayers.length === 0) {
      alert('Please select at least one player');
      return;
    }

    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    if (!confirm(`Reject ${selectedPlayers.length} player(s)?`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/registrations/tournaments/${tournamentId}/bulk-reject`, {
        registrationIds: selectedPlayers,
        reason
      });
      
      alert(response.data.message);
      await fetchTournamentData();
      setSelectedPlayers([]);
    } catch (error) {
      console.error('Failed to reject players:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkLock = async () => {
    if (selectedPlayers.length === 0) {
      alert('Please select at least one player');
      return;
    }

    if (!confirm(`Lock ${selectedPlayers.length} player(s)?`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/registrations/tournaments/${tournamentId}/bulk-lock`, {
        registrationIds: selectedPlayers
      });
      
      alert(response.data.message);
      await fetchTournamentData();
      setSelectedPlayers([]);
    } catch (error) {
      console.error('Failed to lock players:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleSelectAll = (players) => {
    const playerIds = players.map(p => p.id);
    if (selectedPlayers.length === playerIds.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(playerIds);
    }
  };

  const handleBulkUnlock = async () => {
    if (selectedPlayers.length === 0) {
      alert('Please select at least one player');
      return;
    }

    if (!confirm(`Unlock ${selectedPlayers.length} player(s)?`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/registrations/tournaments/${tournamentId}/bulk-unlock`, {
        registrationIds: selectedPlayers
      });
      
      alert(response.data.message);
      await fetchTournamentData();
      setSelectedPlayers([]);
    } catch (error) {
      console.error('Failed to unlock players:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlock = async (registrationId) => {
    try {
      setProcessing(true);
      await api.put(`/registrations/tournaments/${tournamentId}/${registrationId}/unlock`);
      await fetchTournamentData();
    } catch (error) {
      console.error('Failed to unlock player:', error);
      alert('Failed to unlock player');
    } finally {
      setProcessing(false);
    }
  };

  const handleOrganizerJoin = async () => {
    if (!window.confirm('Do you want to join this tournament as a participant?')) {
      return;
    }
    
    try {
      setProcessing(true);
      await api.post(`/registrations/tournaments/${tournamentId}/organizer-join`);
      alert('Successfully joined as participant!');
      await fetchTournamentData();
    } catch (error) {
      console.error('Failed to join tournament:', error);
      alert(error.response?.data?.message || 'Failed to join tournament');
    } finally {
      setProcessing(false);
    }
  };

  const handlePublishTournament = async () => {
    if (!window.confirm('Are you sure you want to publish this tournament? It will be visible to all users.')) {
      return;
    }
    
    try {
      setProcessing(true);
      await api.post(`/tournaments/${tournamentId}/publish`);
      alert('Tournament published successfully!');
      await fetchTournamentData();
    } catch (error) {
      console.error('Failed to publish tournament:', error);
      alert(error.response?.data?.error || 'Failed to publish tournament');
    } finally {
      setProcessing(false);
    }
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

  // Show "Not Approved" message if tournament is not approved by admin
  if (notApproved && tournament) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-yellow-600" />
            </div>
            
            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tournament Pending Admin Approval
            </h2>
            
            {/* Tournament Name */}
            <p className="text-xl text-gray-700 mb-6">
              <span className="font-semibold">{tournament.name}</span>
            </p>
            
            {/* Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
              <p className="text-gray-700 leading-relaxed mb-4">
                This tournament is currently under review by our admin team and has not been approved yet.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You will be able to manage this tournament once it has been approved. Please check back later or contact support if you have any questions.
              </p>
            </div>
            
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold mb-8">
              <Clock className="w-4 h-4" />
              Awaiting Admin Approval
            </div>
            
            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/tournaments/my-tournaments')}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to My Tournaments
              </button>
              
              <button
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
                className="px-6 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-lg hover:bg-primary-50 transition-all inline-flex items-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                View Tournament Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament || !registrations) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Tournament not found</h2>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'locked', label: 'Locked Players', count: registrations.counts.locked, icon: Lock, color: 'primary' },
    { id: 'accepted', label: 'Accepted', count: registrations.counts.accepted, icon: UserCheck, color: 'blue' },
    { id: 'pending', label: 'Pending', count: registrations.counts.pending, icon: Clock, color: 'yellow' },
    { id: 'rejected', label: 'Rejected', count: (registrations.counts.rejected || 0) + (registrations.counts.declined || 0), icon: UserX, color: 'red' }
  ];

  // Check if organizer is already registered
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isOrganizerRegistered = [...(registrations.locked || []), ...(registrations.accepted || []), ...(registrations.pending || [])]
    .some(reg => reg.user_id === user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/tournaments/my-tournaments')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Tournaments
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
                {/* Status Badge */}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  tournament.status === 'draft' 
                    ? 'bg-gray-200 text-gray-700' 
                    : tournament.status === 'open'
                    ? 'bg-green-100 text-green-700'
                    : tournament.status === 'ongoing'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {tournament.status.toUpperCase()}
                </span>
                {/* Admin Approval Badge */}
                {tournament.status === 'draft' && (
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    tournament.admin_approved 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {tournament.admin_approved ? '✓ Admin Approved' : '⏳ Pending Approval'}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">Manage Participants & Teams</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Publish Tournament Button - Only show if status is draft */}
              {tournament.status === 'draft' && (
                <button
                  onClick={handlePublishTournament}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4.5 h-4.5" />
                  <span className="hidden sm:inline">Publish Tournament</span>
                  <span className="sm:hidden">Publish</span>
                </button>
              )}

              {/* Edit Tournament Button */}
              <button
                onClick={() => navigate(`/tournaments/${tournamentId}/edit`)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Edit Tournament</span>
                <span className="sm:hidden">Edit</span>
              </button>

              {!isOrganizerRegistered && (
                <button
                  onClick={handleOrganizerJoin}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4.5 h-4.5" />
                  <span className="hidden sm:inline">Join as Participant</span>
                  <span className="sm:hidden">Join</span>
                </button>
              )}
              
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <UserPlus className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">Invite Players</span>
                <span className="sm:hidden">Invite</span>
              </button>

              {registrations.counts.locked > 0 && tournament.category !== 'singles' && (
                <button
                  onClick={() => navigate(`/tournaments/${tournamentId}/teams`)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Users className="w-4.5 h-4.5" />
                  <span className="hidden sm:inline">{tournament.category === 'teams' ? 'Manage Teams' : 'Manage Pairs'}</span>
                  <span className="sm:hidden">{tournament.category === 'teams' ? 'Teams' : 'Pairs'}</span>
                </button>
              )}

              {/* Match Scheduling Button */}
              {(() => {
                // Calculate minimum required participants based on category
                let minRequired = 2; // Default for singles
                let participantType = 'players';
                
                if (tournament.category === 'doubles') {
                  // For doubles, need at least 2 pairs (4 players)
                  minRequired = 4;
                  participantType = 'players (2 pairs)';
                } else if (tournament.category === 'teams') {
                  // For football, use match_config.players_per_side if available
                  let playersPerTeam;
                  if (tournament.sport_name?.toLowerCase() === 'football' && tournament.match_config) {
                    try {
                      const matchConfig = typeof tournament.match_config === 'string' 
                        ? JSON.parse(tournament.match_config) 
                        : tournament.match_config;
                      playersPerTeam = matchConfig.players_per_side || tournament.min_players_per_side || 2;
                    } catch (e) {
                      playersPerTeam = tournament.min_players_per_side || 2;
                    }
                  } else {
                    playersPerTeam = tournament.min_players_per_side || 2;
                  }
                  
                  // Need at least 2 teams, so multiply by 2
                  minRequired = playersPerTeam * 2;
                  participantType = `players (2 teams of ${playersPerTeam})`;
                }
                
                const hasEnoughParticipants = registrations.counts.locked >= minRequired;
                
                const canSchedule = hasEnoughParticipants && 
                                   tournament.status !== 'ongoing' && 
                                   tournament.status !== 'completed';
                
                if (!hasEnoughParticipants && tournament.status !== 'ongoing' && tournament.status !== 'completed') {
                  // Show disabled button with tooltip
                  return (
                    <div className="relative group">
                      <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gray-400 text-white rounded-lg cursor-not-allowed font-semibold opacity-60"
                      >
                        <Trophy className="w-4.5 h-4.5" />
                        <span className="hidden sm:inline">Match Scheduling</span>
                        <span className="sm:hidden">Matches</span>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        Need at least {minRequired} locked {participantType}
                      </div>
                    </div>
                  );
                }
                
                return canSchedule && (
                  <button
                    onClick={() => navigate(`/tournaments/${tournamentId}/match-scheduling`)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                  >
                    <Trophy className="w-4.5 h-4.5" />
                    <span className="hidden sm:inline">Match Scheduling</span>
                    <span className="sm:hidden">Matches</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Locked Players</p>
                <p className="text-3xl font-bold text-gray-900">{registrations.counts.locked}</p>
              </div>
              <Lock className="w-10 h-10 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-3xl font-bold text-gray-900">{registrations.counts.accepted}</p>
              </div>
              <UserCheck className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-gray-900">{registrations.counts.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900">{registrations.counts.total}</p>
              </div>
              <Users className="w-10 h-10 text-gray-500" />
            </div>
          </div>

          {/* Required Players Card */}
          {tournament.max_participants && (() => {
            let playersNeeded = 0;
            
            // Calculate based on category
            if (tournament.category === 'singles') {
              playersNeeded = tournament.max_participants * 1;
            } else if (tournament.category === 'doubles') {
              playersNeeded = tournament.max_participants * 2;
            } else if (tournament.category === 'teams') {
              // For football, use match_config.players_per_side if available
              let multiplier;
              if (tournament.sport_name?.toLowerCase() === 'football' && tournament.match_config) {
                try {
                  const matchConfig = typeof tournament.match_config === 'string' 
                    ? JSON.parse(tournament.match_config) 
                    : tournament.match_config;
                  multiplier = matchConfig.players_per_side || tournament.min_players_per_side || tournament.max_players_per_side || 11;
                } catch (e) {
                  multiplier = tournament.min_players_per_side || tournament.max_players_per_side || 11;
                }
              } else {
                multiplier = tournament.min_players_per_side || tournament.max_players_per_side || 11;
              }
              playersNeeded = tournament.max_participants * multiplier;
            }

            const isComplete = registrations.counts.locked >= playersNeeded;
            const borderColor = isComplete ? 'border-primary-500' : 'border-red-500';
            const textColor = isComplete ? 'text-primary-500' : 'text-red-600';
            const bgColor = isComplete ? 'bg-primary-50' : 'bg-red-50';
            
            // Determine heading text - "Min Players Required" for football, "Required" for others
            const headingText =  'Min Players Required' 
              

            return playersNeeded > 0 && (
              <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${borderColor}`}>
                <div className="flex flex-col">
                  <p className="text-sm text-gray-600 mb-2">{headingText}</p>
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${bgColor}`}>
                    <p className={`text-2xl font-bold ${textColor}`}>
                      {registrations.counts.locked}
                    </p>
                    <p className="text-xl text-gray-400">/</p>
                    <p className={`text-2xl font-bold ${textColor}`}>
                      {playersNeeded}
                    </p>
                  </div>
                  {!isComplete && (
                    <p className="text-xs text-red-600 mt-2 text-center">
                      Need {playersNeeded - registrations.counts.locked} more
                    </p>
                  )}
                  {isComplete && (
                    <p className="text-xs text-primary-500 mt-2 text-center">
                      ✓ Ready
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? `text-${tab.color}-600 border-b-2 border-${tab.color}-600`
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id
                      ? `bg-${tab.color}-100 text-${tab.color}-700`
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Players List */}
          <div className="p-6">
            <PlayersList
              players={activeTab === 'rejected' 
                ? [...(registrations.grouped.rejected || []), ...(registrations.grouped.declined || [])]
                : registrations.grouped[activeTab]
              }
              status={activeTab}
              searchQuery={searchQuery}
              onAccept={handleAccept}
              onReject={handleReject}
              onLock={handleLock}
              onUnlock={handleUnlock}
              processing={processing}
              selectedPlayers={selectedPlayers}
              onToggleSelection={togglePlayerSelection}
              onToggleSelectAll={toggleSelectAll}
              onBulkAccept={handleBulkAccept}
              onBulkReject={handleBulkReject}
              onBulkLock={handleBulkLock}
              onBulkUnlock={handleBulkUnlock}
              onPlayerClick={(userId) => {
                setSelectedPlayerId(userId);
                setShowPlayerModal(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InvitePlayersModal
          tournamentId={tournamentId}
          tournamentName={tournament.name}
          onClose={() => setShowInviteModal(false)}
          onSuccess={fetchTournamentData}
        />
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

// Players List Component
const PlayersList = ({ 
  players, 
  status, 
  searchQuery, 
  onAccept, 
  onReject, 
  onLock, 
  onUnlock, 
  processing,
  selectedPlayers,
  onToggleSelection,
  onToggleSelectAll,
  onBulkAccept,
  onBulkReject,
  onBulkLock,
  onBulkUnlock,
  onPlayerClick
}) => {
  const filteredPlayers = players.filter(player => {
    const name = player.first_name && player.last_name 
      ? `${player.first_name} ${player.last_name}`.toLowerCase()
      : '';
    const email = player.email ? player.email.toLowerCase() : '';
    const phone = player.phone ? player.phone : '';
    const search = searchQuery.toLowerCase();
    
    return name.includes(search) || email.includes(search) || phone.includes(search);
  });

  if (filteredPlayers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No players found</p>
      </div>
    );
  }

  const showBulkActions = status === 'pending' || status === 'accepted' || status === 'locked';
  const allSelected = filteredPlayers.length > 0 && filteredPlayers.every(p => selectedPlayers.includes(p.id));

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleSelectAll(filteredPlayers)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedPlayers.length > 0 
                ? `${selectedPlayers.length} selected`
                : 'Select All'
              }
            </span>
          </div>

          {selectedPlayers.length > 0 && (
            <div className="flex items-center gap-2">
              {status === 'pending' && (
                <>
                  <button
                    onClick={onBulkAccept}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept Selected ({selectedPlayers.length})
                  </button>
                  <button
                    onClick={onBulkReject}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Selected ({selectedPlayers.length})
                  </button>
                </>
              )}
              {status === 'accepted' && (
                <button
                  onClick={onBulkLock}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Lock className="w-4 h-4" />
                  Lock Selected ({selectedPlayers.length})
                </button>
              )}
              {status === 'locked' && (
                <button
                  onClick={onBulkUnlock}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Selected ({selectedPlayers.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Players List */}
      {filteredPlayers.map((player) => (
        <div
          key={player.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            {/* Checkbox for bulk selection */}
            {showBulkActions && (
              <input
                type="checkbox"
                checked={selectedPlayers.includes(player.id)}
                onChange={() => onToggleSelection(player.id)}
                className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
            )}

            {/* Avatar with Profile Picture */}
            <div 
              className="relative w-12 h-12 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (player.user_id && onPlayerClick) {
                  onPlayerClick(player.user_id);
                }
              }}
              title={player.user_id ? 'View player profile' : 'Player not registered'}
            >
              {player.profile_image ? (
                <img
                  src={getImageUrl(player.profile_image)}
                  alt={`${player.first_name} ${player.last_name}`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center text-white font-bold"
                style={{ display: player.profile_image ? 'none' : 'flex' }}
              >
                {player.first_name 
                  ? getUserInitials(player.first_name, player.last_name || '.')
                  : player.phone ? player.phone.slice(-2) : '?'
                }
              </div>
            </div>

            {/* Player Info */}
            <div 
              className="cursor-pointer hover:text-primary-600 transition-colors"
              onClick={() => {
                if (player.user_id && onPlayerClick) {
                  onPlayerClick(player.user_id);
                }
              }}
              title={player.user_id ? 'View player profile' : 'Player not registered'}
            >
              <h3 className="font-semibold text-gray-900">
                {player.first_name 
                  ? `${player.first_name}${player.last_name ? ' ' + player.last_name : ''}`
                  : player.phone || 'External User'
                }
              </h3>
              <p className="text-sm text-gray-600">
                {player.email || player.phone}
              </p>
              {!player.user_id && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                  Not registered
                </span>
              )}
              {player.skill_level && (
                <span className="inline-block mt-1 ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  {player.skill_level}
                </span>
              )}
            </div>

            {/* Registration Type Badge */}
            <div>
              <span className={`px-3 py-1 text-xs rounded-full ${
                player.registration_type === 'invitation'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {player.registration_type === 'invitation' ? 'Invited' : 'Requested'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {status === 'pending' && (
              <>
                <button
                  onClick={() => onAccept(player.id)}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => onReject(player.id)}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}

            {status === 'accepted' && (
              <button
                onClick={() => onLock(player.id)}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                Lock Player
              </button>
            )}

            {status === 'locked' && (
              <button
                onClick={() => onUnlock(player.id)}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                Unlock
              </button>
            )}

            {(status === 'rejected' || status === 'declined') && (
              <span className="text-sm text-gray-500">
                {new Date(player.responded_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Invite Players Modal Component
const InvitePlayersModal = ({ tournamentId, tournamentName, onClose, onSuccess }) => {
  const defaultMessage = `You're invited to participate in "${tournamentName}"! Join us for an exciting tournament. We look forward to seeing you there!`;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState(['']);
  const [message, setMessage] = useState(defaultMessage);
  const [searching, setSearching] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteMode, setInviteMode] = useState('search'); // 'search' or 'phone'
  const [sports, setSports] = useState([]);
  const [selectedSportFilter, setSelectedSportFilter] = useState('all');
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [showViewPlayerModal, setShowViewPlayerModal] = useState(false);

  // Fetch sports list
  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await api.get('/sports');
        setSports(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch sports:', error);
      }
    };
    fetchSports();
  }, []);

  // Fetch all available users when component mounts or sport filter changes
  useEffect(() => {
    if (tournamentId) {
      fetchAvailableUsers();
    }
  }, [tournamentId, selectedSportFilter]);

  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      // Always pass sport_id parameter: 'all' for all sports, or specific sport ID
      const sportParam = `?sport_id=${selectedSportFilter}`;
      const response = await api.get(`/users/tournament/${tournamentId}/available${sportParam}`);
      setAvailableUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch available users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const searchPlayers = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const response = await api.get(`/users/search?q=${searchQuery}`);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Failed to search players:', error);
    } finally {
      setSearching(false);
    }
  };

  const togglePlayer = (player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const addPhoneField = () => {
    setPhoneNumbers([...phoneNumbers, '']);
  };

  const removePhoneField = (index) => {
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
  };

  const updatePhoneNumber = (index, value) => {
    const updated = [...phoneNumbers];
    updated[index] = value;
    setPhoneNumbers(updated);
  };

  const sendInvitations = async () => {
    if (inviteMode === 'search') {
      if (selectedPlayers.length === 0) {
        alert('Please select at least one player');
        return;
      }

      try {
        setSending(true);
        // Send phone numbers from selected players
        const phones = selectedPlayers.map(p => p.phone);
        await api.post(`/registrations/tournaments/${tournamentId}/invite`, {
          phoneNumbers: phones,
          message: message.trim() || undefined
        });

        alert(`Invitations sent to ${selectedPlayers.length} player(s)!`);
        onSuccess();
        onClose();
      } catch (error) {
        console.error('Failed to send invitations:', error);
        alert(error.response?.data?.message || 'Failed to send invitations');
      } finally {
        setSending(false);
      }
    } else {
      // Phone mode - Add +91 prefix for external users
      const validPhones = phoneNumbers
        .filter(p => p.trim().length >= 10)
        .map(phone => {
          const cleanPhone = phone.trim();
          // Add +91 if not already present
          if (!cleanPhone.startsWith('+')) {
            return `+91${cleanPhone}`;
          }
          return cleanPhone;
        });
      
      if (validPhones.length === 0) {
        alert('Please enter at least one valid phone number (minimum 10 digits)');
        return;
      }

      try {
        setSending(true);
        await api.post(`/registrations/tournaments/${tournamentId}/invite`, {
          phoneNumbers: validPhones,
          message: message.trim() || undefined
        });

        alert(`Invitations sent to ${validPhones.length} phone number(s)!`);
        onSuccess();
        onClose();
      } catch (error) {
        console.error('Failed to send invitations:', error);
        alert(error.response?.data?.message || 'Failed to send invitations');
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Invite Players</h2>
          <p className="text-sm text-gray-600 mt-1">{tournamentName}</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Mode Toggle */}
          <div className="mb-6">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setInviteMode('search')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  inviteMode === 'search'
                    ? 'bg-white text-primary-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search System Users
              </button>
              <button
                onClick={() => setInviteMode('phone')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  inviteMode === 'phone'
                    ? 'bg-white text-primary-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Enter Phone Numbers
              </button>
            </div>
          </div>

          {inviteMode === 'search' ? (
            <>
              {/* Sport Filter */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter by Sport
                </label>
                <select
                  value={selectedSportFilter}
                  onChange={(e) => setSelectedSportFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Sports</option>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* All Available Users Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select from Available Users
                </label>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    Loading users...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No available users to invite</p>
                    <p className="text-sm mt-1">All system users have already been invited</p>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {availableUsers.map((user) => {
                        const isSelected = selectedPlayers.find(p => p.id === user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => togglePlayer(user)}
                            className={`p-3 border-b border-gray-200 cursor-pointer transition-colors hover:bg-primary-50 ${
                              isSelected ? 'bg-primary-100' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                
                                {/* Profile Picture */}
                                <div className="relative w-10 h-10 flex-shrink-0">
                                  {user.profile_image ? (
                                    <img
                                      src={getImageUrl(user.profile_image)}
                                      alt={`${user.first_name} ${user.last_name}`}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-primary-200"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                    style={{ display: user.profile_image ? 'none' : 'flex' }}
                                  >
                                    {getUserInitials(user.first_name, user.last_name)}
                                  </div>
                                </div>
                                
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {user.sports && user.sports.length > 0 && (
                                      <span className="text-primary-500">
                                        • {user.sports.map(s => `${s.name} (${s.skill_level})`).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Eye Icon to View Details */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingPlayerId(user.id);
                                  setShowViewPlayerModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="View player details"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {selectedPlayers.length > 0 && (
                  <div className="mt-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <p className="text-sm font-medium text-primary-600">
                      {selectedPlayers.length} player(s) selected
                    </p>
                  </div>
                )}
              </div>

              {/* Search (Optional - for additional filtering) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Or Search for Specific Players
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by name, phone or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={searchPlayers}
                    disabled={searching}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    {searching ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Phone Numbers */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Numbers
                </label>
                <div className="space-y-2">
                  {phoneNumbers.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="Enter phone number (e.g., 9876543210)"
                        value={phone}
                        onChange={(e) => updatePhoneNumber(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {phoneNumbers.length > 1 && (
                        <button
                          onClick={() => removePhoneField(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addPhoneField}
                    className="flex items-center gap-2 px-4 py-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Another Phone Number
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Results
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {searchResults.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => togglePlayer(player)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'bg-primary-100 border-2 border-primary-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Profile Picture */}
                      <div className="relative w-10 h-10 flex-shrink-0">
                        {player.profile_image ? (
                          <img
                            src={getImageUrl(player.profile_image)}
                            alt={`${player.first_name} ${player.last_name}`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ display: player.profile_image ? 'none' : 'flex' }}
                        >
                          {getUserInitials(player.first_name, player.last_name)}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {player.first_name} {player.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{player.phone}</p>
                        {player.email && <p className="text-xs text-gray-500">{player.email}</p>}
                        {player.sports && player.sports.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {player.sports.map((sport, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                              >
                                {sport.name} • {sport.skill_level}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedPlayers.find(p => p.id === player.id) && (
                      <CheckCircle className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Players */}
          {selectedPlayers.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Selected Players ({selectedPlayers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 px-3 py-2 bg-primary-100 text-primary-600 rounded-lg"
                  >
                    <span className="text-sm font-medium">
                      {player.first_name} {player.last_name}
                    </span>
                    <button
                      onClick={() => togglePlayer(player)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Invitation Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Add a personal message to your invitation..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                This message will be sent via SMS to invited players
              </p>
              <p className="text-xs text-gray-500">
                {message.length}/500
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={sendInvitations}
            disabled={sending || (inviteMode === 'search' ? selectedPlayers.length === 0 : phoneNumbers.filter(p => p.trim()).length === 0)}
            className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {inviteMode === 'search' 
                  ? `Send Invitations (${selectedPlayers.length})`
                  : `Send Invitations (${phoneNumbers.filter(p => p.trim()).length})`
                }
              </>
            )}
          </button>
        </div>
      </div>

      {/* Player Profile Modal for viewing details */}
      {showViewPlayerModal && viewingPlayerId && (
        <PlayerProfileModal
          userId={viewingPlayerId}
          onClose={() => {
            setShowViewPlayerModal(false);
            setViewingPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

export default TournamentManage;

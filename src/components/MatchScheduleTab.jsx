import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Edit2, 
  X, 
  Check,
  AlertCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  User,
  Users,
  Zap,
  Award,
  Hourglass,
  RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getTournamentMatches, resetMatch } from '../services/matchService';
import { formatDate } from '../utils/dateFormatter';
import { getParticipantName } from '../utils/participantHelper';
import RescheduleMatchModal from './RescheduleMatchModal';
import CancelMatchModal from './CancelMatchModal';
import BulkSchedulingModal from './BulkSchedulingModal';
import RefereeAssignmentModal from './RefereeAssignmentModal';
import UpdateParticipantModal from './UpdateParticipantModal';
import ResetMatchModal from './ResetMatchModal';

const MatchScheduleTab = ({ tournament, isOrganizer, onRefresh, onBulkSchedule }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showBulkScheduling, setShowBulkScheduling] = useState(false);
  const [showRefereeModal, setShowRefereeModal] = useState(false);
  const [showUpdateParticipantModal, setShowUpdateParticipantModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [participantSlot, setParticipantSlot] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRound, setFilterRound] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [matchRefereeStatuses, setMatchRefereeStatuses] = useState({});

  // Debug logging
  // console.log('MatchScheduleTab - isOrganizer:', isOrganizer);
  // console.log('MatchScheduleTab - tournament:', tournament);

  useEffect(() => {
    if (tournament?.id) {
      fetchMatches();
    }
  }, [tournament?.id, filterStatus, filterRound]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (filterRound !== 'all') filters.round_number = filterRound;
      
      const data = await getTournamentMatches(tournament.id, filters);
      setMatches(data || []);
      
      // Fetch referee assignment statuses for all matches
      await fetchRefereeStatuses(data || []);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefereeStatuses = async (matchList) => {
    try {
      const { getBatchPendingRequestsForMatches } = await import('../services/refereeService');
      
      // Extract all match IDs
      const matchIds = matchList.map(match => match.id);
      
      if (matchIds.length === 0) {
        setMatchRefereeStatuses({});
        return;
      }
      
      // Fetch all statuses in a single API call
      const statusMap = await getBatchPendingRequestsForMatches(matchIds);
      
      setMatchRefereeStatuses(statusMap);
    } catch (error) {
      console.error('Failed to fetch referee statuses:', error);
    }
  };

  const handleReschedule = (match) => {
    setSelectedMatch(match);
    setShowRescheduleModal(true);
  };

  const handleCancel = (match) => {
    setSelectedMatch(match);
    setShowCancelModal(true);
  };

  const handleRescheduleSuccess = () => {
    setShowRescheduleModal(false);
    setSelectedMatch(null);
    fetchMatches();
    if (onRefresh) onRefresh();
    toast.success('Match rescheduled successfully!');
  };

  const handleCancelSuccess = () => {
    setShowCancelModal(false);
    setSelectedMatch(null);
    fetchMatches();
    if (onRefresh) onRefresh();
    toast.success('Match cancelled successfully!');
  };

  const handleAssignReferee = (match) => {
    setSelectedMatch(match);
    setShowRefereeModal(true);
  };

  const handleRefereeAssignSuccess = () => {
    setShowRefereeModal(false);
    setSelectedMatch(null);
    fetchMatches(); // This will also refresh referee statuses
    if (onRefresh) onRefresh();
  };

  const handleUpdateParticipant = (match, slot) => {
    setSelectedMatch(match);
    setParticipantSlot(slot);
    setShowUpdateParticipantModal(true);
  };

  const handleUpdateParticipantSuccess = () => {
    fetchMatches();
    if (onRefresh) onRefresh();
    setShowUpdateParticipantModal(false);
    setSelectedMatch(null);
    setParticipantSlot(null);
  };

  const handleResetMatch = (match) => {
    setSelectedMatch(match);
    setShowResetModal(true);
  };

  const handleResetConfirm = async () => {
    try {
      await resetMatch(selectedMatch.id);
      setShowResetModal(false);
      setSelectedMatch(null);
      fetchMatches();
      if (onRefresh) onRefresh();
      toast.success('Match reset successfully! You can now start fresh scoring.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset match');
      throw error;
    }
  };

  // Check if current user can reset a match (organizer or referee)
  const canResetMatch = (match) => {
    if (!user) return false;
    return isOrganizer || match.referee_id === user.id;
  };

  // Get referee icon color and type based on status
  const getRefereeIconStyle = (match) => {
    const status = matchRefereeStatuses[match.id];
    
    if (match.referee_id) {
      // Match officials accepted and assigned
      return {
        className: 'text-green-600 hover:bg-green-50',
        title: `Match officials: ${match.referee_name || 'Assigned'} (Accepted)`,
        icon: 'award'
      };
    } else if (status === 'pending') {
      // Invitation sent, waiting for response
      return {
        className: 'text-blue-600 hover:bg-blue-50',
        title: 'Invitation Pending - Waiting for referee response',
        icon: 'hourglass'
      };
    } else if (status === 'declined') {
      // Referee declined
      return {
        className: 'text-red-600 hover:bg-red-50',
        title: 'Invitation Declined - Click to assign another referee',
        icon: 'award'
      };
    } else {
      // No referee assigned
      return {
        className: 'text-red-600 hover:bg-red-50',
        title: 'No Referee Assigned - Click to assign',
        icon: 'award'
      };
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
      ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
      completed: { bg: 'bg-primary-100', text: 'text-primary-600', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
      postponed: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Postponed' },
      walkover: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Walkover' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getRoundName = (roundNumber, totalRounds) => {
    if (!roundNumber) return 'TBD';
    if (roundNumber === totalRounds) return 'Final';
    if (roundNumber === totalRounds - 1) return 'Semi-Final';
    if (roundNumber === totalRounds - 2) return 'Quarter-Final';
    return `Round ${roundNumber}`;
  };

  const groupMatchesByRound = () => {
    // Use round_name from backend (already correct)
    if (tournament?.format_type === 'groups_knockout') {
      const grouped = {};
      matches.forEach(match => {
        const key = match.round_name || `Round ${match.round_number || 0}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(match);
      });
      return grouped;
    }
    
    // For other formats, group by round
    const grouped = {};
    matches.forEach(match => {
      const round = match.round_number || 0;
      if (!grouped[round]) {
        grouped[round] = [];
      }
      grouped[round].push(match);
    });
    return grouped;
  };

  const groupedMatches = groupMatchesByRound();
  const rounds = Object.keys(groupedMatches).sort((a, b) => {
    // For groups_knockout, sort by round_number (not alphabetically)
    if (tournament?.format_type === 'groups_knockout') {
      const aIsGroup = a.startsWith('Group');
      const bIsGroup = b.startsWith('Group');
      if (aIsGroup && !bIsGroup) return -1;
      if (!aIsGroup && bIsGroup) return 1;
      
      // Sort by round_number from first match in each group
      const aRoundNum = groupedMatches[a][0]?.round_number || 0;
      const bRoundNum = groupedMatches[b][0]?.round_number || 0;
      return aRoundNum - bRoundNum;
    }
    return a - b;
  });

  if (loading && matches.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Match Schedule</h2>
          <p className="text-sm text-gray-600 mt-1">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} found
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* {isOrganizer && (
            <button
              onClick={() => setShowBulkScheduling(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              <Zap className="w-4 h-4" />
              Bulk Schedule
            </button>
          )} */}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={fetchMatches}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="postponed">Postponed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Round
              </label>
              <select
                value={filterRound}
                onChange={(e) => setFilterRound(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Rounds</option>
                {rounds.map(round => (
                  <option key={round} value={round}>
                    {getRoundName(parseInt(round), rounds.length)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Matches List */}
      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matches Found</h3>
          <p className="text-gray-600">
            {filterStatus !== 'all' || filterRound !== 'all'
              ? 'Try adjusting your filters'
              : 'Matches will appear here once the tournament brackets are generated'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {rounds.map(round => {
            const isGroupStage = round.startsWith('Group');
            const headerColor = isGroupStage 
              ? 'from-blue-500 to-purple-600'
              : 'from-primary-500 to-primary-600';
            const headerTextColor = isGroupStage ? 'text-blue-100' : 'text-primary-100';
            
            // Get display name - use round_name from backend directly
            let displayName;
            if (tournament?.format_type === 'groups_knockout') {
              // For groups_knockout, backend already sends correct round_name
              displayName = round; // "Group A", "Group B", "Knockout - Semi Finals", etc.
            } else {
              // For other formats, calculate round name
              const roundNum = parseInt(round);
              displayName = getRoundName(roundNum, rounds.length);
            }
            
            return (
              <div key={round} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Round/Group Header */}
                <div className={`bg-gradient-to-r ${headerColor} px-6 py-4`}>
                  <h3 className="text-lg font-bold text-white">
                    {displayName}
                  </h3>
                  <p className={`text-sm ${headerTextColor}`}>
                    {groupedMatches[round].length} {groupedMatches[round].length === 1 ? 'match' : 'matches'}
                  </p>
                </div>

                {/* Matches in Round/Group */}
                <div className="divide-y divide-gray-200">
                  {groupedMatches[round].map(match => (
                    <div 
                      key={match.id} 
                      onClick={() => {
                        if (match.status === 'completed') {
                          navigate(`/matches/${match.id}/history?source=tournament&tournamentId=${tournament.id}`);
                        }
                      }}
                      className={`p-6 hover:bg-gray-50 transition-colors ${match.status === 'completed' ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                      {/* Match Info */}
                      <div className="flex-1 space-y-3">
                        {/* Participants */}
                        <div className="space-y-2">
                          <div 
                            onClick={(e) => {
                              if (isOrganizer && match.status !== 'completed') {
                                e.stopPropagation();
                                handleUpdateParticipant(match, 'participant1');
                              }
                            }}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                              match.winner_participant_id === match.participant1_id 
                                ? 'bg-gradient-to-r from-primary-50 to-green-50 border-2 border-primary-400 shadow-md' 
                                : match.status === 'completed' && !match.winner_participant_id
                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300'
                                : 'bg-gray-50'
                            } ${isOrganizer && match.status !== 'completed' ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 border-2 border-transparent' : ''}`}
                            title={isOrganizer && match.status !== 'completed' ? 'Click to change participant' : ''}
                          >
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              {tournament.category === 'teams' ? (
                                <Users className="w-4 h-4 text-blue-600" />
                              ) : (
                                <User className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <span className={`font-semibold ${
                              match.winner_participant_id === match.participant1_id 
                                ? 'text-primary-700' 
                                : 'text-gray-900'
                            }`}>
                              {getParticipantName(match.participant1)}
                            </span>
                            {isOrganizer && match.status !== 'completed' && (
                              <Edit2 className="w-4 h-4 text-blue-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                            {match.status === 'completed' && match.winner_participant_id === match.participant1_id && (
                              <div className="ml-auto flex items-center gap-2 bg-primary-500 text-white px-3 py-1 rounded-full">
                                <Award className="w-4 h-4" />
                                <span className="text-xs font-bold">WINNER</span>
                              </div>
                            )}
                          </div>
                          
                          <div 
                            onClick={(e) => {
                              if (isOrganizer && match.status !== 'completed') {
                                e.stopPropagation();
                                handleUpdateParticipant(match, 'participant2');
                              }
                            }}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                              match.winner_participant_id === match.participant2_id 
                                ? 'bg-gradient-to-r from-primary-50 to-green-50 border-2 border-primary-400 shadow-md' 
                                : match.status === 'completed' && !match.winner_participant_id
                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300'
                                : 'bg-gray-50'
                            } ${isOrganizer && match.status !== 'completed' ? 'cursor-pointer hover:bg-red-50 hover:border-red-300 border-2 border-transparent' : ''}`}
                            title={isOrganizer && match.status !== 'completed' ? 'Click to change participant' : ''}
                          >
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              {tournament.category === 'teams' ? (
                                <Users className="w-4 h-4 text-red-600" />
                              ) : (
                                <User className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <span className={`font-semibold ${
                              match.winner_participant_id === match.participant2_id 
                                ? 'text-primary-700' 
                                : 'text-gray-900'
                            }`}>
                              {getParticipantName(match.participant2)}
                            </span>
                            {isOrganizer && match.status !== 'completed' && (
                              <Edit2 className="w-4 h-4 text-red-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                            {match.status === 'completed' && match.winner_participant_id === match.participant2_id && (
                              <div className="ml-auto flex items-center gap-2 bg-primary-500 text-white px-3 py-1 rounded-full">
                                <Award className="w-4 h-4" />
                                <span className="text-xs font-bold">WINNER</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Draw Badge - Show when match is completed with no winner */}
                          {match.status === 'completed' && !match.winner_participant_id && (
                            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-2 rounded-full shadow-md">
                              <span className="text-sm font-bold">🤝 DRAW</span>
                            </div>
                          )}
                        </div>

                        {/* Match Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          {match.match_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(match.match_date)}</span>
                            </div>
                          )}
                          
                          {match.match_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{match.match_time}</span>
                            </div>
                          )}
                          
                          {match.venue_name && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{match.venue_name}</span>
                              {match.court_name && <span className="text-gray-400">• {match.court_name}</span>}
                            </div>
                          )}

                          {match.referee_name && (
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-primary-500" />
                              <span className="font-semibold text-primary-600">Match officials: {match.referee_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Score (if completed) */}
                        {match.status === 'completed' && match.score && (
                          <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 inline-block">
                            <span className="text-sm font-semibold text-primary-700">
                              Score: {JSON.stringify(match.score)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status and Actions */}
                      <div className="flex flex-col items-end gap-3">
                        {getStatusBadge(match.status)}
                        
                        {match.status !== 'cancelled' && (
                          <div className="flex items-center gap-2">
                            {isOrganizer && match.status !== 'completed' && (
                              <>
                                <button
                                  onClick={() => handleAssignReferee(match)}
                                  className={`p-2 rounded-lg transition-colors ${getRefereeIconStyle(match).className}`}
                                  title={getRefereeIconStyle(match).title}
                                >
                                  {getRefereeIconStyle(match).icon === 'hourglass' ? (
                                    <Hourglass className="w-4 h-4" />
                                  ) : (
                                    <Award className="w-4 h-4" />
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => handleReschedule(match)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Reschedule"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {canResetMatch(match) && (match.status === 'in_progress' || match.status === 'completed') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetMatch(match);
                                }}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Reset Match - Clear all scores and events"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* <button
                              onClick={() => handleCancel(match)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button> */}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Warning for unscheduled matches */}
                    {!match.match_date && match.status === 'scheduled' && (
                      <div className="mt-3 flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-yellow-800 font-medium">
                            This match needs to be scheduled with a date and time
                          </span>
                        </div>
                        {isOrganizer && (
                          <button
                            onClick={() => handleReschedule(match)}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Calendar className="w-4 h-4" />
                            Schedule Now
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showRescheduleModal && selectedMatch && (
        <RescheduleMatchModal
          match={selectedMatch}
          onClose={() => {
            setShowRescheduleModal(false);
            setSelectedMatch(null);
          }}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {showCancelModal && selectedMatch && (
        <CancelMatchModal
          match={selectedMatch}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedMatch(null);
          }}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Bulk Scheduling Modal */}
      {showBulkScheduling && (
        <BulkSchedulingModal
          matches={matches}
          tournament={tournament}
          onClose={() => setShowBulkScheduling(false)}
          onSave={async (scheduleData) => {
            try {
              if (onBulkSchedule) {
                await onBulkSchedule(scheduleData);
              }
              setShowBulkScheduling(false);
              fetchMatches(); // Refresh matches
              if (onRefresh) onRefresh();
              toast.success('Matches scheduled successfully!');
            } catch (error) {
              toast.error(error.message || 'Failed to schedule matches');
            }
          }}
        />
      )}

      {/* Referee Assignment Modal */}
      {showRefereeModal && selectedMatch && (
        <RefereeAssignmentModal
          match={selectedMatch}
          tournament={tournament}
          onClose={() => {
            setShowRefereeModal(false);
            setSelectedMatch(null);
          }}
          onSuccess={handleRefereeAssignSuccess}
        />
      )}

      {/* Update Participant Modal */}
      {showUpdateParticipantModal && selectedMatch && (
        <UpdateParticipantModal
          isOpen={showUpdateParticipantModal}
          onClose={() => {
            setShowUpdateParticipantModal(false);
            setSelectedMatch(null);
            setParticipantSlot(null);
          }}
          match={selectedMatch}
          participantSlot={participantSlot}
          onSuccess={handleUpdateParticipantSuccess}
        />
      )}

      {/* Reset Match Modal */}
      {showResetModal && selectedMatch && (
        <ResetMatchModal
          match={selectedMatch}
          onClose={() => {
            setShowResetModal(false);
            setSelectedMatch(null);
          }}
          onConfirm={handleResetConfirm}
        />
      )}
    </div>
  );
};

export default MatchScheduleTab;

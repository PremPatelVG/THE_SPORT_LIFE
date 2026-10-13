import { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, MapPin, Clock, ChevronRight, Zap, Grid3x3, GitBranch, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import MatchSchedulingModal from './MatchSchedulingModal';
import BulkSchedulingModal from './BulkSchedulingModal';
import BracketTreeView from './BracketTreeView';
import { getImageUrl, getUserInitials } from '../utils/imageUtils';

const TournamentBracket = ({ tournament, matches, onMatchClick, onScheduleUpdate, isOrganizer }) => {
  const [groupedMatches, setGroupedMatches] = useState({});
  const [selectedRound, setSelectedRound] = useState(null);
  const [showBulkScheduling, setShowBulkScheduling] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'tree'

  // Ensure matches is always an array
  const matchesArray = Array.isArray(matches) ? matches : [];

  // Debug logging
  // console.log('TournamentBracket - matches received:', matches);
  // console.log('TournamentBracket - is Array?:', Array.isArray(matches));
  // console.log('TournamentBracket - matchesArray length:', matchesArray.length);
  // console.log('TournamentBracket - tournament:', tournament);

  useEffect(() => {
    if (matchesArray && matchesArray.length > 0) {
      groupMatchesByRound();
    }
  }, [matches]);

  const groupMatchesByRound = () => {
    const grouped = {};
    matchesArray.forEach(match => {
      const round = match.round_number || 1;
      if (!grouped[round]) {
        grouped[round] = [];
      }
      grouped[round].push(match);
    });
    setGroupedMatches(grouped);
    // Set initial selected round
    if (Object.keys(grouped).length > 0 && !selectedRound) {
      setSelectedRound(Number(Object.keys(grouped).sort((a, b) => Number(a) - Number(b))[0]));
    }
  };

  const getRoundName = (roundNumber, totalRounds) => {
    // For groups_knockout, use the actual round_name from matches
    if (tournament.format === 'groups_knockout' && groupedMatches[roundNumber]?.length > 0) {
      const firstMatch = groupedMatches[roundNumber][0];
      if (firstMatch.round_name) {
        return firstMatch.round_name;
      }
    }
    
    const roundsFromEnd = totalRounds - roundNumber;
    
    if (tournament.format === 'knockout' || tournament.format === 'single_elimination') {
      if (roundsFromEnd === 0) return 'Finals';
      if (roundsFromEnd === 1) return 'Semi-Finals';
      if (roundsFromEnd === 2) return 'Quarter-Finals';
      return `Round ${roundNumber}`;
    }
    
    if (tournament.format === 'round_robin') {
      return `Round ${roundNumber}`;
    }
    
    return `Round ${roundNumber}`;
  };

  const getMatchStatus = (match) => {
    if (match.status === 'completed') {
      return {
        bg: 'bg-primary-50',
        border: 'border-primary-200',
        text: 'text-primary-600',
        label: 'Completed'
      };
    }
    if (match.status === 'in_progress') {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        label: 'Live'
      };
    }
    if (match.status === 'scheduled') {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        label: 'Scheduled'
      };
    }
    if (match.status === 'ready') {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        label: 'Ready'
      };
    }
    if (match.status === 'pending') {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-600',
        label: 'Pending'
      };
    }
    // Default fallback
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      label: 'Pending'
    };
  };

  const formatMatchDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMatchDate2 = (date, time) => {
  if (!date || !time) return null;

  // Combine date + time into a single Date object
  const dateTime = new Date(`${date}T${time}`);

  return dateTime.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};


  // Helper function to get participant display name
  const getParticipantName = (participant) => {
    if (!participant) return 'TBD';
    
    // For singles - show player name
    if (participant.name) return participant.name;
    
    // For doubles/pairs - show pair name or "Player1 & Player2"
    if (participant.player1_name && participant.player2_name) {
      return participant.name || `${participant.player1_name} & ${participant.player2_name}`;
    }
    
    // For teams - show team name
    if (participant.name) return participant.name;
    
    return 'TBD';
  };

  const MatchCard = ({ match }) => {
    const status = getMatchStatus(match);
    const isWinner1 = match.winner_participant_id === match.participant1_id;
    const isWinner2 = match.winner_participant_id === match.participant2_id;
    
    // Get participant names from the participant objects
    const participant1Name = getParticipantName(match.participant1);
    const participant2Name = getParticipantName(match.participant2);

    return (
      <div
        onClick={() => onMatchClick && onMatchClick(match)}
        className={`${status.bg} ${status.border} border-2 rounded-xl p-4 hover:shadow-lg transition-all ${match.status === 'completed' ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Match Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${status.text} px-2 py-1 rounded-full ${status.bg}`}>
              {status.label}
            </span>
            <span className="text-xs text-gray-500">Match #{match.match_number || match.id}</span>
          </div>
          {match.court_name && (
            <span className="text-xs text-gray-500">Court {match.court_name}</span>
          )}
        </div>

        {/* Participants */}
        <div className="space-y-2">
          {/* Participant 1 */}
          <div className={`flex items-center justify-between p-2 rounded-lg ${
            isWinner1 ? 'bg-primary-100 border-2 border-primary-400' : 'bg-white'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isWinner1 && <Trophy className="w-4 h-4 text-primary-500 flex-shrink-0" />}
              
              {/* Participant 1 Profile Picture */}
              {match.participant1 && participant1Name !== 'TBD' && (
                <div className="relative w-6 h-6 flex-shrink-0">
                  {match.participant1.profile_image ? (
                    <img
                      src={getImageUrl(match.participant1.profile_image)}
                      alt={participant1Name}
                      className="w-6 h-6 rounded-full object-cover border border-primary-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ display: match.participant1.profile_image ? 'none' : 'flex' }}
                  >
                    {participant1Name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                </div>
              )}
              
              <span className={`font-semibold truncate ${
                isWinner1 ? 'text-primary-700' : 'text-gray-900'
              }`}>
                {participant1Name}
              </span>
            </div>
            {match.participant1_score !== null && match.participant1_score !== undefined && (
              <span className={`font-bold text-lg ${
                isWinner1 ? 'text-primary-700' : 'text-gray-700'
              }`}>
                {match.participant1_score}
              </span>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400">VS</span>
          </div>

          {/* Participant 2 */}
          <div className={`flex items-center justify-between p-2 rounded-lg ${
            isWinner2 ? 'bg-primary-100 border-2 border-primary-400' : 'bg-white'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isWinner2 && <Trophy className="w-4 h-4 text-primary-500 flex-shrink-0" />}
              
              {/* Participant 2 Profile Picture */}
              {match.participant2 && participant2Name !== 'TBD' && (
                <div className="relative w-6 h-6 flex-shrink-0">
                  {match.participant2.profile_image ? (
                    <img
                      src={getImageUrl(match.participant2.profile_image)}
                      alt={participant2Name}
                      className="w-6 h-6 rounded-full object-cover border border-primary-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ display: match.participant2.profile_image ? 'none' : 'flex' }}
                  >
                    {participant2Name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                </div>
              )}
              
              <span className={`font-semibold truncate ${
                isWinner2 ? 'text-primary-700' : 'text-gray-900'
              }`}>
                {participant2Name}
              </span>
            </div>
            {match.participant2_score !== null && match.participant2_score !== undefined && (
              <span className={`font-bold text-lg ${
                isWinner2 ? 'text-primary-700' : 'text-gray-700'
              }`}>
                {match.participant2_score}
              </span>
            )}
          </div>
        </div>

        {/* Match Details */}
        {match.match_date && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatMatchDate2(match.match_date, match.match_time)}</span>
              </div>
              {match.venue_name && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{match.venue_name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!matchesArray || matchesArray.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Matches Yet</h3>
          <p className="text-gray-500">
            Matches will appear here once the tournament brackets are generated.
          </p>
        </div>
      </div>
    );
  }

  const rounds = Object.keys(groupedMatches).sort((a, b) => Number(a) - Number(b));
  const totalRounds = rounds.length;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Tournament Bracket</h2>
            <p className="text-white/90 text-sm">
              {tournament.format_type || tournament.format} • {matchesArray.length} matches
            </p>
          </div>
        </div>
      </div>

      {/* View Mode Selector & Actions */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-700">View Mode</h3>
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-300">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Grid View
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'tree'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Tree View
              </button>
            </div>
          </div>
          {/* {isOrganizer && (
            <button
              onClick={() => setShowBulkScheduling(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              <Zap className="w-4 h-4" />
              Bulk Schedule
            </button>
          )} */}
        </div>
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2 overflow-x-auto">
            {rounds.map((round) => {
              const roundNum = Number(round);
              const roundMatches = groupedMatches[round];
              const completedCount = roundMatches.filter(m => m.status === 'completed').length;
              
              return (
                <button
                  key={round}
                  onClick={() => setSelectedRound(roundNum)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedRound === roundNum
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-sm">{getRoundName(roundNum, totalRounds)}</div>
                  <div className="text-xs opacity-75 mt-0.5">
                    {completedCount}/{roundMatches.length}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Area - Grid or Tree View */}
      {viewMode === 'grid' ? (
        /* Grid View - Matches Grid */
        <div className="p-6">
          {selectedRound && groupedMatches[selectedRound] && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {getRoundName(selectedRound, totalRounds)}
                </h3>
                <span className="text-sm text-gray-500">
                  {groupedMatches[selectedRound].length} {groupedMatches[selectedRound].length === 1 ? 'match' : 'matches'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedMatches[selectedRound].map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Tree View - Bracket Tree Visualization */
        <div className="p-6">
          <BracketTreeView
            tournament={tournament}
            matches={matchesArray}
            onMatchClick={onMatchClick}
          />
        </div>
      )}

      {/* Bulk Scheduling Modal */}
      {showBulkScheduling && (
        <BulkSchedulingModal
          matches={matchesArray}
          tournament={tournament}
          onClose={() => setShowBulkScheduling(false)}
          onSave={onScheduleUpdate}
        />
      )}
    </div>
  );
};

export default TournamentBracket;

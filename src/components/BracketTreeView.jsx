import { useState } from 'react';
import { Trophy, Users, Calendar, MapPin, Clock, User } from 'lucide-react';
import { getParticipantName } from '../utils/participantHelper';

const BracketTreeView = ({ tournament, matches = [], onMatchClick }) => {
  const [hoveredMatch, setHoveredMatch] = useState(null);

  // Ensure matches is an array
  const matchesArray = Array.isArray(matches) ? matches : [];

  // Early return if no matches
  if (!matchesArray || matchesArray.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Matches Yet</h3>
        <p className="text-gray-500">
          Matches will appear here once the tournament brackets are generated.
        </p>
      </div>
    );
  }

  // Group matches by rounds
  const groupMatchesByRound = () => {
    const grouped = {};
    matchesArray.forEach(match => {
      const round = match.round_number || 1;
      if (!grouped[round]) {
        grouped[round] = [];
      }
      grouped[round].push(match);
    });
    return grouped;
  };

  const groupedMatches = groupMatchesByRound();
  const rounds = Object.keys(groupedMatches).sort((a, b) => Number(a) - Number(b)); // Normal order: Round 1, 2, 3...
  const totalRounds = rounds.length;

  const getRoundName = (roundNumber) => {
    const roundsFromEnd = totalRounds - roundNumber;
    if (roundsFromEnd === 0) return 'Final';
    if (roundsFromEnd === 1) return 'Semi-Final';
    if (roundsFromEnd === 2) return 'Quarter-Final';
    return `Round ${roundNumber}`;
  };

  const getMatchStatus = (match) => {
    if (match.status === 'completed') return 'bg-primary-100 border-primary-400';
    if (match.status === 'in_progress') return 'bg-blue-100 border-blue-400';
    if (match.status === 'scheduled') return 'bg-yellow-50 border-yellow-300';
    return 'bg-gray-50 border-gray-300';
  };

  const MatchNode = ({ match }) => {
    const isWinner1 = match.winner_participant_id === match.participant1_id;
    const isWinner2 = match.winner_participant_id === match.participant2_id;
    const isHovered = hoveredMatch === match.id;
    const hasWinner = match.winner_participant_id !== null && match.winner_participant_id !== undefined;

    return (
      <div
        onClick={() => onMatchClick && onMatchClick(match)}
        onMouseEnter={() => setHoveredMatch(match.id)}
        onMouseLeave={() => setHoveredMatch(null)}
        className={`relative bg-white border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
          getMatchStatus(match)
        } ${isHovered ? 'shadow-lg scale-105 z-10' : 'shadow-sm'}`}
        style={{ minWidth: '180px', maxWidth: '200px' }}
      >
        {/* Winner Badge (if match is completed) */}
        {hasWinner && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary-500 to-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Winner
          </div>
        )}
        
        {/* Match Number */}
        <div className="text-xs text-gray-500 font-semibold mb-2 text-center">
          Match #{match.match_number || match.id}
        </div>

        {/* Participants */}
        <div className="space-y-1">
          {/* Participant 1 */}
          <div className={`flex items-center gap-2 p-1.5 rounded ${
            isWinner1 ? 'bg-primary-200 font-bold' : 'bg-white'
          }`}>
            {isWinner1 ? (
              <Trophy className="w-3 h-3 text-primary-500 flex-shrink-0" />
            ) : (
              <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
            )}
            <span className={`text-xs truncate ${isWinner1 ? 'text-primary-700' : 'text-gray-700'}`}>
              {getParticipantName(match.participant1)}
            </span>
          </div>

          {/* VS */}
          <div className="text-center text-xs text-gray-400 font-semibold">vs</div>

          {/* Participant 2 */}
          <div className={`flex items-center gap-2 p-1.5 rounded ${
            isWinner2 ? 'bg-primary-200 font-bold' : 'bg-white'
          }`}>
            {isWinner2 ? (
              <Trophy className="w-3 h-3 text-primary-500 flex-shrink-0" />
            ) : (
              <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
            )}
            <span className={`text-xs truncate ${isWinner2 ? 'text-primary-700' : 'text-gray-700'}`}>
              {getParticipantName(match.participant2)}
            </span>
          </div>
        </div>

        {/* Match Details (on hover) */}
        {isHovered && match.match_date && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-purple-300 rounded-lg p-2 shadow-xl z-20">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Calendar className="w-3 h-3" />
                <span>{new Date(match.match_date).toLocaleDateString()}</span>
              </div>
              {match.match_time && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{match.match_time}</span>
                </div>
              )}
              {match.venue_name && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{match.venue_name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ConnectorLine = ({ type = 'horizontal', showArrow = false }) => {
    if (type === 'horizontal') {
      return (
        <div className="flex items-center">
          <div className="h-0.5 bg-gradient-to-r from-purple-300 to-purple-400 flex-1 min-w-[40px]"></div>
          {showArrow && (
            <div className="relative">
              {/* Arrow pointing RIGHT */}
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-purple-400"></div>
            </div>
          )}
        </div>
      );
    }
    if (type === 'vertical') {
      return <div className="w-0.5 bg-gradient-to-b from-purple-400 to-purple-300 flex-1"></div>;
    }
    return null;
  };

  // Normal order for display (left to right: Round 1 -> Final)
  // No need to reverse - display in natural order
  const displayRounds = rounds;

  return (
    <div className="overflow-x-auto pb-8">
      <div className="min-w-max">
        {/* Tree Structure - Left to Right (Round 1 on left, Final on right) */}
        <div className="flex items-start justify-center gap-8 p-8">
          {displayRounds.map((round, displayIndex) => {
            const roundNum = Number(round);
            const roundMatches = groupedMatches[round];
            const matchesPerColumn = Math.pow(2, totalRounds - roundNum);
            const spacing = 120 / matchesPerColumn;
            
            // Check if this is the Final round (last in display order)
            const isFinalRound = displayIndex === displayRounds.length - 1;

            return (
              <div key={round} className="flex flex-col items-center">
                {/* Round Label */}
                <div className="mb-6 sticky top-0 bg-white z-10 py-2">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    {getRoundName(roundNum)}
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'}
                  </div>
                </div>

                {/* Matches Column */}
                <div className="relative flex flex-col justify-around" style={{ gap: `${spacing}px`, minHeight: '400px' }}>
                  {roundMatches.map((match) => (
                    <div key={match.id} className="flex items-center">
                      {/* Match Node */}
                      <MatchNode match={match} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-8 px-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary-100 border-2 border-primary-400 rounded"></div>
            <span className="text-xs text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
            <span className="text-xs text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
            <span className="text-xs text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded"></div>
            <span className="text-xs text-gray-600">Pending</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mt-6 px-8">
          <p className="text-sm text-gray-500">
            💡 Hover over matches to see details • Click to view full information
          </p>
        </div>
      </div>
    </div>
  );
};

export default BracketTreeView;

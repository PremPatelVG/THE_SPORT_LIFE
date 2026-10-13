import { useState, useEffect } from 'react';
import { Users, Trophy, Calendar, MapPin } from 'lucide-react';

/**
 * GroupStageDisplay Component
 * Displays group stage matches organized by groups with proper match counts
 */
const GroupStageDisplay = ({ matches, groups }) => {
  const [groupedMatches, setGroupedMatches] = useState({});
  const [groupStats, setGroupStats] = useState({});

  useEffect(() => {
    if (matches && groups) {
      organizeMatchesByGroup();
    }
  }, [matches, groups]);

  const organizeMatchesByGroup = () => {
    const organized = {};
    const stats = {};

    // Initialize groups
    groups.forEach(group => {
      organized[group.id] = [];
      stats[group.id] = {
        total_matches: 0,
        completed_matches: 0,
        pending_matches: 0,
        participants: group.participants || []
      };
    });

    // Organize matches by group
    matches.forEach(match => {
      if (match.group_id && organized[match.group_id]) {
        organized[match.group_id].push(match);
        stats[match.group_id].total_matches++;
        
        if (match.status === 'completed') {
          stats[match.group_id].completed_matches++;
        } else {
          stats[match.group_id].pending_matches++;
        }
      }
    });

    setGroupedMatches(organized);
    setGroupStats(stats);
  };

  const getMatchStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'scheduled':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getMatchStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'Live';
      case 'scheduled':
        return 'Scheduled';
      default:
        return 'Pending';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Group Stage Matches</h3>
        <div className="text-sm text-gray-600">
          <strong>{groups.length}</strong> Groups • <strong>{matches.length}</strong> Total Matches
        </div>
      </div>

      {groups.map((group) => {
        const groupMatches = groupedMatches[group.id] || [];
        const stats = groupStats[group.id] || {};

        return (
          <div key={group.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
            {/* Group Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold">{group.group_name}</h4>
                  <p className="text-sm text-purple-100 mt-1">
                    {stats.participants?.length || 0} Participants • {stats.total_matches} Matches
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.completed_matches}/{stats.total_matches}</div>
                  <div className="text-xs text-purple-100">Completed</div>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="bg-purple-50 p-4 border-b border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Participants</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {stats.participants?.map((participant, index) => (
                  <div
                    key={participant.id || index}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-purple-200"
                  >
                    <img
                      src={participant.profile_image || '/default-avatar.png'}
                      alt={participant.participant_name || participant.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {participant.participant_name || participant.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matches */}
            <div className="p-4 bg-white">
              {groupMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No matches scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupMatches.map((match, index) => (
                    <div
                      key={match.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500">
                            Match {index + 1}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getMatchStatusColor(match.status)}`}>
                            {getMatchStatusText(match.status)}
                          </span>
                        </div>
                        {match.match_date && (
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(match.match_date)}
                            </div>
                            {match.match_time && (
                              <div className="flex items-center gap-1">
                                <span>{formatTime(match.match_time)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Participants */}
                      <div className="flex items-center justify-between gap-4">
                        {/* Participant 1 */}
                        <div className="flex-1 flex items-center gap-3">
                          <img
                            src={match.participant1?.profile_image || '/default-avatar.png'}
                            alt={match.participant1?.name || 'TBD'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {match.participant1?.name || 'TBD'}
                            </p>
                            {match.status === 'completed' && match.live_score && (
                              <p className="text-sm text-gray-600">
                                Score: {match.live_score.participant1?.goals || 0}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* VS */}
                        <div className="px-4 py-2 bg-gray-100 rounded-lg">
                          <span className="text-sm font-bold text-gray-600">VS</span>
                        </div>

                        {/* Participant 2 */}
                        <div className="flex-1 flex items-center gap-3 justify-end">
                          <div className="flex-1 text-right">
                            <p className="font-semibold text-gray-900">
                              {match.participant2?.name || 'TBD'}
                            </p>
                            {match.status === 'completed' && match.live_score && (
                              <p className="text-sm text-gray-600">
                                Score: {match.live_score.participant2?.goals || 0}
                              </p>
                            )}
                          </div>
                          <img
                            src={match.participant2?.profile_image || '/default-avatar.png'}
                            alt={match.participant2?.name || 'TBD'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Winner Badge */}
                      {match.status === 'completed' && match.winner_id && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold text-gray-900">
                              Winner: {match.winner_id === match.participant1_id ? match.participant1?.name : match.participant2?.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group Footer Stats */}
            <div className="bg-gray-50 p-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div>
                  <strong>Expected Matches:</strong> {stats.participants?.length > 1 ? (stats.participants.length * (stats.participants.length - 1)) / 2 : 0}
                </div>
                <div>
                  <strong>Progress:</strong> {stats.total_matches > 0 ? Math.round((stats.completed_matches / stats.total_matches) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GroupStageDisplay;

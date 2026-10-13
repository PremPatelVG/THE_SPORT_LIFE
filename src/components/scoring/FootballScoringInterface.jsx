import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Clock, Plus, Undo } from 'lucide-react';
import TimingSummary from './TimingSummary';
import api from '../../config/api';

const FootballScoringInterface = ({ 
  match, 
  liveScore, 
  onAddGoal, 
  onAddEvent, 
  matchTimer, 
  periodDuration, 
  onAddTime, 
  onRecordPenalty, 
  onUndo,
  onStartExtraTimeFirstHalf,
  onEndExtraTimeFirstHalf,
  onStartExtraTimeBreak,
  onStartExtraTimeSecondHalf,
  onEndExtraTimeSecondHalf
}) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [eventType, setEventType] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAssist, setSelectedAssist] = useState(null);
  const [goalType, setGoalType] = useState('open_play');
  const [minute, setMinute] = useState('');
  const [cardReason, setCardReason] = useState('');
  const [addMinutes, setAddMinutes] = useState('');
  const [addSeconds, setAddSeconds] = useState('');
  const [penaltyResult, setPenaltyResult] = useState(null);
  // Substitution states
  const [playerOut, setPlayerOut] = useState(null);
  const [playerIn, setPlayerIn] = useState(null);
  
  // Player lists from API
  const [playingPlayers, setPlayingPlayers] = useState([]);
  const [substitutePlayers, setSubstitutePlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const team1 = match.participant1_details;
  const team2 = match.participant2_details;

  const handleOpenEventModal = async (type, team) => {
    setEventType(type);
    setSelectedTeam(team);
    setSelectedPlayer(null);
    setSelectedAssist(null);
    setGoalType('open_play');
    setPlayerOut(null);
    setPlayerIn(null);
    // Auto-fill current match time (MM:SS format)
    setMinute(getMatchMinute());
    setCardReason('');
    
    // Fetch players from API
    const currentTeam = team === 'participant1' ? team1 : team2;
    if (currentTeam && currentTeam.id) {
      await fetchPlayers(match.id, currentTeam.id);
    }
    
    setShowEventModal(true);
  };
  
  // Fetch playing and substitute players from API
  const fetchPlayers = async (matchId, teamId) => {
    try {
      setLoadingPlayers(true);
      
      // Fetch playing players
      const playingRes = await api.get(`/matches/${matchId}/player-status/${teamId}/playing`);
      setPlayingPlayers(playingRes.data.data || []);
      
      // Fetch substitute players
      const subsRes = await api.get(`/matches/${matchId}/player-status/${teamId}/substitutes`);
      setSubstitutePlayers(subsRes.data.data || []);
      
      // console.log('✅ Players loaded:', {
      //   playing: playingRes.data.data?.length,
      //   substitutes: subsRes.data.data?.length
      // });
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleOpenPenaltyModal = (team) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
    setPenaltyResult(null);
    
    // Debug: Log penalty shootout data
    // console.log('🎯 Opening penalty modal for:', team);
    // console.log('📊 Penalty shootout data:', liveScore?.penalty_shootout);
    // console.log('⚽ Kicks array:', liveScore?.penalty_shootout?.kicks);
    
    setShowPenaltyModal(true);
  };

  // Helper function to determine which team should kick next
  const getNextKickingTeam = () => {
    const ps = liveScore?.penalty_shootout;
    if (!ps) return null;
    
    const totalKicks = ps.kicks?.length || 0;
    
    // Alternating pattern: even kicks (0, 2, 4...) = participant1, odd kicks (1, 3, 5...) = participant2
    return totalKicks % 2 === 0 ? 'participant1' : 'participant2';
  };

  // Check if a team can take penalty now
  const canTeamTakePenalty = (team) => {
    if (!liveScore?.is_penalty_shootout) return false;
    const nextTeam = getNextKickingTeam();
    return nextTeam === team;
  };

  const handleConfirmPenalty = async () => {
    if (!selectedPlayer) {
      alert('Please select a player');
      return;
    }

    if (!penaltyResult) {
      alert('Please select penalty result');
      return;
    }

    if (onRecordPenalty) {
      await onRecordPenalty(selectedTeam, selectedPlayer, penaltyResult);
    }

    setShowPenaltyModal(false);
  };

  const handleConfirmEvent = async () => {
    // Special handling for substitution
    if (eventType === 'substitution') {
      if (!playerOut || !playerIn) {
        alert('Please select both Player Out and Player In');
        return;
      }
      if (!minute) {
        alert('Please enter the minute');
        return;
      }

      const eventData = {
        event_type: 'substitution',
        participant_side: selectedTeam,
        player_id: playerOut, // Player going out
        minute: minute, // Keep as MM:SS format
        metadata: {
          player_in_id: playerIn // Player coming in
        }
      };

      await onAddEvent(eventData);
      
      // Refresh players after substitution
      const currentTeam = selectedTeam === 'participant1' ? team1 : team2;
      if (currentTeam && currentTeam.id) {
        await fetchPlayers(match.id, currentTeam.id);
      }
      
      setShowEventModal(false);
      return;
    }

    // Regular events (goal, cards)
    if (!selectedPlayer) {
      alert('Please select a player');
      return;
    }

    if (!minute) {
      alert('Please enter the minute');
      return;
    }

    const eventData = {
      event_type: eventType,
      participant_side: selectedTeam,
      player_id: selectedPlayer,
      minute: minute, // Keep as MM:SS format
      metadata: {}
    };

    if (eventType === 'goal') {
      eventData.metadata.goal_type = goalType;
      if (selectedAssist) {
        eventData.metadata.assist_player_id = selectedAssist;
      }
      await onAddGoal(selectedTeam, eventData);
    } else if (eventType === 'yellow_card') {
      // Call dedicated yellow card endpoint
      eventData.reason = cardReason;
      await onAddEvent(eventData);
    } else if (eventType === 'red_card') {
      // Call dedicated red card endpoint
      eventData.reason = cardReason;
      await onAddEvent(eventData);
    } else {
      await onAddEvent(eventData);
    }

    setShowEventModal(false);
  };

  // Simple helper to get player name
  const getTeamPlayers = (team) => {
    if (!team || !team.members) return [];
    return team.members;
  };

  const getPlayerName = (player) => {
    return `${player.first_name} ${player.last_name}`;
  };

  const getPlayerPosition = (player) => {
    // You can add position logic here if available in your data
    return player.position || 'Player';
  };

  // ✅ NEW: Handle add additional time
  const handleConfirmAddTime = async () => {
    const mins = parseInt(addMinutes) || 0;
    const secs = parseInt(addSeconds) || 0;
    
    if (mins === 0 && secs === 0) {
      alert('Please enter minutes or seconds to add');
      return;
    }
    
    const totalSeconds = (mins * 60) + secs;
    
    // Call parent function to add time
    if (onAddTime) {
      await onAddTime(totalSeconds);
    }
    
    // Reset and close modal
    setAddMinutes('');
    setAddSeconds('');
    setShowAddTimeModal(false);
  };

  // Get current match time in MM:SS format (server-managed)
  const getMatchMinute = () => {
    if (!liveScore?.match_time) return '0:00';
    
    // Return full MM:SS format from server
    // Handle overtime format like "45:00 + 2:30"
    if (liveScore.match_time.includes('+')) {
      // Extract the overtime part (e.g., "45:00 + 2:30" -> "47:30")
      const parts = liveScore.match_time.split('+').map(s => s.trim());
      const [baseMin, baseSec] = parts[0].split(':').map(Number);
      const [extraMin, extraSec] = parts[1].split(':').map(Number);
      const totalMin = baseMin + extraMin;
      const totalSec = baseSec + extraSec;
      return `${totalMin}:${totalSec.toString().padStart(2, '0')}`;
    }
    
    return liveScore.match_time; // Already in MM:SS format
  };

  // ✅ NEW: Get elapsed time (count-up timer) with overtime support
  const getElapsedTime = () => {
    if (!liveScore?.match_time) return '00:00';
    // Handle penalty shootout - show "Penalties" instead of time
    if (liveScore?.is_penalty_shootout) return 'Penalties';
    return liveScore.match_time; // Already in MM:SS format from server (includes overtime: "45:00 + 2:30")
  };
  
  // Check if in overtime
  const isOvertime = () => {
    return liveScore?.is_overtime === true;
  };

  // ✅ NEW: Get additional time display
  const getAdditionalTime = () => {
    const additionalSeconds = liveScore?.additional_time_seconds || 0;
    if (additionalSeconds === 0) return null;
    
    const mins = Math.floor(additionalSeconds / 60);
    const secs = additionalSeconds % 60;
    if (secs === 0) {
      return `+${mins}'`;
    }
    return `+${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHalfName = () => {
    const currentHalf = liveScore?.current_half || 1;
    const isOnBreak = liveScore?.is_on_break || false;
    const isPenaltyShootout = liveScore?.is_penalty_shootout || false;
    const isExtraTime = liveScore?.is_extra_time || false;
    
    if (isPenaltyShootout) return '⚽ Penalties';
    if (isOnBreak && isExtraTime) return '⏸️ Extra Time Break';
    if (isOnBreak) return '⏸️ Half-Time Break';
    if (currentHalf === 1) return 'First Half';
    if (currentHalf === 2) return 'Second Half';
    if (currentHalf === 3) return '⏱️ Extra Time 1st Half';
    if (currentHalf === 4) return '⏱️ Extra Time 2nd Half';
    return 'In Progress';
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
        {/* Scoreboard */}
        <div className="bg-gradient-to-br from-green-600 to-primary-600 rounded-2xl shadow-2xl p-8 text-white flex flex-col justify-center min-h-[400px]">
        <div className="flex items-center justify-center gap-12">
          {/* Team 1 */}
          <div className="flex-1 text-center">
            <div className="text-6xl font-bold mb-3">
              {liveScore?.participant1?.goals || 0}
              {liveScore?.is_penalty_shootout && liveScore?.penalty_shootout && (
                <span className="text-4xl">({liveScore.penalty_shootout.participant1_scored})</span>
              )}
            </div>
            <div className="text-xl font-semibold mb-2">{team1?.name || 'Team 1'}</div>
            <div className="flex items-center justify-center gap-2 text-sm opacity-90">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                🟨 {liveScore?.participant1?.yellow_cards || 0}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                🟥 {liveScore?.participant1?.red_cards || 0}
              </span>
            </div>
          </div>

          {/* VS Divider with Timer */}
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold opacity-75 mb-2">VS</div>
            <div className={`rounded-lg px-6 py-3 text-center min-w-[180px] shadow-lg ${
              isOvertime() 
                ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' 
                : liveScore?.is_on_break
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                : 'bg-gradient-to-r from-primary-500 to-primary-500'
            }`}>
              {/* Extra Time Break - Show only text, no timer */}
              {liveScore?.is_extra_time && liveScore?.is_on_break ? (
                <div className="text-sm font-bold text-white py-1">
                  ⏸️ Extra Time Break
                </div>
              ) : (
                <>
                  {/* Running Time Display */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-4xl font-bold font-mono text-white">
                      {getElapsedTime()}
                    </div>
                    {getAdditionalTime() && (
                      <div className="text-2xl font-bold text-yellow-200">{getAdditionalTime()}</div>
                    )}
                  </div>
                  <div className="text-xs text-white opacity-90 mt-1">
                    {isOvertime() && <span className="font-bold">🔴 EXTRA TIME </span>}
                    {getHalfName()}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div className="flex-1 text-center">
            <div className="text-6xl font-bold mb-3">
              {liveScore?.participant2?.goals || 0}
              {liveScore?.is_penalty_shootout && liveScore?.penalty_shootout && (
                <span className="text-4xl">({liveScore.penalty_shootout.participant2_scored})</span>
              )}
            </div>
            <div className="text-xl font-semibold mb-2">{team2?.name || 'Team 2'}</div>
            <div className="flex items-center justify-center gap-2 text-sm opacity-90">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                🟨 {liveScore?.participant2?.yellow_cards || 0}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                🟥 {liveScore?.participant2?.red_cards || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Match Status Bar */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">{getHalfName()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="opacity-90">Elapsed:</span>
                <span className="font-bold text-lg font-mono">{getElapsedTime()}</span>
                {getAdditionalTime() && (
                  <span className="font-bold text-yellow-300 text-lg">{getAdditionalTime()}</span>
                )}
              </div>
              <button
                onClick={() => setShowAddTimeModal(true)}
                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all flex items-center gap-1 text-xs"
                title="Add Additional Time"
              >
                <Plus className="w-4 h-4" />
                Add Time
              </button>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{periodDuration}' per half</div>
              <div className="text-xs opacity-75">Match Duration</div>
            </div>
          </div>
        </div>
        </div>

        {/* Timing Summary */}
        <TimingSummary liveScore={liveScore} />
      </div>

      {/* Break Active Banner */}
      {liveScore?.is_on_break && (
        <div className="mb-4 bg-gradient-to-r from-orange-500 to-yellow-500 border-2 border-orange-600 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-center gap-3 text-white">
            <Clock className="w-6 h-6 animate-pulse" />
            <div className="text-center">
              <div className="text-xl font-bold">☕ BREAK TIME</div>
              <div className="text-sm opacity-90">All scoring actions are disabled during the break</div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Button - Centered above team actions */}
      {onUndo && (
        <div className="mb-4">
          <button
            onClick={onUndo}
            disabled={liveScore?.is_on_break}
            className={`w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              liveScore?.is_on_break 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:shadow-lg'
            }`}
          >
            <Undo className="w-5 h-5" />
            UNDO LAST ACTION
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Team 1 Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4 text-center">{team1?.name || 'Team 1'}</h3>
          <div className="space-y-3">
            {/* Show Penalty Kick button if in penalty shootout */}
            {liveScore?.is_penalty_shootout ? (
              <button
                onClick={() => handleOpenPenaltyModal('participant1')}
                disabled={liveScore?.is_on_break || !canTeamTakePenalty('participant1')}
                className={`w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  liveScore?.is_on_break || !canTeamTakePenalty('participant1')
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-lg'
                }`}
              >
                🎯 PENALTY KICK
                {!canTeamTakePenalty('participant1') && (
                  <span className="text-xs">(Wait for turn)</span>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleOpenEventModal('goal', 'participant1')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  ⚽ GOAL
                </button>
                <button
                  onClick={() => handleOpenEventModal('yellow_card', 'participant1')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  🟨 Yellow Card
                </button>
                <button
                  onClick={() => handleOpenEventModal('red_card', 'participant1')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  🟥 Red Card
                </button>
                <button
                  onClick={() => handleOpenEventModal('substitution', 'participant1')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  🔄 Substitution
                </button>
              </>
            )}
          </div>
        </div>

        {/* Team 2 Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4 text-center">{team2?.name || 'Team 2'}</h3>
          <div className="space-y-3">
            {/* Show Penalty Kick button if in penalty shootout */}
            {liveScore?.is_penalty_shootout ? (
              <button
                onClick={() => handleOpenPenaltyModal('participant2')}
                disabled={liveScore?.is_on_break || !canTeamTakePenalty('participant2')}
                className={`w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  liveScore?.is_on_break || !canTeamTakePenalty('participant2')
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-lg'
                }`}
              >
                🎯 PENALTY KICK
                {!canTeamTakePenalty('participant2') && (
                  <span className="text-xs">(Wait for turn)</span>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleOpenEventModal('goal', 'participant2')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  ⚽ GOAL
                </button>
                <button
                  onClick={() => handleOpenEventModal('yellow_card', 'participant2')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  🟨 Yellow Card
                </button>
                <button
                  onClick={() => handleOpenEventModal('red_card', 'participant2')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  🟥 Red Card
                </button>
                <button
                  onClick={() => handleOpenEventModal('substitution', 'participant2')}
                  disabled={liveScore?.is_on_break}
                  className={`w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    liveScore?.is_on_break 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  🔄 Substitution
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Extra Time Controls (NEW) - Hide when penalties start */}
      {liveScore?.is_extra_time && !liveScore?.is_penalty_shootout && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-lg mb-2">
              <Clock className="w-5 h-5" />
              ⏱️ EXTRA TIME
            </div>
            <div className="text-xl font-bold text-blue-900">
              {liveScore.current_half === 3 ? 'Extra Time 1st Half' : 'Extra Time 2nd Half'}
            </div>
            {liveScore.extra_time_config && (
              <div className="text-sm text-blue-700 mt-1">
                Half Duration: {liveScore.extra_time_config.half_duration} min | 
                Break: {liveScore.extra_time_config.break_duration} min
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Extra Time 1st Half Controls */}
            {liveScore.current_half === 3 && !liveScore.extra_time_started && (
              <button
                onClick={onStartExtraTimeFirstHalf}
                className="col-span-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                START EXTRA TIME 1ST HALF
              </button>
            )}

            {liveScore.current_half === 3 && liveScore.extra_time_started && !liveScore.is_on_break && (
              <button
                onClick={onEndExtraTimeFirstHalf}
                className="col-span-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                END EXTRA TIME 1ST HALF
              </button>
            )}

            {/* Break Controls */}
            {liveScore.current_half === 3 && liveScore.extra_time_half_1_duration && !liveScore.is_on_break && (
              <button
                onClick={onStartExtraTimeBreak}
                className="col-span-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                START BREAK
              </button>
            )}

            {liveScore.is_on_break && liveScore.current_half === 3 && (
              <button
                onClick={onStartExtraTimeSecondHalf}
                className="col-span-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                START EXTRA TIME 2ND HALF
              </button>
            )}

            {/* Extra Time 2nd Half Controls */}
            {liveScore.current_half === 4 && (
              <button
                onClick={onEndExtraTimeSecondHalf}
                className="col-span-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                END EXTRA TIME 2ND HALF
              </button>
            )}
          </div>

          {/* Extra Time Info */}
          <div className="mt-4 bg-white rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-800 text-center">
              ℹ️ Timer will show in <span className="font-bold text-red-600">RED</span> when it exceeds the configured duration
            </p>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {eventType === 'goal' && '⚽ GOAL - '}
                {eventType === 'yellow_card' && '🟨 Yellow Card - '}
                {eventType === 'red_card' && '🟥 Red Card - '}
                {eventType === 'substitution' && '🔄 Substitution - '}
                <span className="text-primary-500">
                  {selectedTeam === 'participant1' ? team1?.name : team2?.name}
                </span>
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Substitution - Two separate dropdowns */}
              {eventType === 'substitution' ? (
                <>
                  {/* Player Out - Currently Playing */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Player Out: <span className="text-xs text-gray-500">(Currently Playing)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 bg-red-50 rounded-lg border border-red-200">
                      {loadingPlayers ? (
                        <div className="col-span-2 text-center py-8 text-gray-500">Loading...</div>
                      ) : playingPlayers.filter(p => {
                        // Hide players with red cards (they're already sent off)
                        const hasRedCard = p.has_red_card === 1 || p.has_red_card === true;
                        return !hasRedCard;
                      }).length > 0 ? (
                        playingPlayers
                          .filter(p => {
                            // Hide players with red cards (they're already sent off)
                            const hasRedCard = p.has_red_card === 1 || p.has_red_card === true;
                            return !hasRedCard;
                          })
                          .map((player) => (
                        <button
                          key={player.id}
                          onClick={() => {
                            // console.log('Player Out selected:', player.user_id, player);
                            setPlayerOut(player.user_id);
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            playerOut && playerOut === player.user_id
                              ? 'border-red-500 bg-red-100'
                              : 'border-gray-200 hover:border-red-300 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">
                            #{player.jersey_number || player.user_id} {getPlayerName(player)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {player.position_label || 'Player'}
                          </div>
                        </button>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <p className="text-sm">No players available for substitution</p>
                          <p className="text-xs mt-1 text-gray-400">
                            {playingPlayers.length > 0 ? 'All playing players have red cards' : 'No playing players found'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player In - Substitutes */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Player In: <span className="text-xs text-gray-500">(Substitutes)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 bg-green-50 rounded-lg border border-green-200">
                      {loadingPlayers ? (
                        <div className="col-span-2 text-center py-8 text-gray-500">Loading...</div>
                      ) : substitutePlayers.length > 0 ? (
                        substitutePlayers.map((player) => (
                          <button
                            key={player.id}
                            onClick={() => {
                              // console.log('Player In selected:', player.user_id, player);
                              setPlayerIn(player.user_id);
                            }}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              playerIn && playerIn === player.user_id
                                ? 'border-green-500 bg-green-100'
                                : 'border-gray-200 hover:border-green-300 bg-white'
                            }`}
                          >
                            <div className="font-semibold text-gray-900">
                              #{player.jersey_number || player.user_id} {getPlayerName(player)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {player.position_label || 'Player'}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <p className="text-sm">No substitute players available</p>
                          <p className="text-xs mt-1">All squad members are currently playing</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Regular Player Selection (Goals, Cards) - Only Playing Players */
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {eventType === 'goal' ? 'Scorer:' : 'Player:'}
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {loadingPlayers ? (
                      <div className="col-span-2 text-center py-8 text-gray-500">Loading...</div>
                    ) : playingPlayers.map((player) => {
                      // Check if player has red card
                      const hasRedCard = player.has_red_card === 1 || player.has_red_card === true;
                      // Disable players with red cards for goals and cards (they're already sent off)
                      const isDisabled = hasRedCard && (eventType === 'goal' || eventType === 'yellow_card' || eventType === 'red_card');
                      
                      return (
                        <button
                          key={player.id}
                          onClick={() => !isDisabled && setSelectedPlayer(player.user_id)}
                          disabled={isDisabled}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            isDisabled
                              ? 'bg-red-100 border-red-400 cursor-not-allowed opacity-75'
                              : selectedPlayer && selectedPlayer === player.user_id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300 bg-white'
                          }`}
                        >
                          <div className={`font-semibold ${isDisabled ? 'text-red-700' : 'text-gray-900'}`}>
                            #{player.jersey_number || player.user_id} {getPlayerName(player)}
                            {hasRedCard && <span className="ml-2 text-red-600">🟥</span>}
                          </div>
                          <div className={`text-xs mt-1 ${isDisabled ? 'text-red-600' : 'text-gray-500'}`}>
                            {player.position_label || 'Player'}
                            {hasRedCard && eventType === 'goal' && (
                              <span className="block mt-1 font-semibold">Sent Off - Cannot Score</span>
                            )}
                            {hasRedCard && (eventType === 'yellow_card' || eventType === 'red_card') && (
                              <span className="block mt-1 font-semibold">Already Sent Off</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Goal-specific fields */}
              {eventType === 'goal' && (
                <>
                  {/* Assist Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Assist (Optional):
                    </label>
                    <select
                      value={selectedAssist || ''}
                      onChange={(e) => setSelectedAssist(e.target.value || null)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
                    >
                      <option value="">-- No assist --</option>
                      {playingPlayers
                        .filter(p => {
                          // Exclude selected scorer and players with red cards
                          const hasRedCard = p.has_red_card === 1 || p.has_red_card === true;
                          return p.user_id !== selectedPlayer && !hasRedCard;
                        })
                        .map((player) => (
                          <option key={player.id} value={player.user_id}>
                            #{player.jersey_number || player.user_id} {getPlayerName(player)}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Goal Type */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Goal Type:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['open_play', 'penalty', 'free_kick', 'header', 'own_goal'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setGoalType(type)}
                          className={`p-3 rounded-lg border-2 transition-all capitalize ${
                            goalType === type
                              ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold'
                              : 'border-gray-200 hover:border-primary-300 bg-white text-gray-700'
                          }`}
                        >
                          {type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Card Reason */}
              {(eventType === 'yellow_card' || eventType === 'red_card') && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Reason:
                  </label>
                  <input
                    type="text"
                    value={cardReason}
                    onChange={(e) => setCardReason(e.target.value)}
                    placeholder="e.g., Foul, Unsporting behavior"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Match Time */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Match Minute:
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  placeholder="1"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the current minute of play (e.g., 1, 2, 45, 90)</p>
              </div>

              {/* Warning */}
              {eventType === 'goal' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>
                      Make sure to select the correct player who scored the goal. This action will update the live score.
                    </span>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
                >
                  ✕ CANCEL
                </button>
                <button
                  onClick={handleConfirmEvent}
                  disabled={
                    eventType === 'substitution' 
                      ? (!playerOut || !playerIn || !minute)
                      : (!selectedPlayer || !minute)
                  }
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  CONFIRM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Add Time Modal */}
      {showAddTimeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-7 h-7 text-yellow-600" />
                  Add Additional Time
                </h2>
                <button
                  onClick={() => setShowAddTimeModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Current Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Current Half</p>
                    <p className="font-bold text-gray-900">{getHalfName()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Current Time</p>
                    <p className="font-bold text-gray-900">{getElapsedTime()}</p>
                  </div>
                </div>
              </div>

              {/* Time Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Additional Time to Add
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={addMinutes}
                      onChange={(e) => setAddMinutes(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center text-2xl font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Seconds</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={addSeconds}
                      onChange={(e) => setAddSeconds(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center text-2xl font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {(addMinutes || addSeconds) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-1">Time to be added:</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    +{parseInt(addMinutes) || 0}:{(parseInt(addSeconds) || 0).toString().padStart(2, '0')}
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    Additional time (injury time) will be added to the current half. 
                    The timer will continue beyond the regular duration.
                  </span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddTimeModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
                >
                  ✕ CANCEL
                </button>
                <button
                  onClick={handleConfirmAddTime}
                  disabled={!addMinutes && !addSeconds}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  ADD TIME
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Kick Modal */}
      {showPenaltyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                🎯 PENALTY KICK - 
                <span className="text-orange-600">
                  {selectedTeam === 'participant1' ? team1?.name : team2?.name}
                </span>
              </h2>
              <button
                onClick={() => setShowPenaltyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Sudden Death Indicator */}
              {liveScore?.penalty_shootout?.sudden_death && (
                <div className="bg-gradient-to-r from-red-500 to-orange-500 border-2 border-red-600 rounded-lg p-4 mb-6 animate-pulse">
                  <p className="text-white font-bold text-center text-lg flex items-center justify-center gap-2">
                    ⚡ SUDDEN DEATH MODE ⚡
                  </p>
                  <p className="text-white text-sm text-center mt-2">
                    Remaining players kick first, then cycle restarts. Next goal wins!
                  </p>
                </div>
              )}

              {/* Current Round Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Current Round</p>
                    <p className="font-bold text-gray-900">
                      {liveScore?.penalty_shootout?.sudden_death 
                        ? `Sudden Death - Round ${liveScore?.penalty_shootout?.current_round}` 
                        : `Round ${liveScore?.penalty_shootout?.current_round} of ${liveScore?.penalty_shootout?.max_rounds}`
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Penalty Score</p>
                    <p className="font-bold text-gray-900">
                      {liveScore?.penalty_shootout?.participant1_scored || 0} - {liveScore?.penalty_shootout?.participant2_scored || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Player Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Player Taking Penalty:
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {getTeamPlayers(selectedTeam === 'participant1' ? team1 : team2).map((player) => {
                    // Check if player has already taken a penalty kick in this shootout
                    const penaltyShootout = liveScore?.penalty_shootout;
                    
                    // ✅ FIFA RULES: Proper sudden death player eligibility
                    let hasAlreadyKicked = false;
                    
                    if (penaltyShootout?.sudden_death) {
                      // In sudden death mode
                      const teamKicks = penaltyShootout.kicks?.filter(
                        kick => kick.participant_side === selectedTeam
                      ) || [];
                      
                      const totalTeamPlayers = getTeamPlayers(selectedTeam === 'participant1' ? team1 : team2).length;
                      const kicksInCurrentCycle = teamKicks.length % totalTeamPlayers;
                      
                      // ✅ FIX: When cycle is complete (kicksInCurrentCycle = 0), all players eligible
                      if (kicksInCurrentCycle === 0) {
                        // Cycle complete - all players eligible for new cycle
                        hasAlreadyKicked = false;
                      } else {
                        // Get kicks in current sudden death cycle
                        const currentCycleKicks = teamKicks.slice(-kicksInCurrentCycle);
                        
                        // Check if player already kicked in current cycle
                        hasAlreadyKicked = currentCycleKicks.some(
                          kick => kick.player_id === player.id
                        );
                      }
                    } else {
                      // In initial rounds (before sudden death)
                      hasAlreadyKicked = penaltyShootout?.kicks?.some(
                        kick => kick.player_id === player.id && kick.participant_side === selectedTeam
                      ) || false;
                    }
                    
                    // Debug: Log check for each player
                    // if (player.id === 9 || player.id === '9') {
                    //   console.log(`🔍 Checking player #${player.id}:`, {
                    //     playerId: player.id,
                    //     playerIdType: typeof player.id,
                    //     hasAlreadyKicked,
                    //     kicks: penaltyShootout?.kicks,
                    //     matchingKicks: penaltyShootout?.kicks?.filter(
                    //       kick => kick.player_id === player.id && kick.participant_side === selectedTeam
                    //     )
                    //   });
                    // }
                    
                    return (
                      <button
                        key={player.id}
                        onClick={() => !hasAlreadyKicked && setSelectedPlayer(player.id)}
                        disabled={hasAlreadyKicked}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          hasAlreadyKicked
                            ? 'bg-red-100 border-red-400 cursor-not-allowed opacity-75'
                            : selectedPlayer === player.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300 bg-white'
                        }`}
                      >
                        <div className={`font-semibold ${hasAlreadyKicked ? 'text-red-700' : 'text-gray-900'}`}>
                          #{player.id} {getPlayerName(player)}
                          {hasAlreadyKicked && <span className="ml-2 text-red-600">✓</span>}
                        </div>
                        <div className={`text-xs mt-1 ${hasAlreadyKicked ? 'text-red-600' : 'text-gray-500'}`}>
                          {getPlayerPosition(player)}
                          {hasAlreadyKicked && (
                            <span className="block mt-1 font-semibold">Already Kicked</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Penalty Result Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Penalty Result:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPenaltyResult('scored')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      penaltyResult === 'scored'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300 bg-white'
                    }`}
                  >
                    <div className="text-3xl text-center mb-2">✓</div>
                    <div className="font-semibold text-center text-gray-900">SCORED</div>
                  </button>
                  <button
                    onClick={() => setPenaltyResult('missed')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      penaltyResult === 'missed'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 bg-white'
                    }`}
                  >
                    <div className="text-3xl text-center mb-2">✗</div>
                    <div className="font-semibold text-center text-gray-900">MISSED</div>
                  </button>
                  <button
                    onClick={() => setPenaltyResult('saved')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      penaltyResult === 'saved'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="text-3xl text-center mb-2">🧤</div>
                    <div className="font-semibold text-center text-gray-900">SAVED</div>
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
                  <span>
                    Record the result of the penalty kick. The penalty shootout score will be updated automatically.
                  </span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPenaltyModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
                >
                  ✕ CANCEL
                </button>
                <button
                  onClick={handleConfirmPenalty}
                  disabled={!selectedPlayer || !penaltyResult}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  RECORD PENALTY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FootballScoringInterface;

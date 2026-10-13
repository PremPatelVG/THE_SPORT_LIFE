import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import {
  Play,
  Pause,
  Square,
  Plus,
  RotateCcw,
  Clock,
  MapPin,
  Trophy,
  Users,
  AlertCircle,
  Loader,
  Zap,
  CheckCircle,
  XCircle,
  ChevronRight,
  History
} from 'lucide-react';
import api from '../config/api';
import { io } from 'socket.io-client';
import FootballScoringInterface from '../components/scoring/FootballScoringInterface';
import SetBasedScoringInterface from '../components/scoring/SetBasedScoringInterface';
import GameBasedScoringInterface from '../components/scoring/GameBasedScoringInterface';
import * as matchTimingService from '../services/matchTimingService';
import SquadSelectionModal from '../components/SquadSelectionModal';
import * as matchSquadService from '../services/matchSquadService';

const RefereeLiveScoring = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'all';
  
  /**
   * Helper function to determine segment type and number from liveScore
   * Properly handles both set-based and game-based sports
   */
  const getSegmentInfo = (liveScore) => {
    // Time-based sports (Football only)
    if (liveScore.current_half) {
      return {
        type: 'half',
        number: liveScore.current_half
      };
    }
    
    // Set-based sports (Tennis, Padel, Volleyball) - Check match_structure first
    if (liveScore.match_structure === 'set_based' || liveScore.current_set) {
      return {
        type: 'set',
        number: liveScore.current_set || 1
      };
    }
    
    // Game-based sports (Badminton, Table Tennis, Squash, Pickleball)
    if (liveScore.match_structure === 'game_based' || liveScore.current_game) {
      return {
        type: 'game',
        number: liveScore.current_game || 1
      };
    }
    
    // Fallback - check sport name from liveScore
    if (['Tennis', 'Padel', 'Volleyball'].includes(liveScore.sport)) {
      return {
        type: 'set',
        number: 1
      };
    }
    
    return {
      type: 'game',
      number: 1
    };
  };
  const { user } = useSelector((state) => state.auth);

  const [match, setMatch] = useState(null);
  const [sport, setSport] = useState(null);
  const [liveScore, setLiveScore] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState('scheduled');
  const [socket, setSocket] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [matchTimer, setMatchTimer] = useState(0); // Timer in seconds
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(1);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [autoHalfTransition, setAutoHalfTransition] = useState(true); // Toggle auto/manual
  const [periodDuration, setPeriodDuration] = useState(45); // Period duration in minutes (for Football)
  
  // Draw decision states
  const [showDrawDecisionModal, setShowDrawDecisionModal] = useState(false);
  const [extraTimeMinutes, setExtraTimeMinutes] = useState(30);
  
  // Extra Time states
  const [showExtraTimeConfigModal, setShowExtraTimeConfigModal] = useState(false);
  const [extraTimeHalfDuration, setExtraTimeHalfDuration] = useState(15);
  const [extraTimeBreakDuration, setExtraTimeBreakDuration] = useState(5);
  
  // Squad selection states
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [currentSquadTeam, setCurrentSquadTeam] = useState(null);
  
  // Server selection states
  const [showServerSelectionModal, setShowServerSelectionModal] = useState(false);
  const [selectedFirstServer, setSelectedFirstServer] = useState(null);
  
  // Play Again modal states
  const [showPlayAgainModal, setShowPlayAgainModal] = useState(false);
  const [creatingRematch, setCreatingRematch] = useState(false);

  /**
   * Convert numeric points to Tennis/Padel format (ONLY for Tennis/Padel)
   * Regular game: 0 → '0', 1 → '15', 2 → '30', 3 → '40', 4+ → 'Adv'
   * Tiebreak: 0 → '0', 1 → '1', 2 → '2', etc. (numeric)
   */
  const convertToTennisScore = (points, opponentPoints, isTiebreak = false) => {
    if (typeof points !== 'number') {
      // Already in string format
      return points;
    }

    // In tiebreak mode, use numeric scoring
    if (isTiebreak) {
      return points.toString();
    }

    const scores = ['0', '15', '30', '40'];
    
    // Handle deuce and advantage scenarios (regular game only)
    if (points >= 3 && opponentPoints >= 3) {
      if (points === opponentPoints) {
        return '40'; // Deuce
      } else if (points > opponentPoints) {
        return 'Adv'; // Advantage
      } else {
        return '40'; // Opponent has advantage
      }
    }
    
    // Normal scoring
    if (points < 4) {
      return scores[points];
    }
    
    // If points >= 4 and opponent < 3, game should be won already
    return '40'; // Fallback
  };
  const [squadStatus, setSquadStatus] = useState({ team1_squad_set: false, team2_squad_set: false, both_squads_set: false });
  // Lifted from child scoring interfaces so undo can reverse a swap
  const [isSwapped, setIsSwapped] = useState(false);
  
  // Use ref to track latest timer value for persistence
  const matchTimerRef = useRef(0);
  const currentHalfRef = useRef(1);
  
  // Update refs when state changes
  useEffect(() => {
    matchTimerRef.current = matchTimer;
    currentHalfRef.current = currentHalf;
  }, [matchTimer, currentHalf]);

  useEffect(() => {
    fetchMatchData();
    connectWebSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
        // console.log('🔌 WebSocket disconnected');
      }
    };
  }, [matchId]);
  
  // WebSocket connection for real-time updates
  const connectWebSocket = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(`${API_URL}/scoring`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      // console.log('✅ Scoreboard WebSocket connected');
      newSocket.emit('join_match', matchId);
      // console.log('📡 Joined match room:', matchId);
    });
    
    // Listen for match updates (timer, half changes, break)
    newSocket.on('match_update', async (data) => {
      // console.log('🔄 Real-time match update:----', data);
      
      // Convert matchId to string for comparison
      if (String(data.matchId) === String(matchId)) {
        // Update live score if present (handle both liveScore and live_score)
        const updatedLiveScore = data.data?.liveScore || data.data?.live_score;
        if (updatedLiveScore) {
          setLiveScore(updatedLiveScore);
          
          // Update current half, break status, and paused status instantly
          if (updatedLiveScore.current_half !== undefined) {
            setCurrentHalf(updatedLiveScore.current_half);
          }
          if (updatedLiveScore.is_on_break !== undefined) {
            setIsOnBreak(updatedLiveScore.is_on_break);
          }
          if (updatedLiveScore.is_paused !== undefined) {
            setIsPaused(updatedLiveScore.is_paused);
            setTimerRunning(!updatedLiveScore.is_paused);
          }
          
          // Check if match completed
          if (updatedLiveScore.match_complete) {
            // console.log('🏁 Match completed via WebSocket!');
            setMatchStatus('completed');
            setTimerRunning(false);
            
            const winnerName = updatedLiveScore.match_winner === 'participant1' 
              ? match?.participant1_name 
              : match?.participant2_name;
            
            alert(`🏆 Match Complete!\\n\\nWinner: ${winnerName || updatedLiveScore.match_winner}`);
          }
          
          // console.log('✅ Scoreboard updated instantly - Half:', updatedLiveScore.current_half, 'Break:', updatedLiveScore.is_on_break);
        }
        
        // Handle events via WebSocket
        const eventTypesToHandle = ['goal', 'yellow_card', 'red_card', 'substitution', 'penalty_kick', 'match_started', 'match_completed', 'half_ended', 'break_started', 'break_ended'];
        const eventTypesToRefresh = ['point_added', 'game_won', 'set_won', 'server_change', 'side_change']; // Events that need full API refresh
        
        if (data.eventType && eventTypesToHandle.includes(data.eventType)) {
          // Add event to list from WebSocket data (no API call needed!)
          if (data.data?.event_id) {
            const newEvent = {
              id: data.data.event_id,
              event_type: data.eventType,
              participant_side: data.data.participant_side,
              player_id: data.data.playerId,
              minute: data.data.minute,
              reason: data.data.reason,
              notes: data.data.notes,
              created_at: new Date().toISOString()
            };
            
            // Add to top of events list
            setEvents(prev => [newEvent, ...prev].slice(0, 20));
            // console.log('✅ Event added via WebSocket (no API call!):', data.eventType);
          }
            
          // If it's a substitution event, refresh squad members
          if (data.eventType === 'substitution') {
            await refreshSquadMembers();
            // console.log('✅ Squad members refreshed after substitution');
          }
        } else if (data.eventType && eventTypesToRefresh.includes(data.eventType)) {
          // For point/game/set events, fetch complete events list from API
          try {
            const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
            setEvents(eventsRes.data.data || []);
            // console.log('✅ Events refreshed from API after:', data.eventType);
          } catch (error) {
            console.error('Failed to refresh events:', error);
          }
        }
      }
    });
    
    // Listen for match pause
    newSocket.on('match_paused', (data) => {
      // console.log('⏸️ Match paused event:', data);
      if (data.matchId === matchId) {
        setIsPaused(true);
        setTimerRunning(false);
        if (data.data?.live_score) {
          setLiveScore(data.data.live_score);
        }
      }
    });
    
    // Listen for match resume
    newSocket.on('match_resumed', (data) => {
      // console.log('▶️ Match resumed event:', data);
      if (data.matchId === matchId) {
        setIsPaused(false);
        setTimerRunning(true);
        if (data.data?.live_score) {
          setLiveScore(data.data.live_score);
        }
      }
    });
    
    // Listen for half ended
    newSocket.on('half_ended', (data) => {
      // console.log('⏸️ Half ended event:', data);
      if (String(data.matchId) === String(matchId)) {
        setIsPaused(true);
        setTimerRunning(false);
        if (data.data?.liveScore) {
          setLiveScore(data.data.liveScore);
          setCurrentHalf(data.data.liveScore.current_half);
        }
      }
    });
    
    // Listen for break started
    newSocket.on('break_started', (data) => {
      // console.log('☕ Break started event:', data);
      if (String(data.matchId) === String(matchId)) {
        setIsOnBreak(true);
        setIsPaused(false);
        setTimerRunning(true);
        if (data.data?.liveScore) {
          setLiveScore(data.data.liveScore);
        }
      }
    });
    
    // Listen for break ended
    newSocket.on('break_ended', (data) => {
      // console.log('✅ Break ended event:', data);
      if (String(data.matchId) === String(matchId)) {
        setIsOnBreak(false);
        setIsPaused(true);
        setTimerRunning(false);
        if (data.data?.liveScore) {
          setLiveScore(data.data.liveScore);
        }
      }
    });
    
    // Listen for second half started
    newSocket.on('second_half_started', (data) => {
      // console.log('▶️ Second half started event:', data);
      if (String(data.matchId) === String(matchId)) {
        setCurrentHalf(2);
        setIsOnBreak(false);
        setIsPaused(false);
        setTimerRunning(true);
        if (data.data?.liveScore) {
          setLiveScore(data.data.liveScore);
        }
      }
    });
    
    // Listen for penalty shootout start
    newSocket.on('penalty_shootout_start', (data) => {
      // console.log('⚽ Penalty shootout started:', data);
      
      if (data.matchId === matchId && data.data?.liveScore) {
        setLiveScore(data.data.liveScore);
        setCurrentHalf(3); // Half 3 = Penalties
        setTimerRunning(false); // Stop timer for penalties
        
        // No alert on referee page - penalty UI shows directly
      }
    });
    
    // Listen for match completion
    newSocket.on('match_completed', (data) => {
      // console.log('🏆 Match completed event:', data);
      
      if (data.matchId === matchId) {
        setMatchStatus('completed');
        setTimerRunning(false);
        setLiveScore(data.liveScore);
        
        // Get winner name from the event data (includes participant names)
        let winnerName;
        if (data.liveScore && data.liveScore.match_winner === 'participant1') {
          winnerName = data.participant1_name || match?.participant1_name || 'Participant 1';
        } else if (data.liveScore && data.liveScore.match_winner === 'participant2') {
          winnerName = data.participant2_name || match?.participant2_name || 'Participant 2';
        } else {
          winnerName = 'Draw';
        }
        
        // Show detailed completion alert with correct score based on sport type
        let finalScore = '0 - 0';
        if (data.liveScore && data.liveScore.participant1?.sets_won !== undefined) {
          // Set-based sports (Tennis, Badminton, Volleyball)
          const p1Sets = data.liveScore.participant1?.sets_won || 0;
          const p2Sets = data.liveScore.participant2?.sets_won || 0;
          finalScore = `${p1Sets} - ${p2Sets} Sets`;
        } else if (data.liveScore && data.liveScore.participant1?.games_won !== undefined) {
          // Game-based sports (Table Tennis, Squash, Pickleball)
          const p1Games = data.liveScore.participant1?.games_won || 0;
          const p2Games = data.liveScore.participant2?.games_won || 0;
          finalScore = `${p1Games} - ${p2Games} Games`;
        } else if (data.liveScore && data.liveScore.participant1?.goals !== undefined) {
          // Time-based sports (Football only)
          const p1Goals = data.liveScore.participant1?.goals || 0;
          const p2Goals = data.liveScore.participant2?.goals || 0;
          finalScore = `${p1Goals} - ${p2Goals} Goals`;
          
          // Add penalty shootout score if present
          if (data.liveScore.penalty_shootout) {
            const p1Pens = data.liveScore.penalty_shootout.participant1_scored || 0;
            const p2Pens = data.liveScore.penalty_shootout.participant2_scored || 0;
            finalScore += ` (${p1Pens}-${p2Pens} pens)`;
          }
        }
        
        // alert(`🏆 Match Complete!`);
        
        // Refresh page to show completion UI
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    });
    
    newSocket.on('disconnect', () => {
      // console.log('❌ Scoreboard WebSocket disconnected');
    });
    
    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    setSocket(newSocket);
  };

  // Match Timer - Display only (server manages the actual timer)
  // Server-side timer broadcasts updates every second via WebSocket
  // No API calls needed - fully real-time!
  useEffect(() => {
    // console.log('⏱️ Timer display mode - Server manages timer, zero API calls!');
  }, [timerRunning, isPaused]);

  // Prevent accidental navigation during active match
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (matchStatus === 'in_progress') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handlePopState = (e) => {
      if (matchStatus === 'in_progress') {
        const confirmLeave = window.confirm(
          '⚠️ WARNING: Match is in progress!\n\nAre you sure you want to leave? Any unsaved progress may be lost.'
        );
        if (!confirmLeave) {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to enable back button detection
    window.history.pushState(null, '', window.location.pathname);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [matchStatus]);

  // Refresh squad members with updated is_playing status
  const refreshSquadMembers = async () => {
    if (!match || match.tournament_category !== 'teams') return;
    
    try {
      const squadsRes = await matchSquadService.getMatchSquads(matchId);
      if (squadsRes.success && squadsRes.squads) {
        // Update match state with fresh squad data
        setMatch(prevMatch => {
          const updatedMatch = { ...prevMatch };
          
          // Update participant1_details members
          const team1Squad = squadsRes.squads.find(s => s.team_id === prevMatch.participant1_details?.id);
          if (team1Squad && updatedMatch.participant1_details) {
            updatedMatch.participant1_details = {
              ...updatedMatch.participant1_details,
              members: team1Squad.members
            };
          }
          
          // Update participant2_details members
          const team2Squad = squadsRes.squads.find(s => s.team_id === prevMatch.participant2_details?.id);
          if (team2Squad && updatedMatch.participant2_details) {
            updatedMatch.participant2_details = {
              ...updatedMatch.participant2_details,
              members: team2Squad.members
            };
          }
          
          // console.log('✅ Squad members refreshed with updated is_playing status');
          return updatedMatch;
        });
      }
    } catch (error) {
      console.error('Error refreshing squad members:', error);
    }
  };

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const matchRes = await api.get(`/matches/${matchId}/details`);
      let matchData = matchRes.data.data;
      
      // ✅ SECURITY CHECK: Verify user is the assigned referee
      if (!user || matchData.referee_id !== user.id) {
        alert('⛔ Access Denied\n\nOnly the assigned referee can access this page.');
        navigate(`/matches/${matchId}`);
        return;
      }
      
      // Check squad status for team sports
      if (matchData?.tournament_category === 'teams') {
        try {
          const status = await matchSquadService.checkSquadsStatus(matchId);
          setSquadStatus(status);
        } catch (err) {
          console.error('Error checking squad status:', err);
        }
      }

      // console.log("dev value=====", matchData?.tournament_category)
      // console.log("Participant 1 Details:", matchData.participant1_details);
      // console.log("Participant 2 Details:", matchData.participant2_details);

      // Extract participant names based on category
      if (matchData?.tournament_category === "teams") {
        // Teams: Use team name directly
        if (matchData.participant1_details) {
          matchData.participant1_name = matchData.participant1_details.name;
          // console.log("Set Team 1 Name:", matchData.participant1_name);
        }
        if (matchData.participant2_details) {
          matchData.participant2_name = matchData.participant2_details.name;
          // console.log("Set Team 2 Name:", matchData.participant2_name);
        }
      } else if (matchData?.tournament_category === "doubles") {
        // Doubles: Use pair name (if available) or fallback to player names
        if (matchData.participant1_details) {
          // Use pair name if available, otherwise use player names
          matchData.participant1_name = matchData.participant1_details.name || 'Pair 1';
          
          // Store player names separately for display below pair name
          const p1 = matchData.participant1_details.player1;
          const p2 = matchData.participant1_details.player2;
          matchData.participant1_players = `${p1?.first_name || ''} ${p1?.last_name || ''} / ${p2?.first_name || ''} ${p2?.last_name || ''}`.trim();
        }
        if (matchData.participant2_details) {
          // Use pair name if available, otherwise use player names
          matchData.participant2_name = matchData.participant2_details.name || 'Pair 2';
          
          // Store player names separately for display below pair name
          const p1 = matchData.participant2_details.player1;
          const p2 = matchData.participant2_details.player2;
          matchData.participant2_players = `${p1?.first_name || ''} ${p1?.last_name || ''} / ${p2?.first_name || ''} ${p2?.last_name || ''}`.trim();
        }
      } else {
        // Singles: Use user first and last name
        if (matchData.participant1_details?.user) {
          matchData.participant1_name = `${matchData.participant1_details.user.first_name} ${matchData.participant1_details.user.last_name}`;
        }
        if (matchData.participant2_details?.user) {
          matchData.participant2_name = `${matchData.participant2_details.user.first_name} ${matchData.participant2_details.user.last_name}`;
        }
      }
      
      // Debug: Check if names are set correctly
      // console.log("Participant 1 Name:", matchData.participant1_name);
      // console.log("Participant 2 Name:", matchData.participant2_name);
      // console.log("Full Match Data:", matchData);
      // console.log("🎯 Match Config from API:", matchData.match_config);
      
      setMatch(matchData);
      setMatchStatus(matchData.status);


      // Sport info is already included in match details
      setSport({
        id: matchData.sport_id,
        name: matchData.sport_name
      });

      // Fetch events regardless of match status (to show match_start, server_selection, etc.)
      try {
        const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
        // console.log('📋 Events fetched on page load:', eventsRes.data.data);
        setEvents(eventsRes.data.data || []);
      } catch (error) {
        console.error('❌ Failed to fetch events on page load:', error);
        setEvents([]);
      }

      if (matchData.status === 'in_progress') {
        const scoreRes = await api.get(`/matches/${matchId}/live-score`);
        const liveScoreData = scoreRes.data.data;
        
        // Check if liveScoreData is valid
        if (!liveScoreData) {
          console.warn('⚠️ No live score data returned for in-progress match');
          return;
        }
        
        setLiveScore(liveScoreData);
        
        // Recover timer from live score if available
        if (liveScoreData.elapsed_seconds !== undefined) {
          setMatchTimer(liveScoreData.elapsed_seconds);
          // Only start timer if match is not paused
          setTimerRunning(!matchData.is_paused);
        }
        
        if (liveScoreData.current_half) {
          setCurrentHalf(liveScoreData.current_half);
        }
        
        if (liveScoreData.is_on_break !== undefined) {
          setIsOnBreak(liveScoreData.is_on_break);
        }
        
        // Always update period duration from live score (even if 0)
        if (liveScoreData.period_duration !== undefined) {
          setPeriodDuration(liveScoreData.period_duration);
          // console.log('✅ Period duration updated from live score:', liveScoreData.period_duration, 'minutes');
        }
        
        // Set paused state from match data
        setIsPaused(matchData.is_paused || false);
        
        // console.log('Match resumed - Timer:', liveScoreData.elapsed_seconds, 'Paused:', matchData.is_paused);
      }
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenSquadModal = (teamId, teamName) => {
    setCurrentSquadTeam({ id: teamId, name: teamName });
    setShowSquadModal(true);
  };
  
  const handleSquadSaved = async () => {
    // Refresh squad status
    if (match?.tournament_category === 'teams') {
      try {
        const status = await matchSquadService.checkSquadsStatus(matchId);
        setSquadStatus(status);
      } catch (err) {
        console.error('Error checking squad status:', err);
      }
    }
  };

  /**
   * Handle Play Again (create rematch)
   */
  const handlePlayAgain = async () => {
    try {
      setCreatingRematch(true);
      const response = await api.post(`/matches/${matchId}/rematch`);
      
      if (response.data.success) {
        const newMatchId = response.data.data.match.id;
        // Navigate to new match scoring page
        window.location.href = `/matches/${newMatchId}/referee-scoring`;
      }
    } catch (error) {
      console.error('Failed to create rematch:', error);
      alert('Failed to create rematch: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreatingRematch(false);
    }
  };

  const handleStartMatch = async () => {
    // Check if both participants are assigned
    if (!match?.participant1_id || !match?.participant2_id) {
      alert('⛔ Cannot start match\n\nBoth participants must be assigned before starting the match.');
      return;
    }

    // Check if squads are set for team sports
    if (match?.tournament_category === 'teams') {
      const status = await matchSquadService.checkSquadsStatus(matchId);
      if (!status.both_squads_set) {
        alert('Please select squads for both teams before starting the match.');
        return;
      }
    }
    
    // For non-Football sports, show server selection modal first
    if (sport?.name !== 'Football') {
      setShowServerSelectionModal(true);
      return;
    }
    
    // Football: Start directly without server selection
    await startMatchWithServer(null);
  };
  
  const startMatchWithServer = async (firstServer) => {
    try {
      // Show loading state while starting match
      setLoading(true);
      
      // Send firstServer parameter to backend
      const res = await api.post(`/matches/${matchId}/start`, { firstServer });
      
      // console.log('📦 Raw API response:', res);
      // console.log('📦 res.data:', res.data);
      // console.log('📦 res.data.data:', res.data.data);
      
      const liveScoreData = res.data.data;
      
      if (!liveScoreData) {
        throw new Error('Failed to initialize match - no live score returned');
      }
      
      // console.log('🚀 Match start response:', JSON.stringify(liveScoreData));
      
      // Only validate period_duration for time-based sports (Football only)
      const isTimeBased = liveScoreData.sport === 'Football';
      
      if (isTimeBased) {
        // console.log('✅ Period duration from backend:', liveScoreData.period_duration, 'minutes');
        
        // Validate period_duration exists for time-based sports
        if (liveScoreData.period_duration === undefined || liveScoreData.period_duration === null) {
          console.error('❌ ERROR: Backend returned undefined/null period_duration for time-based sport!');
          console.error('Full response:', liveScoreData);
        }
      }
      
      // CRITICAL: Set periodDuration FIRST before any other state
      // This ensures the UI renders with correct duration from the start
      const configuredPeriodDuration = liveScoreData.period_duration !== undefined 
        ? liveScoreData.period_duration 
        : 45;
      
      if (isTimeBased) {
        // console.log('🎯 Setting period duration to:', configuredPeriodDuration);
      }
      
      // Set all states in batch using React 18's automatic batching
      setPeriodDuration(configuredPeriodDuration);
      setLiveScore(liveScoreData);
      setMatchStatus('in_progress');
      setCurrentHalf(liveScoreData.current_half || 1);
      setMatchTimer(liveScoreData.elapsed_seconds || 0);
      
      // Wait for React to process state updates
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Finally start the timer
      setTimerRunning(true);
      
      // ✅ Fetch events to show match_start and server_selection events
      try {
        const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
        // console.log('📋 Events fetched after match start:', eventsRes.data.data);
        setEvents(eventsRes.data.data || []);
      } catch (error) {
        console.error('❌ Failed to fetch events after match start:', error);
      }
      
      // ✅ NEW: Start match timing tracking (non-blocking)
      try {
        await matchTimingService.startMatchTiming(matchId);
        // console.log('⏱️ Match timing started');
        
        // Start first segment based on sport type
        const segmentType = isTimeBased ? 'half' : 
                           (['Tennis', 'Padel', 'Volleyball'].includes(liveScoreData.sport)) ? 'set' : 'game';
        await matchTimingService.startSegment(matchId, segmentType, 1);
        // console.log(`⏱️ ${segmentType} 1 timing started`);
      } catch (timingError) {
        // Don't fail the match start if timing fails
        console.warn('⚠️ Failed to start timing tracking (non-critical):', timingError);
      }
      
      // Hide loading state
      setLoading(false);
      
      // console.log('✅ Match started successfully with period duration:', configuredPeriodDuration, 'minutes');
    } catch (error) {
      console.error('Failed to start match:', error);
      setLoading(false);
      alert('Failed to start match: ' + (error.response?.data?.error || error.message || 'Unknown error'));
    }
  };

  const handlePauseMatch = async () => {
    try {
      // Server-side timer will automatically stop incrementing when paused
      await api.post(`/matches/${matchId}/pause`, { reason: 'Referee pause' });
      setIsPaused(true);
      setTimerRunning(false); // Stop local display updates
      // console.log('⏸️ Match paused - Server timer stopped');
    } catch (error) {
      console.error('Failed to pause match:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to pause match'));
    }
  };

  const handleResumeMatch = async () => {
    try {
      // Server-side timer will automatically resume incrementing
      await api.post(`/matches/${matchId}/resume`);
      setIsPaused(false);
      setTimerRunning(true); // Resume local display updates
      // console.log('▶️ Match resumed - Server timer continues');
    } catch (error) {
      console.error('Failed to resume match:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to resume match'));
    }
  };

  const handleEndMatch = async () => {
    if (confirm('Are you sure you want to end this match?')) {
      try {
        // Server-side timer will automatically stop when match ends
        await api.post(`/matches/${matchId}/end`);
        setTimerRunning(false); // Stop timer
        navigate(`/matches/${matchId}`);
      } catch (error) {
        console.error('Failed to end match:', error);
        alert('Error: ' + (error.response?.data?.error || 'Failed to end match'));
      }
    }
  };

  // NEW: Manual half control functions
  const handleEndHalf = async () => {
    const halfName = currentHalf === 1 ? '1st' 
                   : currentHalf === 2 ? '2nd'
                   : currentHalf === 3 ? 'Extra Time 1st'
                   : 'Extra Time 2nd';
    
    const message = currentHalf === 1 
      ? 'End 1st Half?\n\nBreak will start automatically.'
      : currentHalf === 2
      ? 'End 2nd Half?\n\nMatch will be completed and winner will be declared.'
      : currentHalf === 3
      ? 'End Extra Time 1st Half?\n\nBreak will start automatically.'
      : 'End Extra Time 2nd Half?\n\nMatch will be completed and winner will be declared.';
    
    if (confirm(message)) {
      try {
        const response = await api.post(`/matches/${matchId}/end-half`);
        const updatedLiveScore = response.data.data;
        setLiveScore(updatedLiveScore);
        setCurrentHalf(updatedLiveScore.current_half);
        setIsOnBreak(updatedLiveScore.is_on_break);
        setIsPaused(updatedLiveScore.is_paused);
        setTimerRunning(!updatedLiveScore.is_paused);
        // console.log(`✅ ${halfName} half ended`, updatedLiveScore);
        
        // If 2nd or 4th half ended, check if match is complete or awaiting draw decision
        if (currentHalf === 2 || currentHalf === 4) {
          // console.log('🔍 2nd half ended - checking status:', {
          //   match_complete: updatedLiveScore.match_complete,
          //   awaiting_draw_decision: updatedLiveScore.awaiting_draw_decision,
          //   score1: updatedLiveScore.participant1?.goals || 0,
          //   score2: updatedLiveScore.participant2?.goals || 0
          // });
          
          if (updatedLiveScore.awaiting_draw_decision) {
            // Draw - show options modal (check this FIRST before match_complete)
            // console.log('⚖️ Draw detected - showing modal');
            setShowDrawDecisionModal(true);
          } else if (updatedLiveScore.match_complete) {
            // Clear winner - show result and redirect
            setMatchStatus('completed');
            
            const score1 = updatedLiveScore.participant1?.goals || 0;
            const score2 = updatedLiveScore.participant2?.goals || 0;
            const winnerName = updatedLiveScore.match_winner === 'participant1' 
              ? match?.participant1_name 
              : updatedLiveScore.match_winner === 'participant2'
              ? match?.participant2_name
              : 'Draw';
            
            alert(`🏆 Match Complete!\n\nFinal Score: ${score1} - ${score2}\nWinner: ${winnerName}`);
            
            // Redirect to match details page after 2 seconds
            setTimeout(() => {
              navigate(`/matches/${matchId}`);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Failed to end half:', error);
        alert('Error: ' + (error.response?.data?.error || 'Failed to end half'));
      }
    }
  };

  const handleStartBreak = async () => {
    if (confirm('Start Break Period?\n\nBreak timer will reset to 0:00.')) {
      try {
        // First, end the 1st half if not already ended
        if (!liveScore?.half_1_ended) {
          const endResponse = await api.post(`/matches/${matchId}/end-half`);
          setLiveScore(endResponse.data.data);
          // console.log('✅ 1st half auto-ended before break');
          
          // Wait a moment for state to settle
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Then start the break - timer resets to 0
        const response = await api.post(`/matches/${matchId}/start-break`);
        const breakLiveScore = response.data.data;
        setLiveScore(breakLiveScore);
        setIsOnBreak(breakLiveScore.is_on_break);
        setIsPaused(breakLiveScore.is_paused);
        setCurrentHalf(breakLiveScore.current_half);
        setMatchTimer(breakLiveScore.elapsed_seconds || 0); // Sync with server
        setTimerRunning(!breakLiveScore.is_paused);
        // console.log('✅ Break started - timer reset to 0:00', breakLiveScore);
      } catch (error) {
        console.error('Failed to start break:', error);
        alert('Error: ' + (error.response?.data?.error || 'Failed to start break'));
      }
    }
  };

  const handleEndBreak = async () => {
    if (confirm('End Break?\n\n2nd half will start automatically.')) {
      try {
        const response = await api.post(`/matches/${matchId}/end-break`);
        const endBreakLiveScore = response.data.data;
        setLiveScore(endBreakLiveScore);
        setCurrentHalf(endBreakLiveScore.current_half); // Should be 2 (or 4 for extra time)
        setIsOnBreak(endBreakLiveScore.is_on_break); // Should be false
        setIsPaused(endBreakLiveScore.is_paused); // Should be false
        
        // RESET TIMER TO 0:00 if starting extra time 2nd half
        if (endBreakLiveScore.is_extra_time && endBreakLiveScore.extra_time_current_half === 2) {
          setMatchTimer(0);
          // console.log('✅ Break ended - Extra time 2nd half started from 0:00');
        } else {
          setMatchTimer(endBreakLiveScore.elapsed_seconds || 0);
          // console.log('✅ Break ended - 2nd half started', endBreakLiveScore);
        }
        
        setTimerRunning(!endBreakLiveScore.is_paused); // Should be true
      } catch (error) {
        console.error('Failed to end break:', error);
        alert('Error: ' + (error.response?.data?.error || 'Failed to end break'));
      }
    }
  };

  const handleStartSecondHalf = async () => {
    if (confirm('Start 2nd Half?\n\nTimer will start from 45:00.')) {
      try {
        const response = await api.post(`/matches/${matchId}/start-second-half`);
        const half2LiveScore = response.data.data;
        setLiveScore(half2LiveScore);
        setCurrentHalf(half2LiveScore.current_half);
        setIsOnBreak(half2LiveScore.is_on_break);
        setMatchTimer(half2LiveScore.elapsed_seconds || 0);
        setTimerRunning(!half2LiveScore.is_paused);
        // console.log('✅ 2nd half started from 45:00', half2LiveScore);
      } catch (error) {
        console.error('Failed to start 2nd half:', error);
        alert('Error: ' + (error.response?.data?.error || 'Failed to start 2nd half'));
      }
    }
  };

  // Draw decision handlers
  const handleDeclareDraw = async () => {
    try {
      const response = await api.post(`/matches/${matchId}/declare-draw`);
      const updatedLiveScore = response.data.data;
      setLiveScore(updatedLiveScore);
      setMatchStatus('completed');
      setShowDrawDecisionModal(false);
      
      alert('🤝 Match Declared as DRAW!');
      
      setTimeout(() => {
        navigate(`/matches/${matchId}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to declare draw:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to declare draw'));
    }
  };

  const handleStartExtraTime = async () => {
    if (!extraTimeMinutes || extraTimeMinutes <= 0) {
      alert('Please enter a valid extra time duration');
      return;
    }
    
    try {
      const response = await api.post(`/matches/${matchId}/start-extra-time`, {
        extraTimeMinutes: parseInt(extraTimeMinutes)
      });
      const updatedLiveScore = response.data.data;
      setLiveScore(updatedLiveScore);
      setCurrentHalf(3); // Extra time 1st half
      setIsPaused(false);
      setTimerRunning(true);
      setShowDrawDecisionModal(false);
      
      // RESET TIMER TO 0:00 for extra time
      setMatchTimer(0);
      
      const halfDuration = Math.floor(extraTimeMinutes / 2);
      alert(`⏱️ Extra Time Started!\n\nTotal: ${extraTimeMinutes} min\nEach half: ${halfDuration} min`);
    } catch (error) {
      console.error('Failed to start extra time:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to start extra time'));
    }
  };

  const handleStartPenalties = async () => {
    try {
      // Call backend to initialize penalty shootout
      const response = await api.post(`/matches/${matchId}/start-penalty-shootout`);
      const updatedLiveScore = response.data.data;
      
      // Update local state
      setLiveScore(updatedLiveScore);
      setIsPaused(true);
      setTimerRunning(false);
      setShowDrawDecisionModal(false);
      
      // console.log('⚽ Penalty shootout started!', updatedLiveScore);
    } catch (error) {
      console.error('Failed to start penalty shootout:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to start penalty shootout'));
    }
  };

  // NEW: Extra Time handlers
  const handleShowExtraTimeConfig = () => {
    setShowDrawDecisionModal(false);
    setShowExtraTimeConfigModal(true);
  };

  const handleInitializeExtraTime = async () => {
    if (!extraTimeHalfDuration || extraTimeHalfDuration < 1 || extraTimeHalfDuration > 30) {
      alert('Half duration must be between 1 and 30 minutes');
      return;
    }
    if (!extraTimeBreakDuration || extraTimeBreakDuration < 1 || extraTimeBreakDuration > 15) {
      alert('Break duration must be between 1 and 15 minutes');
      return;
    }

    try {
      const response = await api.post(`/matches/${matchId}/extra-time/initialize`, {
        half_duration: parseInt(extraTimeHalfDuration),
        break_duration: parseInt(extraTimeBreakDuration)
      });
      const updatedLiveScore = response.data.data;
      setLiveScore(updatedLiveScore);
      setShowExtraTimeConfigModal(false);
      setCurrentHalf(3); // Extra Time 1st Half
      
      alert(`✅ Extra Time Configured!\n\nHalf Duration: ${extraTimeHalfDuration} min\nBreak Duration: ${extraTimeBreakDuration} min\n\nClick "Start Extra Time 1st Half" to begin.`);
    } catch (error) {
      console.error('Failed to initialize extra time:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to initialize extra time'));
    }
  };

  const handleStartExtraTimeFirstHalf = async () => {
    try {
      const response = await api.post(`/matches/${matchId}/extra-time/start-first-half`);
      const updatedLiveScore = response.data.data;
      setLiveScore(updatedLiveScore);
      setMatchTimer(0);
      setTimerRunning(true);
      setIsPaused(false);
      
      alert('⏱️ Extra Time 1st Half Started!');
    } catch (error) {
      console.error('Failed to start extra time first half:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to start'));
    }
  };

  const handleEndExtraTimeFirstHalf = async () => {
    try {
      const response = await api.post(`/matches/${matchId}/extra-time/end-first-half`);
      const updatedLiveScore = response.data.data;
      setLiveScore(updatedLiveScore);
      setTimerRunning(false);
      setIsPaused(true);
      
      alert('✅ Extra Time 1st Half Ended!');
    } catch (error) {
      console.error('Failed to end extra time first half:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to end'));
    }
  };

  const handleStartExtraTimeBreak = async () => {
    try {
      const response = await api.post(`/matches/${matchId}/extra-time/start-break`);
      const updatedLiveScore = response.data.data;
      setLiveScore(updatedLiveScore);
      setMatchTimer(0);
      setTimerRunning(true);
      setIsPaused(false);
      setIsOnBreak(true);
      
      alert('⏱️ Extra Time Break Started!');
    } catch (error) {
      console.error('Failed to start extra time break:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to start'));
    }
  };

  const handleStartExtraTimeSecondHalf = async () => {
    try {
      const response = await api.post(`/matches/${matchId}/extra-time/start-second-half`);
      const updatedLiveScore = response.data.data;
      setLiveScore(updatedLiveScore);
      setCurrentHalf(4); // Extra Time 2nd Half
      const halfDuration = updatedLiveScore.extra_time_config?.half_duration || 15;
      setMatchTimer(halfDuration * 60); // Start from configured duration
      setTimerRunning(true);
      setIsPaused(false);
      setIsOnBreak(false);
      
      alert('⏱️ Extra Time 2nd Half Started!');
    } catch (error) {
      console.error('Failed to start extra time second half:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to start'));
    }
  };

  const handleEndExtraTimeSecondHalf = async () => {
    try {
      const response = await api.post(`/matches/${matchId}/extra-time/end-second-half`);
      const updatedLiveScore = response.data.data.liveScore; // ✅ FIX: Get liveScore from nested object
      setLiveScore(updatedLiveScore);
      setTimerRunning(false);
      setIsPaused(true);
      
      if (response.data.data.match_complete) {
        const p1Goals = updatedLiveScore.participant1?.goals || 0;
        const p2Goals = updatedLiveScore.participant2?.goals || 0;
        const winner = p1Goals > p2Goals 
          ? match.participant1_name 
          : match.participant2_name;
        
        alert(`🏆 Match Complete!\n\nWinner: ${winner}\nFinal Score: ${p1Goals}-${p2Goals}`);
        
        setTimeout(() => {
          navigate(`/matches/${matchId}`);
        }, 2000);
      } else {
        // Still a draw - show options again
        setShowDrawDecisionModal(true);
        alert('Extra Time ended - Still a draw. Choose next action.');
      }
    } catch (error) {
      console.error('Failed to end extra time second half:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to end'));
    }
  };

  // OLD: Manual half control functions (keep for backward compatibility)
  const handleSetFirstHalf = async () => {
    if (confirm('Switch to First Half?\n\nTimer will reset to 0:00')) {
      try {
        setCurrentHalf(1);
        setIsOnBreak(false);
        setMatchTimer(0); // Reset timer
        
        // Update in database and broadcast to live viewers
        const response = await api.post(`/matches/${matchId}/timer`, {
          elapsed_seconds: 0,
          current_half: 1
        });
        
        setLiveScore(response.data.data);
        // console.log('✅ First half set - Timer reset broadcasted');
      } catch (error) {
        console.error('Failed to set first half:', error);
        alert('Failed to change half: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleSetBreak = async () => {
    if (confirm('Start Half-Time Break?\n\nTimer will continue running.')) {
      try {
        setIsOnBreak(true);
        
        // Update in database and broadcast to live viewers
        const response = await api.post(`/matches/${matchId}/timer`, {
          elapsed_seconds: matchTimer,
          current_half: currentHalf
        });
        
        setLiveScore(response.data.data);
        // console.log('✅ Break started - broadcasted');
      } catch (error) {
        console.error('Failed to set break:', error);
        alert('Failed to start break: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleSetSecondHalf = async () => {
    if (confirm('Switch to Second Half?\n\nTimer will reset to 0:00')) {
      try {
        setCurrentHalf(2);
        setIsOnBreak(false);
        setMatchTimer(0); // Reset timer for second half
        
        // Update in database and broadcast to live viewers
        const response = await api.post(`/matches/${matchId}/timer`, {
          elapsed_seconds: 0,
          current_half: 2
        });
        
        setLiveScore(response.data.data);
        // console.log('✅ Second half set - Timer reset broadcasted');
      } catch (error) {
        console.error('Failed to set second half:', error);
        alert('Failed to change half: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Format timer display (MM:SS)
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeclareWinner = async (participantSide) => {
    // Check if both participants are assigned
    if (!match?.participant1_id || !match?.participant2_id) {
      alert('⛔ Cannot declare winner\n\nBoth participants must be assigned before a winner can be declared.');
      return;
    }

    // ✅ SECURITY CHECK: Verify user is the assigned referee
    if (!user || !match || match.referee_id !== user.id) {
      alert('⛔ Access Denied\n\nOnly the assigned referee can declare a winner.');
      return;
    }
    
    const winnerName = participantSide === 'participant1' ? match.participant1_name : match.participant2_name;
    
    try {
      // Update live score to mark match as complete with winner
      const updatedLiveScore = {
        ...liveScore,
        match_complete: true,
        match_winner: participantSide
      };
      
      // Update match status to completed with winner
      await api.put(`/matches/${matchId}`, {
        status: 'completed',
        winner_participant_id: participantSide === 'participant1' ? match.participant1_id : match.participant2_id,
        live_score: JSON.stringify(updatedLiveScore)
      });
      
      // Update local state
      setLiveScore(updatedLiveScore);
      setMatchStatus('completed');
      setTimerRunning(false);
      
      // Note: Backend will broadcast WebSocket event to all clients
      
      // Show completion alert with final score
      let finalScore = '0 - 0';
      if (updatedLiveScore.participant1?.sets_won !== undefined) {
        finalScore = `${updatedLiveScore.participant1.sets_won} - ${updatedLiveScore.participant2.sets_won} Sets`;
      } else if (updatedLiveScore.participant1?.games_won !== undefined) {
        finalScore = `${updatedLiveScore.participant1.games_won} - ${updatedLiveScore.participant2.games_won} Games`;
      } else if (updatedLiveScore.participant1?.goals !== undefined) {
        finalScore = `${updatedLiveScore.participant1.goals} - ${updatedLiveScore.participant2.goals} Goals`;
      }
      
      alert(`🏆 Match Complete!\n\nWinner: ${winnerName}\nFinal Score: ${finalScore}\n\nMatch status updated to Completed.`);
      
      // Refresh page to show completion UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Failed to declare winner:', error);
      alert('Failed to declare winner. Please try again.');
    }
  };

  const handleToggleServer = async (playerId = null, keepSamePair = false) => {
    try {
      const payload = playerId ? { player_id: playerId, keep_same_pair: keepSamePair } : {};
      const res = await api.post(`/matches/${matchId}/score/toggle-server`, payload);
      
      if (res.data.success) {
        setLiveScore(res.data.data.live_score);
        // console.log('✅ Server toggled:', res.data.data.server, playerId ? `Player ID: ${playerId}` : '');
      }
    } catch (error) {
      console.error('Failed to toggle server:', error);
      alert('Failed to toggle server: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddPoint = async (participantSide, eventType = 'point') => {
    try {
      const res = await api.post(`/matches/${matchId}/score/point`, {
        participant_side: participantSide,
        event_type: eventType
      });
      
      const newLiveScore = res.data.data.live_score;
      const oldLiveScore = liveScore;
      
      // ✅ NEW: Track segment changes (set/game transitions)
      if (oldLiveScore && newLiveScore) {
        const oldSegmentNum = oldLiveScore.current_set || oldLiveScore.current_game || oldLiveScore.current_half || 1;
        const newSegmentNum = newLiveScore.current_set || newLiveScore.current_game || newLiveScore.current_half || 1;
        
        // Detect segment change (set/game/half ended and new one started)
        if (newSegmentNum > oldSegmentNum) {
          const oldSegmentInfo = getSegmentInfo(liveScore);
          const newSegmentInfo = getSegmentInfo(newLiveScore);
          
          try {
            // End previous segment
            await matchTimingService.endSegment(matchId, oldSegmentInfo.type, oldSegmentNum);
            // console.log(`⏱️ ${oldSegmentInfo.type} ${oldSegmentNum} ended`);
            
            // Start new segment (if match not complete)
            if (!newLiveScore.match_complete) {
              await matchTimingService.startSegment(matchId, newSegmentInfo.type, newSegmentNum);
              // console.log(`⏱️ ${newSegmentInfo.type} ${newSegmentNum} started`);
            }
          } catch (timingError) {
            console.warn('⚠️ Failed to track segment timing (non-critical):', timingError);
          }
        }
      }
      
      // Check if match is complete OR awaiting confirmation
      if (newLiveScore.match_complete || newLiveScore.awaiting_match_end_confirmation) {
        setLiveScore(newLiveScore);
        
        // Only set status to completed if truly complete (not just awaiting confirmation)
        if (newLiveScore.match_complete) {
          setMatchStatus('completed');
        }
        
        // ✅ End current segment (whether confirming or completing)
        try {
          const segmentInfo = getSegmentInfo(newLiveScore);
          await matchTimingService.endSegment(matchId, segmentInfo.type, segmentInfo.number);
          // console.log(`⏱️ Final ${segmentInfo.type} ${segmentInfo.number} ended`);
          
          // Only end match timing if truly complete (not awaiting confirmation)
          if (newLiveScore.match_complete) {
            await matchTimingService.endMatchTiming(matchId);
            // console.log('⏱️ Match timing ended');
          }
        } catch (timingError) {
          console.warn('⚠️ Failed to end timing tracking (non-critical):', timingError);
        }
        
        // Only show winner modal if truly complete (not awaiting confirmation)
        if (newLiveScore.match_complete && !newLiveScore.awaiting_match_end_confirmation) {
          const winnerName = newLiveScore.match_winner === 'participant1' 
            ? match.participant1_name 
            : match.participant2_name;
          
          // Show completion alert with correct score
          let finalScore = '0 - 0';
          if (newLiveScore.participant1?.sets_won !== undefined) {
            finalScore = `${newLiveScore.participant1.sets_won} - ${newLiveScore.participant2.sets_won} Sets`;
          } else if (newLiveScore.participant1?.games_won !== undefined) {
            finalScore = `${newLiveScore.participant1.games_won} - ${newLiveScore.participant2.games_won} Games`;
          }
          alert(`🏆 Match Complete!\n\nWinner: ${winnerName}\n\nFinal Score: ${finalScore}`);
          
          // Refresh match data to update status
          setTimeout(() => {
            fetchMatchData();
          }, 1000);
        }
        // If awaiting confirmation, the modal in SetBasedScoringInterface will handle it
      } else {
        // Normal point - update score
        setLiveScore(newLiveScore);
        setEvents([res.data.data.event, ...events]);
      }
    } catch (error) {
      console.error('Failed to add point:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to add point'));
    }
  };

  const handleRefreshEvents = async () => {
    try {
      const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
      setEvents(eventsRes.data.data || []);
    } catch (error) {
      console.error('Failed to refresh events:', error);
    }
  };

  const handleUndoPoint = async () => {
    if (!confirm('⚠️ Undo last action?\n\nThis will revert the last point/event and cannot be undone.')) {
      return;
    }
    
    try {
      const res = await api.post(`/matches/${matchId}/score/undo`);
      const updatedLiveScore = res.data.data.live_score;
      const undoneEvent = res.data.data.undone_event;
      
      setLiveScore(updatedLiveScore);
      
      // ✅ FIX: If the undone event was a side_change, reverse the visual swap
      if (undoneEvent === 'side_change') {
        setIsSwapped(prev => !prev);
      }
      
      // Refresh events list
      await handleRefreshEvents();
      
      // Show success message
      alert(`✅ ${undoneEvent || 'Last action'} undone successfully`);
      
      // console.log('✅ Undo successful:', undoneEvent);
    } catch (error) {
      console.error('Failed to undo:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to undo last action'));
    }
  };

  const handleRecordEvent = async (eventData) => {
    try {
      // Check if it's a card event - use dedicated endpoints
      if (eventData.event_type === 'yellow_card') {
        const res = await api.post(`/matches/${matchId}/score/yellow-card`, {
          participant_side: eventData.participant_side,
          player_id: eventData.player_id,
          minute: eventData.minute,
          reason: eventData.reason || ''
        });
        
        const newLiveScore = res.data.data.live_score;
        setLiveScore(newLiveScore);
        
        // Check if this was a second yellow (automatic red card)
        if (res.data.data.second_yellow || res.data.data.automatic_red_card) {
          alert('🟨🟨 ➡️ 🟥\n\nSECOND YELLOW CARD!\n\nPlayer has been automatically sent off with a RED CARD!');
        }
        
        // Fetch events to update the log
        const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
        setEvents(eventsRes.data.data || []);
      } else if (eventData.event_type === 'red_card') {
        const res = await api.post(`/matches/${matchId}/score/red-card`, {
          participant_side: eventData.participant_side,
          player_id: eventData.player_id,
          minute: eventData.minute,
          reason: eventData.reason || ''
        });
        
        const newLiveScore = res.data.data.live_score;
        setLiveScore(newLiveScore);
        
        // Fetch events to update the log
        const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
        setEvents(eventsRes.data.data || []);
      } else {
        // Other events - use generic event endpoint
        await api.post(`/matches/${matchId}/events`, {
          ...eventData,
          score_snapshot: liveScore
        });
        
        // Fetch events to update the log
        const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
        setEvents(eventsRes.data.data || []);
        
        // If it's a substitution, refresh squad members to update is_playing status
        if (eventData.event_type === 'substitution') {
          await refreshSquadMembers();
          // console.log('🔄 Squad members refreshed after substitution');
        }
      }
    } catch (error) {
      console.error('Failed to record event:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to record event'));
    }
  };

  const handleAddGoal = async (participantSide, eventData) => {
    try {
      // For own goals, award the goal to the opposing team
      const goalType = eventData.metadata?.goal_type || 'open_play';
      const isOwnGoal = goalType === 'own_goal';
      const scoringTeam = isOwnGoal 
        ? (participantSide === 'participant1' ? 'participant2' : 'participant1')
        : participantSide;
      
      const res = await api.post(`/matches/${matchId}/score/goal`, {
        participant_side: scoringTeam,
        player_id: eventData.player_id,
        minute: eventData.minute,
        goal_type: goalType,
        assist_player_id: eventData.metadata?.assist_player_id
        // DO NOT send elapsed_seconds - timer is managed by server!
      });
      
      const newLiveScore = res.data.data.live_score;
      setLiveScore(newLiveScore);
      
      // Fetch events to update the log
      const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
      setEvents(eventsRes.data.data || []);
      
      // Check if match is complete
      if (newLiveScore.match_complete) {
        setMatchStatus('completed');
        setTimerRunning(false); // Stop timer when match completes
        let winnerName;
        if (newLiveScore.match_winner === 'participant1') {
          winnerName = match.participant1_name || 'Participant 1';
        } else if (newLiveScore.match_winner === 'participant2') {
          winnerName = match.participant2_name || 'Participant 2';
        } else {
          winnerName = 'Draw';
        }
        // Show completion alert with correct score
        let finalScore = '0 - 0';
        if (newLiveScore.participant1?.sets_won !== undefined) {
          finalScore = `${newLiveScore.participant1.sets_won} - ${newLiveScore.participant2.sets_won} Sets`;
        } else if (newLiveScore.participant1?.games_won !== undefined) {
          finalScore = `${newLiveScore.participant1.games_won} - ${newLiveScore.participant2.games_won} Games`;
        } else if (newLiveScore.participant1?.goals !== undefined) {
          finalScore = `${newLiveScore.participant1.goals} - ${newLiveScore.participant2.goals} Goals`;
        }
        alert(`🏆 Match Complete!\n\nWinner: ${winnerName}\n\nFinal Score: ${finalScore}`);
      }
      // Don't call fetchMatchData() - it resets the timer
    } catch (error) {
      console.error('Failed to add goal:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to add goal'));
    }
  };

  // ✅ NEW: Handle add additional time (injury time)
  const handleAddTime = async (additionalSeconds) => {
    try {
      const res = await api.post(`/matches/${matchId}/additional-time`, {
        half: currentHalf,
        additional_seconds: additionalSeconds
      });
      
      // Update live score with new additional time
      const updatedLiveScore = res.data.data?.live_score || liveScore;
      setLiveScore(updatedLiveScore);
      
      // Emit WebSocket event to all viewers
      if (socket) {
        socket.emit('additional_time_added', {
          matchId,
          half: currentHalf,
          additionalSeconds,
          totalAdditionalTime: (liveScore.additional_time_seconds || 0) + additionalSeconds
        });
      }
      
      const minutes = Math.floor(additionalSeconds / 60);
      const seconds = additionalSeconds % 60;
      alert(`✅ Added +${minutes}:${seconds.toString().padStart(2, '0')} additional time to Half ${currentHalf}`);
      
      // console.log(`⏱️ Additional time added: +${additionalSeconds}s to Half ${currentHalf}`);
    } catch (error) {
      console.error('Failed to add additional time:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to add additional time'));
    }
  };

  // ✅ NEW: Handle record penalty kick
  const handleRecordPenalty = async (participantSide, playerId, result) => {
    try {
      const res = await api.post(`/matches/${matchId}/penalty-kick`, {
        participant_side: participantSide,
        player_id: playerId,
        result: result
      });
      
      const newLiveScore = res.data.data.live_score;
      setLiveScore(newLiveScore);
      
      // Fetch events to update the log
      const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
      setEvents(eventsRes.data.data || []);
      
      // Check if match is complete (penalty shootout finished)
      if (res.data.data.match_complete) {
        setMatchStatus('completed');
        setTimerRunning(false);
        
        let winnerName;
        if (newLiveScore.match_winner === 'participant1') {
          winnerName = match.participant1_name || 'Participant 1';
        } else if (newLiveScore.match_winner === 'participant2') {
          winnerName = match.participant2_name || 'Participant 2';
        } else {
          winnerName = 'Draw';
        }
        
        const regularScore = `${newLiveScore.participant1.goals}-${newLiveScore.participant2.goals}`;
        const penaltyScore = `${newLiveScore.penalty_shootout.participant1_scored}-${newLiveScore.penalty_shootout.participant2_scored}`;
        
        alert(`🏆 Match Complete!\n\nWinner: ${winnerName}\n\nFinal Score: ${regularScore} (${penaltyScore} pens)`);
        
        // Redirect to match details page after 2 seconds
        setTimeout(() => {
          navigate(`/matches/${matchId}`);
        }, 2000);
      } else {
        // Show penalty result
        const resultEmoji = result === 'scored' ? '✓' : '✗';
        alert(`${resultEmoji} Penalty ${result}!`);
      }
    } catch (error) {
      console.error('Failed to record penalty kick:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to record penalty kick'));
    }
  };

  const renderScoreDisplay = () => {
    if (!liveScore || !sport) return null;

    // Generic score display for all sports
    return (
      <div>
        {/* Main Score */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="text-sm text-gray-600">Live Score</div>
            {/* Show Tiebreak Indicator */}
            {liveScore.is_tiebreak && (
              <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                🎾 TIEBREAK
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary-500">
                {liveScore.participant1?.games_won || liveScore.participant1?.sets_won || liveScore.participant1?.goals || 0}
              </div>
              <div className="text-sm text-gray-600 mt-2 font-semibold">{match.participant1_name || 'P1'}</div>
            </div>
            <div className="text-4xl text-gray-400">-</div>
            <div className="text-center">
              <div className="text-6xl font-bold text-primary-600">
                {liveScore.participant2?.games_won || liveScore.participant2?.sets_won || liveScore.participant2?.goals || 0}
              </div>
              <div className="text-sm text-gray-600 mt-2 font-semibold">{match.participant2_name || 'P2'}</div>
            </div>
          </div>
        </div>

        {/* Penalty Shootout Display */}
        {liveScore.is_penalty_shootout && liveScore.penalty_shootout && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-400 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-orange-600 mb-2">
                ⚽ PENALTY SHOOTOUT {liveScore.penalty_shootout.sudden_death && '- SUDDEN DEATH'}
              </h3>
              <p className="text-gray-600">
                Regular Time: {liveScore.participant1?.goals || 0} - {liveScore.participant2?.goals || 0}
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 items-center mb-4">
              {/* Team 1 Penalty Score */}
              <div className="text-center">
                <div className="text-5xl font-bold text-primary-500">
                  {liveScore.penalty_shootout.participant1_scored}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {liveScore.penalty_shootout.participant1_attempts} attempts
                </div>
              </div>
              
              {/* Round Info */}
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  Round {liveScore.penalty_shootout.current_round}
                </div>
                {liveScore.penalty_shootout.sudden_death ? (
                  <div className="text-sm text-red-600 font-semibold mt-1">
                    SUDDEN DEATH
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 mt-1">
                    Best of {liveScore.penalty_shootout.max_rounds}
                  </div>
                )}
              </div>
              
              {/* Team 2 Penalty Score */}
              <div className="text-center">
                <div className="text-5xl font-bold text-primary-600">
                  {liveScore.penalty_shootout.participant2_scored}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {liveScore.penalty_shootout.participant2_attempts} attempts
                </div>
              </div>
            </div>
            
            {/* Penalty Kicks Grid */}
            {liveScore.penalty_shootout.kicks && liveScore.penalty_shootout.kicks.length > 0 && (() => {
              const kicksByRound = {};
              liveScore.penalty_shootout.kicks.forEach(kick => {
                const r = kick.round || 1;
                if (!kicksByRound[r]) {
                  kicksByRound[r] = { participant1: null, participant2: null };
                }
                kicksByRound[r][kick.participant_side] = kick;
              });

              const roundNumbers = Object.keys(kicksByRound).map(Number).sort((a, b) => a - b);
              
              const getResultBadge = (kick) => {
                if (!kick) return <span className="text-gray-400 font-normal">-</span>;
                
                if (kick.result === 'scored') {
                  return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                      <span>✅</span> Goal
                    </span>
                  );
                } else if (kick.result === 'saved') {
                  return (
                    <div className="flex flex-col items-center md:items-start">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 shadow-sm">
                        <span>🧤</span> Saved
                      </span>
                      {kick.goalkeeper_name && (
                        <span className="text-[10px] text-gray-500 mt-0.5 italic max-w-[120px] truncate" title={`Saved by ${kick.goalkeeper_name}`}>
                          by {kick.goalkeeper_name}
                        </span>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-sm">
                      <span>❌</span> Missed
                    </span>
                  );
                }
              };

              return (
                <div className="mt-6 bg-white rounded-xl border border-gray-200/80 p-4 md:p-6 shadow-inner w-full">
                  <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider text-center flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                    Detailed Penalty Shootout Log
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-500 pb-2">
                          <th className="text-left font-semibold pb-2 w-5/12">
                            {match.participant1_name || 'Team A'}
                          </th>
                          <th className="text-center font-semibold pb-2 w-2/12">Round</th>
                          <th className="text-right font-semibold pb-2 w-5/12">
                            {match.participant2_name || 'Team B'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {roundNumbers.map((roundNum) => {
                          const p1Kick = kicksByRound[roundNum].participant1;
                          const p2Kick = kicksByRound[roundNum].participant2;
                          const isSuddenDeath = roundNum > 5;
                          
                          return (
                            <tr key={roundNum} className="hover:bg-gray-50/50 transition-colors">
                              {/* Team 1 Kick info */}
                              <td className="py-3 text-left">
                                {p1Kick ? (
                                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                                    <div className="font-semibold text-gray-800 text-sm">
                                      {p1Kick.player_name || 'Player'}
                                    </div>
                                    <div>{getResultBadge(p1Kick)}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 font-normal">-</span>
                                )}
                              </td>
                              
                              {/* Round Number */}
                              <td className="py-3 text-center">
                                <span className={`inline-flex flex-col items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${
                                  isSuddenDeath 
                                    ? 'bg-red-50 text-red-700 border border-red-100' 
                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}>
                                  <span>R{roundNum}</span>
                                  {isSuddenDeath && <span className="text-[8px] font-medium tracking-tighter uppercase">SD</span>}
                                </span>
                              </td>
                              
                              {/* Team 2 Kick info */}
                              <td className="py-3 text-right">
                                {p2Kick ? (
                                  <div className="flex flex-col md:flex-row md:items-center justify-end gap-2">
                                    <div>{getResultBadge(p2Kick)}</div>
                                    <div className="font-semibold text-gray-800 text-sm">
                                      {p2Kick.player_name || 'Player'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 font-normal">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tiebreak Alert Banner - Tennis/Padel */}
        {liveScore && liveScore.is_tiebreak && (
          <>
            <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg p-4 mb-4 shadow-lg animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">🎾</span>
                <div className="text-center">
                  <p className="text-white font-bold text-2xl tracking-wide">
                    TIEBREAK IN PROGRESS
                  </p>
                  <p className="text-white text-sm mt-1">
                    {liveScore.tiebreak_type === 'match' 
                      ? 'Final Set Match Tiebreak - First to 10 points' 
                      : 'Regular Tiebreak - First to 7 points'}
                  </p>
                  <p className="text-white text-xs mt-1 font-semibold">
                    Total Points Played: {liveScore.tiebreak_total_points || 0}
                  </p>
                </div>
                <span className="text-3xl">🎾</span>
              </div>
            </div>

            {/* Change Ends Alert - Every 6 Points */}
            {liveScore.tiebreak_total_points > 0 && liveScore.tiebreak_total_points % 6 === 0 && (
              <div className="bg-orange-100 border-2 border-orange-500 rounded-lg p-4 mb-4 shadow-lg animate-pulse">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl">🔄</span>
                  <div className="text-center">
                    <p className="text-orange-900 font-bold text-xl tracking-wide">
                      ⚠️ CHANGE ENDS NOW ⚠️
                    </p>
                    <p className="text-orange-700 text-sm mt-1">
                      Players must switch sides ({liveScore.tiebreak_total_points} points played)
                    </p>
                    <p className="text-orange-600 text-xs mt-1">
                      International Rule: Change ends every 6 points in tiebreak
                    </p>
                  </div>
                  <span className="text-3xl">🔄</span>
                </div>
              </div>
            )}

            {/* Serve Rotation Reminder */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎾</span>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 text-sm">
                    Serve Rotation Guide:
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    {liveScore.tiebreak_total_points === 0 
                      ? "▶️ First server serves 1 point only"
                      : liveScore.tiebreak_total_points === 1
                        ? "⚠️ SWITCH SERVER NOW - Opponent serves next 2 points"
                        : liveScore.tiebreak_total_points % 2 === 1
                          ? "⚠️ SWITCH SERVER after this point (alternate every 2 points)"
                          : "✅ Current server continues (serves 2 points total)"}
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    International Rule: First server → 1 point, then alternate every 2 points
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Detailed Score Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm">
            {/* Current Set/Game/Period Info */}
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Current</p>
              <p className="font-bold text-gray-900">
                {liveScore.current_game ? `Game ${liveScore.current_game}` :
                 liveScore.current_set ? `Set ${liveScore.current_set}` : 
                 liveScore.current_period ? `Period ${liveScore.current_period}` : 
                 'In Progress'}
              </p>
            </div>

            {/* Current Game/Points (Tennis/Padel: 15-30-40 format) */}
            {liveScore.participant1?.current_game_points !== undefined && (
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">
                  {liveScore.is_tiebreak ? 'Tiebreak Points' : 'Current Points'}
                </p>
                <p className="font-bold text-gray-900">
                  {convertToTennisScore(liveScore.participant1.current_game_points, liveScore.participant2.current_game_points, liveScore.is_tiebreak)} - {convertToTennisScore(liveScore.participant2.current_game_points, liveScore.participant1.current_game_points, liveScore.is_tiebreak)}
                </p>
                {/* Deuce/Advantage Indicator */}
                {!liveScore.is_tiebreak && liveScore.participant1.current_game_points >= 3 && liveScore.participant2.current_game_points >= 3 && (
                  <div className="mt-2">
                    {liveScore.participant1.current_game_points === liveScore.participant2.current_game_points ? (
                      <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                        <span>⚡</span>
                        <span>DEUCE</span>
                        {liveScore.current_game_deuce_count > 0 && (
                          <span className="ml-1 bg-yellow-200 px-1.5 rounded-full">
                            {liveScore.current_game_deuce_count}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                        <span>🎯</span>
                        <span>ADV</span>
                        <span className="ml-1">
                          ({liveScore.participant1.current_game_points > liveScore.participant2.current_game_points ? match.participant1_name : match.participant2_name})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Set Scores for racquet sports */}
            {liveScore.participant1?.games && (
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Games This Set</p>
                <p className="font-bold text-gray-900">
                  {liveScore.participant1.games[liveScore.current_set - 1] || 0} - {liveScore.participant2.games[liveScore.current_set - 1] || 0}
                </p>
              </div>
            )}

            {/* Current game/set score */}
            {liveScore.participant1?.game_scores && (
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Game Score</p>
                <p className="font-bold text-gray-900">
                  {liveScore.participant1.game_scores[(liveScore.current_game || 1) - 1] || 0} - {liveScore.participant2.game_scores[(liveScore.current_game || 1) - 1] || 0}
                </p>
              </div>
            )}
            {liveScore.participant1?.set_scores && (
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Set Score</p>
                <p className="font-bold text-gray-900">
                  {liveScore.participant1.set_scores[(liveScore.current_set || 1) - 1] || 0} - {liveScore.participant2.set_scores[(liveScore.current_set || 1) - 1] || 0}
                </p>
              </div>
            )}

            {/* Match time for timed sports */}
            {liveScore.match_time && (
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Time</p>
                <p className="font-bold text-gray-900">{liveScore.match_time}</p>
              </div>
            )}
          </div>

          {/* Set/Game History for Tennis/Padel */}
          {liveScore.participant1?.games && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 text-center">Set History</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {liveScore.participant1.games.map((p1Games, idx) => (
                  <div key={idx} className={`px-3 py-1 rounded text-xs font-bold ${
                    idx === (liveScore.current_set - 1) 
                      ? 'bg-primary-100 text-primary-600 border-2 border-primary-500' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    Set {idx + 1}: {p1Games}-{liveScore.participant2?.games?.[idx] || 0}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game scores history for game-based sports (Badminton, Table Tennis, Squash, Pickleball) */}
          {liveScore.participant1?.game_scores && liveScore.participant1.game_scores.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 text-center">Game History</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {liveScore.participant1.game_scores.map((p1Score, idx) => (
                  <div key={idx} className={`px-3 py-1 rounded text-xs font-bold ${
                    idx === (liveScore.current_game || 1) - 1 
                      ? 'bg-primary-100 text-primary-600 border-2 border-primary-500' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    Game {idx + 1}: {p1Score}-{liveScore.participant2.game_scores[idx]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Set scores history for volleyball */}
          {liveScore.participant1?.set_scores && liveScore.participant1.set_scores.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 text-center">Set History</p>
              <div className="flex justify-center gap-2">
                {liveScore.participant1.set_scores.map((p1Score, idx) => (
                  <div key={idx} className={`px-3 py-1 rounded text-xs font-bold ${
                    idx === liveScore.current_set - 1 
                      ? 'bg-primary-100 text-primary-600 border-2 border-primary-500' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    Set {idx + 1}: {p1Score}-{liveScore.participant2.set_scores[idx]}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sport Info */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>{sport.name} • {match.tournament_category}</p>
        </div>

        {/* Prominent Set/Game History Section - Similar to Live Match View */}
        {sport && sport.name !== 'Football' && (
          (liveScore.participant1?.game_scores?.length > 0 || 
           liveScore.participant1?.set_scores?.length > 0 || 
           liveScore.participant1?.games?.length > 0) && (
            <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
              <h3 className="font-bold text-gray-900 mb-4 text-center">
                {liveScore.participant1?.game_scores ? 'Game History' : 
                 liveScore.participant1?.games ? 'Set History' : 'Set History'}
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {/* For Tennis/Padel - Show games per set */}
                {liveScore.participant1?.games && liveScore.participant1.games.map((gamesWon, index) => {
                  const participant2Games = liveScore.participant2?.games?.[index] || 0;
                  const isCurrentSet = liveScore.current_set === (index + 1);
                  
                  return (
                    <div
                      key={index}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        isCurrentSet
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Set {index + 1}: {gamesWon}-{participant2Games}
                    </div>
                  );
                })}
                
                {/* For game-based sports - Show game scores */}
                {!liveScore.participant1?.games && liveScore.participant1?.game_scores?.map((score, index) => {
                  const participant2Score = liveScore.participant2?.game_scores?.[index] || 0;
                  const isCurrentGame = (liveScore.current_game) === (index + 1);
                  
                  return (
                    <div
                      key={index}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        isCurrentGame
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Game {index + 1}: {score}-{participant2Score}
                    </div>
                  );
                })}

                {/* For set-based sports (Volleyball) - Show set scores */}
                {!liveScore.participant1?.games && !liveScore.participant1?.game_scores && liveScore.participant1?.set_scores?.map((score, index) => {
                  const participant2Score = liveScore.participant2?.set_scores?.[index] || 0;
                  const isCurrentSet = (liveScore.current_set) === (index + 1);
                  
                  return (
                    <div
                      key={index}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        isCurrentSet
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Set {index + 1}: {score}-{participant2Score}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  const renderQuickActions = () => {
    if (!sport) return null;

    const actionGroups = {
      'Tennis': [
        { label: 'Ace', type: 'ace', color: 'yellow' },
        { label: 'Fault', type: 'fault', color: 'orange' },
        { label: 'Timeout', type: 'timeout', color: 'purple' },
        { label: 'Challenge', type: 'challenge', color: 'blue' }
      ],
      'Badminton': [
        { label: 'Timeout', type: 'timeout', color: 'yellow' },
        { label: 'Fault', type: 'fault', color: 'orange' },
        { label: 'Let', type: 'let', color: 'blue' },
        { label: 'Challenge', type: 'challenge', color: 'purple' }
      ],
      'Table Tennis': [
        { label: 'Timeout', type: 'timeout', color: 'yellow' },
        { label: 'Let', type: 'let', color: 'blue' },
        { label: 'Yellow', type: 'yellow_card', color: 'yellow' },
        { label: 'Red', type: 'red_card', color: 'red' }
      ],
      'Squash': [
        { label: 'Let', type: 'let', color: 'blue' },
        { label: 'Stroke', type: 'stroke', color: 'green' },
        { label: 'Timeout', type: 'timeout', color: 'yellow' },
        { label: 'Conduct', type: 'conduct_warning', color: 'orange' }
      ],
      'Pickleball': [
        { label: 'Timeout', type: 'timeout', color: 'yellow' },
        { label: 'Fault', type: 'fault', color: 'orange' },
        { label: 'Let', type: 'let', color: 'blue' },
        { label: 'Replay', type: 'replay', color: 'purple' }
      ],
      'Volleyball': [
        { label: 'Timeout', type: 'timeout', color: 'yellow' },
        { label: 'Sub', type: 'substitution', color: 'green' },
        { label: 'Yellow', type: 'yellow_card', color: 'yellow' },
        { label: 'Red', type: 'red_card', color: 'red' }
      ],
      'Football': [
        { label: 'Goal', type: 'goal', color: 'green' },
        { label: 'Yellow', type: 'yellow_card', color: 'yellow' },
        { label: 'Red', type: 'red_card', color: 'red' },
        { label: 'Sub', type: 'substitution', color: 'blue' }
      ],
      'Basketball': [
        { label: 'Timeout', type: 'timeout', color: 'yellow' },
        { label: 'Sub', type: 'substitution', color: 'green' },
        { label: 'Foul', type: 'foul', color: 'orange' },
        { label: 'Tech Foul', type: 'technical_foul', color: 'red' }
      ],
      'Cricket': [
        { label: 'Wicket', type: 'wicket', color: 'red' },
        { label: 'No Ball', type: 'no_ball', color: 'orange' },
        { label: 'Wide', type: 'wide', color: 'yellow' },
        { label: 'Review', type: 'review', color: 'blue' }
      ],
      'Hockey': [
        { label: 'Goal', type: 'goal', color: 'green' },
        { label: 'Yellow', type: 'yellow_card', color: 'yellow' },
        { label: 'Red', type: 'red_card', color: 'red' },
        { label: 'Sub', type: 'substitution', color: 'blue' }
      ]
    };

    const actions = actionGroups[sport.name];
    if (!actions) return null;

    const colorMap = {
      yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
      orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      green: 'bg-green-100 text-green-700 hover:bg-green-200',
      red: 'bg-red-300 text-red-900 hover:bg-red-400'
    };

    return (
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleRecordEvent(action.type, 'participant1')}
            className={`py-2 text-xs font-semibold rounded ${colorMap[action.color]}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
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

  if (!match || !sport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Match not found</h2>
            <button
              onClick={() => navigate('/matches')}
              className="mt-4 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Back to Matches
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{match.tournament_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>{sport.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="capitalize">{match.category}</span>
                </div>
                {match.venue_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{match.venue_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="px-4 py-2 bg-white/20 rounded-lg text-center">
                <p className="text-xs opacity-90">Status</p>
                <p className="font-bold capitalize">{matchStatus}</p>
              </div>
              {matchStatus === 'in_progress' && (
                <>
                  {/* Show Timer for Football, LIVE indicator for other sports */}
                  {sport?.name === 'Football' ? (
                    <div className="px-4 py-2 bg-white/20 rounded-lg text-center">
                      <p className="text-xs opacity-90">Timer</p>
                      <p className="font-bold text-2xl font-mono">{formatTimer(matchTimer)}</p>
                      {isPaused && <p className="text-xs text-yellow-300">⏸ PAUSED</p>}
                    </div>
                  ) : (
                    <div className="px-6 py-2 bg-white/20 rounded-lg text-center flex items-center gap-2 shadow-md">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                      <p className="font-bold text-xl tracking-wider">LIVE</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {match.match_date && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(match.match_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
                {match.match_time && ` • ${match.match_time}`}
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        {matchStatus === 'completed' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-6">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🏆 Match Complete!</h2>
            
            {liveScore && (
              <div className="space-y-4">
                <div className="text-2xl font-bold text-gray-800">
                  {liveScore.match_winner === 'participant1' && (
                    <span className="text-green-600">Winner: {match.participant1_name}</span>
                  )}
                  {liveScore.match_winner === 'participant2' && (
                    <span className="text-green-600">Winner: {match.participant2_name}</span>
                  )}
                  {liveScore.match_winner === 'draw' && (
                    <span className="text-blue-600">Match Drawn</span>
                  )}
                </div>
                
                {/* Score display based on sport type */}
                <div className="text-4xl font-bold text-gray-900">
                  {sport.name === 'Football' ? (
                    // Time-based sports: Show goals/points
                    <>{liveScore.participant1?.goals || 0} - {liveScore.participant2?.goals || 0}</>
                  ) : ['Table Tennis', 'Squash', 'Pickleball'].includes(sport.name) ? (
                    // Game-based sports: Show games won
                    <>{liveScore.participant1?.games_won || 0} - {liveScore.participant2?.games_won || 0}</>
                  ) : (
                    // Set-based sports: Show sets won (Badminton, Tennis, Volleyball, Padel)
                    <>{liveScore.participant1?.sets_won || 0} - {liveScore.participant2?.sets_won || 0}</>
                  )}
                </div>
                
                {/* Sport-specific stats */}
                {sport.name === 'Football' && (
                  <>
                    {/* Penalty Shootout Score */}
                    {liveScore.penalty_shootout && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-400 mt-4">
                        <p className="text-lg font-bold text-orange-600 mb-2">⚽ Penalty Shootout</p>
                        <div className="text-3xl font-bold text-gray-900">
                          {liveScore.penalty_shootout.participant1_scored} - {liveScore.penalty_shootout.participant2_scored}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          ({liveScore.penalty_shootout.participant1_attempts} attempts - {liveScore.penalty_shootout.participant2_attempts} attempts)
                        </p>
                      </div>
                    )}
                    
                    {/* Football: Show cards */}
                    <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Yellow Cards</p>
                        <p className="text-xl font-bold">{liveScore.participant1?.yellow_cards || 0} - {liveScore.participant2?.yellow_cards || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Red Cards</p>
                        <p className="text-xl font-bold">{liveScore.participant1?.red_cards || 0} - {liveScore.participant2?.red_cards || 0}</p>
                      </div>
                    </div>
                  </>
                )}
                
                {['Badminton', 'Tennis', 'Volleyball', 'Pickleball', 'Padel'].includes(sport.name) && (
                  // Set-based sports: Show set scores
                  <div className="mt-6 text-left">
                    <p className="text-sm text-gray-600 mb-2">Set Scores</p>
                    <div className="grid grid-cols-3 gap-2">
                      {liveScore.participant1?.set_scores?.map((score, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500">Set {idx + 1}</p>
                          <p className="text-lg font-bold">{score} - {liveScore.participant2?.set_scores?.[idx] || 0}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {['Table Tennis', 'Squash'].includes(sport.name) && (
                  // Game-based sports: Show game scores
                  <div className="mt-6 text-left">
                    <p className="text-sm text-gray-600 mb-2">Game Scores</p>
                    <div className="grid grid-cols-3 gap-2">
                      {liveScore.participant1?.game_scores?.map((score, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500">Game {idx + 1}</p>
                          <p className="text-lg font-bold">{score} - {liveScore.participant2?.game_scores?.[idx] || 0}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Match Duration (for time-based sports) */}
                {sport.name === 'Football' && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-gray-600">Match Duration</p>
                    <p className="text-lg font-semibold">{liveScore.match_time || '00:00'}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-6 flex gap-4 justify-center">
              {/* Show "Play Again" button only for standalone matches */}
              {!match.tournament_id && (
                <button
                  onClick={() => setShowPlayAgainModal(true)}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
              )}
              <button
                onClick={() => navigate('/matches')}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:shadow-lg transition-all"
              >
                Back to Matches
              </button>
            </div>
          </div>
        )}

        {(matchStatus === 'scheduled' || matchStatus === 'ready') && (
          (!match?.participant1_id || !match?.participant2_id) ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-6 border-t-4 border-red-500">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-red-700 mb-2">No Participants Assigned</h2>
              <p className="text-gray-600 max-w-lg mx-auto mb-6">
                This match does not have participants assigned yet. 
                Both participants must be assigned before you can start scoring or declare a winner.
              </p>
              <button
                onClick={() => navigate('/matches')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:shadow-lg transition-all"
              >
                Back to Matches
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-6">
              <Play className="w-16 h-16 text-primary-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start?</h2>
              <p className="text-gray-600 mb-6">
                Both players have checked in. Click below to start the match.
              </p>
              
              {/* Squad Selection for Team Sports */}
              {match?.tournament_category === 'teams' && match.participant1_details && match.participant2_details && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Squad Selection Required
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select playing members and assign positions for both teams before starting the match
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`bg-white rounded-lg p-4 border-2 transition-all ${
                      squadStatus.team1_squad_set 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-200'
                    }`}>
                      <h4 className="font-semibold text-gray-900 mb-2">{match.participant1_details.name}</h4>
                      <button
                        onClick={() => handleOpenSquadModal(match.participant1_details.id, match.participant1_details.name)}
                        className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                          squadStatus.team1_squad_set
                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {squadStatus.team1_squad_set ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Squad Selected
                          </>
                        ) : (
                          'Select Squad'
                        )}
                      </button>
                    </div>
                    <div className={`bg-white rounded-lg p-4 border-2 transition-all ${
                      squadStatus.team2_squad_set 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-200'
                    }`}>
                      <h4 className="font-semibold text-gray-900 mb-2">{match.participant2_details.name}</h4>
                      <button
                        onClick={() => handleOpenSquadModal(match.participant2_details.id, match.participant2_details.name)}
                        className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                          squadStatus.team2_squad_set
                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {squadStatus.team2_squad_set ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Squad Selected
                          </>
                        ) : (
                          'Select Squad'
                        )}
                      </button>
                    </div>
                  </div>
                  {!squadStatus.both_squads_set && (
                    <p className="text-xs text-orange-600 mt-3 font-medium">
                      ⚠️ Both squads must be selected before starting the match
                    </p>
                  )}
                </div>
              )}
              
              <button
                onClick={handleStartMatch}
                disabled={match?.tournament_category === 'teams' && !squadStatus.both_squads_set}
                className={`px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-lg transition-all ${
                  match?.tournament_category === 'teams' && !squadStatus.both_squads_set
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-lg'
                }`}
              >
                🏁 START MATCH
              </button>
              
              <div className="mt-10 pt-8 border-t-2 border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Or Declare Winner Directly</h3>
                <p className="text-sm text-gray-600 mb-6">
                  If the match cannot be played or you need to declare a winner without scoring
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <button
                    onClick={() => handleDeclareWinner('participant1')}
                    className="py-5 px-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white font-bold text-lg rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-6 h-6" />
                    Declare {match.participant1_name || 'Participant 1'} Winner
                  </button>
                  <button
                    onClick={() => handleDeclareWinner('participant2')}
                    className="py-5 px-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white font-bold text-lg rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-6 h-6" />
                    Declare {match.participant2_name || 'Participant 2'} Winner
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {matchStatus === 'in_progress' && (
          <>
            {/* Match Resumed Notification */}
            {liveScore && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white rounded-full p-2">
                    <Play className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-900">Match In Progress</p>
                    <p className="text-sm text-blue-700">
                      {isPaused ? '⏸️ Match is paused - Click Resume to continue' : '✓ Match is live - Scoring enabled'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Football Manual Half Control Panel */}
            {sport.name === 'Football' && matchStatus === 'in_progress' && !liveScore?.is_penalty_shootout && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4">⚽ Match Control</h3>
                
                {/* Debug Info */}
                {/* {console.log('🔍 Button State:', { currentHalf, isPaused, isOnBreak, half_1_duration: liveScore?.half_1_duration })} */}
                
                {/* Debug Panel - Remove after testing */}
                <div className="mb-3 p-2 bg-gray-100 rounded text-xs">
                  <strong>Debug:</strong> Half={currentHalf} | Paused={isPaused ? 'Yes' : 'No'} | Break={isOnBreak ? 'Yes' : 'No'}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* End 1st Half Button - Auto-starts break */}
                  {currentHalf === 1 && !isOnBreak && !liveScore?.half_1_ended && (
                    <button
                      onClick={handleEndHalf}
                      className="py-4 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl"
                    >
                      <div className="text-2xl mb-1">⏸️</div>
                      <div className="text-sm">END 1ST HALF</div>
                      <div className="text-xs opacity-75 mt-1">(Auto-starts break)</div>
                    </button>
                  )}
                  
                  {/* End Break Button - Auto-starts next half */}
                  {isOnBreak && currentHalf === 1 && (
                    <button
                      onClick={handleEndBreak}
                      className="py-4 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl"
                    >
                      <div className="text-2xl mb-1">✅</div>
                      <div className="text-sm">END BREAK</div>
                      <div className="text-xs opacity-75 mt-1">(Auto-starts 2nd half)</div>
                    </button>
                  )}
                  
                  {/* End 2nd Half Button */}
                  {currentHalf === 2 && !isOnBreak && (
                    <button
                      onClick={handleEndHalf}
                      className="py-4 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl"
                    >
                      <div className="text-2xl mb-1">⏹️</div>
                      <div className="text-sm">END 2ND HALF</div>
                      <div className="text-xs opacity-75 mt-1">(Match complete)</div>
                    </button>
                  )}
                </div>
                
                {/* Status Info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center text-sm">
                  {currentHalf === 1 && !isOnBreak && !isPaused && (
                    <span className="text-blue-700 font-semibold">🟢 1st Half in Progress</span>
                  )}
                  {currentHalf === 1 && isPaused && !isOnBreak && (
                    <span className="text-orange-700 font-semibold">⏸️ 1st Half Ended - Ready for Break</span>
                  )}
                  {isOnBreak && currentHalf === 1 && (
                    <span className="text-blue-700 font-semibold">☕ Half-Time Break in Progress</span>
                  )}
                  {currentHalf === 2 && !isOnBreak && !isPaused && (
                    <span className="text-green-700 font-semibold">🟢 2nd Half in Progress</span>
                  )}
                  {currentHalf === 2 && isPaused && (
                    <span className="text-red-700 font-semibold">🏁 2nd Half Ended - Ready to End Match</span>
                  )}
                </div>
              </div>
            )}

            {/* Sport-Specific Scoring Interfaces */}
            {sport.name === 'Football' ? (
              // TIME-BASED: Football
              <FootballScoringInterface
                match={match}
                liveScore={liveScore}
                onAddGoal={handleAddGoal}
                onAddEvent={handleRecordEvent}
                onAddTime={handleAddTime}
                onRecordPenalty={handleRecordPenalty}
                onUndo={handleUndoPoint}
                matchTimer={matchTimer}
                periodDuration={periodDuration}
                onStartExtraTimeFirstHalf={handleStartExtraTimeFirstHalf}
                onEndExtraTimeFirstHalf={handleEndExtraTimeFirstHalf}
                onStartExtraTimeBreak={handleStartExtraTimeBreak}
                onStartExtraTimeSecondHalf={handleStartExtraTimeSecondHalf}
                onEndExtraTimeSecondHalf={handleEndExtraTimeSecondHalf}
              />
            ) : ['Tennis', 'Padel'].includes(sport.name) ? (
              // SET-BASED: Tennis, Padel
              <>
                {/* {console.log('🎾 Rendering SET-BASED interface for:', sport.name)} */}
                <SetBasedScoringInterface
                  match={match}
                  liveScore={liveScore}
                  sport={sport}
                  onAddPoint={handleAddPoint}
                  onToggleServer={handleToggleServer}
                  onUndo={handleUndoPoint}
                  onRefreshEvents={handleRefreshEvents}
                  isSwapped={isSwapped}
                  onSwapSides={() => setIsSwapped(prev => !prev)}
                />
              </>
            ) : ['Badminton', 'Table Tennis', 'Squash', 'Pickleball', 'Volleyball'].includes(sport.name) ? (
              // GAME-BASED: Badminton, Table Tennis, Squash, Pickleball, Volleyball
              <>
                {/* {console.log('🏓 Rendering GAME-BASED interface for:', sport.name)} */}
                <GameBasedScoringInterface
                  match={match}
                  liveScore={liveScore}
                  sport={sport}
                  onAddPoint={handleAddPoint}
                  onToggleServer={handleToggleServer}
                  onUndo={handleUndoPoint}
                  onRefreshEvents={handleRefreshEvents}
                  isSwapped={isSwapped}
                  onSwapSides={() => setIsSwapped(prev => !prev)}
                />
              </>
            ) : (
              // FALLBACK: Generic scoring for unsupported sports
              <>
                <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                  {renderScoreDisplay()}
                  
                  {/* Match Complete Banner */}
                  {liveScore?.match_complete && (
                    <div className="mt-6 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white p-6 rounded-lg text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-2" />
                      <h3 className="text-2xl font-bold">🏆 Match Complete!</h3>
                      <p className="text-lg mt-2">
                        Winner: {
                          liveScore.match_winner === 'participant1' 
                            ? match.participant1_name 
                            : liveScore.match_winner === 'participant2'
                            ? match.participant2_name
                            : 'Draw'
                        }
                      </p>
                      <p className="text-sm mt-1">
                        Final Score: {
                          // Game-based sports (Table Tennis, Squash, Pickleball)
                          ['Table Tennis', 'Squash', 'Pickleball'].includes(match?.sport_name) && liveScore.participant1?.games_won !== undefined
                          ? `${liveScore.participant1.games_won} - ${liveScore.participant2.games_won} Games`
                          // Set-based sports (Tennis, Badminton, Volleyball, Padel)
                          : liveScore.participant1?.sets_won !== undefined 
                          ? `${liveScore.participant1.sets_won} - ${liveScore.participant2.sets_won} Sets`
                          // Time-based sports (Football)
                          : liveScore.participant1?.goals !== undefined
                          ? `${liveScore.participant1.goals} - ${liveScore.participant2.goals} Goals`
                          : '0 - 0'
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => handleAddPoint('participant1')}
                    disabled={liveScore?.match_complete}
                    className={`py-6 font-bold text-xl rounded-lg transition-all ${
                      liveScore?.match_complete 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-br from-primary-500 to-primary-500 text-white hover:shadow-lg'
                    }`}
                  >
                    <Plus className="w-6 h-6 inline mr-2" />
                    POINT {match.participant1_name?.split(' ')[0] || 'P1'}
                  </button>
                  <button
                    onClick={() => handleAddPoint('participant2')}
                    disabled={liveScore?.match_complete}
                    className={`py-6 font-bold text-xl rounded-lg transition-all ${
                      liveScore?.match_complete 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:shadow-lg'
                    }`}
                  >
                    <Plus className="w-6 h-6 inline mr-2" />
                    POINT {match.participant2_name?.split(' ')[0] || 'P2'}
                  </button>
                </div>
              </>
            )}

            {/* <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              {renderQuickActions()}
            </div> */}

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Match Events Log</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.length > 0 ? (
                  events
                    .filter(event => {
                      // Filter out game_won and set_won events as they're now shown in point events
                      return event.event_type !== 'game_won' && event.event_type !== 'set_won';
                    })
                    .slice(0, 20)
                    .map((event, idx) => {
                    const teamName = event.participant_side === 'participant1' 
                      ? match.participant1_name 
                      : match.participant2_name;
                    
                    let eventIcon = '⚡';
                    let eventColor = 'bg-gray-50 border-l-4 border-gray-400';
                    let eventDescription = '';
                    
                    // ✅ Check if event_message exists from backend (for undo events and others)
                    if (event.event_message) {
                      // Use backend-generated message directly
                      if (event.event_type === 'undo') {
                        eventIcon = '⚡';
                        eventColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                      }
                      eventDescription = event.event_message;
                    }
                    // Generate detailed event description based on event type
                    else if (event.event_type === 'goal') {
                      eventIcon = '⚽';
                      eventColor = 'bg-green-50 border-l-4 border-green-500';
                      const goalType = event.metadata?.goal_type || 'open_play';
                      const goalTypeLabel = goalType === 'open_play' ? '' : ` (${goalType.replace('_', ' ')})`;
                      
                      // Use stored excitement from database (generated once when event was created)
                      const goalExcitement = event.metadata?.excitement || 'GOAL!';
                      
                      if (event.player_name) {
                        eventDescription = `${goalExcitement} ${event.player_name} scored a goal${goalTypeLabel}`;
                        if (event.assist_player_name) {
                          eventDescription += ` • Assist: ${event.assist_player_name}`;
                        }
                      } else {
                        eventDescription = `${goalExcitement} Goal scored${goalTypeLabel}`;
                      }
                    } else if (event.event_type === 'yellow_card') {
                      eventIcon = '🟨';
                      eventColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                      eventDescription = event.player_name 
                        ? `${event.player_name} received a yellow card`
                        : 'Yellow card issued';
                      if (event.metadata?.reason) {
                        eventDescription += ` • ${event.metadata.reason}`;
                      }
                    } else if (event.event_type === 'red_card') {
                      eventIcon = '🟥';
                      eventColor = 'bg-red-50 border-l-4 border-red-500';
                      eventDescription = event.player_name 
                        ? `${event.player_name} received a red card`
                        : 'Red card issued';
                      if (event.metadata?.reason) {
                        eventDescription += ` • ${event.metadata.reason}`;
                      }
                    } else if (event.event_type === 'substitution') {
                      eventIcon = '🔄';
                      eventColor = 'bg-blue-50 border-l-4 border-blue-500';
                      
                      // Show both player OUT and player IN
                      if (event.player_name && event.metadata?.player_in_name) {
                        eventDescription = `🔴 ${event.player_name} OUT • 🟢 ${event.metadata.player_in_name} IN`;
                      } else if (event.player_name) {
                        eventDescription = `${event.player_name} substituted`;
                      } else {
                        eventDescription = 'Substitution made';
                      }
                    } else if (event.event_type === 'point') {
                      // Check if this is a server change event
                      if (event.event_subtype === 'server_change') {
                        eventIcon = '🎾';
                        eventColor = 'bg-yellow-50 border-l-4 border-yellow-400';
                        eventDescription = event.event_message || event.notes || 'Server changed';
                      } else {
                        // Use pre-generated message from backend
                        if (event.event_message || event.metadata?.event_message) {
                          eventDescription = event.event_message || event.metadata.event_message;
                          
                          // Set icon and color based on whether game/set was won
                          if (event.metadata?.won_game_set) {
                            eventIcon = '🏆';
                            eventColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                          } else {
                            eventIcon = '🎯';
                            eventColor = 'bg-primary-50 border-l-4 border-primary-500';
                          }
                        } else {
                          // Fallback if message not generated (shouldn't happen with new backend)
                          eventIcon = '🎯';
                          eventColor = 'bg-primary-50 border-l-4 border-primary-500';
                          eventDescription = `${teamName} scored a point`;
                        }
                      
                      // Check if set/game was won
                      if (event.metadata?.set_won) {
                        eventIcon = '🏆';
                        eventColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                        
                        // Sport-specific win expressions
                        let winExpressions = [];
                        if (sport.name === 'Badminton') {
                          winExpressions = [
                            'Dominant performance!', 'Set won!', 'Unstoppable!', 'What a set!',
                            'Brilliant set victory!', 'Phenomenal play!', 'Outstanding set!', 'Champion mindset!'
                          ];
                        } else if (sport.name === 'Tennis') {
                          winExpressions = [
                            'Set point!', 'What a set!', 'Incredible set!', 'Dominant set!',
                            'Brilliant tennis!', 'Outstanding performance!', 'Set won!', 'Unstoppable!'
                          ];
                        } else if (sport.name === 'Volleyball') {
                          winExpressions = [
                            'Set won!', 'Dominant set!', 'What a set!', 'Incredible teamwork!',
                            'Outstanding set!', 'Brilliant volleyball!', 'Unstoppable!', 'Perfect execution!'
                          ];
                        } else {
                          winExpressions = ['Amazing!', 'Incredible!', 'Fantastic!', 'Outstanding!', 'Brilliant!', 'Phenomenal!', 'Unstoppable!', 'Dominant!'];
                        }
                        
                        const winExcitement = winExpressions[Math.floor(Math.random() * winExpressions.length)];
                        eventDescription = `${winExcitement} ${teamName} won ${currentSetGame}!`;
                        if (currentScore) {
                          eventDescription += ` Final score: ${currentScore}`;
                        }
                      } else if (event.metadata?.game_won) {
                        eventIcon = '🏆';
                        eventColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                        
                        // Sport-specific game win expressions
                        let winExpressions = [];
                        if (sport.name === 'Table Tennis') {
                          winExpressions = [
                            'Game won!', 'Lightning victory!', 'What a game!', 'Incredible speed!',
                            'Dominant game!', 'Outstanding control!', 'Brilliant game!', 'Unstoppable!'
                          ];
                        } else if (sport.name === 'Squash') {
                          winExpressions = [
                            'Game won!', 'What a game!', 'Incredible stamina!', 'Dominant performance!',
                            'Outstanding game!', 'Brilliant squash!', 'Unstoppable!', 'Perfect game!'
                          ];
                        } else if (sport.name === 'Pickleball') {
                          winExpressions = [
                            'Game won!', 'What a game!', 'Incredible control!', 'Dominant play!',
                            'Outstanding game!', 'Brilliant pickleball!', 'Unstoppable!', 'Perfect execution!'
                          ];
                        } else {
                          winExpressions = ['Amazing!', 'Incredible!', 'Fantastic!', 'Outstanding!', 'Brilliant!', 'Phenomenal!', 'Unstoppable!', 'Dominant!'];
                        }
                        
                        const winExcitement = winExpressions[Math.floor(Math.random() * winExpressions.length)];
                        eventDescription = `${winExcitement} ${teamName} won ${currentSetGame}!`;
                        if (currentScore) {
                          eventDescription += ` Final score: ${currentScore}`;
                        }
                      }
                      }
                    } else if (event.event_type === 'game_won') {
                      // Game won event (Table Tennis, Squash, Pickleball, Tennis, Padel)
                      eventIcon = '🏆';
                      eventColor = 'bg-green-50 border-l-4 border-green-500';
                      
                      // For Tennis/Padel - show game number within set
                      if (event.metadata?.game_in_set && event.metadata?.current_set) {
                        const gameInSet = event.metadata.game_in_set;
                        const currentSet = event.metadata.current_set;
                        const gameScore = event.metadata?.score || '';
                        eventDescription = `${teamName} won Game ${gameInSet} in Set ${currentSet}${gameScore ? ` (${gameScore})` : ''}`;
                      } else {
                        // For other sports - show game number
                        const gameNumber = event.metadata?.completed_game_number || event.current_game || 'N/A';
                        const gameScore = event.metadata?.score || '';
                        eventDescription = `${teamName} won Game ${gameNumber}${gameScore ? ` (${gameScore})` : ''}`;
                      }
                    } else if (event.event_type === 'set_won') {
                      // Set won event (Tennis, Padel, Badminton, Volleyball)
                      eventIcon = '🏆';
                      eventColor = 'bg-green-50 border-l-4 border-green-500';
                      const setNumber = event.metadata?.completed_game_number || event.current_set || 'N/A';
                      const setScore = event.metadata?.score || '';
                      eventDescription = `${teamName} won Set ${setNumber}${setScore ? ` (${setScore})` : ''}`;
                    } else if (event.event_type === 'penalty_kick') {
                      eventIcon = '⚽';
                      const result = event.metadata?.result || 'unknown';
                      
                      if (result === 'scored') {
                        eventColor = 'bg-green-50 border-l-4 border-green-500';
                        eventIcon = '✅';
                      } else if (result === 'missed') {
                        eventColor = 'bg-red-50 border-l-4 border-red-500';
                        eventIcon = '❌';
                      } else if (result === 'saved') {
                        eventColor = 'bg-orange-50 border-l-4 border-orange-500';
                        eventIcon = '🧤';
                      }
                      
                      // Build proper message with details
                      const roundStr = event.metadata?.sudden_death 
                        ? `Sudden Death - Round ${event.metadata?.round || ''}` 
                        : `Round ${event.metadata?.round || ''}`;
                      const scoreStr = event.metadata?.score ? ` (Shootout: ${event.metadata.score})` : '';
                      const excitement = event.metadata?.excitement ? `${event.metadata.excitement} ` : '';
                      const kickerName = event.player_name || 'Player';
                      
                      if (result === 'scored') {
                        eventDescription = `${excitement}${kickerName} scores a Goal for ${teamName}! • ${roundStr}${scoreStr}`;
                      } else if (result === 'saved') {
                        const goalkeeperName = event.metadata?.goalkeeper_name;
                        if (goalkeeperName) {
                          eventDescription = `${excitement}${kickerName}'s penalty kick is Saved by ${goalkeeperName}! • ${roundStr}${scoreStr}`;
                        } else {
                          eventDescription = `${excitement}${kickerName}'s penalty kick is Saved by the Goalkeeper! • ${roundStr}${scoreStr}`;
                        }
                      } else if (result === 'missed') {
                        eventDescription = `${excitement}${kickerName} misses the target for ${teamName}! • ${roundStr}${scoreStr}`;
                      } else {
                        eventDescription = `Penalty kick ${result} by ${kickerName} • ${roundStr}${scoreStr}`;
                      }
                    } else if (event.event_type === 'match_start') {
                      eventIcon = '⚡';
                      eventColor = 'bg-blue-50 border-l-4 border-blue-500';
                      // Use exciting message from backend notes field
                      eventDescription = event.notes || 'Match Started';
                    } else if (event.event_type === 'server_selection') {
                      eventIcon = '🎾';
                      eventColor = 'bg-purple-50 border-l-4 border-purple-500';
                      // Use message from backend notes field
                      eventDescription = event.notes || `${teamName} selected to serve first`;
                    } else if (event.event_type === 'side_change') {
                      eventIcon = '🔄';
                      eventColor = 'bg-cyan-50 border-l-4 border-cyan-500';
                      // Use message from backend notes field
                      eventDescription = event.notes || 'Sides changed! Players swapped positions on the court';
                    } else if (event.event_type === 'half_1_end') {
                      eventIcon = '⏸️';
                      eventColor = 'bg-orange-50 border-l-4 border-orange-500';
                      eventDescription = 'First Half Ended';
                    } else if (event.event_type === 'half_2_start') {
                      eventIcon = '▶️';
                      eventColor = 'bg-green-50 border-l-4 border-green-500';
                      eventDescription = 'Second Half Started';
                    } else if (event.event_type === 'half_2_end') {
                      eventIcon = '⏹️';
                      eventColor = 'bg-red-50 border-l-4 border-red-500';
                      eventDescription = 'Second Half Ended';
                    } else if (event.event_type === 'break_start') {
                      eventIcon = '☕';
                      eventColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                      eventDescription = 'Break Time Started';
                    } else if (event.event_type === 'break_end') {
                      eventIcon = '▶️';
                      eventColor = 'bg-green-50 border-l-4 border-green-500';
                      eventDescription = 'Break Time Ended';
                    } else if (event.event_type === 'match_complete') {
                      eventIcon = '🏆';
                      eventColor = 'bg-purple-50 border-l-4 border-purple-500';
                      eventDescription = 'Match Completed';
                    } else {
                      eventDescription = event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                    
                    // Check if this is a timing event (no timestamp needed)
                    const isTimingEvent = [
                      'match_start', 'server_selection', 'half_1_end', 'half_2_start', 'half_2_end', 
                      'break_start', 'break_end', 'match_complete',
                      'half_3_end', 'half_4_end', 'extra_time_start', 'extra_time_initialized',
                      'extra_time_half_1_start', 'extra_time_half_1_end', 'extra_time_break_start',
                      'extra_time_half_2_start', 'extra_time_half_2_end'
                    ].includes(event.event_type);
                    
                    return (
                      <div key={idx} className={`p-3 rounded ${eventColor}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">{eventIcon}</span>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">
                                {eventDescription}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {teamName}
                              </div>
                            </div>
                          </div>
                          {!isTimingEvent && (
                            <div className="text-right ml-4">
                              <div className="text-sm font-bold text-gray-700">
                                {(() => {
                                  const snapshot = event.score_snapshot;
                                  const matchStructure = snapshot?.match_structure;
                                  
                                  // For time-based sports (Football): show match time FIRST
                                  if (event.match_time) {
                                    return event.match_time;
                                  }
                                  
                                  // For Tennis/Padel: show set number
                                  if (snapshot?.participant1?.current_game_points !== undefined) {
                                    return `Set ${event.current_set || snapshot?.current_set || 1}`;
                                  }
                                  
                                  // For game-based sports: show current game
                                  if (matchStructure === 'game_based' && (event.current_game || snapshot?.current_game)) {
                                    return `Game ${event.current_game || snapshot?.current_game}`;
                                  }
                                  
                                  // For set-based sports: show current set
                                  if (matchStructure === 'set_based' && (event.current_set || snapshot?.current_set)) {
                                    return `Set ${event.current_set || snapshot?.current_set}`;
                                  }
                                  
                                  // Fallback: check event fields
                                  if (event.current_game) {
                                    return `Game ${event.current_game}`;
                                  }
                                  if (event.current_set) {
                                    return `Set ${event.current_set}`;
                                  }
                                  
                                  return 'N/A';
                                })()}
                              </div>
                              {event.score_snapshot && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {(() => {
                                    const snapshot = event.score_snapshot;
                                    const currentSetIndex = (snapshot.current_set || 1) - 1;
                                    const currentGameIndex = (snapshot.current_game || 1) - 1;
                                    
                                    // For set-based sports: show current set score (points in current set)
                                    if (snapshot.participant1?.set_scores !== undefined) {
                                      const p1Score = snapshot.participant1.set_scores[currentSetIndex] || 0;
                                      const p2Score = snapshot.participant2.set_scores[currentSetIndex] || 0;
                                      return `${p1Score}-${p2Score}`;
                                    }
                                    // For game-based sports: show current game score
                                    else if (snapshot.participant1?.game_scores !== undefined) {
                                      const p1Score = snapshot.participant1.game_scores[currentGameIndex] || 0;
                                      const p2Score = snapshot.participant2.game_scores[currentGameIndex] || 0;
                                      return `${p1Score}-${p2Score}`;
                                    }
                                    // For time-based sports: show goals
                                    else if (snapshot.participant1?.goals !== undefined) {
                                      return `${snapshot.participant1.goals}-${snapshot.participant2.goals}`;
                                    }
                                    return '';
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No events recorded yet</p>
                )}
              </div>
            </div>

            {/* Action Buttons - Only END MATCH */}
            <div className="mb-6">
              <button
                onClick={() => setShowEndMatchModal(true)}
                className="w-full py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-lg"
              >
                <Square className="w-6 h-6" />
                END MATCH
              </button>
            </div>

            {/* Draw Decision Modal */}
            {showDrawDecisionModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-12 h-12 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Match is a Draw!</h2>
                    <p className="text-gray-600 text-lg">
                      Score: {liveScore?.participant1?.goals || 0} - {liveScore?.participant2?.goals || 0}
                    </p>
                    <p className="text-gray-500 mt-2">
                      Choose how to proceed:
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Option 1: Declare Draw */}
                    <button
                      onClick={handleDeclareDraw}
                      className="w-full py-6 px-6 bg-gradient-to-br from-gray-500 to-gray-600 text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3"
                    >
                      <Trophy className="w-6 h-6" />
                      Declare Match as Draw
                    </button>

                    {/* Option 2: Extra Time (NEW) - Hide if extra time already played */}
                    {!liveScore?.extra_time_config && (
                      <button
                        onClick={handleShowExtraTimeConfig}
                        className="w-full py-6 px-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3"
                      >
                        <Clock className="w-6 h-6" />
                        Start Extra Time
                      </button>
                    )}

                    {/* Option 3: Penalties */}
                    <button
                      onClick={handleStartPenalties}
                      className="w-full py-6 px-6 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3"
                    >
                      ⚽ Go to Penalty Shootout
                    </button>
                  </div>

                  <button
                    onClick={() => setShowDrawDecisionModal(false)}
                    className="w-full py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Extra Time Configuration Modal (NEW) */}
            {showExtraTimeConfigModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-12 h-12 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">⏱️ Configure Extra Time</h2>
                    <p className="text-gray-600 text-lg">
                      Set the duration for extra time halves and break
                    </p>
                  </div>

                  <div className="space-y-6 mb-6">
                    {/* Half Duration Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Half Duration (minutes):
                      </label>
                      <input
                        type="number"
                        value={extraTimeHalfDuration}
                        onChange={(e) => setExtraTimeHalfDuration(e.target.value)}
                        min="1"
                        max="30"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg font-semibold text-center"
                        placeholder="15"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 15 minutes (1-30 min)</p>
                    </div>

                    {/* Break Duration Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Break Duration (minutes):
                      </label>
                      <input
                        type="number"
                        value={extraTimeBreakDuration}
                        onChange={(e) => setExtraTimeBreakDuration(e.target.value)}
                        min="1"
                        max="15"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg font-semibold text-center"
                        placeholder="5"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 5 minutes (1-15 min)</p>
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-bold text-blue-900 mb-2">Summary:</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Extra Time 1st Half: {extraTimeHalfDuration || 0} minutes</li>
                        <li>• Break: {extraTimeBreakDuration || 0} minutes</li>
                        <li>• Extra Time 2nd Half: {extraTimeHalfDuration || 0} minutes</li>
                        <li className="font-bold pt-2 border-t border-blue-300 mt-2">
                          Total Extra Time: {(parseInt(extraTimeHalfDuration || 0) * 2) + parseInt(extraTimeBreakDuration || 0)} minutes
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowExtraTimeConfigModal(false);
                        setShowDrawDecisionModal(true);
                      }}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleInitializeExtraTime}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Initialize Extra Time
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* End Match Confirmation Modal */}
            {showEndMatchModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-12 h-12 text-red-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">End Match?</h2>
                    <p className="text-gray-600 text-lg">
                      Are you sure you want to end this match?
                    </p>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Trophy className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-yellow-900 mb-1">Declare Winner</h3>
                        <p className="text-sm text-yellow-800">
                          Select the winner to end the match (walkover, injury, disqualification, etc.)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => {
                        setShowEndMatchModal(false);
                        handleDeclareWinner('participant1');
                      }}
                      className="py-6 px-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3"
                    >
                      <Trophy className="w-6 h-6" />
                      Declare {match.participant1_name || 'Participant 1'} Winner
                    </button>
                    <button
                      onClick={() => {
                        setShowEndMatchModal(false);
                        handleDeclareWinner('participant2');
                      }}
                      className="py-6 px-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3"
                    >
                      <Trophy className="w-6 h-6" />
                      Declare {match.participant2_name || 'Participant 2'} Winner
                    </button>
                  </div>

                  <button
                    onClick={() => setShowEndMatchModal(false)}
                    className="w-full py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Server Selection Modal */}
      {showServerSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-fadeIn">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Who Serves First?</h2>
            <p className="text-gray-600 mb-8 text-center">Select which {match?.tournament_category === 'teams' ? 'team' : match?.tournament_category === 'doubles' ? 'pair' : 'player'} will serve first</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Participant 1 */}
              <button
                onClick={() => {
                  setSelectedFirstServer('participant1');
                  setShowServerSelectionModal(false);
                  startMatchWithServer('participant1');
                }}
                className="group relative bg-gradient-to-br from-primary-50 to-primary-50 hover:from-primary-100 hover:to-teal-100 border-3 border-primary-300 hover:border-primary-500 rounded-xl p-8 transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {match?.participant1_name || 'Participant 1'}
                  </h3>
                  <p className="text-sm text-gray-600">Click to select as first server</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-primary-500 text-white rounded-full p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </button>
              
              {/* Participant 2 */}
              <button
                onClick={() => {
                  setSelectedFirstServer('participant2');
                  setShowServerSelectionModal(false);
                  startMatchWithServer('participant2');
                }}
                className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-3 border-blue-300 hover:border-blue-500 rounded-xl p-8 transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {match?.participant2_name || 'Participant 2'}
                  </h3>
                  <p className="text-sm text-gray-600">Click to select as first server</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-blue-500 text-white rounded-full p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowServerSelectionModal(false)}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Squad Selection Modal */}
      {showSquadModal && currentSquadTeam && (
        <SquadSelectionModal
          isOpen={showSquadModal}
          onClose={() => setShowSquadModal(false)}
          matchId={matchId}
          teamId={currentSquadTeam.id}
          teamName={currentSquadTeam.name}
          onSquadSaved={handleSquadSaved}
        />
      )}

      {/* Play Again Modal (Only for Standalone Matches) */}
      {showPlayAgainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-scale-in relative">
            {/* Close Button */}
            <button
              onClick={() => setShowPlayAgainModal(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors group"
              disabled={creatingRematch}
            >
              <XCircle className="w-6 h-6 text-gray-600 group-hover:text-gray-800" />
            </button>

            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trophy className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                🏆 Match Complete!
              </h2>
              {liveScore && (
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 max-w-md mx-auto">
                  <p className="text-sm text-gray-600 mb-2">Winner</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {liveScore.match_winner === 'participant1' 
                      ? match.participant1_name
                      : liveScore.match_winner === 'participant2'
                      ? match.participant2_name
                      : 'Draw'
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Option 1: Play Again with Same Participants */}
              <button
                onClick={handlePlayAgain}
                disabled={creatingRematch}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <RotateCcw className={`w-5 h-5 ${creatingRematch ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">{creatingRematch ? 'Creating Rematch...' : 'Play Again (Same Participants)'}</p>
                    <p className="text-sm text-white/80">Rematch with same players</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Option 2: Play Again with Different Participants */}
              <button
                onClick={() => {
                  navigate('/standalone-matches/create', {
                    state: {
                      skipStep1: true,
                      preSelectedSport: match.sport_id,
                      sportName: sport?.name,
                      matchCategory: match.tournament_category,
                      startAtStep: 2
                    }
                  });
                }}
                disabled={creatingRematch}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Play Again (Different Participants)</p>
                    <p className="text-sm text-white/80">Start new match with different players</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Option 3: Finish & View History */}
              <button
                onClick={() => navigate(`/matches/${matchId}/history?tab=${tabParam}`)}
                disabled={creatingRematch}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Finish & View Match History</p>
                    <p className="text-sm text-white/80">See complete match details</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefereeLiveScoring;

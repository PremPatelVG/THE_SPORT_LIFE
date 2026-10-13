import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../config/api';
import { Trophy, Users, Clock, Maximize2, Minimize2 } from 'lucide-react';
import MatchTimingDisplay from '../components/MatchTimingDisplay';
import TimingSummary from '../components/scoring/TimingSummary';
import SquadDisplay from '../components/SquadDisplay';
import { getServingIcon } from '../utils/sportIcons';

const LiveMatchView = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'all';
  const [match, setMatch] = useState(null);
  const [liveScore, setLiveScore] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [socket, setSocket] = useState(null);
  const [localTimer, setLocalTimer] = useState(null);
  const [countdownTimer, setCountdownTimer] = useState(null);
  const [breakTimer, setBreakTimer] = useState(null); // Break countdown timer
  const [isDeuceBlinking, setIsDeuceBlinking] = useState(false);
  const [celebratingPlayer, setCelebratingPlayer] = useState(null); // 'participant1' or 'participant2'
  const [viewMode, setViewMode] = useState('default'); // 'default' or 'broadcast'
  const socketInitialized = useRef(false); // Prevent double connection in StrictMode
  const fetchInProgress = useRef(false); // Prevent concurrent API calls
  const matchStartCheckDone = useRef(false); // Prevent repeated calls when countdown reaches zero
  const prevGamesWonRef = useRef({ p1: 0, p2: 0 });
  const isInitializedRef = useRef(false);

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

  useEffect(() => {
    // Prevent double connection in React StrictMode (development only)
    if (socketInitialized.current) {
      // console.log('⚠️ Socket already initialized, skipping...');
      return;
    }

    // console.log('🔵 Initial mount - fetching match data and connecting WebSocket');
    socketInitialized.current = true;
    fetchMatchData();
    connectWebSocket();

    return () => {
      // console.log('🔴 Component unmounting - cleaning up');
      if (socket) {
        // Leave the match room before disconnecting
        if (socket.matchId) {
          // console.log('🚪 Leaving match room:', socket.matchId);
          socket.emit('leave_match', socket.matchId);
        }
        socket.disconnect();
      }
      socketInitialized.current = false; // Reset for next mount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Initialize local timer from match_time (backend already calculates correct time)
  useEffect(() => {
    if (!liveScore || liveScore.sport !== 'Football') {
      return;
    }

    // Use match_time directly from backend (it's already calculated correctly)
    if (liveScore?.match_time) {
      setLocalTimer(liveScore.match_time);
      // console.log('🔄 Timer synced from backend:', liveScore.match_time, 'Half:', liveScore.current_half, 'Break:', liveScore.is_on_break);
    }
  }, [liveScore?.match_time, liveScore?.current_half, liveScore?.is_on_break]);

  // Countdown timer for scheduled matches
  useEffect(() => {
    if (!match || match.status !== 'scheduled' || !match.match_date) {
      setCountdownTimer(null);
      matchStartCheckDone.current = false; // Reset when match status changes
      return;
    }

    // Reset the flag when match status changes to scheduled
    matchStartCheckDone.current = false;

    const updateCountdown = () => {
      const matchDateTime = new Date(match.match_date);
      const now = new Date();
      const diffMs = matchDateTime - now;

      if (diffMs <= 0) {
        setCountdownTimer('Match starting soon...');
        // Check if match has started (in case socket event was missed)
        // Only call once when countdown reaches zero
        if (!matchStartCheckDone.current) {
          // console.log('⏰ Countdown reached zero - checking if match started');
          matchStartCheckDone.current = true;
          fetchMatchData();
        }
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdownTimer(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdownTimer(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdownTimer(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    // Only poll for scheduled matches (to detect when match starts)
    // For in-progress/completed matches, rely on WebSocket events only
    const statusCheckInterval = match.status === 'scheduled' 
      ? setInterval(() => {
          // console.log('⏰ Periodic check - is scheduled match started?');
          fetchMatchData();
        }, 30000) // Check every 30 seconds
      : null;

    return () => {
      clearInterval(countdownInterval);
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.match_date]);

  // Break timer for Football - use backend's match_time directly
  useEffect(() => {
    if (!liveScore || liveScore.sport !== 'Football' || !liveScore.is_on_break) {
      setBreakTimer(null);
      return;
    }

    // ✅ Use backend's match_time directly (already calculated correctly)
    // For regular break: shows elapsed break time
    // For extra time break: shows cumulative time (frozen)
    setBreakTimer(liveScore.match_time);
    
  }, [liveScore?.is_on_break, liveScore?.match_time]);

  // Local timer for smooth Football timer updates
  useEffect(() => {
    if (!liveScore || liveScore.sport !== 'Football' || match?.status !== 'in_progress') {
      // console.log('⏹️ Timer not running - conditions not met');
      return;
    }

    // Don't run timer if paused, on break, or match completed
    if (liveScore?.is_paused || liveScore?.is_on_break || liveScore?.match_complete || match?.status === 'completed') {
      // console.log('⏸️ Timer STOPPED - is_paused:', liveScore?.is_paused, 'is_on_break:', liveScore?.is_on_break, 'match_complete:', liveScore?.match_complete);
      return;
    }

    // Don't start timer until localTimer is initialized
    if (!localTimer) {
      // console.log('⏳ Waiting for timer initialization...');
      return;
    }

    // console.log('▶️ Timer RUNNING - starting from:', localTimer);

    // Update local timer every second (only when NOT paused)
    const timerInterval = setInterval(() => {
      setLocalTimer(prevTimer => {
        if (!prevTimer) return '00:00';
        
        const [minutes, seconds] = prevTimer.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds + 1;
        const newMinutes = Math.floor(totalSeconds / 60);
        const newSeconds = totalSeconds % 60;
        
        return `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [liveScore?.is_paused, liveScore?.is_on_break, liveScore?.match_complete, match?.status, liveScore?.sport, localTimer]);

  // Trigger blink animation when deuce happens
  useEffect(() => {
    if (!liveScore) return;

    const matchStructure = liveScore?.match_structure;
    const currentGameIndex = (liveScore?.current_game || liveScore?.current_set || 1) - 1;
    
    // Determine which scores field to use based on match structure
    let scoresField;
    if (matchStructure === 'game_based') {
      scoresField = 'game_scores';
    } else if (matchStructure === 'set_based') {
      scoresField = 'set_scores';
    } else {
      // For time-based sports, no deuce logic
      return;
    }
    
    const p1Score = liveScore?.participant1?.[scoresField]?.[currentGameIndex] || 0;
    const p2Score = liveScore?.participant2?.[scoresField]?.[currentGameIndex] || 0;
    const isCurrentlyTied = p1Score === p2Score;
    
    // Only blink if deuce count > 0 AND scores are currently tied
    if (liveScore?.current_game_deuce_count > 0 && isCurrentlyTied) {
      setIsDeuceBlinking(true);
      const timer = setTimeout(() => setIsDeuceBlinking(false), 3000); // Blink for 3 seconds
      return () => clearTimeout(timer);
    } else {
      // Turn off blinking immediately if deuce count is 0 or scores are not tied
      setIsDeuceBlinking(false);
    }
  }, [liveScore?.current_game_deuce_count, liveScore?.participant1, liveScore?.participant2, liveScore?.match_structure]);

  // Trigger celebration animation when a player wins a game/set
  useEffect(() => {
    if (!liveScore) return;

    const p1GamesWon = liveScore.participant1?.games_won || liveScore.participant1?.sets_won || 0;
    const p2GamesWon = liveScore.participant2?.games_won || liveScore.participant2?.sets_won || 0;

    // Initialize on first render only
    if (!isInitializedRef.current) {
      prevGamesWonRef.current.p1 = p1GamesWon;
      prevGamesWonRef.current.p2 = p2GamesWon;
      isInitializedRef.current = true;
      return;
    }

    // Handle UNDO case - if games_won decreased, update ref without animation
    if (p1GamesWon < prevGamesWonRef.current.p1) {
      prevGamesWonRef.current.p1 = p1GamesWon;
    }
    if (p2GamesWon < prevGamesWonRef.current.p2) {
      prevGamesWonRef.current.p2 = p2GamesWon;
    }

    // Check if participant1 won a game/set (increased)
    if (p1GamesWon > prevGamesWonRef.current.p1) {
      setCelebratingPlayer('participant1');
      const timer = setTimeout(() => setCelebratingPlayer(null), 2000); // Celebrate for 2 seconds
      prevGamesWonRef.current.p1 = p1GamesWon;
      return () => clearTimeout(timer);
    }

    // Check if participant2 won a game/set (increased)
    if (p2GamesWon > prevGamesWonRef.current.p2) {
      setCelebratingPlayer('participant2');
      const timer = setTimeout(() => setCelebratingPlayer(null), 2000); // Celebrate for 2 seconds
      prevGamesWonRef.current.p2 = p2GamesWon;
      return () => clearTimeout(timer);
    }
  }, [liveScore?.participant1?.games_won, liveScore?.participant1?.sets_won, liveScore?.participant2?.games_won, liveScore?.participant2?.sets_won]);

  const fetchLiveScoreOnly = async () => {
    try {
      const liveScoreRes = await api.get(`/matches/${matchId}/live-score`);
      const freshLiveScore = liveScoreRes.data.data;
      setLiveScore(freshLiveScore);
      // console.log('🔄 Synced live score from API');
    } catch (error) {
      console.error('Failed to sync live score:', error);
    }
  };

  const fetchEventsOnly = async () => {
    try {
      const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
      setEvents(eventsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchMatchData = useCallback(async () => {
    // Prevent concurrent calls
    if (fetchInProgress.current) {
      // console.log('⚠️ Fetch already in progress, skipping...');
      return;
    }

    try {
      fetchInProgress.current = true;
      // console.log('📥 Fetching match data for matchId:', matchId);
      const res = await api.get(`/matches/${matchId}/details`);
      // console.log('✅ Match data received:', res.data);
      
      // Extract data from response
      const matchData = res.data.data || res.data;
      
      // Redirect to history if match is completed
      if (matchData.status === 'completed') {
        // console.log('✅ Match is completed, redirecting to history page...');
        navigate(`/matches/${matchId}/history?tab=${tabParam}`, { replace: true });
        return;
      }
      
      // Only update match state if status or key data changed
      setMatch(prevMatch => {
        if (!prevMatch || 
            prevMatch.status !== matchData.status || 
            prevMatch.match_date !== matchData.match_date ||
            prevMatch.id !== matchData.id) {
          // console.log('📝 Match data changed, updating state');
          return matchData;
        }
        // console.log('✅ Match data unchanged, keeping previous state');
        return prevMatch;
      });
      
      // Parse live_score if it's a string
      let parsedLiveScore = matchData.live_score;
      if (typeof parsedLiveScore === 'string') {
        try {
          parsedLiveScore = JSON.parse(parsedLiveScore);
        } catch (e) {
          console.error('Failed to parse live_score:', e);
        }
      }
      
      // For in-progress matches, fetch fresh live score to get latest timer
      if (matchData.status === 'in_progress') {
        try {
          const liveScoreRes = await api.get(`/matches/${matchId}/live-score`);
          const freshLiveScore = liveScoreRes.data.data;
          setLiveScore(freshLiveScore);
          // console.log('Fresh live score:', freshLiveScore);
        } catch (liveScoreError) {
          console.error('Failed to fetch live score:', liveScoreError);
          setLiveScore(parsedLiveScore);
        }
        
        // Fetch events
        try {
          const eventsRes = await api.get(`/matches/${matchId}/events?limit=20`);
          setEvents(eventsRes.data.data || []);
        } catch (eventsError) {
          console.error('Failed to fetch events:', eventsError);
        }
      } else {
        setLiveScore(parsedLiveScore);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch match:', error);
      setLoading(false);
    } finally {
      fetchInProgress.current = false;
    }
  }, [matchId, navigate]);

  const connectWebSocket = () => {
    // console.log('🔌 Creating WebSocket connection...');
    const newSocket = io(`${import.meta.env.VITE_API_URL}/scoring`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      // console.log('✅ Connected to scoring WebSocket (Socket ID:', newSocket.id, ')');
      // console.log('📡 Joining match room:', matchId);
      newSocket.matchId = matchId; // Store matchId on socket for cleanup
      newSocket.emit('join_match', matchId);
    });

    newSocket.on('reconnect', () => {
      // console.log('🔄 Reconnected to WebSocket - syncing match data');
      fetchLiveScoreOnly(); // Sync data after reconnection
    });

    newSocket.on('joined_match', (data) => {
      // console.log('✅ Joined match room:', data);
      
      // Request viewer count after joining
      newSocket.emit('request_viewer_count', matchId);
      
      // Don't fetch data here - initial fetchMatchData already handles it
      // This prevents duplicate API calls on WebSocket join
    });

    newSocket.on('viewer_count', (data) => {
      // console.log('Viewer count:', data);
      setViewers(data.count || 0);
    });

    newSocket.on('match_update', async (data) => {
      // console.log('🔔 Match update received:---', data);
      
      // Convert matchId to string for comparison
      if (String(data.matchId) !== String(matchId)) {
        return; // Not for this match
      }
      
      // Handle timer updates separately
      if (data.eventType === 'timer_update') {
        // console.log('⏱️ Timer update received:', data.data);
        
        if (data.data?.liveScore) {
          setLiveScore(data.data.liveScore);
          
          // If half changed or timer reset, sync immediately
          if (data.data.half_changed || data.data.liveScore.elapsed_seconds === 0) {
            // console.log('🔄 Half changed or timer reset - syncing timer');
            // Force re-initialization of local timer
            setLocalTimer(data.data.liveScore.match_time);
          }
        }
        return; // Don't fetch events for timer updates
      }
      
      // Update live score from WebSocket event (goals, cards, etc.)
      if (data.data?.liveScore) {
        setLiveScore(data.data.liveScore);
        // console.log('✅ Live score updated from WebSocket:', data.data.liveScore);
      } else if (data.data?.live_score) {
        setLiveScore(data.data.live_score);
        // console.log('✅ Live score updated from WebSocket:', data.data.live_score);
      }
      
      // If there's a new event, refresh events from API (to get full player names)
      if (data.eventType || data.data?.event) {
        // console.log('📝 Refreshing events after:', data.eventType);
        try {
          await fetchEventsOnly();
          // console.log('✅ Events refreshed from API');
        } catch (error) {
          console.error('Failed to refresh events:', error);
        }
      }
    });

    newSocket.on('match_started', (data) => {
      // console.log('🚀 Match started event received:', data);
      
      // Update match status immediately
      setMatch(prev => ({
        ...prev,
        status: 'in_progress'
      }));
      
      // Set initial live score
      if (data.liveState) {
        setLiveScore(data.liveState);
        // console.log('✅ Match started - live score initialized:', data.liveState);
      }
      
      // Fetch events only (no need to fetch full match data, WebSocket provides it)
      fetchEventsOnly();
    });

    newSocket.on('match_paused', (data) => {
      // console.log('🔴 Match paused event received:', data);
      setLiveScore(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.is_paused = true;
        if (data.data?.live_score?.match_time) {
          updated.match_time = data.data.live_score.match_time;
        }
        // console.log('Updated liveScore with is_paused=true:', updated);
        return updated;
      });
    });

    newSocket.on('match_resumed', (data) => {
      // console.log('▶️ Match resumed event received:', data);
      setLiveScore(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.is_paused = false;
        if (data.data?.live_score?.match_time) {
          updated.match_time = data.data.live_score.match_time;
        }
        // console.log('Updated liveScore with is_paused=false:', updated);
        return updated;
      });
    });

    newSocket.on('penalty_shootout_start', (data) => {
      // console.log('⚽ Penalty shootout started:', data);
      
      // Update live score with penalty shootout data
      if (data.data?.liveScore) {
        setLiveScore(data.data.liveScore);
        // console.log('✅ Penalty shootout initialized:', data.data.liveScore);
      }
      
      // No alert on public scoreboard - penalty score shows directly
    });

    newSocket.on('match_completed', (data) => {
      // console.log('🏆 Match completed event received:', data);
      
      // Update live score with completion data
      if (data.liveScore) {
        setLiveScore(data.liveScore);
      }
      
      // Update match status
      setMatch(prev => ({
        ...prev,
        status: 'completed',
        winner_participant_id: data.winner_participant_id
      }));
      
      // Redirect to history page after a short delay (to show completion animation)
      setTimeout(() => {
        // console.log('✅ Match completed, redirecting to history page...');
        navigate(`/matches/${matchId}/history?tab=${tabParam}`, { replace: true });
      }, 2000); // 2 second delay to show completion message
    });

    newSocket.on('disconnect', () => {
      // console.log('❌ Disconnected from scoring WebSocket');
    });

    newSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    setSocket(newSocket);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading match...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Match not found</div>
      </div>
    );
  }

  const getScoreLabel = () => {
    const sportName = match?.sport_name || liveScore?.sport;
    
    // Time-based sports
    if (sportName === 'Football') {
      return 'Goals';
    }
    
    // Set-based sports (Tennis, Padel, Volleyball)
    if (['Tennis', 'Padel', 'Volleyball'].includes(sportName)) {
      return 'Sets Won';
    }
    
    // Game-based sports (Badminton, Table Tennis, Squash, Pickleball)
    if (['Badminton', 'Table Tennis', 'Squash', 'Pickleball'].includes(sportName)) {
      return 'Games Won';
    }
    
    return 'Score';
  };

  /**
   * Convert numeric points to Tennis/Padel scoring (0, 15, 30, 40, Adv)
   */
  const getTennisScore = (points, opponentPoints, isDeuce) => {
    // During deuce (both at 40 or higher)
    if (isDeuce || (points >= 3 && opponentPoints >= 3)) {
      if (points > opponentPoints) return 'Adv';
      // Both players show "40" when tied or when opponent has advantage
      return '40';
    }
    
    const scoreMap = { 0: '0', 1: '15', 2: '30', 3: '40' };
    return scoreMap[points] || '40';
  };

  /**
   * Get current game/set score for game-based sports and Tennis/Padel
   * Returns the current game points (e.g., 5 in "Game 1: 5-3" or "30" for Tennis)
   */
  const getCurrentGameScore = (side) => {
    const sportName = match?.sport_name || liveScore?.sport;
    
    // For Tennis/Padel, show current game points (0, 15, 30, 40, Adv) or numeric in tiebreak
    if (['Tennis', 'Padel'].includes(sportName)) {
      if (!liveScore) return '0';
      
      const p1Points = liveScore.participant1?.current_game_points || 0;
      const p2Points = liveScore.participant2?.current_game_points || 0;
      const isTiebreak = liveScore.is_tiebreak || false;
      
      if (side === 'participant1') {
        return convertToTennisScore(p1Points, p2Points, isTiebreak);
      } else {
        return convertToTennisScore(p2Points, p1Points, isTiebreak);
      }
    }
    
    // For game-based sports and set-based sports (Badminton, Volleyball), show current game/set points
    if (['Table Tennis', 'Squash', 'Pickleball', 'Volleyball', 'Badminton'].includes(sportName)) {
      if (!liveScore) return 0;
      
      // Get current game/set index (0-based)
      const currentIndex = (liveScore.current_game || liveScore.current_set || 1) - 1;
      
      if (side === 'participant1') {
        const scores = liveScore.participant1?.game_scores || liveScore.participant1?.set_scores || [];
        return scores[currentIndex] || 0;
      } else {
        const scores = liveScore.participant2?.game_scores || liveScore.participant2?.set_scores || [];
        return scores[currentIndex] || 0;
      }
    }
    
    return null;
  };

  const getCurrentLabel = () => {
    // Check for break first
    if (liveScore?.is_on_break) {
      return '⏸️ Half-Time Break';
    }
    
    const sportName = match?.sport_name || liveScore?.sport;
    
    // For Tennis/Padel, show "Set X, Game Y" format
    if (['Tennis', 'Padel'].includes(sportName) && liveScore?.current_set) {
      const currentSet = liveScore.current_set;
      const gamesInSet = liveScore.participant1?.games?.[currentSet - 1] || 0;
      return `Set ${currentSet}`;
    }
    
    if (liveScore?.current_game) return `Game ${liveScore.current_game}`;
    if (liveScore?.current_set) return `Set ${liveScore.current_set}`;
    if (liveScore?.current_half) {
      if (liveScore.current_half === 1) return 'First Half';
      if (liveScore.current_half === 2) return 'Second Half';
      return `Half ${liveScore.current_half}`;
    }
    if (liveScore?.current_period) return `Period ${liveScore.current_period}`;
    return 'In Progress';
  };

  const getParticipantName = (side) => {
    const details = side === 'participant1' ? match.participant1_details : match.participant2_details;
    
    // Singles: user object
    if (details?.user) {
      return `${details.user.first_name} ${details.user.last_name}`;
    }
    
    // Doubles: Use pair name if available, otherwise show player names
    if (details?.player1 && details?.player2) {
      // Return pair name (backend sends this in details.name for pairs)
      return details.name || `${details.player1.first_name} ${details.player1.last_name} / ${details.player2.first_name} ${details.player2.last_name}`;
    }
    
    // Teams: team name or name property
    if (details?.team) {
      return details.team.name;
    }
    
    if (details?.name) {
      return details.name;
    }
    
    // Use participant names from match object (fallback)
    if (side === 'participant1' && match.participant1_name) {
      return match.participant1_name;
    }
    if (side === 'participant2' && match.participant2_name) {
      return match.participant2_name;
    }
    
    return side === 'participant1' ? 'Player 1' : 'Player 2';
  };

  const getPlayerNames = (side) => {
    const details = side === 'participant1' ? match.participant1_details : match.participant2_details;
    if (!details || !details.player1 || !details.player2) return null;
    return `${details.player1.first_name} ${details.player1.last_name} / ${details.player2.first_name} ${details.player2.last_name}`;
  };

  const getParticipantDetails = (side) => {
    const details = side === 'participant1' ? match.participant1_details : match.participant2_details;
    
    // Singles - User
    if (details?.user) {
      return (
        <div className="font-bold text-xl">
          {details.user.first_name} {details.user.last_name}
        </div>
      );
    }
    
    // Doubles - Pair (check if specific player is serving)
    if (details?.player1 && details?.player2) {
      const servingPlayerId = liveScore?.serving_player_id;
      const isThisSideServing = liveScore?.server === side;
      
      // If this side is serving and we have a specific player ID
      if (isThisSideServing && servingPlayerId) {
        const player1Id = details.player1?.id;
        const player2Id = details.player2?.id;
        
        if (servingPlayerId === player1Id) {
          // Show Player 1 name prominently
          return (
            <div className="text-center">
              <div className="font-bold text-lg text-black-100">
                {details.player1.first_name} {details.player1.last_name} / {details.player2.first_name} {details.player2.last_name}
              </div>
            </div>
          );
        } else if (servingPlayerId === player2Id) {
          // Show Player 2 name prominently
          return (
            <div className="text-center">
              <div className="font-bold text-lg text-black-100">
                {details.player1.first_name} {details.player1.last_name} / {details.player2.first_name} {details.player2.last_name}
              </div>
            </div>
          );
        }
      }
      
      // Default: Show both players
      return (
        <div className="text-center">
          <div className="font-bold text-lg text-black-100">
            {details.player1.first_name} {details.player1.last_name} / {details.player2.first_name} {details.player2.last_name}
          </div>
        </div>
      );
    }
    
    // Doubles - Pair (old format)
    if (details?.pair) {
      return (
        <div className="text-center">
          <div className="font-bold text-xl mb-1">{details.pair.player1_name}</div>
          <div className="font-bold text-xl">{details.pair.player2_name}</div>
        </div>
      );
    }
    
    // Teams
    if (details?.team) {
      return (
        <div className="font-bold text-xl">
          {details.team.name}
        </div>
      );
    }
    
    // Use participant names from match object (for Football teams)
    const participantName = side === 'participant1' ? match.participant1_name : match.participant2_name;
    if (participantName) {
      return (
        <div className="font-bold text-xl">
          {participantName}
        </div>
      );
    }
    
    // Fallback
    return (
      <div className="font-bold text-xl">
        {side === 'participant1' ? 'Player 1' : 'Player 2'}
      </div>
    );
  };

  // Extract YouTube video ID from URL
  const getYouTubeEmbedUrl = () => {
    // Use match_live_link from match data (added by admin)
    const liveStreamUrl = match?.match_live_link;
    
    if (liveStreamUrl) {
      // Check if URL is already an embed URL
      if (liveStreamUrl.includes('/embed/')) {
        // Extract video ID and rebuild with our parameters
        const videoId = extractYouTubeId(liveStreamUrl);
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
        }
        // If extraction fails, use the URL as-is but add our parameters
        return liveStreamUrl.split('?')[0] + '?autoplay=1&mute=1';
      }
      
      // Handle regular YouTube URLs (watch, youtu.be, etc.)
      const videoId = extractYouTubeId(liveStreamUrl);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
      }
    }
    
    // Return null if no valid URL
    return null;
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://youtu.be/VIDEO_ID?si=XXXXX
    // https://www.youtube.com/embed/VIDEO_ID
    
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  /**
   * Check if participant is serving
   */
  const isServing = (participantSide) => {
    if (!liveScore) return false;
    
    // For Volleyball: Use current_server (auto-switches on point)
    if (match?.sport_name === 'Volleyball' || liveScore?.sport === 'Volleyball') {
      return (liveScore.current_server || liveScore.server) === participantSide;
    }
    
    // For other sports: Check serving_player, serving_team, or server
    return liveScore.serving_player === participantSide || 
           liveScore.serving_team === participantSide || 
           liveScore.server === participantSide;
  };

  /**
   * Get serving player name for display in badge
   */
  const getServingPlayerName = (participantSide) => {
    const details = participantSide === 'participant1' ? match.participant1_details : match.participant2_details;
    
    // Check if doubles with specific player selected
    if (details?.player1 && details?.player2) {
      const servingPlayerId = liveScore?.serving_player_id;
      
      if (servingPlayerId) {
        const player1Id = details.player1?.id;
        const player2Id = details.player2?.id;
        
        if (servingPlayerId === player1Id) {
          return `${details.player1.first_name} ${details.player1.last_name}`;
        } else if (servingPlayerId === player2Id) {
          return `${details.player2.first_name} ${details.player2.last_name}`;
        }
      }
    }
    
    // Default: just say "Serving"
    return null;
  };

  /**
   * Check if in deuce state (Tennis/Padel only)
   */
  const isInDeuce = () => {
    const sportName = match?.sport_name || liveScore?.sport;
    if (!liveScore || !['Tennis', 'Padel'].includes(sportName)) return false;
    const p1Points = liveScore.participant1?.current_game_points || 0;
    const p2Points = liveScore.participant2?.current_game_points || 0;
    return p1Points >= 3 && p2Points >= 3 && p1Points === p2Points;
  };

  /**
   * Get deuce count (how many times deuce occurred in current game)
   * Uses backend-tracked count that persists throughout the game
   */
  const getDeuceCount = () => {
    const sportName = match?.sport_name || liveScore?.sport;
    if (!liveScore || !['Tennis', 'Padel'].includes(sportName)) return 0;
    // Use backend-tracked deuce count (increments each time deuce is reached)
    return liveScore.current_game_deuce_count || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{match.tournament_name || 'Live Match'}</h1>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('default')}
                  className={`px-4 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-2 ${
                    viewMode === 'default'
                      ? 'bg-white text-primary-500 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Minimize2 className="w-4 h-4" />
                  Default View
                </button>
                <button
                  onClick={() => setViewMode('broadcast')}
                  className={`px-4 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-2 ${
                    viewMode === 'broadcast'
                      ? 'bg-white text-primary-500 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Maximize2 className="w-4 h-4" />
                  Broadcast View
                </button>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span>{viewers} watching</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span>{match.sport_name || 'Sport'} • {match.category || 'Category'}</span>
          </div>
        </div>

        {/* BROADCAST VIEW MODE - Cricket Style */}
        {viewMode === 'broadcast' && match.status === 'in_progress' && getYouTubeEmbedUrl() && (
          <div className="relative bg-black rounded-xl shadow-2xl overflow-hidden mb-6">
            {/* Large Video */}
            <div className="relative h-[600px]">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={getYouTubeEmbedUrl()}
                title="Live Match Stream"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            
            {/* Compact Score Overlay at Bottom - Cricket Style */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent backdrop-blur-sm">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Left: Participant 1 */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-white">
                      <div className="text-sm font-semibold opacity-80">{getParticipantName('participant1')}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-4xl font-black">
                          {getCurrentGameScore('participant1') !== null 
                            ? getCurrentGameScore('participant1')
                            : (liveScore?.participant1?.games_won || liveScore?.participant1?.sets_won || liveScore?.participant1?.goals || 0)
                          }
                        </div>
                        {getCurrentGameScore('participant1') !== null && (
                          <div className="text-sm bg-white/20 px-2 py-1 rounded">
                            {getScoreLabel()}: {liveScore?.participant1?.games_won || liveScore?.participant1?.sets_won || 0}
                          </div>
                        )}
                      </div>
                    </div>
                    {isServing('participant1') && (
                      <div className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
                        {getServingIcon(match?.sport_name || liveScore?.sport)} SERVING
                      </div>
                    )}
                  </div>

                  {/* Center: Match Info */}
                  <div className="text-center px-6">
                    <div className="flex items-center gap-2 justify-center mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-white text-xs font-bold">LIVE</span>
                    </div>
                    {match.round_name && (
                      <div className="text-white/70 text-xs">{match.round_name}</div>
                    )}
                    {liveScore && liveScore.is_tiebreak && (
                      <div className="text-orange-400 text-xs font-bold mt-1">TIEBREAK</div>
                    )}
                  </div>

                  {/* Right: Participant 2 */}
                  <div className="flex items-center gap-4 flex-1 justify-end">
                    {isServing('participant2') && (
                      <div className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
                        {getServingIcon(match?.sport_name || liveScore?.sport)} SERVING
                      </div>
                    )}
                    <div className="text-white text-right">
                      <div className="text-sm font-semibold opacity-80">{getParticipantName('participant2')}</div>
                      <div className="flex items-center gap-2 mt-1 justify-end">
                        {getCurrentGameScore('participant2') !== null && (
                          <div className="text-sm bg-white/20 px-2 py-1 rounded">
                            {getScoreLabel()}: {liveScore?.participant2?.games_won || liveScore?.participant2?.sets_won || 0}
                          </div>
                        )}
                        <div className="text-4xl font-black">
                          {getCurrentGameScore('participant2') !== null 
                            ? getCurrentGameScore('participant2')
                            : (liveScore?.participant2?.games_won || liveScore?.participant2?.sets_won || liveScore?.participant2?.goals || 0)
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEFAULT VIEW MODE - Original Layout */}
        {viewMode === 'default' && (
          <>
            {/* Live Stream Video */}
            {match.status === 'in_progress' && getYouTubeEmbedUrl() && (
              <div className="bg-black rounded-xl shadow-lg overflow-hidden mb-6">
                <div className="relative h-[400px]">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={getYouTubeEmbedUrl()}
                    title="Live Match Stream"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">LIVE STREAM</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Match Status Banner */}
        {(match.status === 'completed' || liveScore?.match_complete) && (
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white p-6 rounded-xl shadow-lg mb-6 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-3" />
            <h2 className="text-3xl font-bold">Match Complete!</h2>
            <p className="text-xl mt-2">
              Winner: {getParticipantName(liveScore?.match_winner || 'participant1')}
            </p>
          </div>
        )}

        {/* Live Score - Modern Design (Only in Default View) */}
        {viewMode === 'default' && (
        <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden mb-6 transition-all ${
          isDeuceBlinking ? 'ring-4 ring-yellow-400 ring-opacity-75 animate-pulse' : ''
        }`}>
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  {match.status === 'in_progress' ? (
                    <>
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-white font-bold text-sm">LIVE</span>
                    </>
                  ) : (
                    <span className="text-white font-bold text-sm">{(match.status || 'PENDING').toUpperCase()}</span>
                  )}
                </div>
                {match.round_name && (
                  <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {match.round_name}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {liveScore && liveScore.is_tiebreak && (
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg">
                    🎾 TIEBREAK
                  </div>
                )}
                {getDeuceCount() > 0 && (
                  <div className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    {isInDeuce() ? 'DEUCE' : 'DEUCES'} ({getDeuceCount()})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Score Label */}
          <div className="text-center py-3 bg-slate-800/50">
            <div className="text-sm font-semibold text-primary-400 uppercase tracking-wider">{getScoreLabel()}</div>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-center gap-8 px-8 py-10">
            {/* Participant 1 */}
            <div className={`text-center flex-1 transition-all duration-500 ${
              (liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant1'
                ? 'scale-105'
                : celebratingPlayer === 'participant1'
                ? 'scale-110 animate-bounce ring-4 ring-green-400 ring-opacity-75 rounded-xl bg-green-100/10'
                : ''
            }`}>
              {/* Show current game score for game-based sports */}
              {getCurrentGameScore('participant1') !== null ? (
                <>
                  {/* BIG NUMBER: Current Game Points */}
                  <div className={`text-8xl font-black mb-3 ${
                    (liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant1'
                      ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)] animate-pulse'
                      : 'text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  }`}>
                    {getCurrentGameScore('participant1')}
                    {celebratingPlayer === 'participant1' && (
                      <span className="ml-4 text-5xl animate-bounce"></span>
                    )}
                  </div>
                  {/* SMALL TEXT: Games/Sets Won */}
                  <div className="text-sm font-semibold text-primary-400 mb-3 bg-slate-800/50 inline-block px-4 py-1 rounded-full">
                    {getScoreLabel()}: {liveScore?.participant1?.games_won || liveScore?.participant1?.sets_won || 0}
                  </div>
                </>
              ) : (
                <div className={`text-8xl font-black mb-4 ${
                  (liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant1'
                    ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)] animate-pulse'
                    : 'text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                }`}>
                  {liveScore?.participant1?.games_won || liveScore?.participant1?.sets_won || liveScore?.participant1?.goals || 0}
                  {liveScore?.is_penalty_shootout && liveScore?.penalty_shootout && (
                    <span className="text-5xl">({liveScore.penalty_shootout.participant1_scored})</span>
                  )}
                  {celebratingPlayer === 'participant1' && (
                    <span className="ml-4 text-5xl animate-bounce"></span>
                  )}
                </div>
              )}
              <div className="min-h-[100px] flex flex-col items-center justify-center">
                <div className="text-white">{getParticipantDetails('participant1')}</div>
                {/* Serving Indicator - Fixed space */}
                <div className="h-10 mt-3 flex items-center justify-center">
                  {isServing('participant1') && (() => {
                    const playerName = getServingPlayerName('participant1');
                    return (
                      <div className="flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg animate-pulse">
                        <span className="text-base">{getServingIcon(match?.sport_name || liveScore?.sport)}</span>
                        <span>SERVING</span>
                        {playerName && <span className="text-xs">({playerName})</span>}
                      </div>
                    );
                  })()}
                </div>
              </div>
              {(liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant1' && (
                <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 px-6 py-3 rounded-full text-lg font-black shadow-xl animate-bounce">
                  <Trophy className="w-6 h-6" />
                  WINNER!
                </div>
              )}
            </div>
            
            {/* Center - VS or Timer for Football or Countdown for Scheduled */}
            <div className="text-center px-6">
              {match.status === 'scheduled' && countdownTimer ? (
                <div className="flex flex-col items-center">
                  <div className="text-6xl font-black text-white/30 mb-3">VS</div>
                  <div className="px-8 py-4 rounded-2xl shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-2 border-blue-400/30">
                    <div className="text-3xl font-black font-mono">{countdownTimer}</div>
                  </div>
                </div>
              ) : (match?.sport_name === 'Football' || liveScore?.sport === 'Football') && (liveScore?.match_time || localTimer) ? (
                (() => {
                  const isTimeBased = (match?.sport_name === 'Football' || liveScore?.sport === 'Football');
                  return (
                    <div className="flex flex-col items-center">
                      <div className="text-6xl font-black text-white/30 mb-3">VS</div>
                      {isTimeBased ? (
                    <div className="flex flex-col items-center gap-3">
                      {/* Timer Display - HIDE during Extra Time Break */}
                      {liveScore?.is_extra_time && liveScore?.is_on_break ? (
                        // Extra Time Break - Show only orange break box (no timer)
                        <div className="px-6 py-3 rounded-xl border-2 shadow-lg backdrop-blur-sm bg-gradient-to-br from-yellow-600 to-orange-600 border-yellow-400/30 text-white">
                          <div className="text-lg font-bold">
                            ⏸️ Extra Time Break
                          </div>
                        </div>
                      ) : (
                        // Regular timer display
                        <div className={`px-8 py-6 rounded-2xl border-4 shadow-2xl backdrop-blur-sm ${
                          liveScore?.is_penalty_shootout
                            ? 'bg-gradient-to-br from-orange-500 to-red-600 border-orange-400/30'
                            : liveScore?.is_overtime
                            ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-400/30 animate-pulse'
                            : liveScore?.is_on_break 
                            ? 'bg-gradient-to-br from-yellow-600 to-orange-600 border-yellow-400/30'
                            : 'bg-gradient-to-br from-primary-500 to-primary-600 border-primary-400/30'
                        } text-white`}>
                          <div className="text-3xl font-black font-mono">
                            {liveScore?.is_penalty_shootout 
                              ? 'PKs' 
                              : liveScore?.is_on_break && breakTimer && !liveScore?.is_extra_time
                                ? breakTimer // Show break countdown for regular break only
                                : (localTimer || liveScore?.match_time)}
                          </div>
                          <div className="text-xs mt-2 font-semibold opacity-90">
                            {liveScore?.is_overtime ? '🔴 EXTRA TIME' : liveScore?.is_on_break ? '⏸️ BREAK' : liveScore?.is_paused ? '⏸️ PAUSED' : getCurrentLabel()}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-6xl font-black text-white/30">VS</div>
                      
                      {/* Deuce Count for Table Tennis, Pickleball, Squash, Badminton & Volleyball */}
                      {(['Table Tennis', 'Pickleball', 'Squash', 'Badminton', 'Volleyball'].includes(match?.sport_name)) && liveScore?.current_game_deuce_count > 0 && (
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-2xl animate-pulse border-2 border-orange-300/30">
                          🔥 DEUCE x{liveScore.current_game_deuce_count}
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-6xl font-black text-white/30">VS</div>
                  
                  {/* Deuce Count for Table Tennis, Pickleball, Squash, Badminton & Volleyball */}
                  {(['Table Tennis', 'Pickleball', 'Squash', 'Badminton', 'Volleyball'].includes(match?.sport_name)) && liveScore?.current_game_deuce_count > 0 && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-2xl animate-pulse border-2 border-orange-300/30">
                      🔥 DEUCE x{liveScore.current_game_deuce_count}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Participant 2 */}
            <div className={`text-center flex-1 transition-all duration-500 ${
              (liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant2'
                ? 'scale-105'
                : celebratingPlayer === 'participant2'
                ? 'scale-110 animate-bounce ring-4 ring-green-400 ring-opacity-75 rounded-xl bg-green-100/10'
                : ''
            }`}>
              {/* Show current game score for game-based sports */}
              {getCurrentGameScore('participant2') !== null ? (
                <>
                  {/* BIG NUMBER: Current Game Points */}
                  <div className={`text-8xl font-black mb-3 ${
                    (liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant2'
                      ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)] animate-pulse'
                      : 'text-white drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]'
                  }`}>
                    {getCurrentGameScore('participant2')}
                    {celebratingPlayer === 'participant2' && (
                      <span className="ml-4 text-5xl animate-bounce"></span>
                    )}
                  </div>
                  {/* SMALL TEXT: Games/Sets Won */}
                  <div className="text-sm font-semibold text-teal-400 mb-3 bg-slate-800/50 inline-block px-4 py-1 rounded-full">
                    {getScoreLabel()}: {liveScore?.participant2?.games_won || liveScore?.participant2?.sets_won || 0}
                  </div>
                </>
              ) : (
                <div className={`text-8xl font-black mb-4 ${
                  (liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant2'
                    ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)] animate-pulse'
                    : 'text-white drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]'
                }`}>
                  {liveScore?.participant2?.games_won || liveScore?.participant2?.sets_won || liveScore?.participant2?.goals || 0}
                  {liveScore?.is_penalty_shootout && liveScore?.penalty_shootout && (
                    <span className="text-5xl">({liveScore.penalty_shootout.participant2_scored})</span>
                  )}
                  {celebratingPlayer === 'participant2' && (
                    <span className="ml-4 text-5xl animate-bounce"></span>
                  )}
                </div>
              )}
              <div className="min-h-[100px] flex flex-col items-center justify-center">
                <div className="text-white">{getParticipantDetails('participant2')}</div>
                {/* Serving Indicator - Fixed space */}
                <div className="h-10 mt-3 flex items-center justify-center">
                  {isServing('participant2') && (() => {
                    const playerName = getServingPlayerName('participant2');
                    return (
                      <div className="flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg animate-pulse">
                        <span className="text-base">{getServingIcon(match?.sport_name || liveScore?.sport)}</span>
                        <span>SERVING</span>
                        {playerName && <span className="text-xs">({playerName})</span>}
                      </div>
                    );
                  })()}
                </div>
              </div>
              {(liveScore?.match_complete || match?.status === 'completed') && liveScore?.match_winner === 'participant2' && (
                <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 px-6 py-3 rounded-full text-lg font-black shadow-xl animate-bounce">
                  <Trophy className="w-6 h-6" />
                  WINNER!
                </div>
              )}
            </div>
          </div>

          {/* Penalty Shootout Display */}
          {liveScore?.is_penalty_shootout && liveScore?.penalty_shootout && (
            <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-400 shadow-lg">
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
                  <div className="mt-6 bg-white rounded-xl border border-gray-200/80 p-4 md:p-6 shadow-inner">
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
                              {getParticipantName('participant1') || 'Team A'}
                            </th>
                            <th className="text-center font-semibold pb-2 w-2/12">Round</th>
                            <th className="text-right font-semibold pb-2 w-5/12">
                              {getParticipantName('participant2') || 'Team B'}
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
                      Points Played: {liveScore.tiebreak_total_points || 0}
                    </p>
                  </div>
                  <span className="text-3xl">🎾</span>
                </div>
              </div>

              {/* Change Ends Notification - For Spectators */}
              {liveScore.tiebreak_total_points > 0 && liveScore.tiebreak_total_points % 6 === 0 && (
                <div className="bg-orange-100 border-2 border-orange-500 rounded-lg p-4 mb-4 shadow-lg animate-pulse">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl">🔄</span>
                    <div className="text-center">
                      <p className="text-orange-900 font-bold text-lg tracking-wide">
                        PLAYERS CHANGING ENDS
                      </p>
                      <p className="text-orange-700 text-sm mt-1">
                        {liveScore.tiebreak_total_points} points played - Time to switch sides
                      </p>
                    </div>
                    <span className="text-3xl">🔄</span>
                  </div>
                </div>
              )}

              {/* Serve Information - For Spectators */}
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">ℹ️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 text-sm">
                      Tiebreak Serve Rotation:
                    </p>
                    <p className="text-blue-700 text-xs mt-1">
                      {liveScore.tiebreak_total_points === 0 
                        ? "First server will serve 1 point, then players alternate every 2 points"
                        : liveScore.tiebreak_total_points === 1
                          ? "Server will change after this point"
                          : liveScore.tiebreak_total_points % 2 === 1
                            ? "Server will change after this point"
                            : "Current server serves 2 points"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Current Game/Set/Half Score - For Non-Football Sports */}
          {liveScore && match.status === 'in_progress' && match?.sport_name !== 'Football' && liveScore?.sport !== 'Football' && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Current</p>
                  <p className="font-bold text-gray-900">{getCurrentLabel()}</p>
                </div>
                
                {/* Game-based sports */}
                {liveScore.participant1?.game_scores && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Current Game</p>
                    <p className="font-bold text-gray-900">
                      {liveScore.participant1.game_scores[(liveScore.current_game || 1) - 1] || 0} - {liveScore.participant2.game_scores[(liveScore.current_game || 1) - 1] || 0}
                    </p>
                  </div>
                )}
                
                {/* Set-based sports */}
                {liveScore.participant1?.set_scores && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Current Set</p>
                    <p className="font-bold text-gray-900">
                      {liveScore.participant1.set_scores[(liveScore.current_set || 1) - 1] || 0} - {liveScore.participant2.set_scores[(liveScore.current_set || 1) - 1] || 0}
                    </p>
                  </div>
                )}
                
                {/* Tennis/Padel - Current Game Points (15-30-40 format or numeric in tiebreak) */}
                {liveScore.participant1?.current_game_points !== undefined && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">
                      {liveScore.is_tiebreak ? 'Tiebreak Points' : 'Game Points'}
                    </p>
                    <p className="font-bold text-gray-900">
                      {convertToTennisScore(liveScore.participant1.current_game_points, liveScore.participant2.current_game_points, liveScore.is_tiebreak)} - {convertToTennisScore(liveScore.participant2.current_game_points, liveScore.participant1.current_game_points, liveScore.is_tiebreak)}
                    </p>
                  </div>
                )}
                
                {/* Tennis - Games in Current Set */}
                {liveScore.participant1?.games && liveScore.current_set && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Games (Set {liveScore.current_set})</p>
                    <p className="font-bold text-gray-900">
                      {liveScore.participant1.games[liveScore.current_set - 1] || 0} - {liveScore.participant2.games[liveScore.current_set - 1] || 0}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game/Set History - For Set/Game-based Sports */}
          {liveScore && match?.sport_name !== 'Football' && liveScore?.sport !== 'Football' && (
            (liveScore.participant1?.game_scores?.length > 0 || 
             liveScore.participant1?.set_scores?.length > 0 || 
             liveScore.participant1?.games?.length > 0) && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  {liveScore.participant1?.game_scores ? 'Game History' : 
                   liveScore.participant1?.games ? 'Set History' : 'Set History'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* For Tennis/Padel - Show games per set */}
                  {liveScore.participant1?.games && liveScore.participant1.games.map((gamesWon, index) => {
                    const participant2Games = liveScore.participant2?.games?.[index] || 0;
                    const isCurrentSet = liveScore.current_set === (index + 1);
                    
                    return (
                      <button
                        key={index}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          isCurrentSet
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Set {index + 1}: {gamesWon}-{participant2Games}
                      </button>
                    );
                  })}
                  
                  {/* For other sports - Show game/set scores */}
                  {!liveScore.participant1?.games && (liveScore.participant1?.game_scores || liveScore.participant1?.set_scores)?.map((score, index) => {
                    const participant2Score = liveScore.participant2?.game_scores?.[index] || liveScore.participant2?.set_scores?.[index] || 0;
                    const isCurrentGame = (liveScore.current_game || liveScore.current_set) === (index + 1);
                    const label = liveScore.participant1?.game_scores ? 'Game' : 'Set';
                    
                    return (
                      <button
                        key={index}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          isCurrentGame
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label} {index + 1}: {score}-{participant2Score}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
        )}

        {/* Football: Events + Timing Summary Side by Side */}
        {(match?.sport_name === 'Football' || liveScore?.sport === 'Football') && events.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-6">
            {/* Match Events - 70% */}
            <div className="lg:col-span-7 bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Match Events</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {events.filter(event => event.event_type !== 'game_won' && event.event_type !== 'set_won').map((event, idx) => {
                const teamName = event.participant_side === 'participant1' 
                  ? getParticipantName('participant1')
                  : getParticipantName('participant2');
                
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
                      // Fallback if message not generated
                      eventIcon = '🎯';
                      eventColor = 'bg-primary-50 border-l-4 border-primary-500';
                      eventDescription = event.player_name 
                        ? `${event.player_name} scored a point`
                        : 'Point scored';
                    }
                  }
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
                              // Get the time value from available fields
                              const timeValue = event.match_time || event.score_snapshot?.match_time || event.minute;
                              
                              if (!timeValue) return 'N/A';
                              
                              // If it's already in minute format (e.g., "1'", "15'"), return as is
                              if (typeof timeValue === 'string' && timeValue.includes("'")) {
                                return timeValue;
                              }
                              
                              // If it's in MM:SS format (e.g., "15:23"), extract minutes
                              if (typeof timeValue === 'string' && timeValue.includes(':')) {
                                const minutes = timeValue.split(':')[0];
                                return `${parseInt(minutes)}'`;
                              }
                              
                              // If it's a number, treat as minutes
                              if (typeof timeValue === 'number') {
                                return `${timeValue}'`;
                              }
                              
                              // Fallback: return as is
                              return timeValue;
                            })()}
                          </div>
                          {event.score_snapshot && (
                            <div className="text-xs text-gray-500 mt-1">
                              {event.score_snapshot.participant1?.goals !== undefined 
                                ? (() => {
                                    const p1Goals = event.score_snapshot.participant1.goals;
                                    const p2Goals = event.score_snapshot.participant2.goals;
                                    const p1Penalties = event.score_snapshot.penalty_shootout?.participant1_scored;
                                    const p2Penalties = event.score_snapshot.penalty_shootout?.participant2_scored;
                                    
                                    // If penalty shootout data exists, show format: 2(3) - 2(1)
                                    if (p1Penalties !== undefined && p2Penalties !== undefined) {
                                      return `${p1Goals}(${p1Penalties}) - ${p2Goals}(${p2Penalties})`;
                                    }
                                    
                                    // Otherwise show regular score
                                    return `${p1Goals}-${p2Goals}`;
                                  })()
                                : event.score_snapshot.participant1?.games_won !== undefined
                                ? `${event.score_snapshot.participant1.games_won}-${event.score_snapshot.participant2.games_won}`
                                : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Timing Summary - 30% */}
            <div className="lg:col-span-3">
              <TimingSummary liveScore={liveScore} />
            </div>
          </div>
        )}

        {/* Non-Football: Events Only */}
        {match?.sport_name !== 'Football' && liveScore?.sport !== 'Football' && events.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Match Events</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {events.filter(event => event.event_type !== 'game_won' && event.event_type !== 'set_won').map((event, idx) => {
                const teamName = event.participant_side === 'participant1' 
                  ? getParticipantName('participant1')
                  : getParticipantName('participant2');
                
                let eventIcon = '⚡';
                let eventColor = 'bg-gray-50 border-l-4 border-gray-400';
                let eventDescription = '';
                
                // Handle point events with excitement
                if (event.event_type === 'point') {
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
                      // Fallback if message not generated
                      eventIcon = '🎯';
                      eventColor = 'bg-primary-50 border-l-4 border-primary-500';
                      const playerName = event.player_name || teamName;
                      eventDescription = playerName ? `${playerName} scored a point` : 'Point scored';
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
                } else if (event.event_type === 'match_start') {
                  // Use exciting message from backend notes field
                  eventDescription = event.notes || 'Match Started';
                } else if (event.event_type === 'server_selection') {
                  // Use message from backend notes field
                  eventDescription = event.notes || `${teamName} selected to serve first`;
                } else if (event.event_type === 'side_change') {
                  // Use message from backend notes field
                  eventDescription = event.notes || 'Sides changed! Players swapped positions on the court';
                } else if (event.event_type === 'half_1_end') {
                  eventDescription = 'First Half Ended';
                } else if (event.event_type === 'half_2_start') {
                  eventDescription = 'Second Half Started';
                } else if (event.event_type === 'half_2_end') {
                  eventDescription = 'Second Half Ended';
                } else if (event.event_type === 'break_start') {
                  eventDescription = 'Break Time Started';
                } else if (event.event_type === 'break_end') {
                  eventDescription = 'Break Time Ended';
                } else if (event.event_type === 'match_complete') {
                  eventDescription = 'Match Completed';
                } else {
                  eventDescription = event.event_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Event';
                }
                
                return (
                  <div key={idx} className={`p-3 rounded ${eventColor}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{eventIcon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{eventDescription}</div>
                          <div className="text-sm text-gray-600 mt-1">{teamName}</div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-bold text-gray-700">
                          {(() => {
                            const snapshot = event.score_snapshot;
                            const matchStructure = snapshot?.match_structure;
                            
                            // For Tennis/Padel: show set number only
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
                            if (event.match_time) {
                              return event.match_time;  
                            }
                            if (event.minute) {
                              return event.minute;
                            }
                            
                            return 'N/A';
                          })()}
                        </div>
                        {event.score_snapshot && (
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const snapshot = event.score_snapshot;
                              // Use the current set/game from the snapshot itself (not from event)
                              const snapshotCurrentSet = snapshot.current_set || 1;
                              const snapshotCurrentGame = snapshot.current_game || 1;
                              const currentSetIndex = snapshotCurrentSet - 1;
                              const currentGameIndex = snapshotCurrentGame - 1;
                              
                              // For Tennis/Padel - Use tennis_score from metadata if available
                              if (event.metadata?.tennis_score) {
                                return event.metadata.tennis_score;
                              }
                              
                              // Fallback: Calculate from snapshot for Tennis/Padel
                              if (snapshot.participant1?.current_game_points !== undefined && snapshot.participant2?.current_game_points !== undefined) {
                                const p1Points = snapshot.participant1.current_game_points;
                                const p2Points = snapshot.participant2.current_game_points;
                                const isTiebreak = snapshot.is_tiebreak || false;
                                
                                // Convert to Tennis format
                                const p1Display = convertToTennisScore(p1Points, p2Points, isTiebreak);
                                const p2Display = convertToTennisScore(p2Points, p1Points, isTiebreak);
                                
                                return `${p1Display}-${p2Display}`;
                              }
                              
                              // For game-based sports (Table Tennis, Squash, Pickleball)
                              if (snapshot.participant1?.game_scores && snapshot.participant1.game_scores[currentGameIndex] !== undefined) {
                                const p1Score = snapshot.participant1.game_scores[currentGameIndex];
                                const p2Score = snapshot.participant2.game_scores[currentGameIndex];
                                return `${p1Score}-${p2Score}`;
                              }
                              
                              // For set-based sports (Badminton, Volleyball)
                              if (snapshot.participant1?.set_scores && snapshot.participant1.set_scores[currentSetIndex] !== undefined) {
                                const p1Score = snapshot.participant1.set_scores[currentSetIndex];
                                const p2Score = snapshot.participant2.set_scores[currentSetIndex];
                                return `${p1Score}-${p2Score}`;
                              }
                              
                              // Fallback: show games/sets won
                              if (snapshot.participant1?.games_won !== undefined) {
                                return `${snapshot.participant1.games_won}-${snapshot.participant2.games_won}`;
                              }
                              
                              if (snapshot.participant1?.sets_won !== undefined) {
                                return `${snapshot.participant1.sets_won}-${snapshot.participant2.sets_won}`;
                              }
                              
                              return '';
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Match Info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">Match Information</h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Tournament Details */}
            <div>
              <p className="text-gray-500 text-sm mb-1">Tournament</p>
              <p className="font-semibold text-gray-900">{match.tournament_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm mb-1">Round</p>
              <p className="font-semibold text-gray-900">{match.round_name || `Round ${match.round_number || 'N/A'}`}</p>
            </div>
            
            {/* Sport & Category */}
            <div>
              <p className="text-gray-500 text-sm mb-1">Sport</p>
              <p className="font-semibold text-gray-900">{match.sport_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm mb-1">Category</p>
              <p className="font-semibold text-gray-900 capitalize">{match.category || match.tournament_category || 'N/A'}</p>
            </div>
            
            {/* Venue & Court */}
            {match.venue_name && (
              <div>
                <p className="text-gray-500 text-sm mb-1">Venue</p>
                <p className="font-semibold text-gray-900">{match.venue_name}</p>
              </div>
            )}
            {match.court_name && (
              <div>
                <p className="text-gray-500 text-sm mb-1">Court</p>
                <p className="font-semibold text-gray-900">{match.court_name}</p>
              </div>
            )}
            
            {/* Date & Time */}
            <div>
              <p className="text-gray-500 text-sm mb-1">Date</p>
              <p className="font-semibold text-gray-900">
                {match.match_date ? new Date(match.match_date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }) : 'TBD'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm mb-1">Time</p>
              <p className="font-semibold text-gray-900">{match.match_time || 'TBD'}</p>
            </div>
            
            {/* Match officials */}
            {(match.referee_name || match.referee_first_name) && (
              <div className="col-span-2 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                <p className="text-purple-700 text-sm mb-1 font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Match Officials
                </p>
                <p className="font-bold text-purple-900 text-lg">
                  {match.referee_name || `${match.referee_first_name} ${match.referee_last_name}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Match Timing Display - NEW! */}
        <MatchTimingDisplay matchId={matchId} />
        
        {/* Squad Display for Team Sports */}
        {match?.tournament_category === 'teams' && (
          <SquadDisplay matchId={matchId} showTitle={true} />
        )}
      </div>
    </div>
  );
};

export default LiveMatchView;

/**
 * Match Scoring Service
 * Handles all live match scoring operations
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');
const { getScoringCalculator } = require('../utils/scoringCalculators');
const { getCalculator } = require('../utils/scoreCalculators'); // NEW: Class-based calculators
const { broadcastMatchUpdate, broadcastMatchCompleted } = require('../websocket/scoringSocket');
const matchService = require('./matchService');
const matchPlayerStatusService = require('./matchPlayerStatusService');

/**
 * Format duration in seconds to HH:MM:SS
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Convert ISO 8601 datetime to MySQL datetime format
 * @param {string} isoDateTime - ISO 8601 datetime string (e.g., '2025-12-18T05:59:39.450Z')
 * @returns {string} MySQL datetime format (e.g., '2025-12-18 05:59:39')
 * 
 * IMPORTANT TIMEZONE NOTE:
 * - Local Dev: Stores IST (UTC+05:30) time in database
 * - Live/Production: Stores UTC time in database
 * 
 * This function converts ISO datetime to MySQL format but preserves the UTC time.
 * The database server's timezone setting determines how it's stored:
 * - If DB timezone = IST: Will store as IST
 * - If DB timezone = UTC: Will store as UTC
 * 
 * Example:
 * Input:  '2025-12-18T05:59:39.450Z' (UTC)
 * Output: '2025-12-18 05:59:39' (MySQL format, timezone depends on DB server)
 */
const toMySQLDateTime = (isoDateTime) => {
  if (!isoDateTime) return null;
  const date = new Date(isoDateTime);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Calculate and update total match duration from segment timings
 * @param {number} matchId - Match ID
 * @returns {Promise<{total_duration_seconds: number, total_duration_formatted: string}>}
 */
const calculateAndUpdateTotalDuration = async (matchId) => {
  try {
    // Get all segment timings for this match
    const segments = await query(
      `SELECT duration_seconds FROM match_segment_timings WHERE match_id = ?`,
      [matchId]
    );
    
    // Calculate total duration by summing all segment durations
    let totalSeconds = segments.reduce((sum, seg) => sum + (seg.duration_seconds || 0), 0);
    
    // ✅ FALLBACK: If no segments or total is 0, calculate from actual start/end times
    if (totalSeconds === 0) {
      const [match] = await query(
        `SELECT actual_start_time, actual_end_time FROM matches WHERE id = ?`,
        [matchId]
      );
      
      if (match && match.actual_start_time && match.actual_end_time) {
        const startTime = new Date(match.actual_start_time);
        const endTime = new Date(match.actual_end_time);
        totalSeconds = Math.floor((endTime - startTime) / 1000);
        logger.info(`⚠️ No segment durations found, calculated from actual times: ${totalSeconds}s`);
      }
    }
    
    const totalFormatted = formatDuration(totalSeconds);
    
    // Update match with total duration
    await query(
      `UPDATE matches 
       SET total_duration_seconds = ?,
           total_duration_formatted = ?
       WHERE id = ?`,
      [totalSeconds, totalFormatted, matchId]
    );
    
    logger.info(`✅ Updated total duration for match ${matchId}: ${totalFormatted} (${totalSeconds}s)`);
    
    return { total_duration_seconds: totalSeconds, total_duration_formatted: totalFormatted };
  } catch (error) {
    logger.error(`❌ Error calculating total duration for match ${matchId}:`, error);
    return { total_duration_seconds: 0, total_duration_formatted: '00:00:00' };
  }
};

/**
 * Convert minute input to display format
 * Accepts either:
 * - Plain number: "1", "2", "45" → "1'", "2'", "45'"
 * - MM:SS format: "0:03", "1:20" → "1'", "2'" (for backward compatibility)
 * 
 * Examples:
 * - "1" → "1'"
 * - "2" → "2'"
 * - "45" → "45'"
 * - "0:03" → "1'" (legacy format)
 * - "1:20" → "2'" (legacy format)
 */
const convertToRoundedMinute = (input) => {
  if (!input) return 1; // Default to 1st minute
  
  const inputStr = String(input).trim();
  
  // Check if it's MM:SS format (contains colon)
  if (inputStr.includes(':')) {
    const parts = inputStr.split(':');
    const minutes = parseInt(parts[0]) || 0;
    // For MM:SS format: 0:00-0:59 → minute 1, 1:00-1:59 → minute 2
    return minutes + 1;
  }
  
  // Plain number format - use as is
  const minute = parseInt(inputStr) || 1;
  return minute;
};

/**
 * Format match time for event display (Football notation)
 * Examples:
 * - "12:30" → "12'" (regular time)
 * - "45:30" (when period is 45 min) → "45+1'" (overtime)
 * - "47:00" → "47'" (extra time)
 */
const formatEventTime = (matchTime, liveScore) => {
  if (!matchTime) return "0'";
  
  // Parse MM:SS format
  const parts = matchTime.split(':');
  const minutes = parseInt(parts[0]) || 0;
  const seconds = parseInt(parts[1]) || 0;
  
  // Get period duration (default 45 for football)
  const periodDuration = liveScore?.period_duration || 45;
  
  // Check if in overtime (minutes exceed period duration)
  if (minutes >= periodDuration && liveScore?.is_overtime) {
    const overtimeMinutes = Math.floor((minutes - periodDuration) + (seconds / 60));
    return `${periodDuration}+${overtimeMinutes}'`;
  }
  
  // Regular time - just show minutes (round up if seconds > 30)
  const displayMinutes = seconds >= 30 ? minutes + 1 : minutes;
  return `${displayMinutes}'`;
};

/**
 * Initialize live score based on sport
 */
const initializeLiveScore = async (matchId, sportId) => {
  try {
    // Get sport details
    const sportSql = `SELECT name, scoring_system FROM sports WHERE id = ?`;
    const [sport] = await query(sportSql, [sportId]);
    
    if (!sport) {
      throw new Error('Sport not found');
    }
    
    let liveScore = {};
    
    switch (sport.name) {
      case 'Tennis':
      case 'Padel':
        liveScore = {
          sport: sport.name, // 'Tennis' or 'Padel'
          match_structure: 'set_based', // Add match structure for consistency
          current_set: 1,
          current_game: 1,
          participant1: {
            sets_won: 0,
            games: [0],
            current_game_points: 0,
            total_points: 0
          },
          participant2: {
            sets_won: 0,
            games: [0],
            current_game_points: 0,
            total_points: 0
          },
          is_deuce: false,
          is_tiebreak: false,
          server: 'participant1',
          serving_player: 'participant1' // For frontend compatibility
        };
        break;
        
      case 'Volleyball':
        liveScore = {
          sport: 'Volleyball',
          current_set: 1,
          current_server: 'participant1', // Track who is serving
          participant1: {
            sets_won: 0,
            set_scores: [0],
            total_points: 0,
            current_server_position: 1 // Position 1-6 (clockwise rotation)
          },
          participant2: {
            sets_won: 0,
            set_scores: [0],
            total_points: 0,
            current_server_position: 1 // Position 1-6 (clockwise rotation)
          },
          server: 'participant1', // Keep for backward compatibility
          timeouts_left: {
            participant1: 2,
            participant2: 2
          }
        };
        break;
        
      case 'Football':
        // Get match config for period duration (from tournament OR standalone match)
        const matchConfigSql = `
          SELECT COALESCE(t.match_config, m.match_config) as match_config
          FROM matches m
          LEFT JOIN tournaments t ON m.tournament_id = t.id
          WHERE m.id = ?
        `;
        const [matchConfigRow] = await query(matchConfigSql, [matchId]);
        let matchConfig = { periods: 2, period_duration: 45 }; // defaults
        
        logger.info('📋 Match config from database:', matchConfigRow?.match_config);
        
        if (matchConfigRow && matchConfigRow.match_config) {
          try {
            const config = typeof matchConfigRow.match_config === 'string' 
              ? JSON.parse(matchConfigRow.match_config) 
              : matchConfigRow.match_config;
            
            // Ensure we have the period_duration field
            if (config && typeof config === 'object') {
              matchConfig = config;
              logger.info('✅ Parsed match config:', JSON.stringify(matchConfig));
              logger.info('📊 Config has period_duration?', config.period_duration !== undefined);
            } else {
              logger.warn('⚠️ Invalid match config format:', config);
            }
          } catch (e) {
            logger.warn('Failed to parse match config, using defaults:', e.message);
          }
        } else {
          logger.warn('⚠️ No match config found in tournament, using defaults');
        }
        
        // Explicitly check for period_duration and break_duration
        const periodDuration = matchConfig.period_duration !== undefined 
          ? matchConfig.period_duration 
          : 45;
        
        const breakDuration = matchConfig.break_duration !== undefined
          ? matchConfig.break_duration
          : 15;
        
        logger.info(`⏱️ Final period duration: ${periodDuration} minutes (from config: ${matchConfig.period_duration})`);
        logger.info(`⏸️ Final break duration: ${breakDuration} minutes (from config: ${matchConfig.break_duration})`);
        
        liveScore = {
          sport: 'Football',
          current_half: 1,
          current_period: 1, // Keep for backward compatibility
          match_time: '00:00',
          elapsed_seconds: 0,
          period_duration: periodDuration,
          break_duration: breakDuration,
          periods: matchConfig.periods || 2,
          participant1: {
            goals: 0,
            yellow_cards: 0,
            red_cards: 0
          },
          participant2: {
            goals: 0,
            yellow_cards: 0,
            red_cards: 0
          },
          is_injury_time: false,
          injury_time_minutes: 0,
          match_started_at: new Date().toISOString()
        };
        break;
        
      case 'Badminton':
        // Badminton uses GAME-BASED structure (Best of 3 games, 21 points per game)
        liveScore = {
          sport: 'Badminton',
          match_structure: 'game_based',
          current_game: 1,
          participant1: {
            games_won: 0,
            game_scores: [0],
            total_points: 0
          },
          participant2: {
            games_won: 0,
            game_scores: [0],
            total_points: 0
          },
          server: 'participant1',
          serving_player: 'participant1', // For frontend compatibility
          first_server: 'participant1' // Track who served first
        };
        break;
        
      case 'Pickleball':
        // Pickleball uses GAME-BASED structure (Best of 3 games, 11 points per game)
        liveScore = {
          sport: 'Pickleball',
          match_structure: 'game_based',
          current_game: 1,
          participant1: {
            games_won: 0,
            game_scores: [0],
            total_points: 0
          },
          participant2: {
            games_won: 0,
            game_scores: [0],
            total_points: 0
          },
          server: 'participant1',
          serving_player: 'participant1' // For frontend compatibility
        };
        break;
        
      case 'Table Tennis':
      case 'Squash':
        liveScore = {
          sport: sport.name,
          match_structure: 'game_based',
          current_game: 1,
          participant1: {
            games_won: 0,
            game_scores: [0],
            total_points: 0
          },
          participant2: {
            games_won: 0,
            game_scores: [0],
            total_points: 0
          },
          server: 'participant1',
          serving_player: 'participant1', // For frontend compatibility
          first_server: 'participant1' // Track who served first for correct serve rotation
        };
        break;
        
      default:
        liveScore = {
          sport: sport.name,
          participant1: { score: 0 },
          participant2: { score: 0 }
        };
    }
    
    return liveScore;
  } catch (error) {
    logger.error('Initialize live score error:', error);
    throw error;
  }
};

/**
 * Start match
 * @param {string} firstServer - Optional: 'participant1' or 'participant2' (who serves first)
 */
const startMatch = async (matchId, refereeId, io = null, firstServer = null) => {
  console.log(":dev=====",matchId, refereeId);
  
  try {
    // Verify match exists and referee is assigned (supports both tournament and standalone matches)
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        s.name as sport_name,
        m.is_standalone
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ? AND m.referee_id = ?
    `;
    
    const [match] = await query(matchSql, [matchId, refereeId]);
    console.log("match",match);
    
    if (!match) {
      throw new Error('Match not found or referee not assigned');
    }

    if (!match.participant1_id || !match.participant2_id) {
      throw new Error('Cannot start match: both participants must be assigned');
    }
    
    if (!['scheduled', 'ready', 'pending'].includes(match.status)) {
      throw new Error(`Cannot start match with status: ${match.status}`);
    }
    
    // Initialize live score
    const liveScore = await initializeLiveScore(matchId, match.sport_id);
    
    // Set first server if provided (for non-Football sports)
    if (firstServer && (firstServer === 'participant1' || firstServer === 'participant2')) {
      liveScore.server = firstServer;
      liveScore.serving_player = firstServer;
      liveScore.current_server = firstServer;
      liveScore.first_server = firstServer; // Store for serve rotation logic (Table Tennis, etc.)
      logger.info(`🎾 First server set to: ${firstServer}`);
    }
    
    // Update match status
    const updateSql = `
      UPDATE matches 
      SET status = 'in_progress',
          actual_start_time = NOW(),
          live_score = ?,
          current_set = 1,
          is_paused = FALSE
      WHERE id = ?
    `;
    
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Note: Player status is already initialized when squads are set
    // No need to initialize here
    
    // Get participant names for exciting messages (supports both tournament and standalone matches)
    const getParticipantNamesSql = `
      SELECT 
        COALESCE(m.category, t.category) as match_category,
        m.is_standalone,
        -- Teams
        p1_team.name as p1_team_name,
        p2_team.name as p2_team_name,
        -- Singles (users)
        p1_user.first_name as p1_first_name,
        p1_user.last_name as p1_last_name,
        p2_user.first_name as p2_first_name,
        p2_user.last_name as p2_last_name,
        -- Doubles (pairs)
        p1_pair.name as p1_pair_name,
        p2_pair.name as p2_pair_name
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN teams p1_team ON m.participant1_id = p1_team.id AND COALESCE(m.category, t.category) = 'teams'
      LEFT JOIN teams p2_team ON m.participant2_id = p2_team.id AND COALESCE(m.category, t.category) = 'teams'
      LEFT JOIN users p1_user ON m.participant1_id = p1_user.id AND COALESCE(m.category, t.category) = 'singles'
      LEFT JOIN users p2_user ON m.participant2_id = p2_user.id AND COALESCE(m.category, t.category) = 'singles'
      LEFT JOIN pairs p1_pair ON m.participant1_id = p1_pair.id AND COALESCE(m.category, t.category) = 'doubles'
      LEFT JOIN pairs p2_pair ON m.participant2_id = p2_pair.id AND COALESCE(m.category, t.category) = 'doubles'
      WHERE m.id = ?
    `;
    const [participantData] = await query(getParticipantNamesSql, [matchId]);
    
    let participant1Name = 'Participant 1';
    let participant2Name = 'Participant 2';
    
    if (participantData) {
      const category = participantData.match_category;
      
      if (category === 'teams') {
        participant1Name = participantData.p1_team_name || 'Team 1';
        participant2Name = participantData.p2_team_name || 'Team 2';
      } else if (category === 'singles') {
        participant1Name = `${participantData.p1_first_name || ''} ${participantData.p1_last_name || ''}`.trim() || 'Player 1';
        participant2Name = `${participantData.p2_first_name || ''} ${participantData.p2_last_name || ''}`.trim() || 'Player 2';
      } else if (category === 'doubles') {
        participant1Name = participantData.p1_pair_name || 'Pair 1';
        participant2Name = participantData.p2_pair_name || 'Pair 2';
      }
    }
    
    // Exciting match start messages
    const matchStartMessages = [
      `🎯 Game On! ${participant1Name} vs ${participant2Name} - Let the battle begin!`,
      `⚡ Match is Live! ${participant1Name} takes on ${participant2Name}!`,
      `🔥 It's time! ${participant1Name} vs ${participant2Name} - May the best win!`,
      `🏆 The match begins! ${participant1Name} faces ${participant2Name}!`,
      `⚔️ Battle starts now! ${participant1Name} vs ${participant2Name}!`,
      `🎪 Showtime! ${participant1Name} vs ${participant2Name} - Here we go!`,
      `💪 Let's go! ${participant1Name} vs ${participant2Name} - Match is on!`,
      `🌟 The action begins! ${participant1Name} vs ${participant2Name}!`
    ];
    
    const randomMatchStartMessage = matchStartMessages[Math.floor(Math.random() * matchStartMessages.length)];
    
    // Create match start event
    await recordEvent(matchId, {
      event_type: 'match_start',
      participant_side: 'participant1',
      score_snapshot: liveScore,
      match_time: liveScore.sport === 'Football' ? '00:00' : null,
      event_order: 1,
      notes: randomMatchStartMessage
    });
    
    // Create server selection event if firstServer was provided
    if (firstServer && (firstServer === 'participant1' || firstServer === 'participant2')) {
      const serverName = firstServer === 'participant1' ? participant1Name : participant2Name;
      await recordEvent(matchId, {
        event_type: 'server_selection',
        participant_side: firstServer,
        score_snapshot: liveScore,
        match_time: liveScore.sport === 'Football' ? '00:00' : null,
        notes: `${serverName} will serve first`
      }, io);
      logger.info(`🎾 Server selection event recorded for ${firstServer}`);
    }
    
    logger.info(`Match ${matchId} started by referee ${refereeId}`);
    
    // Broadcast match_started event via WebSocket
    if (io) {
      const room = `match_${matchId}`;
      io.of('/scoring').to(room).emit('match_started', {
        matchId,
        liveState: liveScore,
        timestamp: new Date().toISOString()
      });
      logger.info(`🚀 Broadcasted match_started event to room: ${room}`);
      
      // Start server-side timer for Football matches
      if (liveScore.sport === 'Football') {
        const matchTimerService = require('./matchTimerService');
        matchTimerService.startMatchTimer(matchId, io);
        logger.info(`⏱️ Server-side timer started for match ${matchId}`);
      }
    }
    
    return {
      success: true,
      message: 'Match started successfully',
      live_score: liveScore
    };
  } catch (error) {
    logger.error('Start match error:', error);
    throw error;
  }
};

/**
 * Pause match
 */
const pauseMatch = async (matchId, refereeId, reason = null, io = null) => {
  try {
    const updateSql = `
      UPDATE matches 
      SET is_paused = TRUE,
          pause_reason = ?
      WHERE id = ? AND referee_id = ?
    `;
    
    await query(updateSql, [reason, matchId, refereeId]);
    
    // Get updated live score
    const matchSql = 'SELECT live_score FROM matches WHERE id = ?';
    const [match] = await query(matchSql, [matchId]);
    
    let liveScore = match.live_score;
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    liveScore.is_paused = true;
    
    // Update live_score in database with is_paused flag
    await query(
      'UPDATE matches SET live_score = ? WHERE id = ?',
      [JSON.stringify(liveScore), matchId]
    );
    
    logger.info(`Match ${matchId} paused by referee ${refereeId}`);
    
    // Broadcast pause event via WebSocket
    if (io) {
      const room = `match_${matchId}`;
      io.of('/scoring').to(room).emit('match_paused', {
        matchId,
        data: { live_score: liveScore },
        timestamp: new Date()
      });
      logger.info(`Broadcasted match_paused event to room: ${room}`);
    }
    
    return { success: true, message: 'Match paused', live_score: liveScore };
  } catch (error) {
    logger.error('Pause match error:', error);
    throw error;
  }
};

/**
 * Resume match
 */
const resumeMatch = async (matchId, refereeId, io = null) => {
  try {
    const updateSql = `
      UPDATE matches 
      SET is_paused = FALSE,
          pause_reason = NULL
      WHERE id = ? AND referee_id = ?
    `;
    
    await query(updateSql, [matchId, refereeId]);
    
    // Get updated live score
    const matchSql = 'SELECT live_score FROM matches WHERE id = ?';
    const [match] = await query(matchSql, [matchId]);
    
    let liveScore = match.live_score;
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    liveScore.is_paused = false;
    
    // Update live_score in database with is_paused flag
    await query(
      'UPDATE matches SET live_score = ? WHERE id = ?',
      [JSON.stringify(liveScore), matchId]
    );
    
    logger.info(`Match ${matchId} resumed by referee ${refereeId}`);
    
    // Broadcast resume event via WebSocket
    if (io) {
      const room = `match_${matchId}`;
      io.of('/scoring').to(room).emit('match_resumed', {
        matchId,
        data: { live_score: liveScore },
        timestamp: new Date()
      });
      logger.info(`Broadcasted match_resumed event to room: ${room}`);
    }
    
    return { success: true, message: 'Match resumed', live_score: liveScore };
  } catch (error) {
    logger.error('Resume match error:', error);
    throw error;
  }
};

/**
 * Add point to match
 */
const addPoint = async (matchId, refereeId, participantSide, eventType = 'point', playerId = null, io = null) => {
  try {
    // Get current match with tournament or standalone config
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        COALESCE(m.match_config, t.match_config) as match_config,
        s.name as sport_name,
        m.is_standalone
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ? AND m.referee_id = ?
    `;
    
    const [match] = await query(matchSql, [matchId, refereeId]);
    
    if (!match) {
      throw new Error('Match not found or referee not assigned');
    }
    
    if (match.status !== 'in_progress') {
      throw new Error('Match is not in progress');
    }
    
    // Get current live score
    let liveScore;
    if (match.live_score) {
      try {
        // Check if it's already an object (MySQL JSON type returns object)
        if (typeof match.live_score === 'object') {
          liveScore = match.live_score;
        } else if (typeof match.live_score === 'string') {
          liveScore = JSON.parse(match.live_score);
        } else {
          throw new Error('Invalid live_score type');
        }
      } catch (error) {
        logger.error('Failed to parse live_score, reinitializing:', error);
        liveScore = await initializeLiveScore(matchId, match.sport_id);
      }
    } else {
      // If no live_score exists, initialize it
      logger.warn(`Match ${matchId} has no live_score, initializing...`);
      liveScore = await initializeLiveScore(matchId, match.sport_id);
      
      // Save the initialized score
      const saveSql = `UPDATE matches SET live_score = ? WHERE id = ?`;
      await query(saveSql, [JSON.stringify(liveScore), matchId]);
    }
    
    // Parse match config from tournament
    let matchConfig = null;
    if (match.match_config) {
      try {
        matchConfig = typeof match.match_config === 'string' 
          ? JSON.parse(match.match_config) 
          : match.match_config;
      } catch (error) {
        logger.warn('Failed to parse match_config:', error);
      }
    }
    
    // Get scoring calculator (use old system - now fixed for Tennis/Padel)
    const calculator = getScoringCalculator(match.sport_name);
    
    if (!calculator) {
      throw new Error(`No scoring calculator for sport: ${match.sport_name}`);
    }
    
    // Track previous state to detect game/set completion
    const prevGamesWon = {
      participant1: liveScore.participant1?.games_won || liveScore.participant1?.sets_won || 0,
      participant2: liveScore.participant2?.games_won || liveScore.participant2?.sets_won || 0
    };
    const prevCurrentGame = liveScore.current_game || liveScore.current_set || 1;
    
    // For Tennis/Padel - track games in current set
    let prevTennisGames = null;
    if (['Tennis', 'Padel'].includes(match.sport_name) && liveScore.participant1?.games) {
      const currentSetIndex = (liveScore.current_set || 1) - 1;
      prevTennisGames = {
        participant1: liveScore.participant1.games[currentSetIndex] || 0,
        participant2: liveScore.participant2.games[currentSetIndex] || 0
      };
    }
    
    // Save score BEFORE adding point (to capture final score of completed game/set)
    const scoreBeforePoint = JSON.parse(JSON.stringify(liveScore));
    
    // Add point using calculator with match config and sport name
    if (calculator.addPoint) {
      liveScore = calculator.addPoint(liveScore, participantSide, matchConfig, match.sport_name);
    } else if (match.sport_name === 'Football' && eventType === 'goal') {
      liveScore = calculator.addGoal(liveScore, participantSide);
    }
    
    // Detect if a game/set was won
    const newGamesWon = {
      participant1: liveScore.participant1?.games_won || liveScore.participant1?.sets_won || 0,
      participant2: liveScore.participant2?.games_won || liveScore.participant2?.sets_won || 0
    };
    const newCurrentGame = liveScore.current_game || liveScore.current_set || 1;
    
    // For Tennis/Padel - check if games in current set increased
    let tennisGameWon = false;
    let tennisGameWinner = null;
    if (prevTennisGames && liveScore.participant1?.games) {
      const currentSetIndex = (liveScore.current_set || 1) - 1;
      const newTennisGames = {
        participant1: liveScore.participant1.games[currentSetIndex] || 0,
        participant2: liveScore.participant2.games[currentSetIndex] || 0
      };
      
      if (newTennisGames.participant1 > prevTennisGames.participant1) {
        tennisGameWon = true;
        tennisGameWinner = 'participant1';
      } else if (newTennisGames.participant2 > prevTennisGames.participant2) {
        tennisGameWon = true;
        tennisGameWinner = 'participant2';
      }
    }
    
    // Check if games/sets won increased (indicating game/set completion)
    const gameSetWon = (newGamesWon.participant1 > prevGamesWon.participant1) || 
                       (newGamesWon.participant2 > prevGamesWon.participant2) ||
                       tennisGameWon; // Include Tennis game completion
    const winnerSide = newGamesWon.participant1 > prevGamesWon.participant1 ? 'participant1' : 
                       newGamesWon.participant2 > prevGamesWon.participant2 ? 'participant2' :
                       tennisGameWinner; // Use Tennis game winner if applicable
    
    // Check if this point would complete the match (for non-Football sports)
    const requiresConfirmation = ['Badminton', 'Tennis', 'Table Tennis', 'Volleyball', 'Pickleball', 'Padel', 'Squash'].includes(match.sport_name);
    const isMatchEndingPoint = liveScore.match_complete && requiresConfirmation;
    
    // If match would end and requires confirmation, flag it
    if (isMatchEndingPoint) {
      liveScore.awaiting_match_end_confirmation = true;
      liveScore.pending_winner = liveScore.match_winner;
      // Don't mark as complete yet
      liveScore.match_complete = false;
    }
    
    // Get event order
    const eventCountSql = `SELECT COUNT(*) as count FROM match_events WHERE match_id = ?`;
    const [eventCount] = await query(eventCountSql, [matchId]);
    const eventOrder = (eventCount?.count || 0) + 1;
    
    // Generate exciting point expression (stored once in DB)
    const pointExpressions = [
      'Incredible speed!', 'What a shot!', 'Amazing rally!', 'Brilliant play!',
      'Perfect execution!', 'Unstoppable!', 'Quick reflexes!', 'Superb point!',
      'Outstanding!', 'Fantastic!', 'Spectacular rally!', 'Clinical finish!',
      'Lightning fast!', 'Precision shot!', 'Unbelievable!', 'Magnificent!',
      'Ace!', 'Winner!', 'Power play!', 'Skillful shot!'
    ];
    const pointExcitement = pointExpressions[Math.floor(Math.random() * pointExpressions.length)];
    
    // Create metadata with excitement and Tennis-specific score formatting
    const metadata = {
      excitement: pointExcitement
    };
    
    // If this point won a game/set, add that information to metadata
    if (gameSetWon && !liveScore.match_complete) {
      // Determine what was won
      let wonType = 'game';
      
      if (['Tennis', 'Padel'].includes(match.sport_name)) {
        const prevSetsWon = {
          participant1: scoreBeforePoint.participant1?.sets_won || 0,
          participant2: scoreBeforePoint.participant2?.sets_won || 0
        };
        const newSetsWon = {
          participant1: liveScore.participant1?.sets_won || 0,
          participant2: liveScore.participant2?.sets_won || 0
        };
        const isSetWon = (newSetsWon.participant1 > prevSetsWon.participant1) || 
                         (newSetsWon.participant2 > prevSetsWon.participant2);
        wonType = isSetWon ? 'set' : 'game';
      } else if (match.sport_name === 'Volleyball') {
        // Volleyball is set-based
        wonType = 'set';
      }
      // Badminton, Table Tennis, Squash, Pickleball are all game-based, so wonType stays 'game'
      
      // Get the score of the completed game/set
      const completedGameNumber = prevCurrentGame;
      let gameSetScore = '';
      
      // Extract score based on sport - use liveScore which has the final score after the winning point
      if (['Tennis', 'Padel'].includes(match.sport_name)) {
        if (wonType === 'game') {
          // For game win - show games won in current set (e.g., "3-0")
          const currentSet = liveScore.current_set || 1;
          const p1GamesInSet = liveScore.participant1?.games?.[currentSet - 1] || 0;
          const p2GamesInSet = liveScore.participant2?.games?.[currentSet - 1] || 0;
          gameSetScore = `${p1GamesInSet}-${p2GamesInSet}`;
        } else {
          // For set win - show games won in that set (e.g., "6-4")
          const completedSet = liveScore.current_set - 1 || 1; // The set that just completed
          const p1GamesInSet = liveScore.participant1?.games?.[completedSet - 1] || 0;
          const p2GamesInSet = liveScore.participant2?.games?.[completedSet - 1] || 0;
          gameSetScore = `${p1GamesInSet}-${p2GamesInSet}`;
        }
      } else if (match.sport_name === 'Badminton') {
        if (liveScore.participant1?.game_scores && liveScore.participant1.game_scores[completedGameNumber - 1] !== undefined) {
          const p1Score = liveScore.participant1.game_scores[completedGameNumber - 1];
          const p2Score = liveScore.participant2.game_scores[completedGameNumber - 1];
          gameSetScore = `${p1Score}-${p2Score}`;
        }
      } else if (match.sport_name === 'Volleyball') {
        if (liveScore.participant1?.set_scores && liveScore.participant1.set_scores[completedGameNumber - 1] !== undefined) {
          const p1Score = liveScore.participant1.set_scores[completedGameNumber - 1];
          const p2Score = liveScore.participant2.set_scores[completedGameNumber - 1];
          gameSetScore = `${p1Score}-${p2Score}`;
        }
      } else {
        // Generic game-based sports (Table Tennis, Squash, Pickleball)
        const scoresField = liveScore.match_structure === 'game_based' ? 'game_scores' : 
                           (liveScore.match_structure === 'set_based' ? 'set_scores' : null);
        if (scoresField && liveScore.participant1?.[scoresField] && 
            liveScore.participant1[scoresField][completedGameNumber - 1] !== undefined) {
          const p1Score = liveScore.participant1[scoresField][completedGameNumber - 1];
          const p2Score = liveScore.participant2[scoresField][completedGameNumber - 1];
          gameSetScore = `${p1Score}-${p2Score}`;
        }
      }
      
      metadata.won_game_set = true;
      metadata.won_type = wonType;
      metadata.won_number = completedGameNumber;
      metadata.won_score = gameSetScore;
      metadata.winner_side = winnerSide;
    }
    
    // For Tennis/Padel - add formatted score in Tennis notation (0, 15, 30, 40, Deuce, Adv)
    if (['Tennis', 'Padel'].includes(match.sport_name) && liveScore.participant1?.current_game_points !== undefined) {
      const p1Points = liveScore.participant1.current_game_points;
      const p2Points = liveScore.participant2.current_game_points;
      const isTiebreak = liveScore.is_tiebreak || false;
      
      // Convert to Tennis score format
      const convertToTennisScore = (points, opponentPoints, isTiebreak) => {
        if (isTiebreak) return points.toString();
        const scores = ['0', '15', '30', '40'];
        if (points >= 3 && opponentPoints >= 3) {
          if (points === opponentPoints) return 'Deuce';
          else if (points > opponentPoints) return 'Adv';
          else return '40';
        }
        return points < 4 ? scores[points] : '40';
      };
      
      const p1Display = convertToTennisScore(p1Points, p2Points, isTiebreak);
      const p2Display = convertToTennisScore(p2Points, p1Points, isTiebreak);
      metadata.tennis_score = `${p1Display}-${p2Display}`;
      metadata.is_tiebreak = isTiebreak;
    }
    
    // Record event
    const eventSql = `
      INSERT INTO match_events (
        match_id, event_type, participant_side, player_id,
        metadata, score_snapshot, current_set, current_game, event_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(eventSql, [
      matchId,
      eventType,
      participantSide,
      playerId,
      JSON.stringify(metadata),
      JSON.stringify(liveScore),
      liveScore.current_set || 1,
      liveScore.current_game || null,
      eventOrder
    ]);
    
    const eventId = result.insertId;
    
    // If a game/set was won, create an additional game_won/set_won event
    if (gameSetWon && !liveScore.match_complete) {
      const gameSetEventOrder = eventOrder + 1;
      
      // For Tennis/Padel - determine if this is a game won or set won
      let completionEventType = 'game_won';
      let isSetWon = false;
      
      if (['Tennis', 'Padel'].includes(match.sport_name)) {
        // Check if sets_won increased (set completion)
        const prevSetsWon = {
          participant1: scoreBeforePoint.participant1?.sets_won || 0,
          participant2: scoreBeforePoint.participant2?.sets_won || 0
        };
        const newSetsWon = {
          participant1: liveScore.participant1?.sets_won || 0,
          participant2: liveScore.participant2?.sets_won || 0
        };
        
        isSetWon = (newSetsWon.participant1 > prevSetsWon.participant1) || 
                   (newSetsWon.participant2 > prevSetsWon.participant2);
        
        if (isSetWon) {
          completionEventType = 'set_won';
        } else {
          completionEventType = 'game_won'; // Just a game won, not the whole set
        }
      } else if (['Volleyball', 'Badminton'].includes(match.sport_name)) {
        completionEventType = 'set_won';
      }
      
      // Get the score of the completed game/set from scoreBeforePoint (which has the final score with winning point)
      const completedGameNumber = prevCurrentGame;
      let gameSetScore = '';
      
      logger.info(`🔍 Extracting score for ${match.sport_name} - Completed game/set: ${completedGameNumber}`);
      logger.info(`📊 scoreBeforePoint structure:`, {
        match_structure: scoreBeforePoint.match_structure,
        has_game_scores: !!scoreBeforePoint.participant1?.game_scores,
        has_set_scores: !!scoreBeforePoint.participant1?.set_scores,
        has_games: !!scoreBeforePoint.participant1?.games,
        game_scores: scoreBeforePoint.participant1?.game_scores,
        set_scores: scoreBeforePoint.participant1?.set_scores,
        games: scoreBeforePoint.participant1?.games
      });
      
      // For Badminton - check match_structure first
      if (match.sport_name === 'Badminton') {
        // Badminton uses game_scores array (not set_scores) even though it's called "sets"
        if (scoreBeforePoint.participant1?.game_scores && scoreBeforePoint.participant1.game_scores[completedGameNumber - 1] !== undefined) {
          const p1Score = scoreBeforePoint.participant1.game_scores[completedGameNumber - 1];
          const p2Score = scoreBeforePoint.participant2.game_scores[completedGameNumber - 1];
          gameSetScore = `${p1Score}-${p2Score}`;
          logger.info(`✅ Badminton score extracted from game_scores: ${gameSetScore}`);
        }
      }
      // For Volleyball - uses set_scores array
      else if (match.sport_name === 'Volleyball') {
        if (scoreBeforePoint.participant1?.set_scores && scoreBeforePoint.participant1.set_scores[completedGameNumber - 1] !== undefined) {
          const p1Score = scoreBeforePoint.participant1.set_scores[completedGameNumber - 1];
          const p2Score = scoreBeforePoint.participant2.set_scores[completedGameNumber - 1];
          gameSetScore = `${p1Score}-${p2Score}`;
          logger.info(`✅ Volleyball score extracted from set_scores: ${gameSetScore}`);
        }
      }
      // For Tennis/Padel - different logic for game_won vs set_won
      else if (['Tennis', 'Padel'].includes(match.sport_name)) {
        if (completionEventType === 'game_won') {
          // For game_won - show final Tennis score (40-0, 40-30, Adv-40, etc.)
          if (scoreBeforePoint.participant1?.current_game_points !== undefined) {
            const p1Points = scoreBeforePoint.participant1.current_game_points;
            const p2Points = scoreBeforePoint.participant2.current_game_points;
            const isTiebreak = scoreBeforePoint.is_tiebreak || false;
            
            // Convert to Tennis format
            const convertToTennisScore = (points, opponentPoints, isTiebreak) => {
              if (isTiebreak) return points.toString();
              const scores = ['0', '15', '30', '40'];
              if (points >= 3 && opponentPoints >= 3) {
                if (points === opponentPoints) return 'Deuce';
                else if (points > opponentPoints) return 'Adv';
                else return '40';
              }
              return points < 4 ? scores[points] : '40';
            };
            
            const p1Display = convertToTennisScore(p1Points, p2Points, isTiebreak);
            const p2Display = convertToTennisScore(p2Points, p1Points, isTiebreak);
            gameSetScore = `${p1Display}-${p2Display}`;
            logger.info(`✅ Tennis/Padel game_won score: ${gameSetScore}`);
          }
        } else {
          // For set_won - show games won in the set (6-4, 7-5, etc.)
          if (scoreBeforePoint.participant1?.games && scoreBeforePoint.participant1.games[completedGameNumber - 1] !== undefined) {
            const p1Games = scoreBeforePoint.participant1.games[completedGameNumber - 1];
            const p2Games = scoreBeforePoint.participant2.games[completedGameNumber - 1];
            gameSetScore = `${p1Games}-${p2Games}`;
            logger.info(`✅ Tennis/Padel set_won score: ${gameSetScore}`);
          }
        }
      }
      // Generic fallback based on match_structure
      else {
        const scoresField = scoreBeforePoint.match_structure === 'game_based' ? 'game_scores' : 
                           (scoreBeforePoint.match_structure === 'set_based' ? 'set_scores' : null);
        
        if (scoresField && scoreBeforePoint.participant1?.[scoresField] && 
            scoreBeforePoint.participant1[scoresField][completedGameNumber - 1] !== undefined) {
          const p1Score = scoreBeforePoint.participant1[scoresField][completedGameNumber - 1];
          const p2Score = scoreBeforePoint.participant2[scoresField][completedGameNumber - 1];
          gameSetScore = `${p1Score}-${p2Score}`;
          logger.info(`✅ Generic score extracted from ${scoresField}: ${gameSetScore}`);
        }
      }
      
      // Create metadata for game/set won event
      const completionMetadata = {
        completed_game_number: completedGameNumber,
        score: gameSetScore,
        games_won: newGamesWon
      };
      
      // For Tennis/Padel game_won - add current game number in set
      if (['Tennis', 'Padel'].includes(match.sport_name) && completionEventType === 'game_won') {
        const currentSetIndex = (liveScore.current_set || 1) - 1;
        const totalGamesInSet = (liveScore.participant1?.games?.[currentSetIndex] || 0) + 
                                (liveScore.participant2?.games?.[currentSetIndex] || 0);
        completionMetadata.game_in_set = totalGamesInSet; // e.g., Game 1, Game 2, etc.
        completionMetadata.current_set = liveScore.current_set || 1;
      }
      
      // Create game_won/set_won event
      const completionEventSql = `
        INSERT INTO match_events (
          match_id, event_type, participant_side, player_id,
          metadata, score_snapshot, current_set, current_game, event_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await query(completionEventSql, [
        matchId,
        completionEventType,
        winnerSide,
        playerId,
        JSON.stringify(completionMetadata),
        JSON.stringify(liveScore),
        liveScore.current_set || 1,
        liveScore.current_game || null,
        gameSetEventOrder
      ]);
      
      logger.info(`${completionEventType} event created for match ${matchId}: ${winnerSide} won ${completionEventType.replace('_', ' ')} ${completedGameNumber} (${gameSetScore})`);
      
      // Broadcast game/set completion via WebSocket to trigger event refresh
      if (io) {
        broadcastMatchUpdate(io, matchId, completionEventType, {
          live_score: liveScore,
          participant_side: winnerSide,
          game_set_number: completedGameNumber,
          score: gameSetScore
        });
        logger.info(`📡 Broadcasted ${completionEventType} event for match ${matchId}`);
      }
    }
    
    // Fetch complete event details with player names and participant names
    // Handles both tournament matches (via tournament_registrations) and standalone matches (direct user/pair/team IDs)
    const eventDetailsSql = `
      SELECT 
        me.*,
        u.first_name as player_first_name,
        u.last_name as player_last_name,
        m.is_standalone,
        m.category as match_category,
        t.category as tournament_category,
        CASE 
          WHEN me.participant_side = 'participant1' THEN 
            CASE 
              -- Standalone matches: Direct user/pair/team IDs
              WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su1.first_name, ' ', su1.last_name)
              WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp1.name
              WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st1.name
              -- Tournament matches: Via tournament_registrations
              WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(tu1.first_name, ' ', tu1.last_name)
              WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN tp1.name
              WHEN m.is_standalone = 0 AND t.category = 'teams' THEN tt1.name
              ELSE 'Participant 1'
            END
          WHEN me.participant_side = 'participant2' THEN 
            CASE 
              -- Standalone matches: Direct user/pair/team IDs
              WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su2.first_name, ' ', su2.last_name)
              WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp2.name
              WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st2.name
              -- Tournament matches: Via tournament_registrations
              WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(tu2.first_name, ' ', tu2.last_name)
              WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN tp2.name
              WHEN m.is_standalone = 0 AND t.category = 'teams' THEN tt2.name
              ELSE 'Participant 2'
            END
        END as participant_name
      FROM match_events me
      LEFT JOIN users u ON me.player_id = u.id
      LEFT JOIN matches m ON me.match_id = m.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      
      -- Standalone Participant 1 joins (singles)
      LEFT JOIN users su1 ON m.participant1_id = su1.id AND m.is_standalone = 1 AND m.category = 'singles'
      -- Standalone Participant 1 joins (doubles)
      LEFT JOIN pairs sp1 ON m.participant1_id = sp1.id AND m.is_standalone = 1 AND m.category = 'doubles'
      -- Standalone Participant 1 joins (teams)
      LEFT JOIN teams st1 ON m.participant1_id = st1.id AND m.is_standalone = 1 AND m.category = 'teams'
      
      -- Standalone Participant 2 joins (singles)
      LEFT JOIN users su2 ON m.participant2_id = su2.id AND m.is_standalone = 1 AND m.category = 'singles'
      -- Standalone Participant 2 joins (doubles)
      LEFT JOIN pairs sp2 ON m.participant2_id = sp2.id AND m.is_standalone = 1 AND m.category = 'doubles'
      -- Standalone Participant 2 joins (teams)
      LEFT JOIN teams st2 ON m.participant2_id = st2.id AND m.is_standalone = 1 AND m.category = 'teams'
      
      -- Tournament Participant 1 joins (singles)
      LEFT JOIN tournament_registrations tr1 ON m.participant1_id = tr1.id AND m.is_standalone = 0 AND t.category = 'singles'
      LEFT JOIN users tu1 ON tr1.user_id = tu1.id
      -- Tournament Participant 1 joins (doubles)
      LEFT JOIN pairs tp1 ON m.participant1_id = tp1.id AND m.is_standalone = 0 AND t.category = 'doubles'
      -- Tournament Participant 1 joins (teams)
      LEFT JOIN teams tt1 ON m.participant1_id = tt1.id AND m.is_standalone = 0 AND t.category = 'teams'
      
      -- Tournament Participant 2 joins (singles)
      LEFT JOIN tournament_registrations tr2 ON m.participant2_id = tr2.id AND m.is_standalone = 0 AND t.category = 'singles'
      LEFT JOIN users tu2 ON tr2.user_id = tu2.id
      -- Tournament Participant 2 joins (doubles)
      LEFT JOIN pairs tp2 ON m.participant2_id = tp2.id AND m.is_standalone = 0 AND t.category = 'doubles'
      -- Tournament Participant 2 joins (teams)
      LEFT JOIN teams tt2 ON m.participant2_id = tt2.id AND m.is_standalone = 0 AND t.category = 'teams'
      
      WHERE me.id = ?
    `;
    
    const [eventDetails] = await query(eventDetailsSql, [eventId]);
    
    // Generate complete event message in backend
    let eventMessage = '';
    const playerName = eventDetails.player_first_name && eventDetails.player_last_name
      ? `${eventDetails.player_first_name} ${eventDetails.player_last_name}`
      : null;
    const participantName = eventDetails.participant_name || 'Team';
    
    // Parse metadata
    const eventMetadata = typeof eventDetails.metadata === 'string' 
      ? JSON.parse(eventDetails.metadata) 
      : eventDetails.metadata;
    
    // Generate message based on event type
    if (eventType === 'point' && eventDetails.event_subtype === 'server_change') {
      // For server change events, use the notes field which has the proper message
      eventMessage = eventDetails.notes || 'Server changed';
    } else if (eventType === 'point') {
      const excitement = eventMetadata.excitement || 'Point scored!';
      
      // Check if this point won a game/set
      if (eventMetadata.won_game_set) {
        const wonType = eventMetadata.won_type || 'game';
        const wonNumber = eventMetadata.won_number;
        const wonScore = eventMetadata.won_score;
        const wonTypeCapitalized = wonType.charAt(0).toUpperCase() + wonType.slice(1);
        
        // Check if match is complete (don't show "Next game/set started" if match ended)
        const snapshot = typeof eventDetails.score_snapshot === 'string' 
          ? JSON.parse(eventDetails.score_snapshot) 
          : eventDetails.score_snapshot;
        const isMatchEnding = snapshot?.match_complete || snapshot?.awaiting_match_end_confirmation;
        
        // Build combined message with game/set win
        if (playerName) {
          eventMessage = isMatchEnding
            ? `${excitement} ${playerName} scored a point in ${wonTypeCapitalized} ${wonNumber} (${wonScore}), won the ${wonType}, and finished the match! Match winner is ${playerName}.`
            : `${excitement} ${playerName} scored a point in ${wonTypeCapitalized} ${wonNumber} (${wonScore}), and won the ${wonType}! Next ${wonType} started.`;
        } else {
          eventMessage = isMatchEnding
            ? `${excitement} ${participantName} scored a point in ${wonTypeCapitalized} ${wonNumber} (${wonScore}), won the ${wonType}, and finished the match! Match winner is ${participantName}.`
            : `${excitement} ${participantName} scored a point in ${wonTypeCapitalized} ${wonNumber} (${wonScore}), and won the ${wonType}! Next ${wonType} started.`;
        }
      } else {
        // Regular point - get current game/set info
        const snapshot = typeof eventDetails.score_snapshot === 'string' 
          ? JSON.parse(eventDetails.score_snapshot) 
          : eventDetails.score_snapshot;
        
        let currentSetGame = '';
        let currentScore = '';
        
        if (snapshot) {
          // For Tennis/Padel - Use tennis_score from metadata if available
          if (eventMetadata.tennis_score) {
            currentSetGame = `Set ${snapshot.current_set || 1}`;
            currentScore = eventMetadata.tennis_score;
            
            // ✅ Add deuce count if in deuce situation
            const deuceCount = snapshot.current_game_deuce_count || 0;
            if (deuceCount > 0 && (currentScore === 'Deuce-Deuce' || currentScore.includes('Deuce') || currentScore.includes('Adv'))) {
              currentScore += ` (Deuce #${deuceCount})`;
            }
          }
          // Determine if set-based or game-based
          else if (snapshot.current_set) {
            currentSetGame = `Set ${snapshot.current_set}`;
            const p1SetScore = snapshot.participant1?.set_scores?.[snapshot.current_set - 1] || 0;
            const p2SetScore = snapshot.participant2?.set_scores?.[snapshot.current_set - 1] || 0;
            currentScore = `${p1SetScore}-${p2SetScore}`;
            
            // ✅ Add deuce count for Volleyball (deuce at 24-24, 25-25, etc.)
            const deuceCount = snapshot.current_game_deuce_count || 0;
            if (deuceCount > 0 && p1SetScore >= 24 && p2SetScore >= 24 && Math.abs(p1SetScore - p2SetScore) <= 1) {
              currentScore += ` (Deuce #${deuceCount})`;
            }
          } else if (snapshot.current_game) {
            currentSetGame = `Game ${snapshot.current_game}`;
            const p1GameScore = snapshot.participant1?.game_scores?.[snapshot.current_game - 1] || 0;
            const p2GameScore = snapshot.participant2?.game_scores?.[snapshot.current_game - 1] || 0;
            currentScore = `${p1GameScore}-${p2GameScore}`;
            
            // ✅ Add deuce count for Badminton/Table Tennis (deuce at 20-20, 21-21, etc.)
            const deuceCount = snapshot.current_game_deuce_count || 0;
            if (deuceCount > 0 && p1GameScore >= 20 && p2GameScore >= 20 && Math.abs(p1GameScore - p2GameScore) <= 1) {
              currentScore += ` (Deuce #${deuceCount})`;
            }
          }
        }
        
        // Build regular point message
        if (playerName) {
          eventMessage = `${excitement} ${playerName} scored a point`;
        } else {
          eventMessage = `${excitement} ${participantName} scored a point`;
        }
        
        if (currentSetGame) {
          eventMessage += ` in ${currentSetGame}`;
        }
        if (currentScore) {
          eventMessage += ` (${currentScore})`;
        }
      }
    }
    
    // Update the event with the generated message
    if (eventMessage) {
      const updateMessageSql = `UPDATE match_events SET event_message = ? WHERE id = ?`;
      await query(updateMessageSql, [eventMessage, eventId]);
      eventMetadata.event_message = eventMessage;
    }
    
    // Format event same as getMatchEvents API
    const formattedEvent = {
      ...eventDetails,
      metadata: eventMetadata,
      score_snapshot: typeof eventDetails.score_snapshot === 'string' ? JSON.parse(eventDetails.score_snapshot) : eventDetails.score_snapshot,
      player_name: playerName,
      participant_name: participantName,
      event_message: eventMessage
    };
    
    // Check if match is complete
    if (liveScore.match_complete) {
      // Determine winner participant ID
      const winnerParticipantId = liveScore.match_winner === 'participant1' 
        ? match.participant1_id 
        : match.participant2_id;
      
      const updateSql = `
        UPDATE matches 
        SET live_score = ?,
            current_set = ?,
            current_game = ?,
            status = 'completed',
            actual_end_time = NOW(),
            winner_participant_id = ?
        WHERE id = ?
      `;
      
      await query(updateSql, [
        JSON.stringify(liveScore),
        liveScore.current_set || liveScore.current_game || 1,
        liveScore.current_game || null,
        winnerParticipantId,
        matchId
      ]);
      
      logger.info(`Match ${matchId} completed! Winner: ${liveScore.match_winner} (Participant ID: ${winnerParticipantId})`);
      
      // Advance winner to next round and check tournament completion (only for tournament matches)
      try {
        const matchData = await query(
          'SELECT m.tournament_id, m.group_id, m.is_standalone, t.format_type FROM matches m LEFT JOIN tournaments t ON m.tournament_id = t.id WHERE m.id = ?', 
          [matchId]
        );
        
        if (matchData && matchData[0]) {
          const { tournament_id, group_id, is_standalone, format_type } = matchData[0];
          
          // Skip tournament logic for standalone matches
          if (is_standalone) {
            logger.info(`✅ [MATCH SCORING] Standalone match ${matchId} completed - no tournament standings to update`);
          } else if (tournament_id && format_type) {
            // Update standings or advance winner based on format (tournament matches only)
            if (format_type === 'knockout') {
            const bracketService = require('./bracketService');
            await bracketService.advanceWinner(matchId, winnerParticipantId);
            logger.info(`Advanced winner ${winnerParticipantId} to next round`);
          } else if (format_type === 'groups_knockout') {
            // For groups_knockout: group stage matches update standings, knockout matches advance winner
            if (group_id) {
              // Group stage match - update standings
              logger.info(`📊 [MATCH SCORING] Group stage match - updating standings`);
              const { processTournamentAfterMatch } = require('./matchService');
              await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
              logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
            } else {
              // Knockout stage match - advance winner
              logger.info(`🏆 [MATCH SCORING] Knockout stage match - advancing winner`);
              const bracketService = require('./bracketService');
              await bracketService.advanceWinner(matchId, winnerParticipantId);
              logger.info(`Advanced winner ${winnerParticipantId} to next round`);
            }
          } else if (format_type === 'round_robin' || format_type === 'league') {
            // Update standings for league/round-robin formats
            logger.info(`📊 [MATCH SCORING] Updating standings for ${format_type} tournament`);
            const { processTournamentAfterMatch } = require('./matchService');
            await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
            logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
          }
            
            // Check if all tournament matches are completed
            await checkAndCompleteTournament(tournament_id);
          }
        }
      } catch (err) {
        logger.error('Error advancing winner or checking tournament completion:', err);
      }
      
      // Broadcast match completion via WebSocket
      if (io) {
        broadcastMatchCompleted(io, matchId, winnerParticipantId, liveScore);
      }
      
      return {
        success: true,
        message: 'Match completed!',
        match_complete: true,
        winner: liveScore.match_winner,
        winner_participant_id: winnerParticipantId,
        live_score: liveScore,
        event: {
          event_type: 'match_end',
          participant_side: participantSide,
          event_order: eventOrder
        }
      };
    }
    
    // Update match live score (match still in progress)
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          current_set = ?,
          current_game = ?
      WHERE id = ?
    `;
    
    // Stringify for MySQL JSON column
    await query(updateSql, [
      JSON.stringify(liveScore),
      liveScore.current_set || 1,
      liveScore.current_game || null,
      matchId
    ]);
    
    logger.info(`Point added to match ${matchId} for ${participantSide}`);
    
    // Broadcast live score update via WebSocket with complete event details
    if (io) {
      broadcastMatchUpdate(io, matchId, 'point_added', {
        live_score: liveScore,
        participant_side: participantSide,
        event_type: eventType,
        event: formattedEvent  // Include complete event with player names
      });
    }
    
    return {
      success: true,
      message: 'Point added successfully',
      live_score: liveScore,
      event: formattedEvent
    };
  } catch (error) {
    logger.error('Add point error:', error);
    throw error;
  }
};

/**
 * Confirm Match End (For Badminton, Tennis, Table Tennis, etc.)
 * Called after the final point to confirm match completion
 */
const confirmMatchEnd = async (matchId, refereeId, confirmed, io = null) => {
  try {
    // Get current match (support both tournament and standalone matches)
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        s.name as sport_name,
        m.is_standalone
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ? AND m.referee_id = ?
    `;
    
    const [match] = await query(matchSql, [matchId, refereeId]);
    
    if (!match) {
      throw new Error('Match not found or referee not assigned');
    }
    
    // Get current live score
    let liveScore = typeof match.live_score === 'object' 
      ? match.live_score 
      : JSON.parse(match.live_score);
    
    // Check if awaiting confirmation
    if (!liveScore.awaiting_match_end_confirmation) {
      throw new Error('No match end confirmation pending');
    }
    
    if (confirmed) {
      // User confirmed - complete the match
      liveScore.match_complete = true;
      liveScore.match_winner = liveScore.pending_winner;
      delete liveScore.awaiting_match_end_confirmation;
      delete liveScore.pending_winner;
      
      // Note: Segment ending is handled by frontend when point is scored
      // No need to end segment here as it's already ended
      
      // Determine winner participant ID
      const winnerParticipantId = liveScore.match_winner === 'participant1' 
        ? match.participant1_id 
        : match.participant2_id;
      
      const updateSql = `
        UPDATE matches 
        SET live_score = ?,
            status = 'completed',
            actual_end_time = NOW(),
            winner_participant_id = ?
        WHERE id = ?
      `;
      
      await query(updateSql, [
        JSON.stringify(liveScore),
        winnerParticipantId,
        matchId
      ]);
      
      logger.info(`✅ Match ${matchId} confirmed complete! Winner: ${liveScore.match_winner} (Participant ID: ${winnerParticipantId})`);
      
      // Calculate and update total duration from segments
      await calculateAndUpdateTotalDuration(matchId);
      
      // End match timing to calculate total duration
      try {
        const MatchTiming = require('../models/MatchTiming');
        await MatchTiming.endMatch(matchId);
        logger.info(`⏱️ Match timing ended for match ${matchId}`);
      } catch (timingError) {
        logger.warn(`Could not end match timing: ${timingError.message}`);
      }
      
      // Advance winner and check tournament completion
      try {
        const matchData = await query(
          'SELECT m.tournament_id, m.group_id, m.is_standalone, t.format_type FROM matches m LEFT JOIN tournaments t ON m.tournament_id = t.id WHERE m.id = ?', 
          [matchId]
        );
        
        if (matchData && matchData[0]) {
          const { tournament_id, group_id, format_type } = matchData[0];
          
          if (format_type === 'knockout') {
            const bracketService = require('./bracketService');
            await bracketService.advanceWinner(matchId, winnerParticipantId);
            logger.info(`🏆 Advanced winner ${winnerParticipantId} to next round`);
          } else if (format_type === 'groups_knockout') {
            if (group_id) {
              const { processTournamentAfterMatch } = require('./matchService');
              await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
            } else {
              const bracketService = require('./bracketService');
              await bracketService.advanceWinner(matchId, winnerParticipantId);
            }
          } else if (format_type === 'round_robin' || format_type === 'league') {
            const { processTournamentAfterMatch } = require('./matchService');
            await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
          }
          
          await checkAndCompleteTournament(tournament_id);
        }
      } catch (err) {
        logger.error('Error advancing winner:', err);
      }
      
      // Broadcast match completion
      if (io) {
        broadcastMatchCompleted(io, matchId, winnerParticipantId, liveScore);
      }
      
      return {
        success: true,
        message: 'Match completed!',
        match_complete: true,
        winner: liveScore.match_winner,
        winner_participant_id: winnerParticipantId,
        live_score: liveScore
      };
    } else {
      // User declined - undo the last point
      logger.info(`❌ Match end declined for match ${matchId} - undoing last point`);
      
      // Clear confirmation flags
      delete liveScore.awaiting_match_end_confirmation;
      delete liveScore.pending_winner;
      
      // Update live score without completing
      await query('UPDATE matches SET live_score = ? WHERE id = ?', [
        JSON.stringify(liveScore),
        matchId
      ]);
      
      // Restart the segment that was ended (frontend will handle this)
      const currentSet = liveScore.current_set || liveScore.current_game;
      if (currentSet) {
        try {
          const MatchTiming = require('../models/MatchTiming');
          await MatchTiming.startSegment(matchId, 'set', currentSet);
          logger.info(`🔄 Restarted segment: set ${currentSet} for match ${matchId}`);
        } catch (segmentError) {
          logger.warn(`Could not restart segment: ${segmentError.message}`);
        }
      }
      
      // Undo the last point
      const undoResult = await undoLastPoint(matchId, refereeId, io);
      
      return {
        success: true,
        message: 'Match end cancelled - last point undone',
        match_complete: false,
        live_score: undoResult.live_score
      };
    }
  } catch (error) {
    logger.error('Confirm match end error:', error);
    throw error;
  }
};

/**
 * Add goal (Football-specific)
 * Records goal with player, minute, goal type, and optional assist
 */
const addGoal = async (matchId, refereeId, participantSide, playerId, minute, goalType = 'open_play', assistPlayerId = null, elapsedSeconds = null, io = null) => {
  try {
    // Get match details (support both tournament and standalone matches)
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        s.name as sport_name,
        COALESCE(m.match_config, t.match_config) as match_config
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ?
    `;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Verify referee
    if (match.referee_id !== refereeId) {
      throw new Error('Only the assigned referee can score this match');
    }
    
    // Verify match is in a valid state for scoring
    if (!['scheduled', 'ready', 'pending', 'in_progress'].includes(match.status)) {
      throw new Error(`Cannot add goals to match with status: ${match.status}`);
    }
    
    // Verify sport is Football
    if (match.sport_name !== 'Football') {
      throw new Error('This endpoint is only for Football matches');
    }
    
    // Get current live score
    let liveScore = match.live_score;
    
    // Parse if it's a string, otherwise use as-is
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    
    // Auto-initialize live score if not present
    if (!liveScore) {
      logger.warn(`Match ${matchId} has no live_score, initializing...`);
      liveScore = await initializeLiveScore(matchId, match.sport_id);
      
      // Save the initialized score and update status to in_progress
      const updateSql = `
        UPDATE matches 
        SET live_score = ?,
            status = 'in_progress',
            actual_start_time = COALESCE(actual_start_time, NOW())
        WHERE id = ?
      `;
      await query(updateSql, [JSON.stringify(liveScore), matchId]);
      
      // Update match status in memory
      match.status = 'in_progress';
    }
    
    // Get scoring calculator
    const calculator = getScoringCalculator('Football');
    
    if (!calculator || !calculator.addGoal) {
      throw new Error('Football scoring calculator not found');
    }
    
    // Add goal using calculator
    liveScore = calculator.addGoal(liveScore, participantSide);
    
    // DO NOT touch elapsed_seconds or match_time here!
    // Timer is managed by server-side matchTimerService
    // Adding goals/cards should ONLY update the score, not the timer
    
    // Get event order
    const eventCountSql = `SELECT COUNT(*) as count FROM match_events WHERE match_id = ?`;
    const [eventCount] = await query(eventCountSql, [matchId]);
    const eventOrder = (eventCount?.count || 0) + 1;
    
    // Record goal event with metadata
    const eventSql = `
      INSERT INTO match_events (
        match_id, event_type, participant_side, player_id,
        match_time, metadata, score_snapshot, event_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Generate exciting goal expression (stored once in DB)
    const goalExpressions = [
      'GOAL!', 'What a goal!', 'Incredible goal!', 'Amazing strike!', 
      'Brilliant goal!', 'Fantastic finish!', 'Superb goal!', 'Outstanding!',
      'Golazo!', 'Spectacular!', 'Unstoppable shot!', 'Clinical finish!',
      'Thunderous strike!', 'Perfect placement!', 'World-class goal!', 'Magnificent!',
      'Into the back of the net!', 'What a finish!', 'Absolute screamer!', 'Top corner!'
    ];
    const goalExcitement = goalExpressions[Math.floor(Math.random() * goalExpressions.length)];
    
    // Convert input to minute number (handles both "2" and "1:20" formats)
    const minuteNumber = convertToRoundedMinute(minute);
    
    // Format time for display
    const displayTime = `${minuteNumber}'`;
    
    const metadata = {
      goal_type: goalType,
      minute: minuteNumber, // Store minute number
      display_time: displayTime, // Store formatted display time
      assist_player_id: assistPlayerId,
      excitement: goalExcitement  // Store the exciting expression
    };
    
    const result = await query(eventSql, [
      matchId,
      'goal',
      participantSide,
      playerId,
      displayTime, // Store formatted time in match_time column (e.g., "2'")
      JSON.stringify(metadata),
      JSON.stringify(liveScore),
      eventOrder
    ]);
    
    const eventId = result.insertId;
    
    // Fetch complete event details with player names (same as API response)
    const eventDetailsSql = `
      SELECT 
        me.*,
        u.first_name as player_first_name,
        u.last_name as player_last_name,
        assist.first_name as assist_first_name,
        assist.last_name as assist_last_name
      FROM match_events me
      LEFT JOIN users u ON me.player_id = u.id
      LEFT JOIN users assist ON JSON_EXTRACT(me.metadata, '$.assist_player_id') = assist.id
      WHERE me.id = ?
    `;
    
    const [eventDetails] = await query(eventDetailsSql, [eventId]);
    
    // Format event same as getMatchEvents API
    const formattedEvent = {
      ...eventDetails,
      metadata: typeof eventDetails.metadata === 'string' ? JSON.parse(eventDetails.metadata) : eventDetails.metadata,
      score_snapshot: typeof eventDetails.score_snapshot === 'string' ? JSON.parse(eventDetails.score_snapshot) : eventDetails.score_snapshot,
      player_name: eventDetails.player_first_name && eventDetails.player_last_name
        ? `${eventDetails.player_first_name} ${eventDetails.player_last_name}`
        : null,
      assist_player_name: eventDetails.assist_first_name && eventDetails.assist_last_name
        ? `${eventDetails.assist_first_name} ${eventDetails.assist_last_name}`
        : null
    };
    
    // Check if match is complete
    if (liveScore.match_complete) {
      // Determine winner participant ID
      const winnerParticipantId = liveScore.match_winner === 'participant1' 
        ? match.participant1_id 
        : match.participant2_id;
      
      const updateSql = `
        UPDATE matches 
        SET live_score = ?,
            status = 'completed',
            actual_end_time = NOW(),
            winner_participant_id = ?
        WHERE id = ?
      `;
      
      await query(updateSql, [
        JSON.stringify(liveScore),
        winnerParticipantId,
        matchId
      ]);
      
      logger.info(`Match ${matchId} completed! Winner: ${liveScore.match_winner} (Participant ID: ${winnerParticipantId})`);
      
      // Advance winner to next round and check tournament completion (only for tournament matches)
      try {
        const matchData = await query(
          'SELECT m.tournament_id, m.group_id, m.is_standalone, t.format_type FROM matches m LEFT JOIN tournaments t ON m.tournament_id = t.id WHERE m.id = ?', 
          [matchId]
        );
        
        if (matchData && matchData[0]) {
          const { tournament_id, group_id, is_standalone, format_type } = matchData[0];
          
          // Skip tournament logic for standalone matches
          if (is_standalone) {
            logger.info(`✅ [MATCH SCORING] Standalone match ${matchId} completed - no tournament standings to update`);
          } else if (tournament_id && format_type) {
            // Update standings or advance winner based on format (tournament matches only)
            if (format_type === 'knockout') {
            const bracketService = require('./bracketService');
            await bracketService.advanceWinner(matchId, winnerParticipantId);
            logger.info(`Advanced winner ${winnerParticipantId} to next round`);
          } else if (format_type === 'groups_knockout') {
            // For groups_knockout: group stage matches update standings, knockout matches advance winner
            if (group_id) {
              // Group stage match - update standings
              logger.info(`📊 [MATCH SCORING] Group stage match - updating standings`);
              const { processTournamentAfterMatch } = require('./matchService');
              await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
              logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
            } else {
              // Knockout stage match - advance winner
              logger.info(`🏆 [MATCH SCORING] Knockout stage match - advancing winner`);
              const bracketService = require('./bracketService');
              await bracketService.advanceWinner(matchId, winnerParticipantId);
              logger.info(`Advanced winner ${winnerParticipantId} to next round`);
            }
          } else if (format_type === 'round_robin' || format_type === 'league') {
            // Update standings for league/round-robin formats
            logger.info(`📊 [MATCH SCORING] Updating standings for ${format_type} tournament`);
            const { processTournamentAfterMatch } = require('./matchService');
            await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
            logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
          }
            
            // Check if all tournament matches are completed
            await checkAndCompleteTournament(tournament_id);
          }
        }
      } catch (err) {
        logger.error('Error advancing winner or checking tournament completion:', err);
      }
      
      // Broadcast match completion via WebSocket
      if (io) {
        broadcastMatchCompleted(io, matchId, winnerParticipantId, liveScore);
        // Also broadcast the final goal event
        broadcastMatchUpdate(io, matchId, 'goal', { 
          liveScore, 
          playerId, 
          minute, 
          goalType,
          event: formattedEvent
        });
      }
      
      return {
        success: true,
        message: 'Goal scored! Match completed!',
        match_complete: true,
        winner: liveScore.match_winner,
        winner_participant_id: winnerParticipantId,
        live_score: liveScore,
        event: formattedEvent
      };
    }
    
    // Update live score in database
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          match_timer = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [
      JSON.stringify(liveScore),
      minute,
      matchId
    ]);
    
    // Broadcast score update via WebSocket with complete event details
    if (io) {
      broadcastMatchUpdate(io, matchId, 'goal', { 
        liveScore, 
        playerId, 
        minute, 
        goalType,
        event: formattedEvent  // Include complete event with player names
      });
    }
    
    logger.info(`Goal added to match ${matchId} by player ${playerId} at ${minute}`);
    
    return {
      success: true,
      message: 'Goal scored successfully!',
      match_complete: false,
      live_score: liveScore,
      event: {
        id: eventId,
        event_type: 'goal',
        participant_side: participantSide,
        player_id: playerId,
        minute: minute,
        goal_type: goalType,
        assist_player_id: assistPlayerId,
        event_order: eventOrder
      }
    };
  } catch (error) {
    logger.error('Add goal service error:', error);
    throw error;
  }
};

/**
 * Add yellow card (Football-specific)
 */
const addYellowCard = async (matchId, refereeId, participantSide, playerId, minute, reason = '', io = null) => {
  try {
    // Get match details (support both tournament and standalone matches)
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        s.name as sport_name
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ?
    `;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Verify referee
    if (match.referee_id !== refereeId) {
      throw new Error('Only the assigned referee can score this match');
    }
    
    // Verify match is in a valid state for scoring
    if (!['scheduled', 'ready', 'pending', 'in_progress'].includes(match.status)) {
      throw new Error(`Cannot add cards to match with status: ${match.status}`);
    }
    
    // Get current live score
    let liveScore = match.live_score;
    
    // Parse if it's a string
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    
    // Auto-initialize live score if not present
    if (!liveScore) {
      logger.warn(`Match ${matchId} has no live_score, initializing...`);
      liveScore = await initializeLiveScore(matchId, match.sport_id);
      
      // Save the initialized score and update status to in_progress
      const updateSql = `
        UPDATE matches 
        SET live_score = ?,
            status = 'in_progress',
            actual_start_time = COALESCE(actual_start_time, NOW())
        WHERE id = ?
      `;
      await query(updateSql, [JSON.stringify(liveScore), matchId]);
      
      // Update match status in memory
      match.status = 'in_progress';
    }
    
    // Check if player already has a yellow card (second yellow = red card)
    const checkYellowSql = `
      SELECT COUNT(*) as yellow_count 
      FROM match_events 
      WHERE match_id = ? 
      AND player_id = ? 
      AND event_type = 'yellow_card'
    `;
    const [yellowCheck] = await query(checkYellowSql, [matchId, playerId]);
    const hasYellowCard = yellowCheck.yellow_count > 0;
    
    // Update yellow card count
    liveScore[participantSide].yellow_cards = (liveScore[participantSide].yellow_cards || 0) + 1;
    
    // Get event order
    const eventCountSql = `SELECT COUNT(*) as count FROM match_events WHERE match_id = ?`;
    const [eventCount] = await query(eventCountSql, [matchId]);
    const eventOrder = (eventCount?.count || 0) + 1;
    
    // Record yellow card event
    const eventSql = `
      INSERT INTO match_events (
        match_id, event_type, participant_side, player_id,
        match_time, metadata, score_snapshot, event_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert input to minute number (handles both "2" and "1:20" formats)
    const minuteNumber = convertToRoundedMinute(minute);
    
    // Format time for display
    const displayTime = `${minuteNumber}'`;
    
    const metadata = {
      minute: minuteNumber, // Store minute number
      display_time: displayTime, // Store formatted display time
      reason: reason
    };
    
    const result = await query(eventSql, [
      matchId,
      'yellow_card',
      participantSide,
      playerId,
      displayTime, // Store formatted time (e.g., "2'")
      JSON.stringify(metadata),
      JSON.stringify(liveScore),
      eventOrder
    ]);
    
    const eventId = result.insertId;
    
    // Update live score in database
    const updateSql = `
      UPDATE matches 
      SET live_score = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [
      JSON.stringify(liveScore),
      matchId
    ]);
    
    // If player already had a yellow card, this is their second yellow → automatic red card
    if (hasYellowCard) {
      // Update red card count
      liveScore[participantSide].red_cards = (liveScore[participantSide].red_cards || 0) + 1;
      
      // Record automatic red card event
      const redCardEventOrder = eventOrder + 1;
      const redCardEventSql = `
        INSERT INTO match_events (
          match_id, event_type, participant_side, player_id,
          match_time, metadata, score_snapshot, event_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const redCardMetadata = {
        minute: minuteNumber,
        display_time: displayTime,
        reason: 'Second yellow card',
        automatic: true,
        triggered_by_yellow: true
      };
      
      await query(redCardEventSql, [
        matchId,
        'red_card',
        participantSide,
        playerId,
        displayTime,
        JSON.stringify(redCardMetadata),
        JSON.stringify(liveScore),
        redCardEventOrder
      ]);
      
      // Update live score with red card
      const updateRedCardSql = `
        UPDATE matches 
        SET live_score = ?
        WHERE id = ?
      `;
      await query(updateRedCardSql, [JSON.stringify(liveScore), matchId]);
      
      logger.info(`AUTOMATIC RED CARD: Player ${playerId} sent off for second yellow card at ${minute}`);
    }
    
    // Broadcast score update via WebSocket
    if (io) {
      broadcastMatchUpdate(io, matchId, 'yellow_card', { 
        liveScore, 
        playerId, 
        minute, 
        reason,
        secondYellow: hasYellowCard,
        automaticRedCard: hasYellowCard
      });
    }
    
    logger.info(`Yellow card added to match ${matchId} for player ${playerId} at ${minute}${hasYellowCard ? ' (SECOND YELLOW → RED CARD)' : ''}`);
    
    return {
      success: true,
      message: hasYellowCard 
        ? '⚠️ SECOND YELLOW CARD! Player sent off with automatic red card!' 
        : 'Yellow card recorded successfully!',
      live_score: liveScore,
      second_yellow: hasYellowCard,
      automatic_red_card: hasYellowCard,
      event: {
        id: eventId,
        event_type: 'yellow_card',
        participant_side: participantSide,
        player_id: playerId,
        minute: minute,
        reason: reason,
        event_order: eventOrder
      }
    };
  } catch (error) {
    logger.error('Add yellow card service error:', error);
    throw error;
  }
};

/**
 * Add red card
 */
const addRedCard = async (matchId, refereeId, participantSide, playerId, minute, reason = '', io = null) => {
  try {
    // Get match details (support both tournament and standalone matches)
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        s.name as sport_name
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ?
    `;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Verify referee
    if (match.referee_id !== refereeId) {
      throw new Error('Only the assigned referee can score this match');
    }
    
    // Verify match is in a valid state for scoring
    if (!['scheduled', 'ready', 'pending', 'in_progress'].includes(match.status)) {
      throw new Error(`Cannot add cards to match with status: ${match.status}`);
    }
    
    // Get current live score
    let liveScore = match.live_score;
    
    // Parse if it's a string
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    
    // Auto-initialize live score if not present
    if (!liveScore) {
      logger.warn(`Match ${matchId} has no live_score, initializing...`);
      liveScore = await initializeLiveScore(matchId, match.sport_id);
      
      // Save the initialized score and update status to in_progress
      const updateSql = `
        UPDATE matches 
        SET live_score = ?,
            status = 'in_progress',
            actual_start_time = COALESCE(actual_start_time, NOW())
        WHERE id = ?
      `;
      await query(updateSql, [JSON.stringify(liveScore), matchId]);
      
      // Update match status in memory
      match.status = 'in_progress';
    }
    
    // Update red card count
    liveScore[participantSide].red_cards = (liveScore[participantSide].red_cards || 0) + 1;
    
    // Get event order
    const eventCountSql = `SELECT COUNT(*) as count FROM match_events WHERE match_id = ?`;
    const [eventCount] = await query(eventCountSql, [matchId]);
    const eventOrder = (eventCount?.count || 0) + 1;
    
    // Record red card event
    const eventSql = `
      INSERT INTO match_events (
        match_id, event_type, participant_side, player_id,
        match_time, metadata, score_snapshot, event_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert input to minute number (handles both "2" and "1:20" formats)
    const minuteNumber = convertToRoundedMinute(minute);
    
    // Format time for display
    const displayTime = `${minuteNumber}'`;
    
    const metadata = {
      minute: minuteNumber, // Store minute number
      display_time: displayTime, // Store formatted display time
      reason: reason
    };
    
    const result = await query(eventSql, [
      matchId,
      'red_card',
      participantSide,
      playerId,
      displayTime, // Store formatted time (e.g., "2'")
      JSON.stringify(metadata),
      JSON.stringify(liveScore),
      eventOrder
    ]);
    
    const eventId = result.insertId;
    
    // Update live score in database
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          match_timer = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [
      JSON.stringify(liveScore),
      minute,
      matchId
    ]);
    
    // Broadcast score update via WebSocket
    if (io) {
      broadcastMatchUpdate(io, matchId, 'red_card', { liveScore, playerId, minute, reason });
    }
    
    logger.info(`Red card added to match ${matchId} for player ${playerId} at ${minute}`);
    
    return {
      success: true,
      message: 'Red card recorded successfully!',
      live_score: liveScore,
      event: {
        id: eventId,
        event_type: 'red_card',
        participant_side: participantSide,
        player_id: playerId,
        minute: minute,
        reason: reason,
        event_order: eventOrder
      }
    };
  } catch (error) {
    logger.error('Add red card service error:', error);
    throw error;
  }
};

/**
 * Format score for simple message display with Set/Game info
 * Returns a human-readable score string based on sport type
 */
const formatScoreForMessage = (score, sportName) => {
  if (!score) return 'Set 1 (0-0)';
  
  try {
    // Football - show goals
    if (sportName === 'Football') {
      const p1Goals = score.participant1?.goals || 0;
      const p2Goals = score.participant2?.goals || 0;
      return `${p1Goals}-${p2Goals}`;
    }
    
    // Tennis/Padel - show Set X (Tennis score)
    if (['Tennis', 'Padel'].includes(sportName)) {
      const currentSet = score.current_set || 1;
      const p1Points = score.participant1?.current_game_points || 0;
      const p2Points = score.participant2?.current_game_points || 0;
      const isTiebreak = score.is_tiebreak || false;
      
      // Convert to Tennis score format
      const convertToTennisScore = (points, opponentPoints, isTiebreak) => {
        if (isTiebreak) return points.toString();
        const scores = ['0', '15', '30', '40'];
        if (points >= 3 && opponentPoints >= 3) {
          if (points === opponentPoints) return 'Deuce';
          else if (points > opponentPoints) return 'Adv';
          else return '40';
        }
        return points < 4 ? scores[points] : '40';
      };
      
      const p1Display = convertToTennisScore(p1Points, p2Points, isTiebreak);
      const p2Display = convertToTennisScore(p2Points, p1Points, isTiebreak);
      
      return `Set ${currentSet} (${p1Display}-${p2Display})`;
    }
    
    // Badminton - show Game X (points) - Badminton uses "Games" not "Sets"
    if (sportName === 'Badminton') {
      const currentGame = score.current_game || score.current_set || 1;
      const p1Points = score.participant1?.game_scores?.[currentGame - 1] || 0;
      const p2Points = score.participant2?.game_scores?.[currentGame - 1] || 0;
      return `Game ${currentGame} (${p1Points}-${p2Points})`;
    }
    
    // Volleyball - show Set X (points) - uses sets like Badminton
    if (sportName === 'Volleyball') {
      const currentSet = score.current_set || 1;
      const p1Points = score.participant1?.set_scores?.[currentSet - 1] || 0;
      const p2Points = score.participant2?.set_scores?.[currentSet - 1] || 0;
      return `Set ${currentSet} (${p1Points}-${p2Points})`;
    }
    
    // Game-based sports (Table Tennis, Squash, Pickleball)
    if (['Table Tennis', 'Squash', 'Pickleball'].includes(sportName)) {
      const currentGame = score.current_game || 1;
      const p1Points = score.participant1?.game_scores?.[currentGame - 1] || 0;
      const p2Points = score.participant2?.game_scores?.[currentGame - 1] || 0;
      return `Game ${currentGame} (${p1Points}-${p2Points})`;
    }
    
    // Default
    return 'Set 1 (0-0)';
  } catch (error) {
    logger.warn('Error formatting score for message:', error);
    return 'Set 1 (0-0)';
  }
};

/**
 * Undo last point/event
 * Reverts one step at a time based on sport type:
 * - Football: Undo goal, card, substitution
 * - Set-based (Tennis/Badminton): Undo point
 * - Game-based (Table Tennis/Squash/Volleyball): Undo point
 */
const undoLastPoint = async (matchId, refereeId, io = null) => {
  try {
    // Get match details (support both tournament and standalone matches)
    const matchSql = `
      SELECT 
        m.*, 
        s.name as sport_name, 
        s.category as sport_category, 
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        m.is_standalone
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ? AND m.referee_id = ?
    `;
    const [match] = await query(matchSql, [matchId, refereeId]);
    
    if (!match) {
      throw new Error('Match not found or you are not the referee');
    }
    
    // Prevent undo on completed matches
    if (match.status === 'completed') {
      throw new Error('Cannot undo events in a completed match');
    }
    
    // Determine match structure from sport name
    const sportName = match.sport_name;
    let matchStructure = 'time_based'; // default
    
    if (['Tennis', 'Badminton', 'Padel'].includes(sportName)) {
      matchStructure = 'set_based';
    } else if (['Table Tennis', 'Squash', 'Pickleball', 'Volleyball'].includes(sportName)) {
      matchStructure = 'game_based';
    } else if (sportName === 'Football') {
      matchStructure = 'time_based';
    }
    
    // Get last event (exclude already undone events and undo events themselves)
    const lastEventSql = `
      SELECT * FROM match_events 
      WHERE match_id = ? 
        AND is_undone = FALSE
        AND event_type != 'undo'
      ORDER BY event_order DESC 
      LIMIT 1
    `;
    
    const [lastEvent] = await query(lastEventSql, [matchId]);
    
    if (!lastEvent) {
      throw new Error('No events to undo');
    }
    
    // Prevent undoing match_start event
    if (lastEvent.event_type === 'match_start') {
      throw new Error('No more events to undo. Cannot undo match start.');
    }
    
    logger.info(`🔄 Undoing last event for match ${matchId}:`, {
      event_type: lastEvent.event_type,
      event_order: lastEvent.event_order,
      sport: sportName,
      match_structure: matchStructure
    });
    
    // Get previous event's score snapshot
    let previousScore = null;
    
    if (lastEvent.event_order > 1) {
      const prevEventSql = `
        SELECT score_snapshot FROM match_events 
        WHERE match_id = ? AND event_order = ?
      `;
      
      const [prevEvent] = await query(prevEventSql, [matchId, lastEvent.event_order - 1]);
      if (prevEvent && prevEvent.score_snapshot) {
        // Handle both string and object (MySQL JSON type)
        previousScore = typeof prevEvent.score_snapshot === 'string' 
          ? JSON.parse(prevEvent.score_snapshot) 
          : prevEvent.score_snapshot;
      }
    }
    
    // If no previous score, get initial score from match start
    if (!previousScore) {
      let currentLiveScore = {};
      if (match.live_score) {
        // Handle both string and object (MySQL JSON type)
        currentLiveScore = typeof match.live_score === 'string' 
          ? JSON.parse(match.live_score) 
          : match.live_score;
      }
      
      // Initialize based on sport type
      if (matchStructure === 'time_based') {
        // Football - reset to 0-0
        previousScore = {
          sport: sportName,
          participant1: { goals: 0, yellow_cards: 0, red_cards: 0 },
          participant2: { goals: 0, yellow_cards: 0, red_cards: 0 },
          current_half: currentLiveScore.current_half || 1,
          is_on_break: currentLiveScore.is_on_break || false,
          is_paused: currentLiveScore.is_paused || false,
          elapsed_seconds: currentLiveScore.elapsed_seconds || 0,
          period_duration: currentLiveScore.period_duration || 45
        };
      } else if (matchStructure === 'set_based') {
        // Tennis/Badminton - reset to 0-0
        previousScore = {
          sport: sportName,
          participant1: { 
            sets_won: 0, 
            set_scores: [0],
            current_game_points: 0
          },
          participant2: { 
            sets_won: 0, 
            set_scores: [0],
            current_game_points: 0
          },
          current_set: 1,
          server: 'participant1'
        };
      } else if (matchStructure === 'game_based') {
        // Table Tennis/Squash/Volleyball - reset to 0-0
        previousScore = {
          sport: sportName,
          participant1: { 
            games_won: 0, 
            game_scores: [0]
          },
          participant2: { 
            games_won: 0, 
            game_scores: [0]
          },
          current_game: 1,
          serving_player: 'participant1'
        };
      }
    }
    
    // Handle substitution reversal (for Football)
    if (lastEvent.event_type === 'substitution') {
      // Handle both string and object (MySQL JSON type)
      let metadata = {};
      if (lastEvent.metadata) {
        metadata = typeof lastEvent.metadata === 'string' 
          ? JSON.parse(lastEvent.metadata) 
          : lastEvent.metadata;
      }
      const playerOutId = lastEvent.player_id;
      const playerInId = metadata.player_in_id;
      
      if (playerOutId && playerInId) {
        // Get team_id
        const teamSql = `
          SELECT 
            CASE 
              WHEN ? = 'participant1' THEN participant1_id
              WHEN ? = 'participant2' THEN participant2_id
            END as team_id
          FROM matches 
          WHERE id = ?
        `;
        const [teamInfo] = await query(teamSql, [
          lastEvent.participant_side,
          lastEvent.participant_side,
          matchId
        ]);
        
        if (teamInfo && teamInfo.team_id) {
          // Reverse substitution: playerOut becomes playing, playerIn becomes substitute
          await matchPlayerStatusService.performSubstitution(
            matchId,
            teamInfo.team_id,
            playerInId,  // Player to take out (was brought in)
            playerOutId  // Player to bring in (was taken out)
          );
          
          logger.info(`✅ Substitution reversed: Player ${playerInId} OUT, Player ${playerOutId} IN`);
        }
      }
    }
    
    // ✅ NEW: Mark events as undone instead of deleting
    // Special handling: If undoing a game_won/set_won event, also mark the winning point event
    let eventsToUndo = [lastEvent.id];
    
    if (lastEvent.event_type === 'game_won' || lastEvent.event_type === 'set_won') {
      // Get the previous event (should be the winning point)
      const prevPointSql = `
        SELECT * FROM match_events 
        WHERE match_id = ? AND event_order = ? AND is_undone = FALSE
      `;
      const [prevPoint] = await query(prevPointSql, [matchId, lastEvent.event_order - 1]);
      
      if (prevPoint && prevPoint.event_type === 'point') {
        // Check if this point won the game/set
        let prevMetadata = {};
        if (prevPoint.metadata) {
          prevMetadata = typeof prevPoint.metadata === 'string' 
            ? JSON.parse(prevPoint.metadata) 
            : prevPoint.metadata;
        }
        
        if (prevMetadata.won_game_set) {
          // This is the winning point - mark it as undone too
          eventsToUndo.push(prevPoint.id);
          logger.info(`🔄 Also undoing winning point event (id: ${prevPoint.id})`);
          
          // Update previousScore to be from 2 events back
          if (lastEvent.event_order > 2) {
            const twoEventsBackSql = `
              SELECT score_snapshot FROM match_events 
              WHERE match_id = ? AND event_order = ? AND is_undone = FALSE
            `;
            const [twoEventsBack] = await query(twoEventsBackSql, [matchId, lastEvent.event_order - 2]);
            if (twoEventsBack && twoEventsBack.score_snapshot) {
              previousScore = typeof twoEventsBack.score_snapshot === 'string' 
                ? JSON.parse(twoEventsBack.score_snapshot) 
                : twoEventsBack.score_snapshot;
            }
          }
        }
      }
    }
    
    // ✅ Mark all identified events as undone (DO NOT DELETE)
    const markUndoneEventSql = `UPDATE match_events SET is_undone = TRUE WHERE id IN (?)`;
    await query(markUndoneEventSql, [eventsToUndo]);
    
    // ✅ Extract deuce counts for logging
    let currentLiveScore = {};
    if (match.live_score) {
      currentLiveScore = typeof match.live_score === 'string' 
        ? JSON.parse(match.live_score) 
        : match.live_score;
    }
    const deuceCountBefore = currentLiveScore.current_game_deuce_count || 0;
    const deuceCountAfter = previousScore.current_game_deuce_count || 0;
    const wasDeuceCausingPoint = deuceCountBefore > deuceCountAfter;
    
    // ✅ Log undo action to match_undo_logs (internal tracking)
    try {
      await query(
        `INSERT INTO match_undo_logs (
          match_id, undone_by_user_id, undone_by_role,
          undone_event_id, undone_event_type, undone_event_data,
          match_status, current_set, current_game,
          score_before_undo, score_after_undo,
          deuce_count_before, deuce_count_after,
          was_match_end_undo, was_deuce_causing_point,
          participant_side, player_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matchId,
          refereeId,
          'referee',
          lastEvent.id,
          lastEvent.event_type,
          JSON.stringify(lastEvent),
          match.status,
          previousScore.current_set || null,
          previousScore.current_game || null,
          JSON.stringify(currentLiveScore),
          JSON.stringify(previousScore),
          deuceCountBefore,
          deuceCountAfter,
          false, // was_match_end_undo
          wasDeuceCausingPoint,
          lastEvent.participant_side,
          lastEvent.player_id || null
        ]
      );
      logger.info(`📝 Undo action logged for match ${matchId}`);
    } catch (logError) {
      logger.warn(`Could not log undo action: ${logError.message}`);
    }
    
    // ✅ Create meaningful undo event message for display
    const eventCountSql = `SELECT COUNT(*) as count FROM match_events WHERE match_id = ?`;
    const [eventCount] = await query(eventCountSql, [matchId]);
    const eventOrder = (eventCount?.count || 0) + 1;
    
    // Get player/participant name who scored the undone point
    let undoneByName = null;
    if (lastEvent.player_id) {
      const playerSql = `SELECT first_name, last_name FROM users WHERE id = ?`;
      const [player] = await query(playerSql, [lastEvent.player_id]);
      if (player) {
        undoneByName = `${player.first_name} ${player.last_name}`;
      }
    }
    
    // If no player name, get participant name
    if (!undoneByName) {
      const participantSql = `
        SELECT 
          CASE 
            WHEN ? = 'participant1' THEN 
              CASE 
                WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su1.first_name, ' ', su1.last_name)
                WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp1.name
                WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st1.name
                WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(tu1.first_name, ' ', tu1.last_name)
                WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN tp1.name
                WHEN m.is_standalone = 0 AND t.category = 'teams' THEN tt1.name
                ELSE 'Participant 1'
              END
            WHEN ? = 'participant2' THEN 
              CASE 
                WHEN m.is_standalone = 1 AND m.category = 'singles' THEN CONCAT(su2.first_name, ' ', su2.last_name)
                WHEN m.is_standalone = 1 AND m.category = 'doubles' THEN sp2.name
                WHEN m.is_standalone = 1 AND m.category = 'teams' THEN st2.name
                WHEN m.is_standalone = 0 AND t.category = 'singles' THEN CONCAT(tu2.first_name, ' ', tu2.last_name)
                WHEN m.is_standalone = 0 AND t.category = 'doubles' THEN tp2.name
                WHEN m.is_standalone = 0 AND t.category = 'teams' THEN tt2.name
                ELSE 'Participant 2'
              END
          END as participant_name
        FROM matches m
        LEFT JOIN tournaments t ON m.tournament_id = t.id
        LEFT JOIN users su1 ON m.participant1_id = su1.id AND m.is_standalone = 1 AND m.category = 'singles'
        LEFT JOIN pairs sp1 ON m.participant1_id = sp1.id AND m.is_standalone = 1 AND m.category = 'doubles'
        LEFT JOIN teams st1 ON m.participant1_id = st1.id AND m.is_standalone = 1 AND m.category = 'teams'
        LEFT JOIN users su2 ON m.participant2_id = su2.id AND m.is_standalone = 1 AND m.category = 'singles'
        LEFT JOIN pairs sp2 ON m.participant2_id = sp2.id AND m.is_standalone = 1 AND m.category = 'doubles'
        LEFT JOIN teams st2 ON m.participant2_id = st2.id AND m.is_standalone = 1 AND m.category = 'teams'
        LEFT JOIN tournament_registrations tr1 ON m.participant1_id = tr1.id AND m.is_standalone = 0 AND t.category = 'singles'
        LEFT JOIN users tu1 ON tr1.user_id = tu1.id
        LEFT JOIN pairs tp1 ON m.participant1_id = tp1.id AND m.is_standalone = 0 AND t.category = 'doubles'
        LEFT JOIN teams tt1 ON m.participant1_id = tt1.id AND m.is_standalone = 0 AND t.category = 'teams'
        LEFT JOIN tournament_registrations tr2 ON m.participant2_id = tr2.id AND m.is_standalone = 0 AND t.category = 'singles'
        LEFT JOIN users tu2 ON tr2.user_id = tu2.id
        LEFT JOIN pairs tp2 ON m.participant2_id = tp2.id AND m.is_standalone = 0 AND t.category = 'doubles'
        LEFT JOIN teams tt2 ON m.participant2_id = tt2.id AND m.is_standalone = 0 AND t.category = 'teams'
        WHERE m.id = ?
      `;
      const [participant] = await query(participantSql, [
        lastEvent.participant_side,
        lastEvent.participant_side,
        matchId
      ]);
      if (participant) {
        undoneByName = participant.participant_name;
      }
    }
    
    // Generate meaningful undo message
    let undoActionText = 'point';
    if (lastEvent.event_type === 'goal') {
      undoActionText = 'goal';
    } else if (lastEvent.event_type === 'set_won') {
      undoActionText = 'set';
    } else if (lastEvent.event_type === 'game_won') {
      undoActionText = 'game';
    } else if (lastEvent.event_type === 'yellow_card') {
      undoActionText = 'yellow card';
    } else if (lastEvent.event_type === 'red_card') {
      undoActionText = 'red card';
    } else if (lastEvent.event_type === 'substitution') {
      undoActionText = 'substitution';
    }
    
    // Add score info to message with deuce count if applicable
    let scoreInfo = formatScoreForMessage(previousScore, sportName);
    
    // ✅ Add deuce count information if in deuce situation (use deuceCountAfter already declared above)
    if (deuceCountAfter > 0) {
      // Check if we're in a deuce situation
      let isInDeuce = false;
      
      if (['Tennis', 'Padel'].includes(sportName)) {
        const p1Points = previousScore.participant1?.current_game_points || 0;
        const p2Points = previousScore.participant2?.current_game_points || 0;
        isInDeuce = (p1Points >= 3 && p2Points >= 3);
      } else if (sportName === 'Volleyball') {
        const currentSet = previousScore.current_set || 1;
        const p1Score = previousScore.participant1?.set_scores?.[currentSet - 1] || 0;
        const p2Score = previousScore.participant2?.set_scores?.[currentSet - 1] || 0;
        isInDeuce = (p1Score >= 24 && p2Score >= 24);
      } else if (['Badminton', 'Table Tennis'].includes(sportName)) {
        const currentGame = previousScore.current_game || 1;
        const p1Score = previousScore.participant1?.game_scores?.[currentGame - 1] || 0;
        const p2Score = previousScore.participant2?.game_scores?.[currentGame - 1] || 0;
        isInDeuce = (p1Score >= 20 && p2Score >= 20);
      }
      
      if (isInDeuce) {
        scoreInfo += ` (Deuce #${deuceCountAfter})`;
      }
    }
    
    // Build final meaningful undo message
    let fullUndoMessage = '';
    if (undoneByName) {
      fullUndoMessage = `${undoneByName}'s ${undoActionText} undone, score reverted to ${scoreInfo}`;
    } else {
      fullUndoMessage = `${undoActionText.charAt(0).toUpperCase() + undoActionText.slice(1)} undone, score reverted to ${scoreInfo}`;
    }
    
    // Insert undo event into match_events for display
    await query(
      `INSERT INTO match_events (
        match_id, event_type, participant_side, player_id,
        match_time, score_snapshot, current_set, current_game,
        event_order, notes, event_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId,
        'undo',
        lastEvent.participant_side,
        lastEvent.player_id || null, // Include player who scored the undone point
        previousScore.match_time || null,
        JSON.stringify(previousScore),
        previousScore.current_set || 1,
        previousScore.current_game || null,
        eventOrder,
        `Undid ${lastEvent.event_type}`,
        fullUndoMessage
      ]
    );
    
    logger.info(`✅ Undo event created: "${fullUndoMessage}"`);
    
    // Get current elapsed_seconds from live match (to preserve timer)
    let currentElapsedSeconds = null;
    let currentMatchTime = null;
    
    if (match.live_score) {
      const currentLiveScore = typeof match.live_score === 'string' 
        ? JSON.parse(match.live_score) 
        : match.live_score;
      currentElapsedSeconds = currentLiveScore.elapsed_seconds;
      currentMatchTime = currentLiveScore.match_time;
    }
    
    // Restore previous score BUT keep current timer
    if (currentElapsedSeconds !== null) {
      previousScore.elapsed_seconds = currentElapsedSeconds;
      previousScore.match_time = currentMatchTime;
      logger.info(`⏱️ [UNDO] Preserving timer: elapsed_seconds=${currentElapsedSeconds}, match_time=${currentMatchTime}`);
    }
    
    // Update match with previous score (with preserved timer)
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          current_set = ?,
          current_game = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [
      JSON.stringify(previousScore),
      previousScore.current_set || null,
      previousScore.current_game || null,
      matchId
    ]);
    
    logger.info(`✅ Last event undone in match ${matchId}: ${lastEvent.event_type}`);
    
    // Broadcast undo via WebSocket
    if (io) {
      broadcastMatchUpdate(io, matchId, 'score_undo', {
        liveScore: previousScore,
        undone_event: {
          type: lastEvent.event_type,
          participant_side: lastEvent.participant_side
        }
      });
      logger.info(`📡 Broadcasted undo event for match ${matchId}`);
    }
    
    return {
      success: true,
      message: `${lastEvent.event_type} undone successfully`,
      live_score: previousScore,
      undone_event: lastEvent.event_type
    };
  } catch (error) {
    logger.error('Undo point error:', error);
    throw error;
  }
};

/**
 * Record event (non-scoring)
 */
const recordEvent = async (matchId, eventData, io = null) => {
  try {
    const eventCountSql = `SELECT COUNT(*) as count FROM match_events WHERE match_id = ?`;
    const [eventCount] = await query(eventCountSql, [matchId]);
    const eventOrder = (eventCount?.count || 0) + 1;
    
    // Handle substitution - update player status in match_player_status table
    if (eventData.event_type === 'substitution') {
      logger.info('Processing substitution event:', {
        player_id: eventData.player_id,
        metadata: eventData.metadata,
        participant_side: eventData.participant_side
      });
      
      if (!eventData.metadata?.player_in_id) {
        logger.error('❌ Substitution missing player_in_id in metadata');
        throw new Error('Substitution requires player_in_id in metadata');
      }
      
      const playerOutId = eventData.player_id;
      const playerInId = eventData.metadata.player_in_id;
      
      // Get match details to find team_id
      const matchSql = `
        SELECT 
          CASE 
            WHEN ? = 'participant1' THEN participant1_id
            WHEN ? = 'participant2' THEN participant2_id
          END as team_id
        FROM matches 
        WHERE id = ?
      `;
      const [matchInfo] = await query(matchSql, [
        eventData.participant_side,
        eventData.participant_side,
        matchId
      ]);
      
      if (!matchInfo || !matchInfo.team_id) {
        logger.error('❌ Could not find team_id for substitution');
        throw new Error('Could not find team for substitution');
      }
      
      // Use the new player status service
      await matchPlayerStatusService.performSubstitution(
        matchId,
        matchInfo.team_id,
        playerOutId,
        playerInId
      );
      
      logger.info(`✅ Substitution completed: Player ${playerOutId} OUT, Player ${playerInId} IN for match ${matchId}`);
    }
    
    const eventSql = `
      INSERT INTO match_events (
        match_id, event_type, participant_side, player_id,
        match_time, score_snapshot, current_set, current_game, event_order, notes, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(eventSql, [
      matchId,
      eventData.event_type,
      eventData.participant_side,
      eventData.player_id || null,
      eventData.match_time || null,
      JSON.stringify(eventData.score_snapshot || {}),
      eventData.current_set || 1,
      eventData.current_game || null,
      eventOrder,
      eventData.notes || null,
      JSON.stringify(eventData.metadata || {})
    ]);
    
    logger.info(`Event recorded for match ${matchId}: ${eventData.event_type}`);
    
    // Broadcast event via WebSocket
    if (io) {
      broadcastMatchUpdate(io, matchId, eventData.event_type, {
        event_id: result.insertId,
        event_type: eventData.event_type,
        participant_side: eventData.participant_side,
        player_id: eventData.player_id,
        metadata: eventData.metadata,
        notes: eventData.notes
      });
      logger.info(`📡 Broadcasted ${eventData.event_type} event for match ${matchId}`);
    }
    
    return {
      success: true,
      message: 'Event recorded',
      event_id: result.insertId
    };
  } catch (error) {
    logger.error('Record event error:', error);
    throw error;
  }
};

/**
 * End match
 */
const endMatch = async (matchId, refereeId) => {
  try {
    // Get match
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(t.best_of_sets, m.best_of_sets) as best_of_sets
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ? AND m.referee_id = ?
    `;
    
    const [match] = await query(matchSql, [matchId, refereeId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }
    
    // Get live score
    const liveScore = match.live_score ? JSON.parse(match.live_score) : {};
    
    // Determine winner
    let winnerId = null;
    if (liveScore.participant1 && liveScore.participant2) {
      if (liveScore.participant1.sets_won > liveScore.participant2.sets_won) {
        winnerId = match.participant1_id;
      } else if (liveScore.participant2.sets_won > liveScore.participant1.sets_won) {
        winnerId = match.participant2_id;
      }
    }
    
    // Update match
    const updateSql = `
      UPDATE matches 
      SET status = 'completed',
          actual_end_time = NOW(),
          winner_participant_id = ?,
          score = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [winnerId, JSON.stringify(liveScore), matchId]);
    
    // For Football matches, create segment timing records if they don't exist
    if (liveScore.sport === 'Football' && liveScore.timing_summary) {
      try {
        const timing = liveScore.timing_summary;
        
        // Check if segments already exist
        const existingSegments = await query(
          'SELECT segment_type, segment_number FROM match_segment_timings WHERE match_id = ?',
          [matchId]
        );
        
        const hasHalf1 = existingSegments.some(s => s.segment_type === 'half' && s.segment_number === 1);
        const hasBreak = existingSegments.some(s => s.segment_type === 'break' && s.segment_number === 1);
        const hasHalf2 = existingSegments.some(s => s.segment_type === 'half' && s.segment_number === 2);
        
        // Create Half 1 segment if not exists
        if (!hasHalf1 && timing.first_half) {
          await query(
            `INSERT INTO match_segment_timings 
             (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, additional_time_seconds, status)
             VALUES (?, 'half', 1, ?, ?, ?, ?, ?, 'completed')`,
            [
              matchId,
              match.actual_start_time,
              new Date(new Date(match.actual_start_time).getTime() + timing.first_half.elapsed * 1000),
              timing.first_half.elapsed,
              formatDuration(timing.first_half.elapsed),
              timing.first_half.additional_time || 0
            ]
          );
          logger.info(`Created Half 1 segment for match ${matchId}`);
        }
        
        // Create Break segment if not exists
        if (!hasBreak && timing.break && timing.break.elapsed > 0) {
          const breakStart = new Date(new Date(match.actual_start_time).getTime() + timing.first_half.elapsed * 1000);
          await query(
            `INSERT INTO match_segment_timings 
             (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, additional_time_seconds, status)
             VALUES (?, 'break', 1, ?, ?, ?, ?, ?, 'completed')`,
            [
              matchId,
              breakStart,
              new Date(breakStart.getTime() + timing.break.elapsed * 1000),
              timing.break.elapsed,
              formatDuration(timing.break.elapsed),
              timing.break.additional_time || 0
            ]
          );
          logger.info(`Created Break segment for match ${matchId}`);
        }
        
        // Create Half 2 segment if not exists
        if (!hasHalf2 && timing.second_half && timing.second_half.elapsed > 0) {
          const half2Start = new Date(new Date(match.actual_start_time).getTime() + (timing.first_half.elapsed + timing.break.elapsed) * 1000);
          await query(
            `INSERT INTO match_segment_timings 
             (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, additional_time_seconds, status)
             VALUES (?, 'half', 2, ?, ?, ?, ?, ?, 'completed')`,
            [
              matchId,
              half2Start,
              match.actual_end_time || new Date(half2Start.getTime() + timing.second_half.elapsed * 1000),
              timing.second_half.elapsed,
              formatDuration(timing.second_half.elapsed),
              timing.second_half.additional_time || 0
            ]
          );
          logger.info(`Created Half 2 segment for match ${matchId}`);
        }
      } catch (err) {
        logger.error(`Error creating segment timings for match ${matchId}:`, err);
        // Don't fail the match end if segment creation fails
      }
    }
    
    // Record match end event
    await recordEvent(matchId, {
      event_type: 'match_end',
      participant_side: winnerId === match.participant1_id ? 'participant1' : 'participant2',
      match_time: liveScore.match_time || null,
      score_snapshot: liveScore,
      notes: `Match ended. Winner: ${winnerId}`
    }, io);
    
    logger.info(`Match ${matchId} ended. Winner: ${winnerId}`);
    
    return {
      success: true,
      message: 'Match ended successfully',
      winner_id: winnerId,
      final_score: liveScore
    };
  } catch (error) {
    logger.error('End match error:', error);
    throw error;
  }
};

/**
 * Get live score
 */
const getLiveScore = async (matchId) => {
  try {
    const sql = `SELECT live_score FROM matches WHERE id = ?`;
    const [match] = await query(sql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = match.live_score;
    
    // Parse if it's a string, otherwise use as-is
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    
    return liveScore;
  } catch (error) {
    logger.error('Get live score error:', error);
    throw error;
  }
};

/**
 * Get match events with player details
 */
const getMatchEvents = async (matchId, limit = 50) => {
  try {
    const sql = `
      SELECT 
        me.*,
        u.first_name as player_first_name,
        u.last_name as player_last_name,
        assist.first_name as assist_first_name,
        assist.last_name as assist_last_name,
        player_in.first_name as player_in_first_name,
        player_in.last_name as player_in_last_name
      FROM match_events me
      LEFT JOIN users u ON me.player_id = u.id
      LEFT JOIN users assist ON JSON_EXTRACT(me.metadata, '$.assist_player_id') = assist.id
      LEFT JOIN users player_in ON JSON_EXTRACT(me.metadata, '$.player_in_id') = player_in.id
      WHERE me.match_id = ? 
        AND (me.is_undone = FALSE OR me.event_type = 'undo')
      ORDER BY me.event_order DESC 
      LIMIT ?
    `;
    
    const events = await query(sql, [matchId, limit]);
    
    return events.map(event => {
      let scoreSnapshot = event.score_snapshot;
      
      // Parse if it's a string, otherwise use as-is
      if (typeof scoreSnapshot === 'string') {
        scoreSnapshot = JSON.parse(scoreSnapshot);
      }
      
      let metadata = event.metadata;
      
      // Parse metadata if it's a string
      if (typeof metadata === 'string') {
        metadata = JSON.parse(metadata);
      }
      
      // Build player name
      const playerName = event.player_first_name && event.player_last_name
        ? `${event.player_first_name} ${event.player_last_name}`
        : null;
      
      // Build assist player name
      const assistPlayerName = event.assist_first_name && event.assist_last_name
        ? `${event.assist_first_name} ${event.assist_last_name}`
        : null;
      
      // Build player_in name (for substitutions)
      const playerInName = event.player_in_first_name && event.player_in_last_name
        ? `${event.player_in_first_name} ${event.player_in_last_name}`
        : null;
      
      // Add player_in_name to metadata for substitutions
      if (playerInName && event.event_type === 'substitution') {
        metadata = {
          ...metadata,
          player_in_name: playerInName
        };
      }
      
      return {
        ...event,
        score_snapshot: scoreSnapshot,
        metadata: metadata,
        player_name: playerName,
        assist_player_name: assistPlayerName
      };
    });
  } catch (error) {
    logger.error('Get match events error:', error);
    throw error;
  }
};

/**
 * Get score details
 */
const getScoreDetails = async (matchId) => {
  try {
    const sql = `
      SELECT * FROM match_score_details 
      WHERE match_id = ? 
      ORDER BY set_number ASC
    `;
    
    const details = await query(sql, [matchId]);
    return details;
  } catch (error) {
    logger.error('Get score details error:', error);
    throw error;
  }
};

/**
 * Update match timer (for Football)
 */
const updateMatchTimer = async (matchId, refereeId, elapsedSeconds, currentHalf, io = null) => {
  try {
    // Get match
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        COALESCE(m.match_config, t.match_config) as match_config,
        s.name as sport_name
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ? AND m.referee_id = ?
    `;
    const [match] = await query(matchSql, [matchId, refereeId]);
    
    if (!match) {
      throw new Error('Match not found or referee not assigned');
    }
    
    if (match.status !== 'in_progress') {
      throw new Error(`Match is not in progress. Current status: ${match.status}. Please start the match first.`);
    }
    
    // Get current live score
    let liveScore = match.live_score;
    if (typeof liveScore === 'string') {
      try {
        liveScore = JSON.parse(liveScore);
      } catch (e) {
        liveScore = null;
      }
    }
    
    // If no live score exists, initialize it
    if (!liveScore) {
      logger.warn(`Match ${matchId} has no live score, initializing now...`);
      liveScore = await initializeLiveScore(matchId, match.sport_id);
      
      // Save initialized live score
      const initSql = `UPDATE matches SET live_score = ? WHERE id = ?`;
      await query(initSql, [JSON.stringify(liveScore), matchId]);
    }
    
    // Check if match was already completed before this update
    const wasAlreadyCompleted = liveScore.match_complete === true;
    
    // Get match configuration
    let matchConfig = match.match_config;
    if (typeof matchConfig === 'string') {
      matchConfig = JSON.parse(matchConfig);
    }
    
    const periodDuration = liveScore.period_duration || matchConfig?.period_duration || 45; // minutes
    const breakDuration = matchConfig?.break_duration || 15; // minutes
    let periodDurationSeconds = periodDuration * 60;
    const breakDurationSeconds = breakDuration * 60;
    
    // For extra time halves (3 and 4), use extra_time_half_duration instead
    if (currentHalf === 3 || currentHalf === 4) {
      const extraTimeHalfDuration = liveScore.extra_time_half_duration || 15; // minutes
      periodDurationSeconds = extraTimeHalfDuration * 60;
      logger.info(`⏱️ Extra Time Half ${currentHalf}: Using ${extraTimeHalfDuration} min duration`);
    }
    
    // Store previous half to detect changes
    const previousHalf = liveScore.current_half || 1;
    
    // HYBRID MODE: Manual control + Automatic transitions when time expires
    let newHalf = currentHalf;
    // IMPORTANT: Preserve is_on_break from database, don't reset it!
    let isOnBreak = liveScore.is_on_break || false;
    
    // Calculate time thresholds
    const totalFirstHalf = periodDurationSeconds;
    const totalBreak = totalFirstHalf + breakDurationSeconds;
    const totalSecondHalf = totalBreak + periodDurationSeconds;
    
    // Auto-transition when time expires (if not manually controlled)
    if (!liveScore.half_1_duration && elapsedSeconds >= totalFirstHalf && currentHalf === 1 && !isOnBreak) {
      // 1st half time expired - auto end it
      logger.info(`⏰ 1st half time expired at ${elapsedSeconds}s - auto-ending`);
      // Don't auto-end here, just let timer continue (manual end required)
    }
    
    // Timer continues running even after regulation time for overtime
    
    // Update timer fields
    // Use COMPLETELY SEPARATE timer for extra time
    if (liveScore.is_extra_time) {
      // Extra time uses its own timer
      liveScore.extra_time_elapsed_seconds = elapsedSeconds;
      // DON'T touch elapsed_seconds or current_half (keep regular time frozen)
    } else {
      // Regular time timer
      liveScore.elapsed_seconds = elapsedSeconds;
      liveScore.current_half = newHalf;
    }
    liveScore.is_on_break = isOnBreak;
    
    // Calculate match_time in MM:SS format (time in current half)
    let timeInCurrentPeriod = elapsedSeconds;
    
    // SEPARATE calculation for extra time
    if (liveScore.is_extra_time && !isOnBreak) {
      // ✅ CUMULATIVE TIMER: Add base time (regular match total) to extra time
      let baseSeconds = liveScore.extra_time_base_seconds;
      
      // If base_seconds not set, calculate it now from match config
      if (!baseSeconds || baseSeconds === 0) {
        const matchConfig = typeof match.match_config === 'string' 
          ? JSON.parse(match.match_config) 
          : match.match_config;
        const periodDurationMinutes = matchConfig?.period_duration || liveScore.half_duration || 45;
        const periods = matchConfig?.periods || 2;
        baseSeconds = periodDurationMinutes * periods * 60;
        liveScore.extra_time_base_seconds = baseSeconds; // Save it for next time
        logger.warn(`⚠️ extra_time_base_seconds was not set! Calculated from config: ${baseSeconds}s`);
      }
      
      // Use extra_time_elapsed_seconds if available, otherwise use elapsedSeconds
      const extraElapsed = liveScore.extra_time_elapsed_seconds || elapsedSeconds || 0;
      const extraHalf = liveScore.extra_time_current_half || 1;
      
      logger.info(`⏱️ Extra time timer update: baseSeconds=${baseSeconds}, extraElapsed=${extraElapsed}, extraHalf=${extraHalf}, elapsedSeconds=${elapsedSeconds}`);
      
      let extraTimeInCurrentPeriod = 0;
      if (extraHalf === 1) {
        // Extra time 1st half - use extraElapsed directly
        extraTimeInCurrentPeriod = extraElapsed;
      } else {
        // Extra time 2nd half
        const half1Duration = liveScore.extra_time_half_1_duration || 0;
        const extraTimeBreakDuration = liveScore.extra_time_config?.break_duration_seconds || 0;
        extraTimeInCurrentPeriod = extraElapsed - half1Duration - extraTimeBreakDuration;
      }
      
      if (extraTimeInCurrentPeriod < 0) extraTimeInCurrentPeriod = 0;
      
      // Add base time to show cumulative timer (e.g., 120 + 5 = 125 = 02:05)
      timeInCurrentPeriod = baseSeconds + extraTimeInCurrentPeriod;
      
      logger.info(`⏱️ Extra time calculated: extraTimeInCurrentPeriod=${extraTimeInCurrentPeriod}, total=${timeInCurrentPeriod}`);
      
    } else if (liveScore.is_extra_time && isOnBreak) {
      // ✅ EXTRA TIME BREAK: Show cumulative time (frozen at end of extra time 1st half)
      const baseSeconds = liveScore.extra_time_base_seconds || 0;
      const extraHalf1Duration = liveScore.extra_time_half_1_duration || 0;
      timeInCurrentPeriod = baseSeconds + extraHalf1Duration; // e.g., 90:00 + 5:00 = 95:00
      
    } else if (elapsedSeconds === 0) {
      // Manual reset - show 00:00
      timeInCurrentPeriod = 0;
    } else if (newHalf === 2 && !isOnBreak) {
      // Second half - calculate time from half_2_start_time (manual control)
      const half2StartTime = liveScore.half_2_start_elapsed || totalBreak;
      timeInCurrentPeriod = elapsedSeconds - half2StartTime;
      // Ensure non-negative
      if (timeInCurrentPeriod < 0) {
        timeInCurrentPeriod = 0;
      }
    } else if (isOnBreak) {
      // During break - show break time
      timeInCurrentPeriod = elapsedSeconds - totalFirstHalf;
      // Ensure non-negative
      if (timeInCurrentPeriod < 0) {
        timeInCurrentPeriod = 0;
      }
    }
    
    // Check for overtime (time exceeds regulation)
    const isOvertime = timeInCurrentPeriod > periodDurationSeconds;
    const overtimeSeconds = isOvertime ? timeInCurrentPeriod - periodDurationSeconds : 0;
    
    // Store overtime info
    liveScore.is_overtime = isOvertime;
    liveScore.overtime_seconds = overtimeSeconds;
    
    // Format time display
    if (isOvertime && !isOnBreak) {
      // Show as "45:00 + 2:30" format
      const baseMinutes = Math.floor(periodDurationSeconds / 60);
      const baseSeconds = periodDurationSeconds % 60;
      const baseTime = `${baseMinutes.toString().padStart(2, '0')}:${baseSeconds.toString().padStart(2, '0')}`;
      
      const extraMinutes = Math.floor(overtimeSeconds / 60);
      const extraSeconds = overtimeSeconds % 60;
      const extraTime = `${extraMinutes.toString().padStart(2, '0')}:${extraSeconds.toString().padStart(2, '0')}`;
      
      liveScore.match_time = `${baseTime} + ${extraTime}`;
    } else {
      // Normal time display
      const minutes = Math.floor(Math.abs(timeInCurrentPeriod) / 60);
      const seconds = Math.abs(timeInCurrentPeriod) % 60;
      liveScore.match_time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Debug log for extra time
      if (liveScore.is_extra_time) {
        logger.info(`📺 Match time formatted: ${liveScore.match_time} (from timeInCurrentPeriod=${timeInCurrentPeriod})`);
      }
    }
    
    // Check if match just completed (time ran out)
    if (liveScore.match_complete && !wasAlreadyCompleted) {
      // Determine winner based on score
      const p1Goals = liveScore.participant1?.goals || 0;
      const p2Goals = liveScore.participant2?.goals || 0;
      
      if (p1Goals > p2Goals) {
        liveScore.match_winner = 'participant1';
      } else if (p2Goals > p1Goals) {
        liveScore.match_winner = 'participant2';
      } else {
        liveScore.match_winner = 'draw';
      }
      
      // Get match details for participant IDs
      const matchSql = `SELECT participant1_id, participant2_id, tournament_id FROM matches WHERE id = ?`;
      const [match] = await query(matchSql, [matchId]);
      
      const winnerParticipantId = liveScore.match_winner === 'participant1' 
        ? match.participant1_id 
        : liveScore.match_winner === 'participant2'
        ? match.participant2_id
        : null;
      
      // Update match as completed
      const completeSql = `
        UPDATE matches 
        SET live_score = ?,
            status = 'completed',
            actual_end_time = NOW(),
            winner_participant_id = ?
        WHERE id = ?
      `;
      
      await query(completeSql, [
        JSON.stringify(liveScore),
        winnerParticipantId,
        matchId
      ]);
      
      logger.info(`⏱️ Match ${matchId} completed by timer! Winner: ${liveScore.match_winner} (Participant ID: ${winnerParticipantId})`);
      
      // Advance winner to next round and check tournament completion (only for tournament matches)
      try {
        const matchData = await query(
          'SELECT m.tournament_id, m.group_id, m.is_standalone, t.format_type FROM matches m LEFT JOIN tournaments t ON m.tournament_id = t.id WHERE m.id = ?', 
          [matchId]
        );
        
        if (matchData && matchData[0]) {
          const { tournament_id, group_id, is_standalone, format_type } = matchData[0];
          
          // Skip tournament logic for standalone matches
          if (is_standalone) {
            logger.info(`✅ [MATCH SCORING] Standalone match ${matchId} completed - no tournament standings to update`);
          } else if (tournament_id && format_type) {
            // Update standings or advance winner based on format (tournament matches only)
            if (format_type === 'knockout') {
            const bracketService = require('./bracketService');
            await bracketService.advanceWinner(matchId, winnerParticipantId);
            logger.info(`Advanced winner ${winnerParticipantId} to next round`);
          } else if (format_type === 'groups_knockout') {
            // For groups_knockout: group stage matches update standings, knockout matches advance winner
            if (group_id) {
              // Group stage match - update standings
              logger.info(`📊 [MATCH SCORING] Group stage match - updating standings`);
              const { processTournamentAfterMatch } = require('./matchService');
              await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
              logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
            } else {
              // Knockout stage match - advance winner
              logger.info(`🏆 [MATCH SCORING] Knockout stage match - advancing winner`);
              const bracketService = require('./bracketService');
              await bracketService.advanceWinner(matchId, winnerParticipantId);
              logger.info(`Advanced winner ${winnerParticipantId} to next round`);
            }
          } else if (format_type === 'round_robin' || format_type === 'league') {
            // Update standings for league/round-robin formats
            logger.info(`📊 [MATCH SCORING] Updating standings for ${format_type} tournament`);
            const { processTournamentAfterMatch } = require('./matchService');
            await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
            logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
          }
            
            // Check if all tournament matches are completed
            await checkAndCompleteTournament(tournament_id);
          }
        }
      } catch (err) {
        logger.error('Error advancing winner or checking tournament completion:', err);
      }
      
      // Broadcast match completion via WebSocket
      if (io) {
        broadcastMatchCompleted(io, matchId, winnerParticipantId, liveScore);
      }
      
      return {
        success: true,
        match_complete: true,
        winner: liveScore.match_winner,
        winner_participant_id: winnerParticipantId,
        live_score: liveScore,
        half_changed: newHalf !== previousHalf,
        is_on_break: isOnBreak
      };
    }
    
    // Update in database
    const updateSql = `UPDATE matches SET live_score = ? WHERE id = ?`;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Broadcast timer update via WebSocket
    if (io) {
      const room = `match_${matchId}`;
      const halfChanged = newHalf !== previousHalf;
      io.of('/scoring').to(room).emit('match_update', {
        matchId,
        eventType: 'timer_update',
        data: {
          liveScore: liveScore,
          half_changed: halfChanged,
          is_on_break: isOnBreak
        },
        timestamp: new Date().toISOString()
      });
      logger.info(`⏱️ Broadcasted timer update to room: ${room} - Half: ${newHalf}${halfChanged ? ' (CHANGED)' : ''}, Time: ${liveScore.match_time}`);
    }
    
    return {
      success: true,
      live_score: liveScore,
      half_changed: newHalf !== previousHalf,
      is_on_break: isOnBreak
    };
  } catch (error) {
    logger.error('Update match timer error:', error);
    throw error;
  }
};

/**
 * Delete event
 */
const deleteEvent = async (eventId, matchId, refereeId) => {
  try {
    // Verify referee owns this match
    const matchSql = `SELECT referee_id FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match || match.referee_id !== refereeId) {
      throw new Error('Unauthorized');
    }
    
    const deleteSql = `DELETE FROM match_events WHERE id = ? AND match_id = ?`;
    await query(deleteSql, [eventId, matchId]);
    
    logger.info(`Event ${eventId} deleted from match ${matchId}`);
    
    return { success: true, message: 'Event deleted' };
  } catch (error) {
    logger.error('Delete event error:', error);
    throw error;
  }
};

/**
 * Record penalty kick (Penalty Shootout)
 */
const recordPenaltyKick = async (matchId, refereeId, participantSide, playerId, result, io = null) => {
  try {
    // Get match details (support both tournament and standalone matches)
    const matchSql = `
      SELECT m.*, 
             COALESCE(t.sport_id, m.sport_id) as sport_id,
             s.name as sport_name
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(t.sport_id, m.sport_id) = s.id
      WHERE m.id = ?
    `;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Verify referee
    if (match.referee_id !== refereeId) {
      throw new Error('Only the assigned referee can record penalty kicks');
    }
    
    // Verify match is in progress (penalty shootout)
    if (match.status !== 'in_progress') {
      throw new Error(`Cannot record penalty kicks for match with status: ${match.status}`);
    }
    
    // Get current live score
    let liveScore = match.live_score;
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }
    
    // Verify penalty shootout is active
    if (!liveScore.is_penalty_shootout || !liveScore.penalty_shootout) {
      throw new Error('Penalty shootout is not active for this match');
    }
    
    // ✅ VALIDATION: Check if player already took a kick in first 5 rounds
    const ps = liveScore.penalty_shootout;
    if (!ps.sudden_death && ps.current_round <= 5) {
      // In first 5 rounds, each player can only kick once per team
      const teamKicks = ps.kicks.filter(kick => kick.participant_side === participantSide);
      const playerAlreadyKicked = teamKicks.some(kick => kick.player_id === playerId);
      
      if (playerAlreadyKicked) {
        throw new Error('This player has already taken a penalty kick in this shootout. Each player can only kick once in the first 5 rounds.');
      }
    }
    
    // Get player name (kicker)
    const playerSql = `SELECT first_name, last_name FROM users WHERE id = ?`;
    const [player] = await query(playerSql, [playerId]);
    const playerName = player ? `${player.first_name} ${player.last_name}` : 'Unknown Player';
    
    // Get goalkeeper name (for saved penalties)
    let goalkeeperName = null;
    if (result === 'saved') {
      // Determine opponent team
      const opponentSide = participantSide === 'participant1' ? 'participant2' : 'participant1';
      const opponentTeamId = participantSide === 'participant1' ? match.participant2_id : match.participant1_id;
      
      // Find goalkeeper from opponent team's squad
      const goalkeeperSql = `
        SELECT u.first_name, u.last_name 
        FROM match_squads ms
        JOIN users u ON ms.user_id = u.id
        WHERE ms.match_id = ? 
        AND ms.team_id = ? 
        AND ms.position_label = 'Goalkeeper'
        ORDER BY ms.is_starting DESC, ms.id ASC
        LIMIT 1
      `;
      const [goalkeeper] = await query(goalkeeperSql, [matchId, opponentTeamId]);
      goalkeeperName = goalkeeper ? `${goalkeeper.first_name} ${goalkeeper.last_name}` : null;
    }
    
    // Get scoring calculator
    const { footballScoring } = require('../utils/scoringCalculators');
    
    // Record penalty kick (pass playerId for validation)
    liveScore = footballScoring.recordPenaltyKick(liveScore, participantSide, result, playerId);
    
    // Add player name and goalkeeper name to the last kick
    const lastKick = liveScore.penalty_shootout.kicks[liveScore.penalty_shootout.kicks.length - 1];
    if (lastKick) {
      lastKick.player_name = playerName;
      if (goalkeeperName) {
        lastKick.goalkeeper_name = goalkeeperName;
      }
    }
    
    // Get event order
    const eventCountSql = `SELECT COUNT(*) as count FROM match_events WHERE match_id = ?`;
    const [eventCount] = await query(eventCountSql, [matchId]);
    const eventOrder = (eventCount?.count || 0) + 1;
    
    // Generate exciting penalty expression
    const penaltyExpressions = {
      scored: ['GOAL! Penalty scored!', 'Converted!', 'Perfect penalty!', 'Into the net!', 'Cool as ice!', 'No chance for the keeper!'],
      missed: ['Missed!', 'Over the bar!', 'Wide!', 'Skied it!', 'Pressure got to them!'],
      saved: ['SAVED!', 'Great save!', 'Keeper hero!', 'Denied!', 'What a stop!', 'Brilliant save!']
    };
    const expressions = penaltyExpressions[result] || ['Penalty taken'];
    const excitement = expressions[Math.floor(Math.random() * expressions.length)];
    
    // Use the UPDATED penalty shootout data (after recording the kick)
    const updatedPs = liveScore.penalty_shootout;
    const metadata = {
      result: result,
      round: updatedPs.current_round,
      kick_number: updatedPs.kicks.length,
      sudden_death: updatedPs.sudden_death,
      excitement: excitement,
      score: `${updatedPs.participant1_scored}-${updatedPs.participant2_scored}`,
      goalkeeper_name: goalkeeperName // Add goalkeeper name for saved penalties
    };
    
    // Record event
    const eventSql = `
      INSERT INTO match_events (
        match_id, event_type, participant_side, player_id,
        match_time, metadata, score_snapshot, event_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result_db = await query(eventSql, [
      matchId,
      'penalty_kick',
      participantSide,
      playerId,
      `Penalty ${updatedPs.kicks.length}`,
      JSON.stringify(metadata),
      JSON.stringify(liveScore),
      eventOrder
    ]);
    
    const eventId = result_db.insertId;
    
    // Fetch complete event details with player names
    const eventDetailsSql = `
      SELECT 
        me.*,
        u.first_name as player_first_name,
        u.last_name as player_last_name
      FROM match_events me
      LEFT JOIN users u ON me.player_id = u.id
      WHERE me.id = ?
    `;
    
    const [eventDetails] = await query(eventDetailsSql, [eventId]);
    
    // Format event same as getMatchEvents API
    const formattedEvent = {
      ...eventDetails,
      metadata: typeof eventDetails.metadata === 'string' ? JSON.parse(eventDetails.metadata) : eventDetails.metadata,
      score_snapshot: typeof eventDetails.score_snapshot === 'string' ? JSON.parse(eventDetails.score_snapshot) : eventDetails.score_snapshot,
      player_name: eventDetails.player_first_name && eventDetails.player_last_name
        ? `${eventDetails.player_first_name} ${eventDetails.player_last_name}`
        : null
    };
    
    // Check if penalty shootout is complete
    if (liveScore.match_complete) {
      // Determine winner participant ID
      const winnerParticipantId = liveScore.match_winner === 'participant1' 
        ? match.participant1_id 
        : match.participant2_id;
      
      const updateSql = `
        UPDATE matches 
        SET live_score = ?,
            status = 'completed',
            actual_end_time = NOW(),
            winner_participant_id = ?
        WHERE id = ?
      `;
      
      await query(updateSql, [
        JSON.stringify(liveScore),
        winnerParticipantId,
        matchId
      ]);
      
      logger.info(`Match ${matchId} completed via penalty shootout! Winner: ${liveScore.match_winner} (Participant ID: ${winnerParticipantId})`);
      
      // Advance winner to next round and check tournament completion (only for tournament matches)
      try {
        const matchData = await query(
          'SELECT m.tournament_id, m.group_id, m.is_standalone, t.format_type FROM matches m LEFT JOIN tournaments t ON m.tournament_id = t.id WHERE m.id = ?', 
          [matchId]
        );
        
        if (matchData && matchData[0]) {
          const { tournament_id, group_id, is_standalone, format_type } = matchData[0];
          
          // Skip tournament logic for standalone matches
          if (is_standalone) {
            logger.info(`✅ [MATCH SCORING] Standalone match ${matchId} completed - no tournament standings to update`);
          } else if (tournament_id && format_type) {
            // Update standings or advance winner based on format (tournament matches only)
            if (format_type === 'knockout') {
            const bracketService = require('./bracketService');
            await bracketService.advanceWinner(matchId, winnerParticipantId);
            logger.info(`Advanced winner ${winnerParticipantId} to next round`);
          } else if (format_type === 'groups_knockout') {
            // For groups_knockout: group stage matches update standings, knockout matches advance winner
            if (group_id) {
              // Group stage match - update standings
              logger.info(`📊 [MATCH SCORING] Group stage match - updating standings`);
              const { processTournamentAfterMatch } = require('./matchService');
              await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
              logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
            } else {
              // Knockout stage match - advance winner
              logger.info(`🏆 [MATCH SCORING] Knockout stage match - advancing winner`);
              const bracketService = require('./bracketService');
              await bracketService.advanceWinner(matchId, winnerParticipantId);
              logger.info(`Advanced winner ${winnerParticipantId} to next round`);
            }
          } else if (format_type === 'round_robin' || format_type === 'league') {
            // Update standings for league/round-robin formats
            logger.info(`📊 [MATCH SCORING] Updating standings for ${format_type} tournament`);
            const { processTournamentAfterMatch } = require('./matchService');
            await processTournamentAfterMatch(tournament_id, matchId, winnerParticipantId);
            logger.info(`✅ [MATCH SCORING] Standings updated for match ${matchId}`);
          }
            
            // Check if all tournament matches are completed
            await checkAndCompleteTournament(tournament_id);
          }
        }
      } catch (err) {
        logger.error('Error advancing winner or checking tournament completion:', err);
      }
      
      // Broadcast match completion via WebSocket
      if (io) {
        const broadcastMatchCompleted = require('../websocket/scoringSocket').broadcastMatchCompleted;
        broadcastMatchCompleted(io, matchId, winnerParticipantId, liveScore);
        
        // Also broadcast the final penalty kick event
        const broadcastMatchUpdate = require('../websocket/scoringSocket').broadcastMatchUpdate;
        broadcastMatchUpdate(io, matchId, 'penalty_kick', { 
          liveScore, 
          participantSide, 
          playerId,
          result,
          event: formattedEvent
        });
      }
      
      return {
        success: true,
        message: 'Penalty shootout completed!',
        match_complete: true,
        winner: liveScore.match_winner,
        winner_participant_id: winnerParticipantId,
        live_score: liveScore,
        event: formattedEvent
      };
    }
    
    // Update live score in database (shootout continues)
    const updateSql = `
      UPDATE matches 
      SET live_score = ?
      WHERE id = ?
    `;
    
    await query(updateSql, [
      JSON.stringify(liveScore),
      matchId
    ]);
    
    // Broadcast penalty kick via WebSocket
    if (io) {
      const broadcastMatchUpdate = require('../websocket/scoringSocket').broadcastMatchUpdate;
      broadcastMatchUpdate(io, matchId, 'penalty_kick', { 
        liveScore, 
        participantSide, 
        playerId,
        result,
        event: formattedEvent
      });
    }
    
    logger.info(`Penalty kick recorded for match ${matchId}: ${participantSide} - ${result}`);
    
    return {
      success: true,
      message: 'Penalty kick recorded successfully!',
      match_complete: false,
      live_score: liveScore,
      event: formattedEvent
    };
  } catch (error) {
    logger.error('Record penalty kick error:', error);
    throw error;
  }
};

/**
 * Check if all tournament matches are completed and update tournament status
 */
const checkAndCompleteTournament = async (tournamentId) => {
  try {
    // Check if there are any pending/scheduled/in_progress matches
    const pendingMatchesSql = `
      SELECT COUNT(*) as pending_count
      FROM matches
      WHERE tournament_id = ?
        AND status IN ('pending', 'scheduled', 'in_progress')
    `;
    
    const [result] = await query(pendingMatchesSql, [tournamentId]);

    console.log("dev=====", result);
    
    
    if (result.pending_count === 0) {
      logger.info(`🏁 [TOURNAMENT] All matches completed for tournament ${tournamentId}`);
      
      // Get tournament format to determine if we need standings-based winner
      const tournamentSql = `SELECT format_type FROM tournaments WHERE id = ?`;
      const [tournament] = await query(tournamentSql, [tournamentId]);
      
      // For league/round-robin formats, determine winner from standings
      if (tournament && (tournament.format_type === 'league' || tournament.format_type === 'round_robin')) {
        logger.info(`📊 [TOURNAMENT] League/Round-robin format - determining winner from standings`);
        
        try {
          const tournamentWinnerService = require('./tournamentWinnerService');
          const winnerResult = await tournamentWinnerService.determineAndSetWinner(tournamentId);
          console.log("dev222222", winnerResult)
          
          if (winnerResult.success) {
            logger.info(`🏆 [TOURNAMENT] Winner determined: ${winnerResult.winner.participant_name}`);
            logger.info(`📊 [TOURNAMENT] Final standings: ${winnerResult.standings.length} participants`);
            
            if (winnerResult.tiebreaker) {
              logger.info(`🔍 [TOURNAMENT] Tiebreaker applied: ${winnerResult.tiebreaker.tiedCount} participants tied`);
            }
          } else {
            logger.warn(`⚠️ [TOURNAMENT] Could not determine winner: ${winnerResult.message}`);
          }
        } catch (winnerError) {
          logger.error('❌ [TOURNAMENT] Error determining winner:', winnerError);
          // Continue anyway - tournament will be marked as completed
        }
      } else {
        // For knockout/groups_knockout formats, determine winner from final match
        logger.info(`🏆 [TOURNAMENT] Knockout/Groups+Knockout format - determining winner from final match`);
        
        try {
          const tournamentWinnerService = require('./tournamentWinnerService');
          const winnerResult = await tournamentWinnerService.determineAndSetWinner(tournamentId);
          
          if (winnerResult.success) {
            logger.info(`🏆 [TOURNAMENT] Winner determined: ${winnerResult.winner.participant_name} (ID: ${winnerResult.winner.participant_id})`);
          } else {
            logger.warn(`⚠️ [TOURNAMENT] Could not determine winner: ${winnerResult.message}`);
          }
        } catch (winnerError) {
          logger.error('❌ [TOURNAMENT] Error determining winner:', winnerError);
          // Continue anyway - tournament will be marked as completed
        }
        
        // Mark tournament as completed
        const updateTournamentSql = `
          UPDATE tournaments
          SET status = 'completed',
              updated_at = NOW()
          WHERE id = ?
            AND status != 'completed'
        `;
        
        await query(updateTournamentSql, [tournamentId]);
      }
      
      logger.info(`✅ [TOURNAMENT] Tournament ${tournamentId} marked as completed`);
      
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Check and complete tournament error:', error);
    // Don't throw - this is a background operation
    return false;
  }
};

/**
 * Toggle Server (All Racket Sports)
 * Allows referee to manually switch the serving player/pair
 * Works for: Tennis, Padel, Badminton, Pickleball, Table Tennis, Squash
 * @param {number} matchId - Match ID
 * @param {number} refereeId - Referee ID
 * @param {object} io - Socket.io instance
 * @param {number|null} playerId - Optional player ID for doubles matches
 * @param {boolean} keepSamePair - If true, only change player within same pair (don't toggle pairs)
 */
const toggleServer = async (matchId, refereeId, io = null, playerId = null, keepSamePair = false) => {
  try {
    // Get match with sport info (support both tournament and standalone matches)
    const matchSql = `
      SELECT 
        m.*,
        COALESCE(t.category, m.category) as category,
        s.name as sport_name,
        s.category as sport_category,
        m.is_standalone
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ?
    `;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Verify sport is racket-based
    const racketSports = ['Tennis', 'Padel', 'Badminton', 'Pickleball', 'Table Tennis', 'Squash', 'Volleyball'];
    if (!racketSports.includes(match.sport_name)) {
      throw new Error('Server toggle is only available for racket sports');
    }
    
    // Verify match is in progress
    if (match.status !== 'in_progress') {
      throw new Error('Match must be in progress to toggle server');
    }
    
    // Get current live score
    let liveScore;
    if (typeof match.live_score === 'object') {
      liveScore = match.live_score;
    } else if (typeof match.live_score === 'string') {
      liveScore = JSON.parse(match.live_score);
    } else {
      throw new Error('Live score not initialized');
    }
    
    // Toggle server between participant1 and participant2
    const currentServer = liveScore.server || 'participant1';
    let newServer;
    
    if (keepSamePair) {
      // Keep same pair, only change player ID
      newServer = currentServer;
      logger.info(`🎾 Keeping same pair: ${currentServer}, changing player to ID ${playerId}`);
    } else {
      // Toggle to other pair
      newServer = currentServer === 'participant1' ? 'participant2' : 'participant1';
      logger.info(`🎾 Toggling to other pair: ${currentServer} → ${newServer}`);
    }
    
    liveScore.server = newServer;
    liveScore.serving_player = newServer; // For compatibility
    
    // Store player ID for doubles matches
    if (playerId) {
      liveScore.serving_player_id = playerId;
      logger.info(`🎾 Player-specific serving set: Player ID ${playerId}`);
    }
    
    // Update database
    const updateSql = `UPDATE matches SET live_score = ? WHERE id = ?`;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Get participant details for event description (handle both standalone and tournament matches)
    const participantSql = `
      SELECT 
        m.is_standalone, m.category,
        -- Tournament participants
        tp1.id as tp1_id, tp1.user_id as tp1_user_id, tp1.partnership_id as tp1_partnership_id, tp1.team_id as tp1_team_id,
        tp2.id as tp2_id, tp2.user_id as tp2_user_id, tp2.partnership_id as tp2_partnership_id, tp2.team_id as tp2_team_id,
        tu1.first_name as tp1_first_name, tu1.last_name as tp1_last_name,
        tu2.first_name as tp2_first_name, tu2.last_name as tp2_last_name,
        tpart1.player1_id as tp1_part_player1_id, tpart1.player2_id as tp1_part_player2_id,
        tpart2.player1_id as tp2_part_player1_id, tpart2.player2_id as tp2_part_player2_id,
        tpart1_u1.first_name as tp1_part_p1_first, tpart1_u1.last_name as tp1_part_p1_last,
        tpart1_u2.first_name as tp1_part_p2_first, tpart1_u2.last_name as tp1_part_p2_last,
        tpart2_u1.first_name as tp2_part_p1_first, tpart2_u1.last_name as tp2_part_p1_last,
        tpart2_u2.first_name as tp2_part_p2_first, tpart2_u2.last_name as tp2_part_p2_last,
        tt1.name as tp1_team_name, tt2.name as tp2_team_name,
        -- Standalone participants
        su1.first_name as su1_first_name, su1.last_name as su1_last_name,
        su2.first_name as su2_first_name, su2.last_name as su2_last_name,
        sp1.name as sp1_name, sp2.name as sp2_name,
        sp1.player1_id as sp1_player1_id, sp1.player2_id as sp1_player2_id,
        sp2.player1_id as sp2_player1_id, sp2.player2_id as sp2_player2_id,
        sp1_u1.first_name as sp1_p1_first, sp1_u1.last_name as sp1_p1_last,
        sp1_u2.first_name as sp1_p2_first, sp1_u2.last_name as sp1_p2_last,
        sp2_u1.first_name as sp2_p1_first, sp2_u1.last_name as sp2_p1_last,
        sp2_u2.first_name as sp2_p2_first, sp2_u2.last_name as sp2_p2_last,
        st1.name as st1_name, st2.name as st2_name
      FROM matches m
      -- Tournament participants
      LEFT JOIN tournament_participants tp1 ON m.participant1_id = tp1.id AND m.is_standalone = 0
      LEFT JOIN tournament_participants tp2 ON m.participant2_id = tp2.id AND m.is_standalone = 0
      LEFT JOIN users tu1 ON tp1.user_id = tu1.id
      LEFT JOIN users tu2 ON tp2.user_id = tu2.id
      LEFT JOIN partnerships tpart1 ON tp1.partnership_id = tpart1.id
      LEFT JOIN partnerships tpart2 ON tp2.partnership_id = tpart2.id
      LEFT JOIN users tpart1_u1 ON tpart1.player1_id = tpart1_u1.id
      LEFT JOIN users tpart1_u2 ON tpart1.player2_id = tpart1_u2.id
      LEFT JOIN users tpart2_u1 ON tpart2.player1_id = tpart2_u1.id
      LEFT JOIN users tpart2_u2 ON tpart2.player2_id = tpart2_u2.id
      LEFT JOIN teams tt1 ON tp1.team_id = tt1.id
      LEFT JOIN teams tt2 ON tp2.team_id = tt2.id
      -- Standalone participants
      LEFT JOIN users su1 ON m.participant1_id = su1.id AND m.is_standalone = 1 AND m.category = 'singles'
      LEFT JOIN users su2 ON m.participant2_id = su2.id AND m.is_standalone = 1 AND m.category = 'singles'
      LEFT JOIN pairs sp1 ON m.participant1_id = sp1.id AND m.is_standalone = 1 AND m.category = 'doubles'
      LEFT JOIN pairs sp2 ON m.participant2_id = sp2.id AND m.is_standalone = 1 AND m.category = 'doubles'
      LEFT JOIN users sp1_u1 ON sp1.player1_id = sp1_u1.id
      LEFT JOIN users sp1_u2 ON sp1.player2_id = sp1_u2.id
      LEFT JOIN users sp2_u1 ON sp2.player1_id = sp2_u1.id
      LEFT JOIN users sp2_u2 ON sp2.player2_id = sp2_u2.id
      LEFT JOIN teams st1 ON m.participant1_id = st1.id AND m.is_standalone = 1 AND m.category = 'teams'
      LEFT JOIN teams st2 ON m.participant2_id = st2.id AND m.is_standalone = 1 AND m.category = 'teams'
      WHERE m.id = ?
    `;
    const participantRows = await query(participantSql, [matchId]);
    const participants = participantRows[0];
    
    logger.info('📋 Participant data:', JSON.stringify(participants));
    
    // Build server name based on category and match type
    let serverName = 'Server';
    if (participants) {
      const isStandalone = participants.is_standalone === 1;
      const category = participants.category;
      
      if (newServer === 'participant1') {
        if (isStandalone) {
          // Standalone match
          if (category === 'singles') {
            serverName = `${participants.su1_first_name} ${participants.su1_last_name}`;
          } else if (category === 'doubles') {
            const pairName = participants.sp1_name || `${participants.sp1_p1_first} ${participants.sp1_p1_last} / ${participants.sp1_p2_first} ${participants.sp1_p2_last}`;
            if (playerId) {
              if (playerId === participants.sp1_player1_id) {
                serverName = `${participants.sp1_p1_first} ${participants.sp1_p1_last} (${pairName})`;
              } else if (playerId === participants.sp1_player2_id) {
                serverName = `${participants.sp1_p2_first} ${participants.sp1_p2_last} (${pairName})`;
              } else {
                serverName = pairName;
              }
            } else {
              serverName = pairName;
            }
          } else if (category === 'teams') {
            serverName = participants.st1_name;
          }
        } else {
          // Tournament match
          if (participants.tp1_user_id) {
            serverName = `${participants.tp1_first_name} ${participants.tp1_last_name}`;
          } else if (participants.tp1_partnership_id) {
            const pairName = `${participants.tp1_part_p1_first} ${participants.tp1_part_p1_last} / ${participants.tp1_part_p2_first} ${participants.tp1_part_p2_last}`;
            if (playerId) {
              if (playerId === participants.tp1_part_player1_id) {
                serverName = `${participants.tp1_part_p1_first} ${participants.tp1_part_p1_last} (${pairName})`;
              } else if (playerId === participants.tp1_part_player2_id) {
                serverName = `${participants.tp1_part_p2_first} ${participants.tp1_part_p2_last} (${pairName})`;
              } else {
                serverName = pairName;
              }
            } else {
              serverName = pairName;
            }
          } else if (participants.tp1_team_id) {
            serverName = participants.tp1_team_name;
          }
        }
      } else {
        // participant2
        if (isStandalone) {
          // Standalone match
          if (category === 'singles') {
            serverName = `${participants.su2_first_name} ${participants.su2_last_name}`;
          } else if (category === 'doubles') {
            const pairName = participants.sp2_name || `${participants.sp2_p1_first} ${participants.sp2_p1_last} / ${participants.sp2_p2_first} ${participants.sp2_p2_last}`;
            if (playerId) {
              if (playerId === participants.sp2_player1_id) {
                serverName = `${participants.sp2_p1_first} ${participants.sp2_p1_last} (${pairName})`;
              } else if (playerId === participants.sp2_player2_id) {
                serverName = `${participants.sp2_p2_first} ${participants.sp2_p2_last} (${pairName})`;
              } else {
                serverName = pairName;
              }
            } else {
              serverName = pairName;
            }
          } else if (category === 'teams') {
            serverName = participants.st2_name;
          }
        } else {
          // Tournament match
          if (participants.tp2_user_id) {
            serverName = `${participants.tp2_first_name} ${participants.tp2_last_name}`;
          } else if (participants.tp2_partnership_id) {
            const pairName = `${participants.tp2_part_p1_first} ${participants.tp2_part_p1_last} / ${participants.tp2_part_p2_first} ${participants.tp2_part_p2_last}`;
            if (playerId) {
              if (playerId === participants.tp2_part_player1_id) {
                serverName = `${participants.tp2_part_p1_first} ${participants.tp2_part_p1_last} (${pairName})`;
              } else if (playerId === participants.tp2_part_player2_id) {
                serverName = `${participants.tp2_part_p2_first} ${participants.tp2_part_p2_last} (${pairName})`;
              } else {
                serverName = pairName;
              }
            } else {
              serverName = pairName;
            }
          } else if (participants.tp2_team_id) {
            serverName = participants.tp2_team_name;
          }
        }
      }
    }
    
    // Get next event order number
    const getMaxOrderSql = `SELECT COALESCE(MAX(event_order), 0) as max_order FROM match_events WHERE match_id = ?`;
    const maxOrderRows = await query(getMaxOrderSql, [matchId]);
    const nextEventOrder = (maxOrderRows[0]?.max_order || 0) + 1;
    
    // Create serving event (using 'point' type with event_subtype)
    const eventSql = `
      INSERT INTO match_events (match_id, event_type, event_subtype, participant_side, notes, score_snapshot, event_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const eventNotes = `Service change! ${serverName} is now serving`;
    const eventResult = await query(eventSql, [
      matchId,
      'point',
      'server_change',
      newServer,
      eventNotes,
      JSON.stringify(liveScore),
      nextEventOrder
    ]);
    
    // Update event with event_message
    const updateMessageSql = `UPDATE match_events SET event_message = ? WHERE id = ?`;
    await query(updateMessageSql, [eventNotes, eventResult.insertId]);
    
    // Get the created event with updated message
    const getEventSql = `SELECT * FROM match_events WHERE id = ?`;
    const createdEventRows = await query(getEventSql, [eventResult.insertId]);
    const createdEvent = createdEventRows[0];
    
    logger.info(`✅ Server toggled for match ${matchId}: ${currentServer} → ${newServer} (${serverName})`);
    
    // Broadcast via WebSocket with event
    if (io) {
      const broadcastMatchUpdate = require('../websocket/scoringSocket').broadcastMatchUpdate;
      broadcastMatchUpdate(io, matchId, 'server_change', { 
        liveScore,
        server: newServer,
        previousServer: currentServer,
        event: createdEvent
      });
      logger.info(`📡 Server change broadcasted to match room: match_${matchId}`);
    }
    
    return {
      success: true,
      message: `Server changed to ${newServer}`,
      live_score: liveScore,
      server: newServer
    };
  } catch (error) {
    logger.error('Toggle server error:', error);
    throw error;
  }
};

/**
 * End current half (1st or 2nd) - Manual control
 */
const endHalf = async (matchId, refereeId, io = null) => {
  try {
    // Get match
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    if (match.status !== 'in_progress') {
      throw new Error('Match is not in progress');
    }
    
    // Get current live score
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Determine which half we're ending (check extra time first)
    const isExtraTime = liveScore.is_extra_time || false;
    const currentHalf = isExtraTime 
      ? liveScore.extra_time_current_half || 1  // Extra time uses extra_time_current_half
      : liveScore.current_half || 1;             // Regular time uses current_half
    
    const elapsedSeconds = isExtraTime
      ? liveScore.extra_time_elapsed_seconds || 0  // Extra time uses separate timer
      : liveScore.elapsed_seconds || 0;            // Regular time uses regular timer
    
    logger.info(`🔚 Ending half: isExtraTime=${isExtraTime}, currentHalf=${currentHalf}, elapsed=${elapsedSeconds}s`);
    
    // Store the duration of the half that just ended
    if (!isExtraTime && currentHalf === 1) {
      liveScore.half_1_duration = elapsedSeconds;
      liveScore.half_1_end_time = new Date().toISOString();
      liveScore.half_1_ended = true;
      
      // AUTO-START BREAK
      liveScore.is_on_break = true;
      liveScore.break_start_time = new Date().toISOString();
      liveScore.break_start_elapsed = elapsedSeconds; // Save where break started
      logger.info(`✅ 1st half ended at ${elapsedSeconds}s - Break auto-started`);
    } else if (!isExtraTime && currentHalf === 2) {
      liveScore.half_2_duration = elapsedSeconds - (liveScore.half_2_start_elapsed || 0);
      liveScore.half_2_end_time = new Date().toISOString();
      liveScore.half_2_ended = true;
      
      // Check score
      const score1 = liveScore.participant1?.goals || 0;
      const score2 = liveScore.participant2?.goals || 0;
      
      if (score1 !== score2) {
        // Clear winner - complete match immediately
        liveScore.match_complete = true;
        liveScore.is_paused = true;
        
        let winnerParticipantId = null;
        if (score1 > score2) {
          liveScore.match_winner = 'participant1';
          winnerParticipantId = match.participant1_id;
        } else {
          liveScore.match_winner = 'participant2';
          winnerParticipantId = match.participant2_id;
        }
        
        logger.info(`✅ 2nd half ended - Match complete! Winner: ${liveScore.match_winner}, Score: ${score1}-${score2}`);
      } else {
        // DRAW - Pause and wait for referee decision
        liveScore.is_paused = true;
        liveScore.awaiting_draw_decision = true; // Flag for frontend
        logger.info(`⚖️ 2nd half ended - Score is DRAW (${score1}-${score2}). Awaiting referee decision: Draw/Extra Time/Penalties`);
      }
    } else if (liveScore.is_extra_time && liveScore.extra_time_current_half === 1) {
      // Extra time 1st half ended (SEPARATE SYSTEM)
      const extraElapsed = liveScore.extra_time_elapsed_seconds || 0;
      liveScore.extra_time_half_1_duration = extraElapsed - (liveScore.extra_time_half_1_start_elapsed || 0);
      liveScore.extra_time_half_1_end_time = new Date().toISOString();
      liveScore.extra_time_half_1_ended = true;
      
      // AUTO-START BREAK between extra time halves
      liveScore.is_on_break = true;
      liveScore.break_start_time = new Date().toISOString();
      liveScore.break_start_elapsed = extraElapsed;
      
      logger.info(`✅ Extra time 1st half ended (${liveScore.extra_time_half_1_duration}s) - Break auto-started`);
    } else if (liveScore.is_extra_time && liveScore.extra_time_current_half === 2) {
      // Extra time 2nd half ended (SEPARATE SYSTEM)
      const extraElapsed = liveScore.extra_time_elapsed_seconds || 0;
      const half1Duration = liveScore.extra_time_half_1_duration || 0;
      liveScore.extra_time_half_2_duration = extraElapsed - half1Duration;
      liveScore.extra_time_half_2_end_time = new Date().toISOString();
      liveScore.extra_time_half_2_ended = true;
      
      // Check score after extra time (use extra_time scores)
      const score1 = liveScore.extra_time_participant1?.goals || 0;
      const score2 = liveScore.extra_time_participant2?.goals || 0;
      
      if (score1 !== score2) {
        // Clear winner after extra time - complete match
        liveScore.match_complete = true;
        liveScore.is_paused = true;
        
        let winnerParticipantId = null;
        if (score1 > score2) {
          liveScore.match_winner = 'participant1';
          winnerParticipantId = match.participant1_id;
        } else {
          liveScore.match_winner = 'participant2';
          winnerParticipantId = match.participant2_id;
        }
        
        logger.info(`✅ Extra time ended - Match complete! Winner: ${liveScore.match_winner}, Score: ${score1}-${score2}`);
      } else {
        // Still DRAW after extra time - AUTO-START PENALTY SHOOTOUT
        liveScore.is_paused = true;
        liveScore.is_penalty_shootout = true;
        liveScore.penalty_shootout = {
          participant1_score: 0,
          participant2_score: 0,
          participant1_attempts: 0,
          participant2_attempts: 0,
          current_round: 1,
          max_rounds: 5,
          sudden_death: false,
          kicks: [],
          next_kicker: 'participant1' // Start with participant1
        };
        logger.info(`⚽ Extra time ended - Score still DRAW (${score1}-${score2}). AUTO-STARTING PENALTY SHOOTOUT!`);
      }
    }
    
    // Update database
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          status = ?,
          winner_participant_id = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    // Only set status to 'completed' if match is actually complete (not awaiting draw decision)
    const newStatus = liveScore.match_complete ? 'completed' : match.status;
    const winnerId = liveScore.match_complete && liveScore.match_winner !== 'draw' 
      ? (liveScore.match_winner === 'participant1' ? match.participant1_id : match.participant2_id) 
      : null;
    
    await query(updateSql, [JSON.stringify(liveScore), newStatus, winnerId, matchId]);
    
    // ✅ UPDATE OR CREATE SEGMENT TIMING RECORD
    if (!isExtraTime && currentHalf === 1) {
      // Update or create Half 1 timing record
      await query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, status)
         VALUES (?, 'half', 1, ?, ?, ?, ?, 'completed')
         ON DUPLICATE KEY UPDATE
           end_time = VALUES(end_time),
           duration_seconds = VALUES(duration_seconds),
           duration_formatted = VALUES(duration_formatted),
           status = 'completed'`,
        [
          matchId,
          toMySQLDateTime(match.actual_start_time),
          toMySQLDateTime(liveScore.half_1_end_time),
          liveScore.half_1_duration,
          formatDuration(liveScore.half_1_duration)
        ]
      );
      logger.info(`✅ Updated segment timing for Half 1: ${liveScore.half_1_duration}s`);
      
      // Create break record with status='in_progress' (break auto-started)
      await query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, status)
         VALUES (?, 'break', 1, ?, 'in_progress')
         ON DUPLICATE KEY UPDATE
           start_time = VALUES(start_time),
           status = 'in_progress'`,
        [
          matchId,
          toMySQLDateTime(liveScore.break_start_time)
        ]
      );
      logger.info(`✅ Break auto-started - created segment timing record`);
    } else if (!isExtraTime && currentHalf === 2) {
      // Update or create Half 2 timing record
      await query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, status)
         VALUES (?, 'half', 2, ?, ?, ?, ?, 'completed')
         ON DUPLICATE KEY UPDATE
           end_time = VALUES(end_time),
           duration_seconds = VALUES(duration_seconds),
           duration_formatted = VALUES(duration_formatted),
           status = 'completed'`,
        [
          matchId,
          toMySQLDateTime(liveScore.half_2_start_time),
          toMySQLDateTime(liveScore.half_2_end_time),
          liveScore.half_2_duration,
          formatDuration(liveScore.half_2_duration)
        ]
      );
      logger.info(`✅ Updated segment timing for Half 2: ${liveScore.half_2_duration}s`);
    }
    
    // ✅ STANDINGS UPDATE: If match is complete, update tournament standings
    if (liveScore.match_complete && newStatus === 'completed') {
      logger.info(`🏁 [LIVE SCORING] Match ${matchId} completed via live scoring - triggering standings update`);
      
      // Calculate and update total duration from segments
      await calculateAndUpdateTotalDuration(matchId);
      
      try {
        const { processTournamentAfterMatch } = require('./matchService');
        const isDraw = liveScore.match_winner === 'draw';
        
        if (isDraw) {
          logger.info(`🤝 [LIVE SCORING] Match ${matchId} ended in a DRAW - updating standings for both participants`);
        }
        
        await processTournamentAfterMatch(match.tournament_id, matchId, winnerId);
        logger.info(`✅ [LIVE SCORING] Standings update completed for match ${matchId}`);
        
        // ✅ CHECK TOURNAMENT COMPLETION: Determine winner if all matches are done
        await checkAndCompleteTournament(match.tournament_id);
      } catch (error) {
        logger.error(`❌ [LIVE SCORING] Failed to update standings for match ${matchId}:`, error);
        // Don't throw - match is already completed, just log the error
      }
    }
    
    // Record event
    const halfName = currentHalf === 1 ? '1st' 
                   : currentHalf === 2 ? '2nd'
                   : currentHalf === 3 ? 'Extra Time 1st'
                   : 'Extra Time 2nd';
    
    await recordEvent(matchId, {
      event_type: `half_${currentHalf}_end`,
      participant_side: 'participant1',
      match_time: liveScore.match_time || null,
      notes: `${halfName} half ended at ${liveScore.match_time}`,
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      if ((currentHalf === 2 || currentHalf === 4) && liveScore.match_complete) {
        // Broadcast match completion (only if actually complete, not awaiting draw decision)
        const broadcastMatchCompleted = require('../websocket/scoringSocket').broadcastMatchCompleted;
        broadcastMatchCompleted(io, matchId, winnerId, liveScore);
      } else if (currentHalf === 4 && liveScore.is_penalty_shootout) {
        // Extra time ended with draw - penalty shootout auto-started
        io.to(`match_${matchId}`).emit('penalty_shootout_start', {
          matchId,
          data: { liveScore }
        });
        logger.info(`📡 Broadcasted penalty_shootout_start for match ${matchId}`);
      } else {
        // Broadcast half ended (includes draws awaiting decision)
        const duration = currentHalf === 1 ? liveScore.half_1_duration
                       : currentHalf === 2 ? liveScore.half_2_duration
                       : currentHalf === 3 ? liveScore.half_3_duration
                       : liveScore.half_4_duration;
        
        broadcastMatchUpdate(io, matchId, 'half_ended', {
          liveScore,
          half: currentHalf,
          duration: duration
        });
      }
    }
    
    logger.info(`✅ Half ${currentHalf} ended for match ${matchId}`);
    
    return {
      success: true,
      message: `${currentHalf === 1 ? '1st' : '2nd'} half ended`,
      liveScore
    };
  } catch (error) {
    logger.error('End half error:', error);
    throw error;
  }
};

/**
 * Start break period - Manual control
 */
const startBreak = async (matchId, refereeId, io = null) => {
  try {
    // Get match
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Get current live score
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Set break status and RESET timer to 0
    liveScore.is_on_break = true;
    liveScore.break_start_time = new Date().toISOString();
    liveScore.break_start_real_time = Date.now(); // Store actual timestamp for offset calculation
    liveScore.timer_offset = 0; // Reset offset for break timer
    liveScore.elapsed_seconds = 0; // Display will show 0
    liveScore.is_paused = false; // Resume timer for break
    liveScore.match_time = '00:00'; // Reset display
    
    // Update database
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = FALSE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'break_start',
      participant_side: 'participant1',
      match_time: liveScore.match_time || null,
      notes: 'Break period started',
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'break_started', {
        liveScore
      });
    }
    
    logger.info(`✅ Break started for match ${matchId}`);
    
    return {
      success: true,
      message: 'Break period started',
      liveScore
    };
  } catch (error) {
    logger.error('Start break error:', error);
    throw error;
  }
};

/**
 * End break period - Manual control
 */
const endBreak = async (matchId, refereeId, io = null) => {
  try {
    // Get match
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Get current live score
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // End break and AUTO-START NEXT HALF
    // Check if we're in extra time (separate system)
    const isExtraTime = liveScore.is_extra_time || false;
    const elapsedSeconds = isExtraTime
      ? liveScore.extra_time_elapsed_seconds || 0
      : liveScore.elapsed_seconds || 0;
    const currentHalf = isExtraTime
      ? liveScore.extra_time_current_half || 1
      : liveScore.current_half || 1;
    
    liveScore.is_on_break = false;
    liveScore.break_end_time = new Date().toISOString();
    liveScore.break_duration = elapsedSeconds - (liveScore.break_start_elapsed || 0);
    
    logger.info(`🔚 Ending break: isExtraTime=${isExtraTime}, currentHalf=${currentHalf}, elapsed=${elapsedSeconds}s`);
    
    // Determine which half to start next
    if (!isExtraTime && currentHalf === 1) {
      // AUTO-START 2ND HALF (regular time)
      liveScore.current_half = 2;
      liveScore.half_2_start_time = new Date().toISOString();
      liveScore.half_2_start_elapsed = elapsedSeconds;
      liveScore.is_paused = false;
      logger.info(`✅ Break ended at ${elapsedSeconds}s - 2nd half auto-started`);
    } else if (liveScore.is_extra_time && liveScore.extra_time_current_half === 1) {
      // AUTO-START EXTRA TIME 2ND HALF (SEPARATE SYSTEM)
      const extraElapsed = liveScore.extra_time_elapsed_seconds || 0;
      liveScore.extra_time_current_half = 2;  // Move to extra time 2nd half
      liveScore.extra_time_half_2_start_time = new Date().toISOString();
      liveScore.extra_time_half_2_start_elapsed = extraElapsed;
      liveScore.extra_time_half_2_duration = null;
      liveScore.extra_time_half_2_ended = false;
      
      liveScore.is_paused = false;
      liveScore.is_overtime = false;
      logger.info(`✅ Extra time break ended - Extra time 2nd half auto-started`);
    } else {
      // Fallback for other cases
      liveScore.is_paused = false;
      logger.info(`✅ Break ended at ${elapsedSeconds}s`);
    }
    
    // Update database
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = FALSE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // ✅ UPDATE OR CREATE SEGMENT TIMING RECORD FOR BREAK
    if (!isExtraTime && currentHalf === 1) {
      // Update or create Break timing record
      await query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, status)
         VALUES (?, 'break', 1, ?, ?, ?, ?, 'completed')
         ON DUPLICATE KEY UPDATE
           end_time = VALUES(end_time),
           duration_seconds = VALUES(duration_seconds),
           duration_formatted = VALUES(duration_formatted),
           status = 'completed'`,
        [
          matchId,
          toMySQLDateTime(liveScore.break_start_time),
          toMySQLDateTime(liveScore.break_end_time),
          liveScore.break_duration,
          formatDuration(liveScore.break_duration)
        ]
      );
      logger.info(`✅ Updated segment timing for Break: ${liveScore.break_duration}s`);
      
      // Create Half 2 record with status='in_progress' (2nd half auto-started)
      await query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, status)
         VALUES (?, 'half', 2, ?, 'in_progress')
         ON DUPLICATE KEY UPDATE
           start_time = VALUES(start_time),
           status = 'in_progress'`,
        [
          matchId,
          toMySQLDateTime(liveScore.half_2_start_time)
        ]
      );
      logger.info(`✅ 2nd half auto-started - created segment timing record`);
    }
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'break_end',
      participant_side: 'participant1',
      match_time: liveScore.match_time || null,
      notes: 'Break period ended',
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'break_ended', {
        liveScore
      });
    }
    
    logger.info(`✅ Break ended for match ${matchId}`);
    
    return {
      success: true,
      message: 'Break period ended',
      liveScore
    };
  } catch (error) {
    logger.error('End break error:', error);
    throw error;
  }
};

/**
 * Start second half - Manual control
 */
const startSecondHalf = async (matchId, refereeId, io = null) => {
  try {
    // Get match
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Get current live score
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Start 2nd half from 45:00 (regulation time, not actual 1st half duration)
    const periodDuration = liveScore.period_duration || 45; // minutes
    const periodDurationSeconds = periodDuration * 60; // 2700 seconds = 45:00
    
    liveScore.current_half = 2;
    liveScore.half_2_start_time = new Date().toISOString();
    liveScore.half_2_start_real_time = Date.now(); // Store actual timestamp for offset calculation
    liveScore.elapsed_seconds = periodDurationSeconds; // 2700 = 45:00
    liveScore.is_paused = false;
    liveScore.is_on_break = false;
    liveScore.break_start_real_time = null; // Clear break timestamp
    liveScore.resumed_at = new Date().toISOString();
    
    // Display 45:00 (start of 2nd half)
    liveScore.match_time = `${String(periodDuration).padStart(2, '0')}:00`;
    
    // Update database
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = FALSE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'half_2_start',
      participant_side: 'participant1',
      match_time: liveScore.match_time || null,
      notes: '2nd half started',
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'second_half_started', {
        liveScore
      });
    }
    
    logger.info(`✅ 2nd half started for match ${matchId}`);
    
    return {
      success: true,
      message: '2nd half started',
      liveScore
    };
  } catch (error) {
    logger.error('Start second half error:', error);
    throw error;
  }
};

/**
 * Start penalty shootout (after 2nd half or extra time ends with equal score)
 */
const startPenaltyShootout = async (matchId, refereeId, io = null) => {
  try {
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Fetch match configuration to get players_per_side
    const [matchConfig] = await query(
      `SELECT t.match_config 
       FROM matches m
       LEFT JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.id = ?`,
      [matchId]
    );
    
    let playersPerSide = 11; // Default to 11-a-side
    if (matchConfig && matchConfig.match_config) {
      try {
        const config = typeof matchConfig.match_config === 'string'
          ? JSON.parse(matchConfig.match_config)
          : matchConfig.match_config;
        playersPerSide = config.players_per_side || 11;
      } catch (e) {
        logger.warn('Failed to parse match config for players_per_side:', e);
      }
    }
    
    // Determine max_rounds based on players_per_side
    // 5-a-side: 3 rounds, others: 5 rounds
    let maxRounds = 5;
    if (playersPerSide === 5) {
      maxRounds = 3;
    }
    
    logger.info(`⚽ Match ${matchId} - Starting penalty shootout - Players per side: ${playersPerSide}, Max rounds: ${maxRounds}`);
    
    // Initialize penalty shootout
    liveScore.is_penalty_shootout = true;
    liveScore.awaiting_draw_decision = false;
    liveScore.is_paused = true; // Pause timer during penalties
    liveScore.penalty_shootout = {
      participant1_scored: 0,
      participant2_scored: 0,
      participant1_attempts: 0,
      participant2_attempts: 0,
      current_round: 1,
      max_rounds: maxRounds,
      sudden_death: false,
      kicks: [],
      next_kicker: 'participant1' // Start with participant1
    };
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Broadcast penalty shootout start
    if (io) {
      io.to(`match_${matchId}`).emit('penalty_shootout_start', {
        matchId,
        data: { liveScore }
      });
    }
    
    logger.info(`⚽ Penalty shootout started for match ${matchId}`);
    
    return { success: true, message: 'Penalty shootout started', liveScore };
  } catch (error) {
    logger.error('Start penalty shootout error:', error);
    throw error;
  }
};

/**
 * Declare match as draw (after 2nd half ends with equal score)
 */
const declareMatchDraw = async (matchId, refereeId, io = null) => {
  try {
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Complete match as draw
    liveScore.match_complete = true;
    liveScore.match_winner = 'draw';
    liveScore.awaiting_draw_decision = false;
    liveScore.is_paused = true;
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          status = 'completed',
          winner_participant_id = NULL,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // ✅ STANDINGS UPDATE: Update tournament standings for draw
    logger.info(`🏁 [LIVE SCORING] Match ${matchId} declared as DRAW - triggering standings update`);
    
    try {
      const { processTournamentAfterMatch } = require('./matchService');
      await processTournamentAfterMatch(match.tournament_id, matchId, null); // null = draw
      logger.info(`✅ [LIVE SCORING] Standings update completed for match ${matchId} (DRAW)`);
    } catch (error) {
      logger.error(`❌ [LIVE SCORING] Failed to update standings for match ${matchId}:`, error);
      // Don't throw - match is already completed, just log the error
    }
    
    // Broadcast match completion
    if (io) {
      const broadcastMatchCompleted = require('../websocket/scoringSocket').broadcastMatchCompleted;
      broadcastMatchCompleted(io, matchId, null, liveScore);
    }
    
    logger.info(`✅ Match ${matchId} declared as DRAW`);
    
    return { success: true, message: 'Match declared as draw', liveScore };
  } catch (error) {
    logger.error('Declare draw error:', error);
    throw error;
  }
};

/**
 * Initialize Extra Time with user-provided configuration
 * User enters: half_duration (e.g., 15 min) and break_duration (e.g., 5 min)
 * This prepares extra time but doesn't start the timer yet
 */
const initializeExtraTime = async (matchId, refereeId, halfDuration, breakDuration, io = null) => {
  try {
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Verify referee
    if (match.referee_id !== refereeId) {
      throw new Error('Only the assigned referee can initialize extra time');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Validate durations
    if (!halfDuration || halfDuration < 1 || halfDuration > 30) {
      throw new Error('Half duration must be between 1 and 30 minutes');
    }
    if (!breakDuration || breakDuration < 1 || breakDuration > 15) {
      throw new Error('Break duration must be between 1 and 15 minutes');
    }
    
    // Initialize extra time configuration
    liveScore.is_extra_time = true;
    liveScore.extra_time_initialized = true;
    liveScore.extra_time_started = false; // Will be true when 1st half starts
    liveScore.awaiting_draw_decision = false;
    liveScore.is_paused = true; // Paused until referee starts 1st half
    
    // Store user-provided configuration
    liveScore.extra_time_config = {
      half_duration: parseInt(halfDuration), // minutes
      break_duration: parseInt(breakDuration), // minutes
      half_duration_seconds: parseInt(halfDuration) * 60,
      break_duration_seconds: parseInt(breakDuration) * 60
    };
    
    // Initialize extra time tracking (will be populated when halves start)
    liveScore.current_half = 3; // Extra Time 1st Half
    liveScore.extra_time_half_1_start_time = null;
    liveScore.extra_time_half_1_start_real_time = null;
    liveScore.extra_time_half_1_duration = null;
    
    liveScore.extra_time_break_start_time = null;
    liveScore.extra_time_break_start_real_time = null;
    
    liveScore.extra_time_half_2_start_time = null;
    liveScore.extra_time_half_2_start_real_time = null;
    liveScore.extra_time_half_2_duration = null;
    
    // ✅ Calculate and set base time NOW (don't wait for start)
    // Get tournament match config
    const tournamentSql = `SELECT match_config FROM tournaments WHERE id = ?`;
    const [tournament] = await query(tournamentSql, [match.tournament_id]);
    const matchConfig = typeof tournament.match_config === 'string' 
      ? JSON.parse(tournament.match_config) 
      : tournament.match_config;
    
    const periodDurationMinutes = matchConfig?.period_duration || liveScore.half_duration || 45;
    const periods = matchConfig?.periods || 2;
    const regularMatchTotalSeconds = periodDurationMinutes * periods * 60;
    
    // Set base time and initial match_time
    liveScore.extra_time_base_seconds = regularMatchTotalSeconds;
    liveScore.elapsed_seconds = 0;
    
    const baseMinutes = Math.floor(regularMatchTotalSeconds / 60);
    const baseSeconds = regularMatchTotalSeconds % 60;
    liveScore.match_time = `${String(baseMinutes).padStart(2, '0')}:${String(baseSeconds).padStart(2, '0')}`;
    
    logger.info(`✅ Extra time initialized with base time: ${regularMatchTotalSeconds}s (${baseMinutes}:${baseSeconds})`);
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'extra_time_initialized',
      participant_side: 'participant1',
      match_time: null,
      notes: `Extra Time initialized: ${halfDuration} min halves, ${breakDuration} min break`,
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'extra_time_initialized', {
        liveScore,
        config: liveScore.extra_time_config
      });
    }
    
    logger.info(`✅ Extra time initialized for match ${matchId}: ${halfDuration} min halves, ${breakDuration} min break`);
    
    return { 
      success: true, 
      message: `Extra time configured: ${halfDuration} min halves, ${breakDuration} min break`,
      liveScore 
    };
  } catch (error) {
    logger.error('Initialize extra time error:', error);
    throw error;
  }
};

/**
 * Start Extra Time 1st Half
 */
const startExtraTimeFirstHalf = async (matchId, refereeId, io = null) => {
  try {
    const matchSql = `
      SELECT m.*, t.match_config 
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    if (!liveScore.extra_time_initialized) {
      throw new Error('Extra time not initialized');
    }
    
    // Get tournament match config
    const matchConfig = typeof match.match_config === 'string' 
      ? JSON.parse(match.match_config) 
      : match.match_config;
    
    // Start Extra Time 1st Half
    liveScore.current_half = 3;
    liveScore.extra_time_started = true;
    liveScore.extra_time_current_half = 1; // ✅ Set to 1 for first half
    liveScore.extra_time_half_1_start_time = new Date().toISOString();
    liveScore.extra_time_half_1_start_real_time = Date.now();
    liveScore.extra_time_half_1_start_elapsed = 0; // ✅ Start from 0
    
    // ✅ CUMULATIVE TIMER: Continue from regular match end time
    // Use CONFIGURED period_duration from tournament (not actual played duration)
    const periodDurationMinutes = matchConfig?.period_duration || liveScore.half_duration || 45;
    const periods = matchConfig?.periods || 2;
    
    // Calculate total regular match time based on CONFIG (e.g., 45 + 45 = 90 min)
    // DON'T include break time - only playing time counts
    const regularMatchTotalSeconds = periodDurationMinutes * periods * 60;
    
    // Store the base time (regular match total) for extra time calculations
    liveScore.extra_time_base_seconds = regularMatchTotalSeconds;
    liveScore.elapsed_seconds = 0; // Extra time elapsed (will be added to base)
    liveScore.extra_time_elapsed_seconds = 0; // ✅ Initialize extra time elapsed
    
    // Format match_time from base seconds (e.g., 90:00, 95:00)
    const baseMinutes = Math.floor(regularMatchTotalSeconds / 60);
    const baseSeconds = regularMatchTotalSeconds % 60;
    liveScore.match_time = `${String(baseMinutes).padStart(2, '0')}:${String(baseSeconds).padStart(2, '0')}`;
    
    liveScore.is_paused = false;
    liveScore.is_on_break = false;
    
    logger.info(`✅ Extra time initialized: base=${regularMatchTotalSeconds}s (${baseMinutes}:${baseSeconds}), config: period=${periodDurationMinutes}min × ${periods} periods`);
    logger.info(`🚀 EXTRA TIME 1ST HALF WILL START FROM: ${baseMinutes}:${String(baseSeconds + 1).padStart(2, '0')} (base time + 1 second)`);
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = FALSE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    logger.info(`✅ Extra time 1st half started - saved to DB with base_seconds=${liveScore.extra_time_base_seconds}`);
    
    // Create Extra Time Half 3 record with status='in_progress'
    await query(
      `INSERT INTO match_segment_timings 
       (match_id, segment_type, segment_number, start_time, status)
       VALUES (?, 'half', 3, ?, 'in_progress')
       ON DUPLICATE KEY UPDATE
         start_time = VALUES(start_time),
         status = 'in_progress'`,
      [
        matchId,
        toMySQLDateTime(liveScore.extra_time_half_1_start_time)
      ]
    );
    logger.info(`✅ Extra Time 1st half started - created segment timing record`);
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'extra_time_half_1_start',
      participant_side: 'participant1',
      match_time: '00:00',
      notes: 'Extra Time 1st half started',
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'extra_time_first_half_started', {
        liveScore
      });
    }
    
    logger.info(`✅ Extra Time 1st half started for match ${matchId}`);
    
    return {
      success: true,
      message: 'Extra Time 1st half started',
      liveScore
    };
  } catch (error) {
    logger.error('Start extra time first half error:', error);
    throw error;
  }
};

/**
 * End Extra Time 1st Half
 */
const endExtraTimeFirstHalf = async (matchId, refereeId, io = null) => {
  try {
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Calculate duration
    const startTime = liveScore.extra_time_half_1_start_real_time;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    liveScore.extra_time_half_1_duration = duration;
    liveScore.extra_time_half_1_end_time = new Date().toISOString();
    
    // AUTO-START EXTRA TIME BREAK
    liveScore.is_paused = true;
    liveScore.is_on_break = true;
    liveScore.extra_time_break_start_time = new Date().toISOString();
    liveScore.extra_time_break_start_real_time = Date.now();
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = TRUE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'extra_time_half_1_end',
      participant_side: 'participant1',
      match_time: liveScore.match_time || null,
      notes: `Extra Time 1st half ended at ${liveScore.match_time}`,
      score_snapshot: liveScore
    }, io);
    
    // Update or create segment timing record for Extra Time Half 1
    await query(
      `INSERT INTO match_segment_timings 
       (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, status)
       VALUES (?, 'half', 3, ?, NOW(), ?, ?, 'completed')
       ON DUPLICATE KEY UPDATE
         end_time = NOW(),
         duration_seconds = VALUES(duration_seconds),
         duration_formatted = VALUES(duration_formatted),
         status = 'completed'`,
      [
        matchId,
        toMySQLDateTime(liveScore.extra_time_half_1_start_time),
        duration,
        formatDuration(duration)
      ]
    );
    logger.info(`✅ Updated segment timing for Extra Time Half 1: ${duration}s`);
    
    // Create extra time break record with status='in_progress' (break auto-started)
    await query(
      `INSERT INTO match_segment_timings 
       (match_id, segment_type, segment_number, start_time, status)
       VALUES (?, 'break', 2, ?, 'in_progress')
       ON DUPLICATE KEY UPDATE
         start_time = VALUES(start_time),
         status = 'in_progress'`,
      [
        matchId,
        toMySQLDateTime(liveScore.extra_time_break_start_time)
      ]
    );
    logger.info(`✅ Extra Time break auto-started - created segment timing record`);
    
    // Record break start event
    await recordEvent(matchId, {
      event_type: 'extra_time_break_start',
      participant_side: 'participant1',
      match_time: liveScore.match_time || null,
      notes: 'Extra Time break started',
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'extra_time_first_half_ended', {
        liveScore,
        duration
      });
    }
    
    logger.info(`✅ Extra Time 1st half ended for match ${matchId} - Break auto-started`);
    
    return {
      success: true,
      message: 'Extra Time 1st half ended',
      liveScore
    };
  } catch (error) {
    logger.error('End extra time first half error:', error);
    throw error;
  }
};

/**
 * Start Extra Time Break
 */
const startExtraTimeBreak = async (matchId, refereeId, io = null) => {
  try {
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Start break
    liveScore.is_on_break = true;
    liveScore.extra_time_break_start_time = new Date().toISOString();
    liveScore.extra_time_break_start_real_time = Date.now();
    liveScore.timer_offset = 0;
    liveScore.elapsed_seconds = 0;
    liveScore.is_paused = false;
    liveScore.match_time = '00:00';
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = FALSE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'extra_time_break_start',
      participant_side: 'participant1',
      match_time: '00:00',
      notes: 'Extra Time break started',
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'extra_time_break_started', {
        liveScore
      });
    }
    
    logger.info(`✅ Extra Time break started for match ${matchId}`);
    
    return {
      success: true,
      message: 'Extra Time break started',
      liveScore
    };
  } catch (error) {
    logger.error('Start extra time break error:', error);
    throw error;
  }
};

/**
 * Start Extra Time 2nd Half
 */
const startExtraTimeSecondHalf = async (matchId, refereeId, io = null) => {
  try {
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    const halfDuration = liveScore.extra_time_config?.half_duration || 15;
    const halfDurationSeconds = halfDuration * 60;
    
    // Calculate break duration
    const breakStartTime = liveScore.extra_time_break_start_real_time;
    const breakDuration = breakStartTime ? Math.floor((Date.now() - breakStartTime) / 1000) : 0;
    
    // End break
    liveScore.extra_time_break_end_time = new Date().toISOString();
    liveScore.extra_time_break_duration = breakDuration;
    
    // Start 2nd half - calculate cumulative time
    liveScore.current_half = 4;
    liveScore.extra_time_current_half = 2; // ✅ Set to 2 for second half
    liveScore.extra_time_half_2_start_time = new Date().toISOString();
    liveScore.extra_time_half_2_start_real_time = Date.now();
    liveScore.is_paused = false;
    liveScore.is_on_break = false;
    liveScore.break_start_real_time = null;
    
    // ✅ Calculate cumulative time: base + CONFIGURED half1 duration (not actual)
    const baseSeconds = liveScore.extra_time_base_seconds || 0;
    const configuredHalf1Duration = halfDurationSeconds; // Use configured duration, not actual
    const cumulativeSeconds = baseSeconds + configuredHalf1Duration;
    const cumulativeMinutes = Math.floor(cumulativeSeconds / 60);
    const cumulativeSecs = cumulativeSeconds % 60;
    liveScore.match_time = `${String(cumulativeMinutes).padStart(2, '0')}:${String(cumulativeSecs).padStart(2, '0')}`;
    
    // Reset extra time elapsed to start 2nd half from configured position
    const actualHalf1Duration = liveScore.extra_time_half_1_duration || 0;
    liveScore.extra_time_elapsed_seconds = configuredHalf1Duration; // Start from configured duration
    
    logger.info(`✅ Extra time 2nd half starting from cumulative time: ${liveScore.match_time} (base=${baseSeconds}s + configured_half1=${configuredHalf1Duration}s, actual_half1=${actualHalf1Duration}s)`);
    logger.info(`🚀 EXTRA TIME 2ND HALF WILL START FROM: ${cumulativeMinutes}:${String(cumulativeSecs + 1).padStart(2, '0')} (cumulative time + 1 second)`);
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = FALSE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Update or create segment timing record for Extra Time Break
    if (breakDuration > 0) {
      await query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, status)
         VALUES (?, 'break', 2, ?, ?, ?, ?, 'completed')
         ON DUPLICATE KEY UPDATE
           end_time = VALUES(end_time),
           duration_seconds = VALUES(duration_seconds),
           duration_formatted = VALUES(duration_formatted),
           status = 'completed'`,
        [
          matchId,
          toMySQLDateTime(liveScore.extra_time_break_start_time),
          toMySQLDateTime(liveScore.extra_time_break_end_time),
          breakDuration,
          formatDuration(breakDuration)
        ]
      );
      logger.info(`✅ Updated segment timing for Extra Time Break: ${breakDuration}s`);
      
      // Create Extra Time Half 4 record with status='in_progress' (2nd half auto-started)
      await query(
        `INSERT INTO match_segment_timings 
         (match_id, segment_type, segment_number, start_time, status)
         VALUES (?, 'half', 4, ?, 'in_progress')
         ON DUPLICATE KEY UPDATE
           start_time = VALUES(start_time),
           status = 'in_progress'`,
        [
          matchId,
          toMySQLDateTime(liveScore.extra_time_half_2_start_time)
        ]
      );
      logger.info(`✅ Extra Time 2nd half auto-started - created segment timing record`);
    }
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'extra_time_half_2_start',
      participant_side: 'participant1',
      match_time: liveScore.match_time,
      notes: 'Extra Time 2nd half started',
      score_snapshot: liveScore
    }, io);
    
    // Broadcast update
    if (io) {
      broadcastMatchUpdate(io, matchId, 'extra_time_second_half_started', {
        liveScore
      });
    }
    
    logger.info(`✅ Extra Time 2nd half started for match ${matchId} - Break auto-ended (${breakDuration}s)`);
    
    return {
      success: true,
      message: 'Extra Time 2nd half started',
      liveScore
    };
  } catch (error) {
    logger.error('Start extra time second half error:', error);
    throw error;
  }
};

/**
 * End Extra Time 2nd Half
 */
const endExtraTimeSecondHalf = async (matchId, refereeId, io = null) => {
  try {
    const matchSql = `SELECT * FROM matches WHERE id = ?`;
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    let liveScore = typeof match.live_score === 'string' 
      ? JSON.parse(match.live_score) 
      : match.live_score;
    
    // Calculate duration
    const startTime = liveScore.extra_time_half_2_start_real_time;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    liveScore.extra_time_half_2_duration = duration;
    liveScore.is_paused = true;
    
    // Check if scores are equal
    const p1Goals = liveScore.participant1?.goals || 0;
    const p2Goals = liveScore.participant2?.goals || 0;
    
    if (p1Goals === p2Goals) {
      // Still a draw - show draw decision options again
      liveScore.awaiting_draw_decision = true;
      liveScore.match_complete = false;
    } else {
      // Winner determined
      liveScore.match_complete = true;
      liveScore.match_winner = p1Goals > p2Goals ? 'participant1' : 'participant2';
    }
    
    const updateSql = `
      UPDATE matches 
      SET live_score = ?,
          is_paused = TRUE,
          updated_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [JSON.stringify(liveScore), matchId]);
    
    // Record event
    await recordEvent(matchId, {
      event_type: 'extra_time_half_2_end',
      participant_side: 'participant1',
      match_time: liveScore.match_time || null,
      notes: `Extra Time 2nd half ended at ${liveScore.match_time}`,
      score_snapshot: liveScore
    }, io);
    
    // Update or create segment timing record for Extra Time Half 2
    await query(
      `INSERT INTO match_segment_timings 
       (match_id, segment_type, segment_number, start_time, end_time, duration_seconds, duration_formatted, status)
       VALUES (?, 'half', 4, ?, NOW(), ?, ?, 'completed')
       ON DUPLICATE KEY UPDATE
         end_time = NOW(),
         duration_seconds = VALUES(duration_seconds),
         duration_formatted = VALUES(duration_formatted),
         status = 'completed'`,
      [
        matchId,
        toMySQLDateTime(liveScore.extra_time_half_2_start_time),
        duration,
        formatDuration(duration)
      ]
    );
    logger.info(`✅ Updated segment timing for Extra Time Half 2: ${duration}s`);
    
    // If match is complete, update match status
    if (liveScore.match_complete) {
      const winnerParticipantId = liveScore.match_winner === 'participant1' 
        ? match.participant1_id 
        : match.participant2_id;
      
      await query(
        `UPDATE matches 
         SET status = 'completed',
             actual_end_time = NOW(),
             winner_participant_id = ?
         WHERE id = ?`,
        [winnerParticipantId, matchId]
      );
      
      // Calculate and update total duration from segments
      await calculateAndUpdateTotalDuration(matchId);
      
      // Update tournament standings
      try {
        const { processTournamentAfterMatch } = require('./matchService');
        await processTournamentAfterMatch(match.tournament_id, matchId, winnerParticipantId);
        logger.info(`✅ Standings updated for match ${matchId}`);
        
        // Check tournament completion
        await checkAndCompleteTournament(match.tournament_id);
      } catch (error) {
        logger.error(`❌ Failed to update standings for match ${matchId}:`, error);
      }
      
      // Broadcast match completion
      if (io) {
        const broadcastMatchCompleted = require('../websocket/scoringSocket').broadcastMatchCompleted;
        broadcastMatchCompleted(io, matchId, winnerParticipantId, liveScore);
      }
      
      logger.info(`✅ Match ${matchId} completed after extra time! Winner: ${liveScore.match_winner}`);
    } else {
      // Broadcast half ended
      if (io) {
        broadcastMatchUpdate(io, matchId, 'extra_time_second_half_ended', {
          liveScore,
          duration,
          awaiting_decision: true
        });
      }
      
      logger.info(`✅ Extra Time 2nd half ended for match ${matchId} - Still a draw`);
    }
    
    return {
      success: true,
      message: liveScore.match_complete 
        ? 'Extra Time ended - Winner determined!' 
        : 'Extra Time ended - Still a draw',
      liveScore,
      match_complete: liveScore.match_complete
    };
  } catch (error) {
    logger.error('End extra time second half error:', error);
    throw error;
  }
};

module.exports = {
  initializeLiveScore,
  startMatch,
  pauseMatch,
  resumeMatch,
  addPoint,
  confirmMatchEnd,
  addGoal,
  addYellowCard,
  addRedCard,
  undoLastPoint,
  recordEvent,
  endMatch,
  getLiveScore,
  getMatchEvents,
  getScoreDetails,
  updateMatchTimer,
  deleteEvent,
  recordPenaltyKick,
  checkAndCompleteTournament,
  toggleServer,
  endHalf,
  startBreak,
  endBreak,
  startSecondHalf,
  declareMatchDraw,
  startPenaltyShootout,
  // Extra Time functions
  initializeExtraTime,
  startExtraTimeFirstHalf,
  endExtraTimeFirstHalf,
  startExtraTimeBreak,
  startExtraTimeSecondHalf,
  endExtraTimeSecondHalf
};

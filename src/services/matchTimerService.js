const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Server-Side Match Timer Manager
 * Manages all active match timers on the backend
 * Broadcasts updates to all connected clients via WebSocket
 * 
 * This eliminates the need for clients to send timer updates every 2 seconds
 * Scales to 10k+ users with minimal server load
 */

// Store active match timers
const activeTimers = new Map();

/**
 * Start server-side timer for a match
 */
const startMatchTimer = (matchId, io) => {
  // Don't start if already running
  if (activeTimers.has(matchId)) {
    logger.warn(`Timer already running for match ${matchId}`);
    return;
  }

  logger.info(`🚀 Starting server-side timer for match ${matchId}`);

  // Timer runs every 1 second
  const intervalId = setInterval(async () => {
    try {
      await updateAndBroadcastTimer(matchId, io);
    } catch (error) {
      logger.error(`Error in timer for match ${matchId}:`, error);
      // Stop timer on error
      stopMatchTimer(matchId);
    }
  }, 1000);

  activeTimers.set(matchId, {
    intervalId,
    startedAt: Date.now()
  });

  logger.info(`✅ Timer started for match ${matchId}`);
};

/**
 * Stop server-side timer for a match
 */
const stopMatchTimer = (matchId) => {
  const timer = activeTimers.get(matchId);
  
  if (timer) {
    clearInterval(timer.intervalId);
    activeTimers.delete(matchId);
    logger.info(`⏹️ Timer stopped for match ${matchId}`);
  }
};

/**
 * Check if timer is running for a match
 */
const isTimerRunning = (matchId) => {
  return activeTimers.has(matchId);
};

/**
 * Update timer and broadcast to all viewers
 */
const updateAndBroadcastTimer = async (matchId, io) => {
  try {
    // Fetch current match state
    const [match] = await query(
      'SELECT status, live_score FROM matches WHERE id = ?',
      [matchId]
    );

    if (!match) {
      logger.warn(`Match ${matchId} not found, stopping timer`);
      stopMatchTimer(matchId);
      return;
    }

    // Stop timer if match is not in progress
    if (match.status !== 'in_progress') {
      logger.info(`Match ${matchId} is ${match.status}, stopping timer`);
      stopMatchTimer(matchId);
      return;
    }

    // Parse live score
    let liveScore = match.live_score;
    if (typeof liveScore === 'string') {
      liveScore = JSON.parse(liveScore);
    }

    // If period_duration or break_duration is missing, fetch from match config
    if (!liveScore.period_duration || !liveScore.break_duration) {
      const [matchConfig] = await query(
        `SELECT t.match_config 
         FROM matches m
         JOIN tournaments t ON m.tournament_id = t.id
         WHERE m.id = ?`,
        [matchId]
      );
      console.log("🔍 Match Config from DB:", matchConfig);
      
      if (matchConfig && matchConfig.match_config) {
        try {
          const config = typeof matchConfig.match_config === 'string'
            ? JSON.parse(matchConfig.match_config)
            : matchConfig.match_config;
          
          console.log("🔍 Parsed Config:", config);
          console.log("🔍 Config period_duration:", config.period_duration);
          console.log("🔍 Config break_duration:", config.break_duration);
          
          if (!liveScore.period_duration) {
            liveScore.period_duration = config.period_duration || 45;
            logger.info(`📝 Added missing period_duration to match ${matchId}: ${liveScore.period_duration} minutes`);
          }
          
          if (!liveScore.break_duration) {
            liveScore.break_duration = config.break_duration || 15;
            logger.info(`📝 Added missing break_duration to match ${matchId}: ${liveScore.break_duration} minutes`);
          }
          
          console.log("🔍 Final liveScore.period_duration:", liveScore.period_duration);
          console.log("🔍 Final liveScore.break_duration:", liveScore.break_duration);
        } catch (e) {
          logger.warn('Failed to parse match config:', e);
          liveScore.period_duration = liveScore.period_duration || 45;
          liveScore.break_duration = liveScore.break_duration || 15;
        }
      } else {
        liveScore.period_duration = liveScore.period_duration || 45;
        liveScore.break_duration = liveScore.break_duration || 15;
      }
    }

    // Stop timer if match is paused (but NOT on break - break should continue!)
    if (liveScore.is_paused) {
      // Don't increment timer when paused, but still broadcast current state
      io.of('/scoring').to(`match_${matchId}`).emit('match_update', {
        matchId,
        eventType: 'timer_update',
        data: {
          liveScore: liveScore,
          is_paused: true
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Stop timer if match is complete
    if (liveScore.match_complete) {
      logger.info(`Match ${matchId} is complete, stopping timer`);
      stopMatchTimer(matchId);
      return;
    }

    // Timer always moves forward - never resets!
    // Simple increment every second
    const newElapsedSeconds = (liveScore.elapsed_seconds || 0) + 1;
    liveScore.elapsed_seconds = newElapsedSeconds;

    // Calculate match_time and check for half transitions
    const periodDuration = liveScore.period_duration || 45; // minutes
    const breakDuration = liveScore.break_duration || 15; // minutes (from match config)
    const periodDurationSeconds = periodDuration * 60;
    const breakDurationSeconds = breakDuration * 60;
    
    // Debug: Log every 10 seconds
    if (newElapsedSeconds % 10 === 0) {
      console.log(`⏱️ -----Timer - Period: ${periodDuration}min, Break: ${breakDuration}min`);
    }

    // ✅ Get additional time for ALL segments from database
    let firstHalfAdditional = 0;
    let breakAdditional = 0;
    let secondHalfAdditional = 0;
    
    try {
      const segments = await query(
        `SELECT segment_type, segment_number, additional_time_seconds 
         FROM match_segment_timings 
         WHERE match_id = ?`,
        [matchId]
      );
      
      if (segments && segments.length > 0) {
        segments.forEach(seg => {
          if (seg.segment_type === 'half' && seg.segment_number === 1) {
            firstHalfAdditional = seg.additional_time_seconds || 0;
          } else if (seg.segment_type === 'break' && seg.segment_number === 1) {
            breakAdditional = seg.additional_time_seconds || 0;
          } else if (seg.segment_type === 'half' && seg.segment_number === 2) {
            secondHalfAdditional = seg.additional_time_seconds || 0;
          }
        });
      }
    } catch (err) {
      logger.error(`Error fetching additional time for match ${matchId}:`, err);
    }

    // Calculate thresholds with additional time for ALL segments
    const totalFirstHalf = periodDurationSeconds + firstHalfAdditional;
    const totalBreak = totalFirstHalf + breakDurationSeconds + breakAdditional;
    const totalSecondHalf = totalBreak + periodDurationSeconds + secondHalfAdditional;
    
    // Debug logging (only log every 10 seconds to avoid spam)
    if (newElapsedSeconds % 10 === 0) {
      logger.info(`⏱️ Match ${matchId} - Elapsed: ${newElapsedSeconds}s, Period: ${periodDuration}m, Break: ${breakDuration}m, Additional: [1st=${firstHalfAdditional}s, Break=${breakAdditional}s, 2nd=${secondHalfAdditional}s], Thresholds: [1st=${totalFirstHalf}s, Break=${totalBreak}s, 2nd=${totalSecondHalf}s]`);
    }

    // MANUAL CONTROL MODE: Don't auto-transition based on time!
    // Preserve current half/break status from database
    let newHalf = liveScore.current_half || 1;
    let isOnBreak = liveScore.is_on_break || false;
    let matchComplete = liveScore.match_complete || false;
    const previousHalf = liveScore.current_half;
    const previousMatchComplete = liveScore.match_complete || false;

    // DON'T auto-transition - referee controls manually!
    // Timer just increments, referee decides when to change half/break
    
    // Keep existing values (don't overwrite)
    liveScore.current_half = newHalf;
    liveScore.is_on_break = isOnBreak;
    liveScore.match_complete = matchComplete;
    
    // Log phase transitions
    const previousIsOnBreak = match.live_score?.is_on_break || false;
    if (isOnBreak !== previousIsOnBreak || newHalf !== previousHalf) {
      logger.info(`🔄 Match ${matchId} - Phase changed: Half ${newHalf}, Break: ${isOnBreak}, Elapsed: ${newElapsedSeconds}s`);
    }

    // Calculate match_time display based on current phase
    // Each phase shows time from 0, but 2nd half starts from period_duration + 0:01
    let timeInCurrentPeriod = 0;
    let phaseStartTime = 0; // When this phase started (in elapsed_seconds)
    
    // ✅ EXTRA TIME HANDLING
    if (liveScore.is_extra_time && (newHalf === 3 || newHalf === 4)) {
      // Extra time - show cumulative time (base + extra time elapsed)
      const baseSeconds = liveScore.extra_time_base_seconds || 0;
      const extraElapsed = liveScore.extra_time_elapsed_seconds || 0;
      
      // Simply add base + extraElapsed (extraElapsed already accounts for configured durations)
      timeInCurrentPeriod = baseSeconds + extraElapsed;
      
      // Increment extra time elapsed
      liveScore.extra_time_elapsed_seconds = extraElapsed + 1;
      
      logger.info(`⏱️ [EXTRA TIME] Match ${matchId} - Half ${newHalf}, Base: ${baseSeconds}s, ExtraElapsed: ${extraElapsed}s, Total: ${timeInCurrentPeriod}s`);
    } else if (newHalf === 2 && !isOnBreak) {
      // Second half - show time starting from period_duration + 0:01 (e.g., 3:01, 45:01)
      phaseStartTime = liveScore.half_2_start_elapsed || 0;
      const timeSincePhaseStart = newElapsedSeconds - phaseStartTime;
      timeInCurrentPeriod = periodDurationSeconds + timeSincePhaseStart;
    } else if (isOnBreak) {
      // Break - show time from 0:00
      phaseStartTime = liveScore.break_start_elapsed || 0;
      timeInCurrentPeriod = newElapsedSeconds - phaseStartTime;
      if (timeInCurrentPeriod < 0) timeInCurrentPeriod = 0;
    } else {
      // 1st half - show time from 0:00
      timeInCurrentPeriod = newElapsedSeconds;
    }

    const minutes = Math.floor(timeInCurrentPeriod / 60);
    const seconds = timeInCurrentPeriod % 60;
    liveScore.match_time = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Check for overtime (exceeding regulation time + extra time)
    let isOvertime = false;
    let overtimeSeconds = 0;
    let regulationTime = 0;
    
    if (newHalf === 1 && !isOnBreak) {
      // 1st half overtime check
      regulationTime = periodDurationSeconds + firstHalfAdditional;
      if (timeInCurrentPeriod > regulationTime) {
        isOvertime = true;
        overtimeSeconds = timeInCurrentPeriod - regulationTime;
      }
    } else if (isOnBreak) {
      // Break overtime check
      regulationTime = breakDurationSeconds + breakAdditional;
      if (timeInCurrentPeriod > regulationTime) {
        isOvertime = true;
        overtimeSeconds = timeInCurrentPeriod - regulationTime;
      }
    } else if (newHalf === 2 && !isOnBreak) {
      // 2nd half overtime check (time shown - period_duration > period_duration + extra)
      const timeIn2ndHalf = timeInCurrentPeriod - periodDurationSeconds;
      regulationTime = periodDurationSeconds + secondHalfAdditional;
      if (timeIn2ndHalf > regulationTime) {
        isOvertime = true;
        overtimeSeconds = timeIn2ndHalf - regulationTime;
      }
    }
    
    liveScore.is_overtime = isOvertime;
    liveScore.overtime_seconds = overtimeSeconds;

    // ✅ Add timing summary for display (MANUAL CONTROL MODE)
    // Use actual phase durations from when referee ended each phase
    let firstHalfElapsed = 0;
    let firstHalfRemaining = 0;
    let breakElapsed = 0;
    let breakRemaining = 0;
    let secondHalfElapsed = 0;
    let secondHalfRemaining = 0;

    if (newHalf === 1 && !isOnBreak) {
      // Currently in 1st half
      firstHalfElapsed = newElapsedSeconds;
      firstHalfRemaining = Math.max(0, (periodDurationSeconds + firstHalfAdditional) - newElapsedSeconds);
    } else if (newHalf === 1 && isOnBreak) {
      // Currently in break
      firstHalfElapsed = liveScore.half_1_duration || 0;
      firstHalfRemaining = 0;
      const breakStartElapsed = liveScore.break_start_elapsed || 0;
      breakElapsed = newElapsedSeconds - breakStartElapsed;
      breakRemaining = Math.max(0, (breakDurationSeconds + breakAdditional) - breakElapsed);
    } else if (newHalf === 2 && !isOnBreak) {
      // Currently in 2nd half
      firstHalfElapsed = liveScore.half_1_duration || 0;
      firstHalfRemaining = 0;
      breakElapsed = liveScore.break_duration || 0;
      breakRemaining = 0;
      const half2StartElapsed = liveScore.half_2_start_elapsed || 0;
      secondHalfElapsed = newElapsedSeconds - half2StartElapsed;
      secondHalfRemaining = Math.max(0, (periodDurationSeconds + secondHalfAdditional) - secondHalfElapsed);
    } else if (matchComplete) {
      // Match complete
      firstHalfElapsed = liveScore.half_1_duration || 0;
      breakElapsed = liveScore.break_duration || 0;
      secondHalfElapsed = liveScore.half_2_duration || 0;
    }

    liveScore.timing_summary = {
      first_half: {
        initial_duration: periodDuration, // minutes
        additional_time: firstHalfAdditional, // seconds
        total_duration: periodDurationSeconds + firstHalfAdditional, // seconds
        elapsed: firstHalfElapsed, // seconds
        remaining: firstHalfRemaining, // seconds
        completed: newHalf > 1 || matchComplete
      },
      break: {
        initial_duration: breakDuration, // minutes
        additional_time: breakAdditional, // seconds
        total_duration: breakDurationSeconds + breakAdditional, // seconds
        elapsed: breakElapsed, // seconds
        remaining: breakRemaining, // seconds
        completed: newHalf === 2 || matchComplete
      },
      second_half: {
        initial_duration: periodDuration, // minutes
        additional_time: secondHalfAdditional, // seconds
        total_duration: periodDurationSeconds + secondHalfAdditional, // seconds
        elapsed: secondHalfElapsed, // seconds
        remaining: secondHalfRemaining, // seconds
        completed: matchComplete
      }
    };

    // Update database
    await query(
      'UPDATE matches SET live_score = ? WHERE id = ?',
      [JSON.stringify(liveScore), matchId]
    );

    // Check if match just completed (compare with previous state, not database state)
    if (matchComplete && !previousMatchComplete) {
      logger.info(`🎯 Match ${matchId} just completed! Calling handleMatchCompletion...`);
      await handleMatchCompletion(matchId, liveScore, io);
      return;
    }
    
    // HOTFIX: If match is complete but winner not set, fix it now
    if (matchComplete && !liveScore.match_winner) {
      logger.warn(`⚠️ Match ${matchId} is complete but has no winner! Fixing now...`);
      await handleMatchCompletion(matchId, liveScore, io);
      return;
    }

    // Broadcast to all viewers
    const halfChanged = newHalf !== previousHalf || isOnBreak !== liveScore.is_on_break;
    
    io.of('/scoring').to(`match_${matchId}`).emit('match_update', {
      matchId,
      eventType: 'timer_update',
      data: {
        liveScore: liveScore,
        half_changed: halfChanged,
        is_on_break: isOnBreak
      },
      timestamp: new Date().toISOString()
    });

    // Log only on significant events
    if (halfChanged) {
      logger.info(`⏱️ Match ${matchId} - Half changed: ${newHalf}, Break: ${isOnBreak}, Time: ${liveScore.match_time}`);
    }

  } catch (error) {
    logger.error(`Error updating timer for match ${matchId}:`, error);
    throw error;
  }
};

/**
 * Handle match completion
 */
const handleMatchCompletion = async (matchId, liveScore, io) => {
  try {
    // Determine winner
    const p1Goals = liveScore.participant1?.goals || 0;
    const p2Goals = liveScore.participant2?.goals || 0;
    
    // Check if score is tied - need penalty shootout
    if (p1Goals === p2Goals) {
      logger.info(`⚽ Match ${matchId} ended in a tie (${p1Goals}-${p2Goals}) - Penalty shootout required!`);
      
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
      
      logger.info(`⚽ Match ${matchId} - Players per side: ${playersPerSide}`);
      
      // Initialize penalty shootout
      const { footballScoring } = require('../utils/scoringCalculators');
      liveScore = footballScoring.initializePenaltyShootout(liveScore, playersPerSide);
      liveScore.match_complete = false; // Match not complete yet, going to penalties
      
      // Update database with penalty shootout state
      await query(
        'UPDATE matches SET live_score = ?, status = ? WHERE id = ?',
        [JSON.stringify(liveScore), 'in_progress', matchId]
      );
      
      // Broadcast penalty shootout start event
      io.of('/scoring').to(`match_${matchId}`).emit('penalty_shootout_start', {
        matchId,
        data: {
          liveScore: liveScore,
          message: 'Match tied - Going to penalties!',
          regular_time_score: `${p1Goals}-${p2Goals}`
        },
        timestamp: new Date().toISOString()
      });
      
      logger.info(`✅ Penalty shootout initialized for match ${matchId}`);
      
      // Stop the timer - penalties are not timed
      stopMatchTimer(matchId);
      return;
    }
    
    if (p1Goals > p2Goals) {
      liveScore.match_winner = 'participant1';
    } else if (p2Goals > p1Goals) {
      liveScore.match_winner = 'participant2';
    } else {
      liveScore.match_winner = 'draw';
    }

    // Get match details with team names
    // For Football: participant1_id and participant2_id are teams.id
    const [match] = await query(
      `SELECT m.participant1_id, m.participant2_id, m.tournament_id,
              t1.name as participant1_name,
              t2.name as participant2_name
       FROM matches m
       LEFT JOIN teams t1 ON m.participant1_id = t1.id
       LEFT JOIN teams t2 ON m.participant2_id = t2.id
       WHERE m.id = ?`,
      [matchId]
    );

    const winnerParticipantId = liveScore.match_winner === 'participant1' 
      ? match.participant1_id 
      : liveScore.match_winner === 'participant2'
      ? match.participant2_id
      : null;

    // Update match as completed
    await query(
      `UPDATE matches 
       SET live_score = ?,
           status = 'completed',
           actual_end_time = NOW(),
           winner_participant_id = ?
       WHERE id = ?`,
      [JSON.stringify(liveScore), winnerParticipantId, matchId]
    );

    logger.info(`🏁 Match ${matchId} completed by timer! Winner: ${liveScore.match_winner}`);

    // Check tournament completion
    const matchScoringService = require('./matchScoringService');
    await matchScoringService.checkAndCompleteTournament(match.tournament_id);

    // Broadcast completion with full details
    io.of('/scoring').to(`match_${matchId}`).emit('match_completed', {
      matchId,
      status: 'completed',
      winner_participant_id: winnerParticipantId,
      participant1_name: match.participant1_name,
      participant2_name: match.participant2_name,
      liveScore: liveScore,
      timestamp: new Date().toISOString()
    });

    // Stop timer
    stopMatchTimer(matchId);

  } catch (error) {
    logger.error(`Error handling match completion for ${matchId}:`, error);
    throw error;
  }
};

/**
 * Get all active timers (for debugging)
 */
const getActiveTimers = () => {
  return Array.from(activeTimers.keys());
};

/**
 * Stop all timers (for server shutdown)
 */
const stopAllTimers = () => {
  logger.info(`Stopping ${activeTimers.size} active timers...`);
  activeTimers.forEach((timer, matchId) => {
    stopMatchTimer(matchId);
  });
};

/**
 * Resume timers for all in-progress matches (on server restart)
 */
const resumeAllActiveMatches = async (io) => {
  try {
    const matches = await query(
      `SELECT id, live_score FROM matches WHERE status = 'in_progress'`
    );

    if (matches && matches.length > 0) {
      logger.info(`🔄 Resuming timers for ${matches.length} in-progress matches...`);
      
      for (const match of matches) {
        let liveScore = match.live_score;
        if (typeof liveScore === 'string') {
          liveScore = JSON.parse(liveScore);
        }
        
        // Only resume Football matches
        if (liveScore.sport === 'Football' && !liveScore.match_complete) {
          startMatchTimer(match.id, io);
          logger.info(`✅ Resumed timer for match ${match.id}`);
        }
      }
    } else {
      logger.info('No in-progress matches to resume');
    }
  } catch (error) {
    logger.error('Error resuming active matches:', error);
  }
};

module.exports = {
  startMatchTimer,
  isTimerRunning,
  stopMatchTimer,
  getActiveTimers,
  stopAllTimers,
  resumeAllActiveMatches
};

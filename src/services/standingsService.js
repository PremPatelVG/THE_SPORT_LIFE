const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Standings Service
 * Handles comprehensive tournament standings calculations and updates
 * Supports: goals, averages, streaks, form guide, head-to-head
 * NOW SUPPORTS: Football (goals) AND Volleyball (sets/points) with FIVB rules
 */

/**
 * Extract sets won from live_score for volleyball
 * @param {Object} liveScore - The live_score JSON
 * @param {String} participant - 'participant1' or 'participant2'
 * @returns {Number} - Sets won
 */
const extractSetsFromScore = (liveScore, participant) => {
  if (!liveScore || !liveScore[participant]) {
    return 0;
  }
  
  try {
    const setsWon = liveScore[participant].sets_won || 0;
    logger.info(`✓ [VOLLEYBALL] ${participant} sets won = ${setsWon}`);
    return setsWon;
  } catch (error) {
    logger.error(`❌ [VOLLEYBALL] Error extracting sets:`, error);
    return 0;
  }
};

/**
 * Extract total points from all sets for volleyball
 * @param {Object} liveScore - The live_score JSON
 * @param {String} participant - 'participant1' or 'participant2'
 * @returns {Number} - Total points scored across all sets
 */
const extractPointsFromSets = (liveScore, participant) => {
  if (!liveScore || !liveScore[participant]) {
    return 0;
  }
  
  try {
    const setScores = liveScore[participant].set_scores || [];
    const totalPoints = setScores.reduce((sum, score) => {
      return sum + (parseInt(score) || 0);
    }, 0);
    logger.info(`✓ [VOLLEYBALL] ${participant} total points = ${totalPoints}`);
    return totalPoints;
  } catch (error) {
    logger.error(`❌ [VOLLEYBALL] Error extracting points:`, error);
    return 0;
  }
};

/**
 * Calculate volleyball match points
 * SIMPLIFIED SYSTEM: Winner Takes All
 * @param {Number} setsWon - Sets won by winner
 * @param {Number} setsLost - Sets lost by winner (sets won by loser)
 * @returns {Object} - { winnerPoints, loserPoints }
 */
const calculateVolleyballPoints = (setsWon, setsLost) => {
  // SIMPLIFIED POINTS SYSTEM:
  // Winner: 3 points (always)
  // Loser: 0 points (always)
  // 
  // This applies regardless of:
  // - Number of sets played (Best of 1, 3, or 5)
  // - Set difference (3-0, 3-1, 3-2, 2-0, 2-1, 1-0, etc.)
  // - Whether it was a close match or dominant win
  // - Whether winner was determined through scoring or declared by referee
  
  logger.info(`🏐 [VOLLEYBALL POINTS] Match ${setsWon}-${setsLost} → Winner: 3 pts, Loser: 0 pts (Winner Takes All)`);
  
  // Always return 3-0 points split
  // Note: Sets won/lost are still tracked for tiebreaker purposes,
  // but they don't affect match points distribution
  return { winnerPoints: 3, loserPoints: 0 };
};

/**
 * Extract goals/points from live_score JSON based on sport type
 * @param {Object} liveScore - The live_score JSON from matches table
 * @param {String} participant - 'participant1' or 'participant2'
 * @returns {Number} - Goals/points scored by the participant
 */
const extractGoalsFromScore = (liveScore, participant) => {
  if (!liveScore) {
    logger.warn(`⚠️ [SCORE EXTRACT] No live_score provided`);
    return 0;
  }
  
  try {
    // PRIORITY 1: Live scoring format - participant1.goals, participant2.goals (FOOTBALL)
    if (liveScore[participant] && liveScore[participant].goals !== undefined) {
      const goals = parseInt(liveScore[participant].goals) || 0;
      logger.info(`✓ [SCORE EXTRACT] Found ${participant}.goals = ${goals}`);
      return goals;
    }
    
    // PRIORITY 2: For set-based sports (tennis, badminton, table tennis, squash)
    if (liveScore.match_structure === 'set_based' && liveScore.sets) {
      const sets = liveScore.sets.filter(set => set.winner === participant).length;
      logger.info(`✓ [SCORE EXTRACT] Found ${participant} sets won = ${sets}`);
      return sets;
    }
    
    // PRIORITY 3: For game-based sports (similar to set-based)
    if (liveScore.match_structure === 'game_based' && liveScore.games) {
      const games = liveScore.games.filter(game => game.winner === participant).length;
      logger.info(`✓ [SCORE EXTRACT] Found ${participant} games won = ${games}`);
      return games;
    }
    
    // PRIORITY 4: For time-based sports (football, volleyball, basketball)
    if (liveScore.match_structure === 'time_based' || liveScore.sport === 'Football') {
      // Direct score from live_score.score
      if (liveScore.score && liveScore.score[participant] !== undefined) {
        const score = parseInt(liveScore.score[participant]) || 0;
        logger.info(`✓ [SCORE EXTRACT] Found ${participant} in score object = ${score}`);
        return score;
      }
      
      // Fallback: check participant1_score / participant2_score
      const scoreField = participant === 'participant1' ? 'participant1_score' : 'participant2_score';
      if (liveScore[scoreField] !== undefined) {
        const score = parseInt(liveScore[scoreField]) || 0;
        logger.info(`✓ [SCORE EXTRACT] Found ${scoreField} = ${score}`);
        return score;
      }
    }
    
    // PRIORITY 5: Fallback - try to get from final score
    if (liveScore.final_score && liveScore.final_score[participant] !== undefined) {
      const score = parseInt(liveScore.final_score[participant]) || 0;
      logger.info(`✓ [SCORE EXTRACT] Found ${participant} in final_score = ${score}`);
      return score;
    }
    
    logger.warn(`⚠️ [SCORE EXTRACT] Could not find score for ${participant}. live_score keys: ${Object.keys(liveScore).join(', ')}`);
    return 0;
  } catch (error) {
    logger.error(`❌ [SCORE EXTRACT] Error extracting goals from score:`, error);
    return 0;
  }
};

/**
 * Update participant standings with incremental stats
 * @param {Object} conn - Database connection
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} participantId - Participant ID
 * @param {Object} stats - Statistics to update
 */
const updateParticipantStandings = async (conn, tournamentId, participantId, stats) => {
  const {
    matches_played = 0,
    matches_won = 0,
    matches_lost = 0,
    matches_drawn = 0,
    points = 0,
    goals_for = 0,
    goals_against = 0,
    clean_sheets = 0,
    // NEW: Volleyball stats
    sets_won = 0,
    sets_lost = 0,
    points_won = 0,
    points_lost = 0
  } = stats;
  
  // Update standings with new stats (supports both football AND volleyball)
  // Note: goal_difference and set_ratio are calculated AFTER updating totals
  await conn.query(`
    UPDATE tournament_standings 
    SET 
      matches_played = matches_played + ?,
      matches_won = matches_won + ?,
      matches_lost = matches_lost + ?,
      matches_drawn = matches_drawn + ?,
      points = points + ?,
      goals_for = goals_for + ?,
      goals_against = goals_against + ?,
      clean_sheets = clean_sheets + ?,
      sets_won = sets_won + ?,
      sets_lost = sets_lost + ?,
      points_won = points_won + ?,
      points_lost = points_lost + ?
    WHERE tournament_id = ? AND participant_id = ?
  `, [
    matches_played, matches_won, matches_lost, matches_drawn, points,
    goals_for, goals_against, clean_sheets,
    sets_won, sets_lost, points_won, points_lost,
    tournamentId, participantId
  ]);
  
  // Recalculate goal_difference and set_ratio from updated totals
  await conn.query(`
    UPDATE tournament_standings
    SET 
      goal_difference = goals_for - goals_against,
      set_ratio = CASE WHEN sets_lost > 0 THEN ROUND(sets_won / sets_lost, 2) ELSE sets_won END,
      point_ratio = CASE WHEN points_lost > 0 THEN ROUND(points_won / points_lost, 2) ELSE points_won END
    WHERE tournament_id = ? AND participant_id = ?
  `, [tournamentId, participantId]);
  
  logger.info(`Updated standings for participant ${participantId}: +${goals_for} GF, +${goals_against} GA, +${sets_won} SW, +${sets_lost} SL, +${points} pts`);
};

/**
 * Update streaks (winning/losing) for a participant
 * @param {Object} conn - Database connection
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} participantId - Participant ID
 * @param {String} result - 'win', 'loss', or 'draw'
 */
const updateStreaks = async (conn, tournamentId, participantId, result) => {
  if (result === 'win') {
    // Increment winning streak, reset losing streak
    await conn.query(`
      UPDATE tournament_standings
      SET winning_streak = winning_streak + 1,
          losing_streak = 0
      WHERE tournament_id = ? AND participant_id = ?
    `, [tournamentId, participantId]);
  } else if (result === 'loss') {
    // Increment losing streak, reset winning streak
    await conn.query(`
      UPDATE tournament_standings
      SET losing_streak = losing_streak + 1,
          winning_streak = 0
      WHERE tournament_id = ? AND participant_id = ?
    `, [tournamentId, participantId]);
  } else if (result === 'draw') {
    // Reset both streaks on draw
    await conn.query(`
      UPDATE tournament_standings
      SET winning_streak = 0,
          losing_streak = 0
      WHERE tournament_id = ? AND participant_id = ?
    `, [tournamentId, participantId]);
  }
};

/**
 * Internal: Recalculate all derived fields (averages, form, position)
 * Uses existing connection (no new transaction)
 * @param {Object} conn - Database connection
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} groupId - Optional group ID
 */
const recalculateStandingsInternal = async (conn, tournamentId, groupId = null) => {
  // Step 1: Update averages
  let updateAvgSql = `
    UPDATE tournament_standings
    SET 
      avg_goals_for = CASE 
        WHEN matches_played > 0 THEN ROUND(goals_for / matches_played, 2)
        ELSE 0
      END,
      avg_goals_against = CASE 
        WHEN matches_played > 0 THEN ROUND(goals_against / matches_played, 2)
        ELSE 0
      END
    WHERE tournament_id = ?
  `;
  
  const avgParams = [tournamentId];
  if (groupId) {
    updateAvgSql += ' AND group_id = ?';
    avgParams.push(groupId);
  }
  
  await conn.query(updateAvgSql, avgParams);
  logger.info(`Updated averages for tournament ${tournamentId}${groupId ? ` group ${groupId}` : ''}`);
  
  // Step 2: Update form guide (last 5 matches)
  await updateFormGuide(conn, tournamentId, groupId);
  
  // Step 3: Recalculate positions
  await recalculatePositions(conn, tournamentId, groupId);
};

/**
 * Recalculate all derived fields (averages, form, position)
 * Public API - creates its own transaction
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} groupId - Optional group ID
 */
const recalculateStandings = async (tournamentId, groupId = null) => {
  return await transaction(async (conn) => {
    await recalculateStandingsInternal(conn, tournamentId, groupId);
  });
};

/**
 * Update form guide (last 5 matches: W/L/D)
 * @param {Object} conn - Database connection
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} groupId - Optional group ID
 */
const updateFormGuide = async (conn, tournamentId, groupId = null) => {
  // Get all participants
  let participantsSql = `
    SELECT participant_id 
    FROM tournament_standings 
    WHERE tournament_id = ?
  `;
  const participantsParams = [tournamentId];
  
  if (groupId) {
    participantsSql += ' AND group_id = ?';
    participantsParams.push(groupId);
  }
  
  const [participants] = await conn.query(participantsSql, participantsParams);
  
  for (const { participant_id } of participants) {
    // Get last 5 completed matches for this participant
    let matchesSql = `
      SELECT 
        m.id,
        m.winner_participant_id,
        m.participant1_id,
        m.participant2_id,
        m.actual_end_time
      FROM matches m
      WHERE m.tournament_id = ?
        AND m.status = 'completed'
        AND (m.participant1_id = ? OR m.participant2_id = ?)
    `;
    const matchesParams = [tournamentId, participant_id, participant_id];
    
    if (groupId) {
      matchesSql += ' AND m.group_id = ?';
      matchesParams.push(groupId);
    }
    
    // Use COALESCE to handle NULL actual_end_time, fallback to updated_at or id
    matchesSql += ' ORDER BY COALESCE(m.actual_end_time, m.updated_at, m.created_at) DESC LIMIT 5';
    
    const [matches] = await conn.query(matchesSql, matchesParams);
    
    // Build form string (W/L/D) - most recent first, then reverse for display
    let form = '';
    for (const match of matches) {
      if (match.winner_participant_id === participant_id) {
        form += 'W';
      } else if (match.winner_participant_id === null) {
        form += 'D';
      } else {
        form += 'L';
      }
    }
    
    // Reverse to show oldest to newest (left to right)
    form = form.split('').reverse().join('');
    
    // Update form
    await conn.query(`
      UPDATE tournament_standings
      SET form = ?
      WHERE tournament_id = ? AND participant_id = ?
    `, [form, tournamentId, participant_id]);
  }
  
  logger.info(`Updated form guide for tournament ${tournamentId}${groupId ? ` group ${groupId}` : ''}`);
};

/**
 * Recalculate standings positions based on points, goal difference, etc.
 * Follows PROFESSIONAL TOURNAMENT TIEBREAKER RULES:
 * 1. Points (primary)
 * 2. Goal/Set difference
 * 3. Goals/Sets for
 * 4. Win ratio (wins/matches played) - IMPORTANT for undefeated teams
 * 5. Fewer losses
 * 6. Fewer matches played (when points equal, undefeated teams rank higher)
 * 
 * @param {Object} conn - Database connection
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} groupId - Optional group ID
 */
const recalculatePositions = async (conn, tournamentId, groupId = null) => {
  // First, get tournament sport to determine tiebreaker rules
  const [sportResult] = await conn.query(`
    SELECT s.name as sport_name
    FROM tournaments t
    JOIN sports s ON t.sport_id = s.id
    WHERE t.id = ?
  `, [tournamentId]);
  
  const sportName = sportResult && sportResult.length > 0 ? sportResult[0].sport_name : '';
  const isSetBasedSport = ['Volleyball', 'Badminton', 'Tennis', 'Table Tennis', 'Squash', 'Pickleball', 'Padel'].includes(sportName);
  
  logger.info(`🎾 [STANDINGS] Sport: ${sportName}, Set-based: ${isSetBasedSport}`);
  
  let sql = `
    SELECT 
      id, 
      participant_id, 
      points, 
      matches_played,
      matches_won, 
      matches_lost,
      matches_drawn,
      goal_difference,
      goals_for,
      goals_against,
      sets_won,
      sets_lost,
      set_ratio
    FROM tournament_standings
    WHERE tournament_id = ?
  `;
  
  const params = [tournamentId];
  
  if (groupId) {
    sql += ' AND group_id = ?';
    params.push(groupId);
  }
  
  const [standings] = await conn.query(sql, params);
  
  // Sort using professional tiebreaker rules (SPORT-AWARE)
  if (standings && standings.length > 0) {
    standings.sort((a, b) => {
      // 1. Points (higher is better) - ALL SPORTS
      if (a.points !== b.points) return b.points - a.points;
      
      if (isSetBasedSport) {
        // SET-BASED SPORTS (Volleyball, Tennis, etc.)
        // 2. Set Ratio (higher is better)
        if (a.set_ratio !== b.set_ratio) return b.set_ratio - a.set_ratio;
        
        // 3. Sets Won (higher is better)
        if (a.sets_won !== b.sets_won) return b.sets_won - a.sets_won;
        
        // 4. Sets Lost (lower is better)
        if (a.sets_lost !== b.sets_lost) return a.sets_lost - b.sets_lost;
        
        // 5. Matches Won (higher is better)
        if (a.matches_won !== b.matches_won) return b.matches_won - a.matches_won;
      } else {
        // GOAL-BASED SPORTS (Football, Basketball, etc.)
        // 2. Goal Difference (higher is better)
        if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference;
        
        // 3. Goals For (higher is better)
        if (a.goals_for !== b.goals_for) return b.goals_for - a.goals_for;
        
        // 4. Win ratio (higher is better) - CRITICAL for undefeated teams
        const winRatioA = a.matches_played > 0 ? a.matches_won / a.matches_played : 0;
        const winRatioB = b.matches_played > 0 ? b.matches_won / b.matches_played : 0;
        if (winRatioA !== winRatioB) return winRatioB - winRatioA;
        
        // 5. Fewer losses (lower is better)
        if (a.matches_lost !== b.matches_lost) return a.matches_lost - b.matches_lost;
        
        // 6. Fewer matches played (lower is better) - undefeated team with fewer games ranks higher
        if (a.matches_played !== b.matches_played) return a.matches_played - b.matches_played;
        
        // 7. More wins (higher is better) - final tiebreaker
        return b.matches_won - a.matches_won;
      }
      
      // Final tiebreaker for set-based sports
      return 0;
    });
    
    // Build CASE statement for batch update
    const cases = standings.map((s, i) => `WHEN ${s.id} THEN ${i + 1}`).join(' ');
    const ids = standings.map(s => s.id).join(',');
    
    await conn.query(`
      UPDATE tournament_standings
      SET position = CASE id ${cases} END
      WHERE id IN (${ids})
    `);
    
    // Log the ranking for debugging
    logger.info(`📊 Recalculated positions for tournament ${tournamentId}${groupId ? ` group ${groupId}` : ''}:`);
    standings.forEach((s, i) => {
      const winRatio = s.matches_played > 0 ? (s.matches_won / s.matches_played * 100).toFixed(1) : '0.0';
      if (isSetBasedSport) {
        logger.info(`  ${i + 1}. Participant ${s.participant_id}: ${s.points}pts, SR:${s.set_ratio}, SW:${s.sets_won}, SL:${s.sets_lost}, W:${s.matches_won}/${s.matches_played} (${winRatio}%), L:${s.matches_lost}`);
      } else {
        logger.info(`  ${i + 1}. Participant ${s.participant_id}: ${s.points}pts, GD:${s.goal_difference}, GF:${s.goals_for}, W:${s.matches_won}/${s.matches_played} (${winRatio}%), L:${s.matches_lost}`);
      }
    });
  }
  
  logger.info(`✅ Recalculated positions for tournament ${tournamentId}${groupId ? ` group ${groupId}` : ''} (${standings.length} participants)`);
};

/**
 * Main function: Update standings after a match completes
 * @param {Number} matchId - Match ID
 * @param {Number} winnerId - Winner participant ID (null for draw)
 * @param {Boolean} isDraw - Whether the match was a draw
 */
const updateStandingsAfterMatch = async (matchId, winnerId, isDraw = false) => {
  logger.info(`🎯 [STANDINGS] Starting standings update for match ${matchId}`);
  
  return await transaction(async (conn) => {
    // Get match details with live_score
    const [matchRows] = await conn.query(
      'SELECT * FROM matches WHERE id = ?',
      [matchId]
    );
    
    if (!matchRows || matchRows.length === 0) {
      logger.error(`❌ [STANDINGS] Match ${matchId} not found`);
      throw new Error('Match not found');
    }
    
    const match = matchRows[0];
    const { tournament_id, group_id, participant1_id, participant2_id, live_score, status } = match;
    
    logger.info(`📋 [STANDINGS] Match details: Tournament ${tournament_id}, P1: ${participant1_id}, P2: ${participant2_id}, Status: ${status}`);
    
    // Parse live_score
    let liveScoreObj = null;
    try {
      // Handle both string and object formats
      if (typeof live_score === 'string') {
        liveScoreObj = JSON.parse(live_score);
        logger.info(`📊 [STANDINGS] Live score parsed from string`);
      } else if (typeof live_score === 'object' && live_score !== null) {
        liveScoreObj = live_score;
        logger.info(`📊 [STANDINGS] Live score already an object`);
      } else {
        logger.warn(`⚠️ [STANDINGS] Live score is null or invalid type: ${typeof live_score}`);
      }
      
      // Debug: Show what's in the live_score
      if (liveScoreObj) {
        logger.info(`🔍 [STANDINGS] Live score keys: ${Object.keys(liveScoreObj).join(', ')}`);
        if (liveScoreObj.participant1) {
          logger.info(`🔍 [STANDINGS] participant1 data: ${JSON.stringify(liveScoreObj.participant1)}`);
        }
        if (liveScoreObj.participant2) {
          logger.info(`🔍 [STANDINGS] participant2 data: ${JSON.stringify(liveScoreObj.participant2)}`);
        }
      }
    } catch (error) {
      logger.error(`❌ [STANDINGS] Failed to parse live_score for match ${matchId}:`, error);
      logger.error(`❌ [STANDINGS] Raw live_score value: ${live_score}`);
    }
    
    // Detect if this is a walkover (declared winner without playing)
    const isWalkover = status === 'walkover' || (!liveScoreObj && winnerId);
    
    if (isWalkover) {
      logger.info(`🚫 [WALKOVER] Match ${matchId} is a walkover - awarding forfeit win`);
    }
    
    // Detect sport type (volleyball vs football/others)
    // For walkovers, we need to check the tournament's sport
    let isVolleyball = liveScoreObj && liveScoreObj.sport === 'Volleyball' && 
                       liveScoreObj.participant1 && liveScoreObj.participant1.sets_won !== undefined;
    
    // If walkover and no live_score, check tournament sport
    if (isWalkover && !isVolleyball) {
      const [tournamentRows] = await conn.query(
        'SELECT s.name FROM tournaments t JOIN sports s ON t.sport_id = s.id WHERE t.id = ?',
        [tournament_id]
      );
      if (tournamentRows && tournamentRows.length > 0) {
        isVolleyball = tournamentRows[0].name === 'Volleyball';
        logger.info(`🔍 [WALKOVER] Detected sport from tournament: ${tournamentRows[0].name}`);
      }
    }
    
    if (isVolleyball) {
      // ========== VOLLEYBALL SCORING (FIVB Rules) ==========
      logger.info(`🏐 [VOLLEYBALL] Processing volleyball match`);
      
      // For walkover: Award 3-0 forfeit win
      let participant1Sets, participant2Sets, participant1Points, participant2Points;
      
      if (isWalkover) {
        logger.info(`🚫 [VOLLEYBALL WALKOVER] Awarding 3-0 forfeit win to ${winnerId}`);
        participant1Sets = winnerId === participant1_id ? 3 : 0;
        participant2Sets = winnerId === participant2_id ? 3 : 0;
        participant1Points = winnerId === participant1_id ? 75 : 0; // Approximate 3 sets x 25 points
        participant2Points = winnerId === participant2_id ? 75 : 0;
      } else {
        // Extract sets and points for volleyball
        participant1Sets = extractSetsFromScore(liveScoreObj, 'participant1');
        participant2Sets = extractSetsFromScore(liveScoreObj, 'participant2');
        participant1Points = extractPointsFromSets(liveScoreObj, 'participant1');
        participant2Points = extractPointsFromSets(liveScoreObj, 'participant2');
      }
      
      logger.info(`🏐 [VOLLEYBALL] Score: P1 (${participant1_id}) = ${participant1Sets} sets, ${participant1Points} pts | P2 (${participant2_id}) = ${participant2Sets} sets, ${participant2Points} pts`);
      
      // CRITICAL: Use winnerId to determine winner, not set comparison
      // This handles cases where referee declares winner on tied sets (e.g., 1-1)
      if (!winnerId) {
        logger.error(`❌ [VOLLEYBALL] No winner declared for match ${matchId}. Cannot update standings.`);
        throw new Error('Cannot update standings: No winner declared');
      }
      
      // Determine winner based on winnerId (not set comparison)
      const isP1Winner = winnerId === participant1_id;
      const winnerSets = isP1Winner ? participant1Sets : participant2Sets;
      const loserSets = isP1Winner ? participant2Sets : participant1Sets;
      
      // Validate: Winner should have more or equal sets (handles tied cases)
      if (winnerSets < loserSets) {
        logger.error(`❌ [VOLLEYBALL] Invalid: Winner (${winnerId}) has fewer sets (${winnerSets}) than loser (${loserSets})`);
        throw new Error('Invalid match result: Winner has fewer sets than loser');
      }
      
      const { winnerPoints, loserPoints } = calculateVolleyballPoints(winnerSets, loserSets);
      
      logger.info(`🏐 [VOLLEYBALL] FIVB Points: Winner gets ${winnerPoints}, Loser gets ${loserPoints}`);
      
      // Update winner
      await updateParticipantStandings(conn, tournament_id, winnerId, {
        matches_played: 1,
        matches_won: 1,
        points: winnerPoints,
        sets_won: winnerSets,
        sets_lost: loserSets,
        points_won: isP1Winner ? participant1Points : participant2Points,
        points_lost: isP1Winner ? participant2Points : participant1Points
      });
      logger.info(`✓ [VOLLEYBALL] Updated winner (${winnerId}): +${winnerPoints} match pts, ${winnerSets}-${loserSets} sets`);
      
      // Update loser
      const loserId = winnerId === participant1_id ? participant2_id : participant1_id;
      await updateParticipantStandings(conn, tournament_id, loserId, {
        matches_played: 1,
        matches_lost: 1,
        points: loserPoints,
        sets_won: loserSets,
        sets_lost: winnerSets,
        points_won: isP1Winner ? participant2Points : participant1Points,
        points_lost: isP1Winner ? participant1Points : participant2Points
      });
      logger.info(`✓ [VOLLEYBALL] Updated loser (${loserId}): +${loserPoints} match pts, ${loserSets}-${winnerSets} sets`);
      
      // Update streaks
      await updateStreaks(conn, tournament_id, winnerId, 'win');
      await updateStreaks(conn, tournament_id, loserId, 'loss');
      
    } else {
      // ========== FOOTBALL/OTHER SPORTS SCORING ==========
      // For walkover: Award 3-0 forfeit win
      let participant1Goals, participant2Goals;
      
      if (isWalkover) {
        logger.info(`🚫 [FOOTBALL WALKOVER] Awarding 3-0 forfeit win to ${winnerId}`);
        participant1Goals = winnerId === participant1_id ? 3 : 0;
        participant2Goals = winnerId === participant2_id ? 3 : 0;
      } else {
        // Extract goals/points for each participant
        participant1Goals = extractGoalsFromScore(liveScoreObj, 'participant1');
        participant2Goals = extractGoalsFromScore(liveScoreObj, 'participant2');
      }
      
      logger.info(`⚽ [FOOTBALL] Match ${matchId} Score: P1 (${participant1_id}) = ${participant1Goals}, P2 (${participant2_id}) = ${participant2Goals}`);
      
      if (isDraw) {
        logger.info(`🤝 [FOOTBALL] Match is a DRAW - updating both participants`);
        
        // Update both participants for draw
        await updateParticipantStandings(conn, tournament_id, participant1_id, {
          matches_played: 1,
          matches_drawn: 1,
          points: 1,
          goals_for: participant1Goals,
          goals_against: participant2Goals,
          clean_sheets: participant2Goals === 0 ? 1 : 0
        });
        logger.info(`✓ [FOOTBALL] Updated P1 (${participant1_id}) for draw`);
        
        await updateParticipantStandings(conn, tournament_id, participant2_id, {
          matches_played: 1,
          matches_drawn: 1,
          points: 1,
          goals_for: participant2Goals,
          goals_against: participant1Goals,
          clean_sheets: participant1Goals === 0 ? 1 : 0
        });
        logger.info(`✓ [FOOTBALL] Updated P2 (${participant2_id}) for draw`);
        
        // Update streaks
        await updateStreaks(conn, tournament_id, participant1_id, 'draw');
        await updateStreaks(conn, tournament_id, participant2_id, 'draw');
        
      } else {
        const loserId = winnerId === participant1_id ? participant2_id : participant1_id;
        const winnerGoals = winnerId === participant1_id ? participant1Goals : participant2Goals;
        const loserGoals = winnerId === participant1_id ? participant2Goals : participant1Goals;
        
        logger.info(`🏆 [FOOTBALL] Winner: ${winnerId} (${winnerGoals} goals), Loser: ${loserId} (${loserGoals} goals)`);
        
        // Update winner
        await updateParticipantStandings(conn, tournament_id, winnerId, {
          matches_played: 1,
          matches_won: 1,
          points: 3,
          goals_for: winnerGoals,
          goals_against: loserGoals,
          clean_sheets: loserGoals === 0 ? 1 : 0
        });
        logger.info(`✓ [FOOTBALL] Updated winner (${winnerId}): +3 points, ${winnerGoals} GF, ${loserGoals} GA`);
        
        // Update loser
        await updateParticipantStandings(conn, tournament_id, loserId, {
          matches_played: 1,
          matches_lost: 1,
          points: 0,
          goals_for: loserGoals,
          goals_against: winnerGoals,
          clean_sheets: 0
        });
        logger.info(`✓ [FOOTBALL] Updated loser (${loserId}): +0 points, ${loserGoals} GF, ${winnerGoals} GA`);
        
        // Update streaks
        await updateStreaks(conn, tournament_id, winnerId, 'win');
        await updateStreaks(conn, tournament_id, loserId, 'loss');
        logger.info(`✓ [FOOTBALL] Updated streaks for both participants`);
      }
    }
    
    // Recalculate averages, form, and positions (use internal version to avoid nested transactions)
    logger.info(`🔄 [STANDINGS] Recalculating averages, form, and positions...`);
    await recalculateStandingsInternal(conn, tournament_id, group_id);
    
    logger.info(`✅ [STANDINGS] Successfully completed standings update for match ${matchId}`);
  });
};

module.exports = {
  extractGoalsFromScore,
  extractSetsFromScore,
  extractPointsFromSets,
  calculateVolleyballPoints,
  updateParticipantStandings,
  updateStreaks,
  recalculateStandings,
  updateFormGuide,
  recalculatePositions,
  updateStandingsAfterMatch
};

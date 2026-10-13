const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Tournament Winner Determination Service
 * 
 * Handles:
 * - Checking if all matches are complete
 * - Determining winner based on standings
 * - Tiebreaker rules when points are equal
 * - Updating tournament with winner
 */

/**
 * Check if all tournament matches are completed
 * @param {Number} tournamentId - Tournament ID
 * @returns {Object} { allComplete: boolean, totalMatches: number, completedMatches: number }
 */
const checkAllMatchesComplete = async (tournamentId) => {
  const sql = `
    SELECT 
      COUNT(*) as total_matches,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_matches,
      SUM(CASE WHEN status IN ('scheduled', 'in_progress', 'pending') THEN 1 ELSE 0 END) as pending_matches
    FROM matches
    WHERE tournament_id = ?
  `;
  
  const [result] = await query(sql, [tournamentId]);
  
  // Handle NULL values from SUM() - explicitly convert to numbers
  const totalMatches = Number(result.total_matches) || 0;
  const completedMatches = Number(result.completed_matches) || 0;
  const pendingMatches = Number(result.pending_matches) || 0;
  
  const allComplete = (pendingMatches === 0) && (totalMatches > 0);
  
  logger.info(`🔍 [WINNER CHECK] Raw values: total=${result.total_matches}, completed=${result.completed_matches}, pending=${result.pending_matches}`);
  logger.info(`🔍 [WINNER CHECK] Converted: total=${totalMatches}, completed=${completedMatches}, pending=${pendingMatches}, allComplete=${allComplete}`);
  
  return {
    allComplete: allComplete,
    totalMatches: totalMatches,
    completedMatches: completedMatches,
    pendingMatches: pendingMatches
  };
};

/**
 * Get tournament standings with tiebreaker rules applied
 * 
 * Tiebreaker Priority (Sport-specific):
 * 
 * VOLLEYBALL/BADMINTON/TENNIS:
 * 1. Points (highest)
 * 2. Set Ratio (highest)
 * 3. Sets Won (highest)
 * 4. Sets Lost (lowest)
 * 5. Matches Won (highest)
 * 
 * FOOTBALL/BASKETBALL:
 * 1. Points (highest)
 * 2. Goal Difference (highest)
 * 3. Goals For (highest)
 * 4. Avg Goals For (highest)
 * 5. Matches Won (highest)
 * 
 * @param {Number} tournamentId - Tournament ID
 * @returns {Array} Sorted standings with winner at position 1
 */
const getStandingsWithTiebreaker = async (tournamentId) => {
  // First, get tournament sport to determine tiebreaker rules
  const sportSql = `
    SELECT s.name as sport_name
    FROM tournaments t
    JOIN sports s ON t.sport_id = s.id
    WHERE t.id = ?
  `;
  const [sportResult] = await query(sportSql, [tournamentId]);
  const sportName = sportResult?.sport_name || '';
  
  // Determine if this is a set-based sport (Volleyball, Badminton, Tennis, etc.)
  const isSetBasedSport = ['Volleyball', 'Badminton', 'Tennis', 'Table Tennis', 'Squash', 'Pickleball', 'Padel'].includes(sportName);
  
  logger.info(`🎾 [WINNER] Sport: ${sportName}, Set-based: ${isSetBasedSport}`);
  
  const sql = `
    SELECT 
      ts.*,
      tp.id as tp_id,
      tp.team_id,
      tp.partnership_id,
      tp.user_id,
      tm.name as team_name,
      p.partnership_name,
      CONCAT(u.first_name, ' ', u.last_name) as user_name,
      CASE 
        WHEN tp.team_id IS NOT NULL THEN tm.name
        WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
        WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
        ELSE 'Unknown'
      END as participant_name
    FROM tournament_standings ts
    JOIN tournaments t ON ts.tournament_id = t.id
    LEFT JOIN tournament_participants tp ON ts.participant_id = tp.id
    LEFT JOIN teams tm ON tp.team_id = tm.id
    LEFT JOIN partnerships p ON tp.partnership_id = p.id
    LEFT JOIN users u ON tp.user_id = u.id
    WHERE ts.tournament_id = ?
    ORDER BY 
      ts.points DESC,              -- 1. Highest points (all sports)
      ${isSetBasedSport ? `
      ts.set_ratio DESC,           -- 2. Best set ratio (volleyball/tennis)
      ts.sets_won DESC,            -- 3. Most sets won
      ts.sets_lost ASC,            -- 4. Least sets lost
      ts.matches_won DESC          -- 5. Most wins
      ` : `
      ts.goal_difference DESC,     -- 2. Best goal difference (football)
      ts.goals_for DESC,           -- 3. Most goals scored
      ts.avg_goals_for DESC,       -- 4. Best average goals
      ts.matches_won DESC,         -- 5. Most wins
      ts.goals_against ASC         -- 6. Least goals conceded
      `}
  `;
  
  const standings = await query(sql, [tournamentId]);
  
  // Debug: Log first standing to see what data we have
  if (standings.length > 0) {
    logger.info(`🔍 [WINNER DEBUG] First standing: participant_id=${standings[0].participant_id}, tp_id=${standings[0].tp_id}, team_id=${standings[0].team_id}, partnership_id=${standings[0].partnership_id}, user_id=${standings[0].user_id}`);
    logger.info(`🔍 [WINNER DEBUG] Names: team_name=${standings[0].team_name}, partnership_name=${standings[0].partnership_name}, user_name=${standings[0].user_name}, participant_name=${standings[0].participant_name}`);
  }
  
  return standings;
};

/**
 * Determine tournament winner
 * @param {Number} tournamentId - Tournament ID
 * @returns {Object} Winner details and standings
 */
const determineTournamentWinner = async (tournamentId) => {
  logger.info(`🏆 [WINNER] Determining winner for tournament ${tournamentId}`);
  
  // Step 1: Check if all matches are complete
  const matchStatus = await checkAllMatchesComplete(tournamentId);
  
  logger.info(`📊 [WINNER] Match status: Total=${matchStatus.totalMatches}, Completed=${matchStatus.completedMatches}, Pending=${matchStatus.pendingMatches}, AllComplete=${matchStatus.allComplete}`);
  
  if (!matchStatus.allComplete) {
    logger.warn(`⚠️ [WINNER] Tournament ${tournamentId} still has ${matchStatus.pendingMatches} pending matches`);
    return {
      success: false,
      message: `Tournament has ${matchStatus.pendingMatches} pending matches`,
      matchStatus
    };
  }
  
  logger.info(`✅ [WINNER] All ${matchStatus.totalMatches} matches completed`);
  
  // Step 2: Get tournament format to determine winner logic
  const formatSql = `SELECT format_type FROM tournaments WHERE id = ?`;
  const [formatResult] = await query(formatSql, [tournamentId]);
  const formatType = formatResult?.format_type;
  
  logger.info(`🎯 [WINNER] Tournament format: ${formatType}`);
  
  // Step 3: Determine winner based on format
  if (formatType === 'knockout' || formatType === 'groups_knockout') {
    // For knockout formats, winner is the winner of the final match
    logger.info(`🏆 [WINNER] Knockout format - finding final match winner`);
    
    // First, try to find match with round_name = 'Final'
    let finalMatchSql = `
      SELECT 
        m.id,
        m.round_name,
        m.round_number,
        m.winner_participant_id,
        tp.id as tp_id,
        tp.team_id,
        tp.partnership_id,
        tp.user_id,
        CASE 
          WHEN tp.team_id IS NOT NULL THEN tm.name
          WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
          WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          ELSE 'Unknown'
        END as participant_name
      FROM matches m
      LEFT JOIN tournament_participants tp ON m.winner_participant_id = tp.id
      LEFT JOIN teams tm ON tp.team_id = tm.id
      LEFT JOIN partnerships p ON tp.partnership_id = p.id
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE m.tournament_id = ?
        AND m.round_name LIKE '%Final%'
        AND m.status = 'completed'
        AND m.winner_participant_id IS NOT NULL
      ORDER BY m.id DESC
      LIMIT 1
    `;
    
    let [finalMatch] = await query(finalMatchSql, [tournamentId]);
    
    // If no match with round_name='Final', find the last completed knockout match (highest round_number, group_id IS NULL)
    if (!finalMatch || !finalMatch.winner_participant_id) {
      logger.warn(`⚠️ [WINNER] No match with round_name='Final' found, checking for last knockout match`);
      
      finalMatchSql = `
        SELECT 
          m.id,
          m.round_name,
          m.round_number,
          m.winner_participant_id,
          tp.id as tp_id,
          tp.team_id,
          tp.partnership_id,
          tp.user_id,
          CASE 
            WHEN tp.team_id IS NOT NULL THEN tm.name
            WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
            WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
            ELSE 'Unknown'
          END as participant_name
        FROM matches m
        LEFT JOIN tournament_participants tp ON m.winner_participant_id = tp.id
        LEFT JOIN teams tm ON tp.team_id = tm.id
        LEFT JOIN partnerships p ON tp.partnership_id = p.id
        LEFT JOIN users u ON tp.user_id = u.id
        WHERE m.tournament_id = ?
          AND m.group_id IS NULL
          AND m.status = 'completed'
          AND m.winner_participant_id IS NOT NULL
        ORDER BY m.round_number DESC, m.id DESC
        LIMIT 1
      `;
      
      [finalMatch] = await query(finalMatchSql, [tournamentId]);
      
      if (finalMatch && finalMatch.winner_participant_id) {
        logger.info(`✅ [WINNER] Found last knockout match: ${finalMatch.round_name} (Round ${finalMatch.round_number}), Match ID: ${finalMatch.id}`);
      }
    }
    
    if (!finalMatch || !finalMatch.winner_participant_id) {
      logger.error(`❌ [WINNER] No final match winner found for knockout tournament ${tournamentId}`);
      return {
        success: false,
        message: 'Final match not completed or no winner declared'
      };
    }
    
    logger.info(`🥇 [WINNER] Final match winner: ${finalMatch.participant_name} (ID: ${finalMatch.winner_participant_id})`);
    
    // Get winner's stats from standings
    const winnerStatsSql = `
      SELECT ts.*, 
        CASE 
          WHEN tp.team_id IS NOT NULL THEN tm.name
          WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
          WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          ELSE 'Unknown'
        END as participant_name
      FROM tournament_standings ts
      LEFT JOIN tournament_participants tp ON ts.participant_id = tp.id
      LEFT JOIN teams tm ON tp.team_id = tm.id
      LEFT JOIN partnerships p ON tp.partnership_id = p.id
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE ts.tournament_id = ? AND ts.participant_id = ?
    `;
    
    const [winnerStats] = await query(winnerStatsSql, [tournamentId, finalMatch.winner_participant_id]);
    
    return {
      success: true,
      winner: {
        participant_id: finalMatch.winner_participant_id,
        participant_name: finalMatch.participant_name,
        points: winnerStats?.points || 0,
        matches_played: winnerStats?.matches_played || 0,
        matches_won: winnerStats?.matches_won || 0,
        matches_drawn: winnerStats?.matches_drawn || 0,
        matches_lost: winnerStats?.matches_lost || 0,
        goals_for: winnerStats?.goals_for || 0,
        goals_against: winnerStats?.goals_against || 0,
        goal_difference: winnerStats?.goal_difference || 0,
        avg_goals_for: winnerStats?.avg_goals_for || 0,
        avg_goals_against: winnerStats?.avg_goals_against || 0,
        form: winnerStats?.form || ''
      },
      method: 'final_match',
      standings: null,
      tiebreaker: null
    };
  }
  
  // For league/round-robin formats, use standings-based winner
  logger.info(`📊 [WINNER] League/Round-robin format - using standings`);
  
  // Step 4: Get standings with tiebreaker rules
  const standings = await getStandingsWithTiebreaker(tournamentId);
  
  if (!standings || standings.length === 0) {
    logger.error(`❌ [WINNER] No standings found for tournament ${tournamentId}`);
    return {
      success: false,
      message: 'No standings data available'
    };
  }
  
  // Step 3: Winner is at position 1 (top of standings)
  const winner = standings[0];
  
  // Check if this is a set-based sport for logging
  const sportSql2 = `SELECT s.name FROM tournaments t JOIN sports s ON t.sport_id = s.id WHERE t.id = ?`;
  const [sport] = await query(sportSql2, [tournamentId]);
  const isSetBased = ['Volleyball', 'Badminton', 'Tennis', 'Table Tennis', 'Squash', 'Pickleball', 'Padel'].includes(sport?.name);
  
  logger.info(`🥇 [WINNER] Winner determined: ${winner.participant_name} (ID: ${winner.participant_id})`);
  
  if (isSetBased) {
    logger.info(`📊 [WINNER] Stats: ${winner.points} pts, ${winner.matches_won}W-${winner.matches_lost}L, Sets: ${winner.sets_won}-${winner.sets_lost}, SR: ${winner.set_ratio}`);
  } else {
    logger.info(`📊 [WINNER] Stats: ${winner.points} pts, ${winner.matches_won}W-${winner.matches_drawn}D-${winner.matches_lost}L, GD: ${winner.goal_difference}`);
  }
  
  // Step 4: Check for ties (multiple participants with same points and GD)
  const tiedParticipants = standings.filter(s => 
    s.points === winner.points && 
    s.goal_difference === winner.goal_difference &&
    s.goals_for === winner.goals_for
  );
  
  if (tiedParticipants.length > 1) {
    logger.warn(`⚠️ [WINNER] ${tiedParticipants.length} participants tied on points, GD, and GF`);
    logger.info(`🔍 [WINNER] Tiebreaker applied: Winner has better avg_goals_for or matches_won`);
  }
  
  return {
    success: true,
    winner: {
      participant_id: winner.participant_id,
      participant_name: winner.participant_name,
      points: winner.points,
      matches_played: winner.matches_played,
      matches_won: winner.matches_won,
      matches_drawn: winner.matches_drawn,
      matches_lost: winner.matches_lost,
      goals_for: winner.goals_for,
      goals_against: winner.goals_against,
      goal_difference: winner.goal_difference,
      avg_goals_for: winner.avg_goals_for,
      avg_goals_against: winner.avg_goals_against,
      form: winner.form
    },
    method: 'standings',
    standings: standings.map((s, index) => ({
      position: index + 1,
      participant_id: s.participant_id,
      participant_name: s.participant_name,
      points: s.points,
      goal_difference: s.goal_difference,
      goals_for: s.goals_for
    })),
    tiebreaker: tiedParticipants.length > 1 ? {
      applied: true,
      tiedCount: tiedParticipants.length,
      rule: 'avg_goals_for and matches_won'
    } : null
  };
};

/**
 * Update tournament with winner and mark as completed
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} winnerId - Winner participant ID
 */
const updateTournamentWinner = async (tournamentId, winnerId) => {
  return await transaction(async (conn) => {
    // Update tournament
    const updateSql = `
      UPDATE tournaments
      SET 
        winner_participant_id = ?,
        status = 'completed',
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await conn.query(updateSql, [winnerId, tournamentId]);
    
    logger.info(`✅ [WINNER] Tournament ${tournamentId} updated with winner ${winnerId}`);
    
    return true;
  });
};

/**
 * Main function: Determine and set tournament winner
 * Called after last match completes
 * 
 * @param {Number} tournamentId - Tournament ID
 * @returns {Object} Winner details
 */
const determineAndSetWinner = async (tournamentId) => {
  try {
    logger.info(`🎯 [WINNER] Starting winner determination for tournament ${tournamentId}`);
    
    // Determine winner based on standings
    const result = await determineTournamentWinner(tournamentId);
    
    if (!result.success) {
      logger.warn(`⚠️ [WINNER] Could not determine winner: ${result.message}`);
      return result;
    }
    
    // Update tournament with winner
    await updateTournamentWinner(tournamentId, result.winner.participant_id);
    
    logger.info(`🏆 [WINNER] Tournament ${tournamentId} completed! Winner: ${result.winner.participant_name}`);
    
    return {
      success: true,
      message: 'Tournament winner determined successfully',
      winner: result.winner,
      standings: result.standings,
      tiebreaker: result.tiebreaker
    };
    
  } catch (error) {
    logger.error(`❌ [WINNER] Error determining winner for tournament ${tournamentId}:`, error);
    throw error;
  }
};

module.exports = {
  checkAllMatchesComplete,
  getStandingsWithTiebreaker,
  determineTournamentWinner,
  updateTournamentWinner,
  determineAndSetWinner
};

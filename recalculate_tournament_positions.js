/**
 * Recalculate Tournament Positions
 * Run this to fix positions for existing tournaments using new tiebreaker rules
 */

const { query } = require('./src/config/database');
const standingsService = require('./src/services/standingsService');
const logger = require('./src/utils/logger');

const recalculateTournamentPositions = async (tournamentId) => {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🔄 Recalculating positions for tournament ${tournamentId}`);
    logger.info(`${'='.repeat(60)}\n`);
    
    // Get all groups for this tournament
    const groups = await query(
      `SELECT DISTINCT group_id FROM tournament_standings WHERE tournament_id = ? AND group_id IS NOT NULL`,
      [tournamentId]
    );
    
    if (groups && groups.length > 0) {
      logger.info(`Found ${groups.length} groups in tournament ${tournamentId}`);
      
      // Recalculate for each group
      for (const { group_id } of groups) {
        logger.info(`\n📊 Recalculating Group ${group_id}...`);
        await standingsService.recalculateStandings(tournamentId, group_id);
      }
    }
    
    // Also recalculate overall standings (for participants without groups)
    logger.info(`\n📊 Recalculating overall standings...`);
    await standingsService.recalculateStandings(tournamentId, null);
    
    logger.info(`\n✅ Successfully recalculated all positions for tournament ${tournamentId}\n`);
    
    // Show updated standings
    const standings = await query(
      `SELECT 
        ts.position,
        ts.participant_id,
        ts.points,
        ts.matches_played,
        ts.matches_won,
        ts.matches_lost,
        ts.goal_difference,
        ts.goals_for,
        tg.group_name,
        CASE 
          WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
          WHEN tp.team_id IS NOT NULL THEN t.name
        END as participant_name
      FROM tournament_standings ts
      LEFT JOIN tournament_groups tg ON ts.group_id = tg.id
      LEFT JOIN tournament_participants tp ON ts.participant_id = tp.id
      LEFT JOIN users u ON tp.user_id = u.id
      LEFT JOIN partnerships p ON tp.partnership_id = p.id
      LEFT JOIN teams t ON tp.team_id = t.id
      WHERE ts.tournament_id = ?
      ORDER BY tg.group_name, ts.position`,
      [tournamentId]
    );
    
    logger.info(`\n📋 Updated Standings:`);
    logger.info(`${'='.repeat(100)}`);
    
    let currentGroup = null;
    standings.forEach(s => {
      if (s.group_name !== currentGroup) {
        currentGroup = s.group_name;
        logger.info(`\n🏆 ${currentGroup || 'Overall'}`);
        logger.info(`${'-'.repeat(100)}`);
      }
      
      const winRatio = s.matches_played > 0 ? (s.matches_won / s.matches_played * 100).toFixed(1) : '0.0';
      logger.info(
        `  ${s.position}. ${s.participant_name?.padEnd(20)} | ` +
        `${s.points}pts | P:${s.matches_played} W:${s.matches_won} L:${s.matches_lost} | ` +
        `GD:${s.goal_difference > 0 ? '+' : ''}${s.goal_difference} GF:${s.goals_for} | ` +
        `Win Rate: ${winRatio}%`
      );
    });
    
    logger.info(`\n${'='.repeat(100)}\n`);
    
  } catch (error) {
    logger.error('❌ Error recalculating positions:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    // Get tournament ID from command line argument
    const tournamentId = process.argv[2];
    
    if (!tournamentId) {
      console.error('❌ Please provide tournament ID as argument');
      console.error('Usage: node recalculate_tournament_positions.js <tournament_id>');
      process.exit(1);
    }
    
    await recalculateTournamentPositions(parseInt(tournamentId));
    
    logger.info('✅ Done! Positions have been recalculated.\n');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

main();

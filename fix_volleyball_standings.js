/**
 * Fix Volleyball Standings for Completed Matches
 * This script retroactively updates standings for volleyball matches that were completed
 * before the volleyball stats update was implemented.
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'tournament_user',
  password: 'Tournament@2025!',
  database: 'sports_tournament_db_v3'
};

async function fixVolleyballStandings() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔍 Finding completed volleyball matches...');
    
    // Get all completed volleyball matches
    const [matches] = await connection.query(`
      SELECT 
        m.id as match_id,
        m.tournament_id,
        m.participant1_id,
        m.participant2_id,
        m.winner_participant_id,
        m.live_score,
        t.sport_id,
        s.name as sport_name
      FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN sports s ON t.sport_id = s.id
      WHERE m.status = 'completed'
        AND s.name = 'Volleyball'
        AND m.live_score IS NOT NULL
    `);
    
    console.log(`✅ Found ${matches.length} completed volleyball matches`);
    
    for (const match of matches) {
      console.log(`\n🏐 Processing match ${match.match_id}...`);
      
      let liveScore;
      try {
        liveScore = typeof match.live_score === 'string' 
          ? JSON.parse(match.live_score) 
          : match.live_score;
      } catch (err) {
        console.error(`❌ Failed to parse live_score for match ${match.match_id}`);
        continue;
      }
      
      // Check if it has volleyball data
      if (!liveScore.participant1 || !liveScore.participant2) {
        console.log(`⚠️ Match ${match.match_id} has no participant data, skipping...`);
        continue;
      }
      
      // Extract sets won for each participant
      const p1SetsWon = liveScore.participant1.sets_won || 0;
      const p2SetsWon = liveScore.participant2.sets_won || 0;
      
      // Extract total points from all sets
      const p1SetScores = liveScore.participant1.set_scores || [];
      const p2SetScores = liveScore.participant2.set_scores || [];
      
      const p1PointsWon = p1SetScores.reduce((sum, score) => sum + (parseInt(score) || 0), 0);
      const p2PointsWon = p2SetScores.reduce((sum, score) => sum + (parseInt(score) || 0), 0);
      
      console.log(`📊 Participant1 (${match.participant1_id}): ${p1SetsWon} sets, ${p1PointsWon} points`);
      console.log(`📊 Participant2 (${match.participant2_id}): ${p2SetsWon} sets, ${p2PointsWon} points`);
      
      // Calculate FIVB points
      const isP1Winner = p1SetsWon > p2SetsWon;
      const winnerSets = isP1Winner ? p1SetsWon : p2SetsWon;
      const loserSets = isP1Winner ? p2SetsWon : p1SetsWon;
      
      let winnerPoints, loserPoints;
      if (winnerSets === 3 && loserSets <= 1) {
        winnerPoints = 3;
        loserPoints = 0;
      } else if (winnerSets === 3 && loserSets === 2) {
        winnerPoints = 2;
        loserPoints = 1;
      } else {
        winnerPoints = 0;
        loserPoints = 0;
      }
      
      console.log(`🏆 FIVB Points: Winner gets ${winnerPoints}, Loser gets ${loserPoints}`);
      
      // Update participant1 standings
      await connection.query(`
        UPDATE tournament_standings
        SET 
          sets_won = sets_won + ?,
          sets_lost = sets_lost + ?,
          points_won = points_won + ?,
          points_lost = points_lost + ?
        WHERE tournament_id = ? AND participant_id = ?
      `, [p1SetsWon, p2SetsWon, p1PointsWon, p2PointsWon, match.tournament_id, match.participant1_id]);
      
      // Update participant2 standings
      await connection.query(`
        UPDATE tournament_standings
        SET 
          sets_won = sets_won + ?,
          sets_lost = sets_lost + ?,
          points_won = points_won + ?,
          points_lost = points_lost + ?
        WHERE tournament_id = ? AND participant_id = ?
      `, [p2SetsWon, p1SetsWon, p2PointsWon, p1PointsWon, match.tournament_id, match.participant2_id]);
      
      // Recalculate ratios
      await connection.query(`
        UPDATE tournament_standings
        SET 
          set_ratio = CASE WHEN sets_lost > 0 THEN ROUND(sets_won / sets_lost, 2) ELSE sets_won END,
          point_ratio = CASE WHEN points_lost > 0 THEN ROUND(points_won / points_lost, 2) ELSE points_won END
        WHERE tournament_id = ? AND participant_id IN (?, ?)
      `, [match.tournament_id, match.participant1_id, match.participant2_id]);
      
      console.log(`✅ Updated standings for match ${match.match_id}`);
    }
    
    console.log(`\n🎉 Successfully fixed ${matches.length} volleyball matches!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

// Run the fix
fixVolleyballStandings()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });

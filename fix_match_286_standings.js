/**
 * Manual script to update standings for match 286
 * Run this once to fix the standings for the completed match
 */

require('dotenv').config();
const standingsService = require('./src/services/standingsService');
const { query } = require('./src/config/database');

async function fixMatch286Standings() {
  try {
    console.log('🔧 Fixing standings for match 286...\n');
    
    // Get match details
    const [match] = await query('SELECT * FROM matches WHERE id = 286');
    
    if (!match) {
      console.error('❌ Match 286 not found');
      process.exit(1);
    }
    
    console.log('📋 Match Details:');
    console.log(`   Tournament ID: ${match.tournament_id}`);
    console.log(`   Participant 1: ${match.participant1_id}`);
    console.log(`   Participant 2: ${match.participant2_id}`);
    console.log(`   Winner: ${match.winner_participant_id}`);
    console.log(`   Status: ${match.status}`);
    
    // Parse live_score
    let liveScore = null;
    try {
      liveScore = JSON.parse(match.live_score);
      console.log(`   Score: P1 (${liveScore.participant1?.goals || 0}) vs P2 (${liveScore.participant2?.goals || 0})`);
    } catch (e) {
      console.log('   Score: Could not parse');
    }
    
    console.log('\n🔄 Updating standings...');
    
    // Update standings
    await standingsService.updateStandingsAfterMatch(
      match.id,
      match.winner_participant_id,
      false // not a draw
    );
    
    console.log('✅ Standings updated successfully!\n');
    
    // Show updated standings
    const standings = await query(`
      SELECT 
        ts.position,
        CASE 
          WHEN tp.team_id IS NOT NULL THEN t.name
          WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
        END as team_name,
        ts.matches_played,
        ts.matches_won,
        ts.matches_lost,
        ts.points,
        ts.goals_for,
        ts.goals_against,
        ts.goal_difference,
        ts.form,
        ts.winning_streak,
        ts.losing_streak
      FROM tournament_standings ts
      JOIN tournament_participants tp ON ts.participant_id = tp.id
      LEFT JOIN teams t ON tp.team_id = t.id
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE ts.tournament_id = ?
      ORDER BY ts.position
    `, [match.tournament_id]);
    
    console.log('📊 Updated Standings:');
    console.log('─'.repeat(100));
    console.log('Pos | Team Name          | P | W | L | Pts | GF | GA | GD  | Form | Streak');
    console.log('─'.repeat(100));
    
    standings.forEach(s => {
      const pos = String(s.position || '-').padEnd(3);
      const name = String(s.team_name || 'Unknown').padEnd(18);
      const p = String(s.matches_played).padEnd(1);
      const w = String(s.matches_won).padEnd(1);
      const l = String(s.matches_lost).padEnd(1);
      const pts = String(s.points).padEnd(3);
      const gf = String(s.goals_for).padEnd(2);
      const ga = String(s.goals_against).padEnd(2);
      const gd = String(s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference).padEnd(3);
      const form = String(s.form || '-').padEnd(4);
      const streak = s.winning_streak > 0 ? `W:${s.winning_streak}` : s.losing_streak > 0 ? `L:${s.losing_streak}` : '-';
      
      console.log(`${pos} | ${name} | ${p} | ${w} | ${l} | ${pts} | ${gf} | ${ga} | ${gd} | ${form} | ${streak}`);
    });
    
    console.log('─'.repeat(100));
    console.log('\n✅ Done! Standings are now up to date.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixMatch286Standings();

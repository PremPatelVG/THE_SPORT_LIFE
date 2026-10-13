/**
 * Quick Fix Script: Update q4 vs a4 Match Standings
 * 
 * Problem: Match shows 1-1 tied, q4 declared winner, but both have 0 points
 * Solution: Manually update standings to give q4 3 points
 */

// Load environment variables
require('dotenv').config();

const { pool } = require('./src/config/database');

async function fixQ4A4Match() {
  console.log('🔧 Fixing q4 vs a4 match standings...\n');
  
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    // Step 1: Find the match
    const [matches] = await conn.query(`
      SELECT m.*, 
             p1.name as p1_name, 
             p2.name as p2_name
      FROM matches m
      LEFT JOIN teams p1 ON m.participant1_id = p1.id
      LEFT JOIN teams p2 ON m.participant2_id = p2.id
      WHERE (p1.name = 'q4' AND p2.name = 'a4')
         OR (p1.name = 'a4' AND p2.name = 'q4')
      ORDER BY m.id DESC
      LIMIT 1
    `);
    
    if (!matches || matches.length === 0) {
      console.log('❌ Match not found between q4 and a4');
      return;
    }
    
    const match = matches[0];
    console.log(`✅ Found match ${match.id}: ${match.p1_name} vs ${match.p2_name}`);
    console.log(`   Winner: ${match.winner_participant_id}`);
    console.log(`   Status: ${match.status}\n`);
    
    // Step 2: Parse live_score
    let liveScore = null;
    try {
      liveScore = typeof match.live_score === 'string' 
        ? JSON.parse(match.live_score) 
        : match.live_score;
    } catch (e) {
      console.log('⚠️  Could not parse live_score');
    }
    
    if (liveScore) {
      console.log('📊 Live Score:');
      console.log(`   P1 (${match.participant1_id}): ${liveScore.participant1?.sets_won || 0} sets`);
      console.log(`   P2 (${match.participant2_id}): ${liveScore.participant2?.sets_won || 0} sets\n`);
    }
    
    // Step 3: Determine winner and loser
    const winnerId = match.winner_participant_id;
    const loserId = winnerId === match.participant1_id ? match.participant2_id : match.participant1_id;
    
    if (!winnerId) {
      console.log('❌ No winner declared for this match');
      await conn.rollback();
      return;
    }
    
    console.log(`🏆 Winner: ${winnerId}`);
    console.log(`😞 Loser: ${loserId}\n`);
    
    // Step 4: Get current standings
    const [currentStandings] = await conn.query(`
      SELECT participant_id, matches_played, matches_won, matches_lost, points
      FROM tournament_standings
      WHERE tournament_id = ? AND participant_id IN (?, ?)
    `, [match.tournament_id, winnerId, loserId]);
    
    console.log('📋 Current Standings:');
    currentStandings.forEach(s => {
      console.log(`   Participant ${s.participant_id}: ${s.matches_played}P ${s.matches_won}W ${s.matches_lost}L ${s.points}pts`);
    });
    console.log('');
    
    // Step 5: Calculate what the standings SHOULD be
    // For 1-1 tied match with referee-declared winner: Winner gets 3 points, Loser gets 0
    const winnerSets = liveScore ? (winnerId === match.participant1_id ? liveScore.participant1?.sets_won : liveScore.participant2?.sets_won) : 1;
    const loserSets = liveScore ? (loserId === match.participant1_id ? liveScore.participant1?.sets_won : liveScore.participant2?.sets_won) : 1;
    
    const winnerPoints = 3; // Tied match = forfeit = 3 points
    const loserPoints = 0;
    
    console.log(`🎯 Should Award:`);
    console.log(`   Winner (${winnerId}): ${winnerPoints} points`);
    console.log(`   Loser (${loserId}): ${loserPoints} points\n`);
    
    // Step 6: Check if standings already updated
    const winnerStanding = currentStandings.find(s => s.participant_id === winnerId);
    const loserStanding = currentStandings.find(s => s.participant_id === loserId);
    
    if (winnerStanding && winnerStanding.points >= winnerPoints && winnerStanding.matches_won >= 1) {
      console.log('✅ Standings already look correct! No update needed.');
      await conn.rollback();
      return;
    }
    
    // Step 7: Update standings
    console.log('🔄 Updating standings...\n');
    
    // Update winner
    await conn.query(`
      UPDATE tournament_standings
      SET matches_played = matches_played + 1,
          matches_won = matches_won + 1,
          points = points + ?,
          sets_won = sets_won + ?,
          sets_lost = sets_lost + ?
      WHERE tournament_id = ? AND participant_id = ?
    `, [winnerPoints, winnerSets, loserSets, match.tournament_id, winnerId]);
    
    console.log(`✅ Updated winner (${winnerId}): +1 match, +1 win, +${winnerPoints} points`);
    
    // Update loser
    await conn.query(`
      UPDATE tournament_standings
      SET matches_played = matches_played + 1,
          matches_lost = matches_lost + 1,
          points = points + ?,
          sets_won = sets_won + ?,
          sets_lost = sets_lost + ?
      WHERE tournament_id = ? AND participant_id = ?
    `, [loserPoints, loserSets, winnerSets, match.tournament_id, loserId]);
    
    console.log(`✅ Updated loser (${loserId}): +1 match, +1 loss, +${loserPoints} points\n`);
    
    // Step 8: Recalculate positions
    const standingsService = require('./src/services/standingsService');
    await standingsService.recalculatePositions(conn, match.tournament_id, match.group_id);
    
    console.log('✅ Recalculated positions\n');
    
    await conn.commit();
    
    // Step 9: Show final standings
    const [finalStandings] = await conn.query(`
      SELECT participant_id, matches_played, matches_won, matches_lost, points, position
      FROM tournament_standings
      WHERE tournament_id = ? AND participant_id IN (?, ?)
      ORDER BY position ASC
    `, [match.tournament_id, winnerId, loserId]);
    
    console.log('📊 Final Standings:');
    finalStandings.forEach(s => {
      console.log(`   Pos ${s.position}: Participant ${s.participant_id} - ${s.matches_played}P ${s.matches_won}W ${s.matches_lost}L ${s.points}pts`);
    });
    
    console.log('\n✅ Fix completed successfully!');
    
  } catch (error) {
    await conn.rollback();
    console.error('❌ Error:', error);
    throw error;
  } finally {
    conn.release();
  }
}

// Run the fix
fixQ4A4Match()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });

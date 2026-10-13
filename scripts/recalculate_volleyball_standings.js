/**
 * Recalculate Volleyball Standings
 * This script resets and recalculates standings for volleyball tournaments
 * to fix incorrect FIVB points calculation
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function recalculateVolleyballStandings() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Step 1: Find all volleyball tournaments (tournaments with sets_won/sets_lost data)
    console.log('\n📊 Finding volleyball tournaments...');
    const [tournaments] = await connection.query(`
      SELECT DISTINCT ts.tournament_id, t.name
      FROM tournament_standings ts
      JOIN tournaments t ON ts.tournament_id = t.id
      WHERE ts.sets_won > 0 OR ts.sets_lost > 0
    `);
    
    if (tournaments.length === 0) {
      console.log('❌ No volleyball tournaments found');
      return;
    }
    
    console.log(`✅ Found ${tournaments.length} volleyball tournament(s):`);
    tournaments.forEach((t, i) => {
      console.log(`   ${i + 1}. Tournament ID: ${t.tournament_id} - ${t.name}`);
    });
    
    // Step 2: For each tournament, reset and recalculate
    for (const tournament of tournaments) {
      console.log(`\n🔄 Processing Tournament ID: ${tournament.tournament_id} - ${tournament.name}`);
      
      // Show current standings
      console.log('   📋 Current standings:');
      const [currentStandings] = await connection.query(`
        SELECT 
          CASE
            WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
            WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
            WHEN tp.team_id IS NOT NULL THEN tm.name
          END AS team,
          ts.matches_played AS P,
          ts.matches_won AS W,
          ts.matches_lost AS L,
          ts.sets_won AS SW,
          ts.sets_lost AS SL,
          ts.points AS PTS
        FROM tournament_standings ts
        LEFT JOIN tournament_participants tp ON ts.participant_id = tp.id
        LEFT JOIN users u ON tp.user_id = u.id
        LEFT JOIN partnerships p ON tp.partnership_id = p.id
        LEFT JOIN teams tm ON tp.team_id = tm.id
        WHERE ts.tournament_id = ?
        ORDER BY ts.position
      `, [tournament.tournament_id]);
      
      console.table(currentStandings);
      
      // Reset standings
      console.log('   🔄 Resetting standings...');
      await connection.query(`
        UPDATE tournament_standings
        SET 
          matches_played = 0,
          matches_won = 0,
          matches_lost = 0,
          matches_drawn = 0,
          points = 0,
          sets_won = 0,
          sets_lost = 0,
          points_won = 0,
          points_lost = 0,
          set_ratio = 0,
          point_ratio = 0,
          winning_streak = 0,
          losing_streak = 0,
          form = ''
        WHERE tournament_id = ?
      `, [tournament.tournament_id]);
      console.log('   ✅ Standings reset');
      
      // Get all completed matches
      console.log('   🔍 Processing completed matches...');
      const [matches] = await connection.query(`
        SELECT 
          m.id,
          m.participant1_id,
          m.participant2_id,
          m.winner_participant_id,
          m.live_score,
          m.actual_end_time
        FROM matches m
        WHERE m.tournament_id = ?
          AND m.status = 'completed'
        ORDER BY m.actual_end_time
      `, [tournament.tournament_id]);
      
      console.log(`   📊 Found ${matches.length} completed matches`);
      
      // Process each match
      for (const match of matches) {
        await processMatch(connection, tournament.tournament_id, match);
      }
      
      // Recalculate positions
      console.log('   🔢 Recalculating positions...');
      await recalculatePositions(connection, tournament.tournament_id);
      
      // Show updated standings
      console.log('   ✅ Updated standings:');
      const [updatedStandings] = await connection.query(`
        SELECT 
          CASE
            WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
            WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
            WHEN tp.team_id IS NOT NULL THEN tm.name
          END AS team,
          ts.matches_played AS P,
          ts.matches_won AS W,
          ts.matches_lost AS L,
          ts.sets_won AS SW,
          ts.sets_lost AS SL,
          ts.points AS PTS,
          ts.form AS FORM
        FROM tournament_standings ts
        LEFT JOIN tournament_participants tp ON ts.participant_id = tp.id
        LEFT JOIN users u ON tp.user_id = u.id
        LEFT JOIN partnerships p ON tp.partnership_id = p.id
        LEFT JOIN teams tm ON tp.team_id = tm.id
        WHERE ts.tournament_id = ?
        ORDER BY ts.position
      `, [tournament.tournament_id]);
      
      console.table(updatedStandings);
    }
    
    console.log('\n✅ All volleyball standings recalculated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

/**
 * Process a single match and update standings
 */
async function processMatch(connection, tournamentId, match) {
  const { id: matchId, participant1_id, participant2_id, winner_participant_id, live_score } = match;
  
  // Parse live_score
  let liveScoreObj = null;
  try {
    if (typeof live_score === 'string') {
      liveScoreObj = JSON.parse(live_score);
    } else if (typeof live_score === 'object' && live_score !== null) {
      liveScoreObj = live_score;
    }
  } catch (error) {
    console.log(`   ⚠️  Match ${matchId}: Could not parse live_score`);
  }
  
  // Check if walkover
  const isWalkover = !liveScoreObj && winner_participant_id;
  
  if (isWalkover) {
    // Walkover: 3-0 forfeit
    console.log(`   🚫 Match ${matchId}: Walkover - awarding 3-0 forfeit`);
    const winnerId = winner_participant_id;
    const loserId = winnerId === participant1_id ? participant2_id : participant1_id;
    
    // Update winner
    await updateStandings(connection, tournamentId, winnerId, {
      matches_played: 1,
      matches_won: 1,
      points: 3, // 3-0 forfeit = 3 points
      sets_won: 3,
      sets_lost: 0,
      points_won: 75,
      points_lost: 0
    });
    
    // Update loser
    await updateStandings(connection, tournamentId, loserId, {
      matches_played: 1,
      matches_lost: 1,
      points: 0, // 3-0 forfeit = 0 points
      sets_won: 0,
      sets_lost: 3,
      points_won: 0,
      points_lost: 75
    });
    
    return;
  }
  
  // Extract sets won
  const participant1Sets = liveScoreObj?.participant1?.sets_won || 0;
  const participant2Sets = liveScoreObj?.participant2?.sets_won || 0;
  
  // Extract points (volleyball points, not match points)
  const participant1Points = extractPointsFromSets(liveScoreObj, 'participant1');
  const participant2Points = extractPointsFromSets(liveScoreObj, 'participant2');
  
  // Determine winner
  const isP1Winner = participant1Sets > participant2Sets;
  const winnerId = isP1Winner ? participant1_id : participant2_id;
  const loserId = isP1Winner ? participant2_id : participant1_id;
  const winnerSets = isP1Winner ? participant1Sets : participant2Sets;
  const loserSets = isP1Winner ? participant2Sets : participant1Sets;
  
  // Calculate FIVB points
  const { winnerPoints, loserPoints } = calculateVolleyballPoints(winnerSets, loserSets);
  
  console.log(`   🏐 Match ${matchId}: ${winnerSets}-${loserSets} → Winner: ${winnerPoints} pts, Loser: ${loserPoints} pts`);
  
  // Update winner
  await updateStandings(connection, tournamentId, winnerId, {
    matches_played: 1,
    matches_won: 1,
    points: winnerPoints,
    sets_won: winnerSets,
    sets_lost: loserSets,
    points_won: isP1Winner ? participant1Points : participant2Points,
    points_lost: isP1Winner ? participant2Points : participant1Points
  });
  
  // Update loser
  await updateStandings(connection, tournamentId, loserId, {
    matches_played: 1,
    matches_lost: 1,
    points: loserPoints,
    sets_won: loserSets,
    sets_lost: winnerSets,
    points_won: isP1Winner ? participant2Points : participant1Points,
    points_lost: isP1Winner ? participant1Points : participant2Points
  });
}

/**
 * Calculate FIVB volleyball match points
 */
function calculateVolleyballPoints(setsWon, setsLost) {
  // FIVB International Rules:
  // 3-0 or 3-1 win: 3 points (winner), 0 points (loser)
  // 3-2 win: 2 points (winner), 1 point (loser)
  
  if (setsWon === 3 && setsLost <= 1) {
    return { winnerPoints: 3, loserPoints: 0 };  // Dominant win
  } else if (setsWon === 3 && setsLost === 2) {
    return { winnerPoints: 2, loserPoints: 1 };  // Close match
  }
  
  // Fallback for incomplete matches (e.g., match ended early, walkover, forfeit)
  // Award points based on who was winning when match ended
  if (setsWon > setsLost) {
    // Winner was ahead - award 3 points (treat as forfeit/walkover)
    console.log(`   ⚠️  Incomplete match: ${setsWon}-${setsLost}. Treating as forfeit/walkover (3-0).`);
    return { winnerPoints: 3, loserPoints: 0 };
  }
  
  // Special case: 0-0 (no sets played, but winner declared via walkover)
  // This should not happen if walkover is handled correctly upstream (sets should be 3-0)
  // But if it does, treat as forfeit win
  if (setsWon === 0 && setsLost === 0) {
    console.log(`   ⚠️  Walkover detected (0-0). Awarding 3 points to declared winner.`);
    return { winnerPoints: 3, loserPoints: 0 };
  }
  
  // No clear winner (shouldn't happen)
  console.log(`   ❌ Invalid match result: ${setsWon}-${setsLost}. No points awarded.`);
  return { winnerPoints: 0, loserPoints: 0 };
}

/**
 * Extract total points from all sets
 */
function extractPointsFromSets(liveScore, participant) {
  if (!liveScore || !liveScore[participant]) {
    return 0;
  }
  
  try {
    const setScores = liveScore[participant].set_scores || [];
    const totalPoints = setScores.reduce((sum, score) => {
      return sum + (parseInt(score) || 0);
    }, 0);
    return totalPoints;
  } catch (error) {
    return 0;
  }
}

/**
 * Update participant standings
 */
async function updateStandings(connection, tournamentId, participantId, stats) {
  const {
    matches_played = 0,
    matches_won = 0,
    matches_lost = 0,
    points = 0,
    sets_won = 0,
    sets_lost = 0,
    points_won = 0,
    points_lost = 0
  } = stats;
  
  await connection.query(`
    UPDATE tournament_standings 
    SET 
      matches_played = matches_played + ?,
      matches_won = matches_won + ?,
      matches_lost = matches_lost + ?,
      points = points + ?,
      sets_won = sets_won + ?,
      sets_lost = sets_lost + ?,
      points_won = points_won + ?,
      points_lost = points_lost + ?
    WHERE tournament_id = ? AND participant_id = ?
  `, [
    matches_played, matches_won, matches_lost, points,
    sets_won, sets_lost, points_won, points_lost,
    tournamentId, participantId
  ]);
  
  // Recalculate ratios
  await connection.query(`
    UPDATE tournament_standings
    SET 
      set_ratio = CASE WHEN sets_lost > 0 THEN ROUND(sets_won / sets_lost, 2) ELSE sets_won END,
      point_ratio = CASE WHEN points_lost > 0 THEN ROUND(points_won / points_lost, 2) ELSE points_won END
    WHERE tournament_id = ? AND participant_id = ?
  `, [tournamentId, participantId]);
}

/**
 * Recalculate positions based on points, set ratio, etc.
 */
async function recalculatePositions(connection, tournamentId) {
  const [standings] = await connection.query(`
    SELECT 
      id, 
      participant_id, 
      points, 
      matches_won, 
      set_ratio,
      sets_won,
      sets_lost
    FROM tournament_standings
    WHERE tournament_id = ?
    ORDER BY 
      points DESC,
      set_ratio DESC,
      sets_won DESC,
      sets_lost ASC
  `, [tournamentId]);
  
  // Update positions
  for (let i = 0; i < standings.length; i++) {
    await connection.query(`
      UPDATE tournament_standings
      SET position = ?
      WHERE id = ?
    `, [i + 1, standings[i].id]);
  }
}

// Run the script
recalculateVolleyballStandings()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

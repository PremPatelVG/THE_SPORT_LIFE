const { query } = require('./src/config/database');

async function fixFinalMatch() {
  try {
    console.log('\n========== FIXING FINAL MATCH FOR TOURNAMENT 64 ==========\n');
    
    // Get all Semi-Final matches
    const semiFinals = await query(
      `SELECT id, round_name, participant1_id, participant2_id, winner_participant_id, status
       FROM matches 
       WHERE tournament_id = 64 
       AND group_id IS NULL 
       AND round_name LIKE '%Semi%'
       ORDER BY id`,
      []
    );
    
    console.log('Semi-Final Matches:');
    console.table(semiFinals);
    
    // Get the Final match
    const finalMatches = await query(
      `SELECT id, round_name, participant1_id, participant2_id, depends_on_match1_id, depends_on_match2_id, status
       FROM matches 
       WHERE tournament_id = 64 
       AND group_id IS NULL 
       AND round_name LIKE '%Final%'
       AND round_name NOT LIKE '%Semi%'
       AND round_name NOT LIKE '%Quarter%'
       ORDER BY id`,
      []
    );
    
    console.log('\nFinal Match:');
    console.table(finalMatches);
    
    if (finalMatches.length === 0) {
      console.log('No Final match found!');
      process.exit(1);
    }
    
    const finalMatch = finalMatches[0];
    
    // Extract winners from semi-finals
    const winners = semiFinals
      .filter(m => m.winner_participant_id !== null)
      .map(m => m.winner_participant_id);
    
    console.log('\nSemi-Final Winners:', winners);
    
    if (winners.length < 2) {
      console.log('Not enough semi-final winners found. Please complete all semi-finals first.');
      process.exit(1);
    }
    
    // Update the Final match
    console.log(`\nUpdating Final Match (ID: ${finalMatch.id})...`);
    console.log(`Setting: Participant 1 = ${winners[0]}, Participant 2 = ${winners[1]}`);
    
    await query(
      `UPDATE matches 
       SET participant1_id = ?, participant2_id = ?, status = 'scheduled'
       WHERE id = ?`,
      [winners[0], winners[1], finalMatch.id]
    );
    
    console.log('\n✅ Final match updated successfully!');
    
    // Verify
    const updatedFinal = await query('SELECT * FROM matches WHERE id = ?', [finalMatch.id]);
    console.log('\nUpdated Final Match:');
    console.table(updatedFinal);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixFinalMatch();

const { query } = require('./src/config/database');

async function checkFinalMatch() {
  try {
    console.log('\n========== CHECKING TOURNAMENT 64 KNOCKOUT MATCHES ==========\n');
    
    // Get all knockout matches
    const knockoutMatches = await query(
      `SELECT id, round_number, match_number, round_name, participant1_id, participant2_id, 
              depends_on_match1_id, depends_on_match2_id, status, winner_participant_id
       FROM matches 
       WHERE tournament_id = 64 AND group_id IS NULL 
       ORDER BY round_number, match_number`,
      []
    );
    
    console.log('Knockout Matches:');
    console.table(knockoutMatches);
    
    // Find the Final match
    const finalMatch = knockoutMatches.find(m => m.round_name && m.round_name.includes('Final'));
    
    if (finalMatch) {
      console.log('\n========== FINAL MATCH DETAILS ==========');
      console.log('Match ID:', finalMatch.id);
      console.log('Round Name:', finalMatch.round_name);
      console.log('Participant 1:', finalMatch.participant1_id);
      console.log('Participant 2:', finalMatch.participant2_id);
      console.log('Depends on Match 1:', finalMatch.depends_on_match1_id);
      console.log('Depends on Match 2:', finalMatch.depends_on_match2_id);
      console.log('Status:', finalMatch.status);
      
      // Get the semi-final matches
      if (finalMatch.depends_on_match1_id) {
        const semi1 = await query('SELECT * FROM matches WHERE id = ?', [finalMatch.depends_on_match1_id]);
        console.log('\n========== SEMI-FINAL 1 (Match ID:', finalMatch.depends_on_match1_id, ') ==========');
        console.log(semi1[0]);
      }
      
      if (finalMatch.depends_on_match2_id) {
        const semi2 = await query('SELECT * FROM matches WHERE id = ?', [finalMatch.depends_on_match2_id]);
        console.log('\n========== SEMI-FINAL 2 (Match ID:', finalMatch.depends_on_match2_id, ') ==========');
        console.log(semi2[0]);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFinalMatch();

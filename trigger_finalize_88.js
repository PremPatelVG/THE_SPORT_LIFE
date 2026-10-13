const { query } = require('./src/config/database');
const bracketService = require('./src/services/bracketService');

async function triggerFinalize() {
  try {
    console.log('\n========== MANUALLY TRIGGERING FINALIZATION FOR TOURNAMENT 88 ==========\n');
    
    const result = await bracketService.finalizeGroupStage(88);
    
    console.log('\n✅ Finalization completed!');
    console.log(result);
    
    // Check matches
    const matches = await query(
      `SELECT id, round_name, participant1_id, participant2_id, depends_on_match1_id, depends_on_match2_id 
       FROM matches 
       WHERE tournament_id = 88 AND group_id IS NULL 
       ORDER BY round_number, match_number`,
      []
    );
    
    console.log('\n========== KNOCKOUT MATCHES AFTER FINALIZATION ==========');
    console.table(matches);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

triggerFinalize();

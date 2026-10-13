/**
 * Manually trigger tournament winner determination
 * Run this script to set the tournament winner
 */

const tournamentWinnerService = require('./src/services/tournamentWinnerService');

const tournamentId = 93; // Tournament ID from screenshot

async function setWinner() {
  try {
    console.log(`🎯 Determining winner for tournament ${tournamentId}...`);
    
    const result = await tournamentWinnerService.determineAndSetWinner(tournamentId);
    
    if (result.success) {
      console.log(`\n🏆 SUCCESS! Tournament Winner Set:`);
      console.log(`   Tournament ID: ${tournamentId}`);
      console.log(`   Winner: ${result.winner.participant_name}`);
      console.log(`   Participant ID: ${result.winner.participant_id}`);
      console.log(`   Points: ${result.winner.points}`);
      console.log(`\n✅ Winner badge will now appear in points table!`);
    } else {
      console.log(`\n⚠️ Could not set winner: ${result.message}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

setWinner();

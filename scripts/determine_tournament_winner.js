/**
 * Manually Determine Tournament Winner
 * Run this script to determine and set the winner for a completed tournament
 */

const tournamentWinnerService = require('../src/services/tournamentWinnerService');
const logger = require('../src/utils/logger');

// Get tournament ID from command line argument
const tournamentId = process.argv[2];

if (!tournamentId) {
  console.error('❌ Error: Please provide a tournament ID');
  console.log('Usage: node scripts/determine_tournament_winner.js <tournament_id>');
  console.log('Example: node scripts/determine_tournament_winner.js 53');
  process.exit(1);
}

async function determineTournamentWinner() {
  try {
    console.log(`\n🏆 Determining winner for tournament ${tournamentId}...\n`);
    
    const result = await tournamentWinnerService.determineAndSetWinner(tournamentId);
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Tournament winner determined!\n');
      console.log('🏆 WINNER:');
      console.log(`   Name: ${result.winner.participant_name}`);
      console.log(`   ID: ${result.winner.participant_id}`);
      console.log(`   Points: ${result.winner.points}`);
      console.log(`   Matches: ${result.winner.matches_played} (${result.winner.matches_won}W-${result.winner.matches_lost}L)`);
      
      if (result.winner.sets_won !== undefined) {
        console.log(`   Sets: ${result.winner.sets_won}-${result.winner.sets_lost}`);
        console.log(`   Set Ratio: ${result.winner.set_ratio || 0}`);
      } else {
        console.log(`   Goals: ${result.winner.goals_for}-${result.winner.goals_against}`);
        console.log(`   Goal Difference: ${result.winner.goal_difference}`);
      }
      
      console.log(`   Form: ${result.winner.form || 'N/A'}`);
      
      if (result.tiebreaker) {
        console.log(`\n⚠️  TIEBREAKER APPLIED:`);
        console.log(`   ${result.tiebreaker.tiedCount} participants were tied`);
        console.log(`   Rule: ${result.tiebreaker.rule}`);
      }
      
      console.log('\n📊 FINAL STANDINGS:');
      result.standings.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.participant_name} - ${s.points} pts`);
      });
      
      console.log('\n🎉 Tournament completed successfully!\n');
    } else {
      console.log(`\n❌ FAILED: ${result.message}\n`);
      if (result.matchStatus) {
        console.log(`📊 Match Status:`);
        console.log(`   Total: ${result.matchStatus.totalMatches}`);
        console.log(`   Completed: ${result.matchStatus.completedMatches}`);
        console.log(`   Pending: ${result.matchStatus.pendingMatches}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run the script
determineTournamentWinner();

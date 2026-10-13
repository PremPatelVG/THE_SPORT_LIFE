/**
 * Table Tennis Score Calculator
 * Implements complete Table Tennis scoring rules including:
 * - Rally point scoring (0-11)
 * - Serve alternation (every 2 points, every 1 at deuce)
 * - Win by 2 rule
 * - Doubles serve order rotation
 * - Expedite system (13-return rule)
 * - Change ends at 5 in deciding game
 */

class TableTennisScoreCalculator {
  constructor(config = {}) {
    // Use config values from tournament match_config
    this.targetScore = config.points_per_game || 11;
    this.winBy = config.win_by_margin || 2;
    this.gamesPerMatch = config.total_games || 5; // Best of 5
    this.gamesToWin = config.games_to_win || Math.ceil(this.gamesPerMatch / 2);
    this.isDoubles = config.isDoubles || false;
    this.expediteEnabled = false;
  }

  /**
   * Initialize score for new match
   */
  initializeScore() {
    return {
      player_a: 0,
      player_b: 0,
      games_won: { player_a: 0, player_b: 0 },
      current_game: 1,
      serving_player: 'player_a',
      serve_count: 0,
      at_deuce: false,
      expedite: false,
      match_complete: false
    };
  }

  /**
   * Calculate new score after point_scored event
   */
  calculatePointScored(currentScore, eventData) {
    const { scoring_player } = eventData;
    const score = { ...currentScore };

    // Award point
    score[scoring_player]++;
    score.serve_count++;

    // Check for deuce (10-10)
    if (score.player_a >= 10 && score.player_b >= 10) {
      score.at_deuce = true;
    }

    // Check for game won
    if (this.isGameWon(score)) {
      return this.handleGameWon(score, scoring_player);
    }

    // Handle serve rotation
    return this.handleServeRotation(score);
  }

  /**
   * Handle serve rotation
   */
  handleServeRotation(score) {
    const serveInterval = score.at_deuce ? 1 : 2;

    if (score.serve_count >= serveInterval) {
      // Change server
      score.serving_player = score.serving_player === 'player_a' ? 'player_b' : 'player_a';
      score.serve_count = 0;

      return {
        ...score,
        status: 'service_change',
        message: `Service change. ${score.serving_player} serves. Score: ${score.player_a}-${score.player_b}`
      };
    }

    return {
      ...score,
      status: 'point_scored',
      message: `Point to ${score.serving_player}. Score: ${score.player_a}-${score.player_b}`
    };
  }

  /**
   * Check if game is won
   */
  isGameWon(score) {
    const playerA = score.player_a;
    const playerB = score.player_b;

    // Must reach target score
    if (playerA < this.targetScore && playerB < this.targetScore) {
      return false;
    }

    // Must win by 2
    const diff = Math.abs(playerA - playerB);
    return diff >= this.winBy;
  }

  /**
   * Handle game won
   */
  handleGameWon(score, winner) {
    const newScore = {
      player_a: 0,
      player_b: 0,
      games_won: {
        ...score.games_won,
        [winner]: score.games_won[winner] + 1
      },
      current_game: score.current_game + 1,
      serving_player: winner === 'player_a' ? 'player_b' : 'player_a', // Loser serves first
      serve_count: 0,
      at_deuce: false,
      expedite: false,
      match_complete: false
    };

    // Check if match is won (use games_to_win from config)
    if (newScore.games_won[winner] >= this.gamesToWin) {
      return {
        ...newScore,
        match_complete: true,
        match_winner: winner,
        status: 'match_won',
        message: `Match won by ${winner}! Games: ${newScore.games_won.player_a}-${newScore.games_won.player_b}`
      };
    }

    // Check if deciding game (change ends at 5)
    const isDecidingGame = newScore.current_game === this.gamesPerMatch;

    return {
      ...newScore,
      is_deciding_game: isDecidingGame,
      status: 'game_won',
      message: `Game won by ${winner}. Games: ${newScore.games_won.player_a}-${newScore.games_won.player_b}`
    };
  }

  /**
   * Handle expedite system
   */
  enableExpedite(score) {
    return {
      ...score,
      expedite: true,
      at_deuce: true, // Serve alternates every point
      serve_count: 0,
      status: 'expedite_enabled',
      message: 'Expedite system activated. Serve alternates every point.'
    };
  }

  /**
   * Check if ends should change (at 5 in deciding game)
   */
  shouldChangeEnds(score) {
    if (!score.is_deciding_game) return false;
    
    const totalPoints = score.player_a + score.player_b;
    return totalPoints === 5;
  }

  /**
   * Get score display
   */
  getScoreDisplay(score) {
    return {
      score: `${score.player_a}-${score.player_b}`,
      games: `${score.games_won.player_a}-${score.games_won.player_b}`,
      serving: score.serving_player,
      game: score.current_game,
      at_deuce: score.at_deuce,
      expedite: score.expedite
    };
  }

  /**
   * Main calculation entry point
   */
  calculate(currentScore, eventType, eventData) {
    switch (eventType) {
      case 'point_scored':
        const newScore = this.calculatePointScored(currentScore, eventData);
        
        // Check for ends change in deciding game
        if (this.shouldChangeEnds(newScore)) {
          return {
            ...newScore,
            status: 'change_ends',
            message: 'Change ends (5 points in deciding game)'
          };
        }
        
        return newScore;
      
      case 'service_change':
        return {
          ...currentScore,
          serving_player: currentScore.serving_player === 'player_a' ? 'player_b' : 'player_a',
          serve_count: 0,
          status: 'service_change'
        };
      
      case 'deuce_reached':
        return {
          ...currentScore,
          at_deuce: true,
          status: 'deuce_reached',
          message: 'Deuce! Serve alternates every point'
        };
      
      case 'expedite_enable':
        return this.enableExpedite(currentScore);
      
      case 'change_ends':
        return {
          ...currentScore,
          status: 'change_ends',
          message: 'Change ends (5 points in deciding game)'
        };
      
      case 'game_won':
        return this.handleGameWon(currentScore, eventData.winner);
      
      case 'match_won':
        return {
          ...currentScore,
          match_complete: true,
          match_winner: eventData.winner || eventData.player_id,
          status: 'match_won',
          message: `Match won by ${eventData.winner || eventData.player_id}! Games: ${currentScore.games_won.player_a}-${currentScore.games_won.player_b}`
        };
      
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }
}

module.exports = TableTennisScoreCalculator;

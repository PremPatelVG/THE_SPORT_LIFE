/**
 * Badminton Score Calculator
 * Implements complete Badminton scoring rules including:
 * - Rally point scoring (0-21)
 * - Win by 2 (cap at 30)
 * - Serve box switching (even/odd)
 * - Interval at 11 points
 * - Change ends at 11 in deciding game
 * - Best of 3 games
 */

class BadmintonScoreCalculator {
  constructor(config = {}) {
    this.targetScore = 21;
    this.winBy = config.win_by_margin || 2;
    this.maxScore = 30;
    this.gamesPerMatch = 3; // Best of 3
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
      serve_box: 'right', // right or left
      interval_taken: false,
      match_complete: false
    };
  }

  /**
   * Calculate new score after rally_won event
   */
  calculateRallyWon(currentScore, eventData) {
    const { scoring_player } = eventData;
    const score = { ...currentScore };

    // Award point
    score[scoring_player]++;

    // Winner becomes server
    score.serving_player = scoring_player;

    // Determine serve box (even score = right, odd = left)
    score.serve_box = score[scoring_player] % 2 === 0 ? 'right' : 'left';

    // Check for interval at 11 points
    if (!score.interval_taken && (score.player_a === 11 || score.player_b === 11)) {
      return {
        ...score,
        interval_taken: true,
        status: 'interval',
        message: `Interval at 11 points. Score: ${score.player_a}-${score.player_b}`
      };
    }

    // Check for deuce (20-20)
    if (score.player_a === 20 && score.player_b === 20) {
      return {
        ...score,
        status: 'deuce_reached',
        message: 'Deuce at 20-20. Must win by 2 or reach 30'
      };
    }

    // Check for game won
    if (this.isGameWon(score)) {
      return this.handleGameWon(score, scoring_player);
    }

    return {
      ...score,
      status: 'rally_won',
      message: `Point to ${scoring_player}. Score: ${score.player_a}-${score.player_b}`
    };
  }

  /**
   * Check if game is won
   */
  isGameWon(score) {
    const playerA = score.player_a;
    const playerB = score.player_b;

    // Cap at 30 points
    if (playerA === this.maxScore || playerB === this.maxScore) {
      return true;
    }

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
      serving_player: winner, // Winner serves first in next game
      serve_box: 'right',
      interval_taken: false,
      match_complete: false
    };

    // Check if match is won
    const gamesNeeded = Math.ceil(this.gamesPerMatch / 2);
    if (newScore.games_won[winner] >= gamesNeeded) {
      return {
        ...newScore,
        match_complete: true,
        match_winner: winner,
        status: 'match_won',
        message: `Match won by ${winner}! Games: ${newScore.games_won.player_a}-${newScore.games_won.player_b}`
      };
    }

    // Check if deciding game (change ends at 11)
    const isDecidingGame = newScore.current_game === 3;

    return {
      ...newScore,
      is_deciding_game: isDecidingGame,
      status: 'game_won',
      message: `Game won by ${winner}. Games: ${newScore.games_won.player_a}-${newScore.games_won.player_b}`
    };
  }

  /**
   * Check if ends should change (at 11 in deciding game)
   */
  shouldChangeEnds(score) {
    if (!score.is_deciding_game) return false;
    
    const leadingPlayer = score.player_a > score.player_b ? 'player_a' : 'player_b';
    const leadingScore = score[leadingPlayer];
    
    return leadingScore === 11;
  }

  /**
   * Get score display
   */
  getScoreDisplay(score) {
    return {
      score: `${score.player_a}-${score.player_b}`,
      games: `${score.games_won.player_a}-${score.games_won.player_b}`,
      serving: score.serving_player,
      serve_box: score.serve_box,
      game: score.current_game
    };
  }

  /**
   * Main calculation entry point
   */
  calculate(currentScore, eventType, eventData) {
    switch (eventType) {
      case 'rally_won':
        const newScore = this.calculateRallyWon(currentScore, eventData);
        
        // Check for ends change in deciding game
        if (this.shouldChangeEnds(newScore)) {
          return {
            ...newScore,
            status: 'change_ends',
            message: 'Change ends (11 points in deciding game)'
          };
        }
        
        return newScore;
      
      case 'service_ace':
        // Same as rally_won but with ace flag
        return {
          ...this.calculateRallyWon(currentScore, eventData),
          ace: true
        };
      
      case 'interval':
        return {
          ...currentScore,
          interval_taken: true,
          status: 'interval',
          message: '60-second interval'
        };
      
      case 'deuce_reached':
        return {
          ...currentScore,
          status: 'deuce_reached',
          message: 'Deuce at 20-20'
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

module.exports = BadmintonScoreCalculator;

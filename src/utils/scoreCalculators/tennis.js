/**
 * Tennis Score Calculator
 * Implements complete Tennis scoring rules including:
 * - Point progression (0→15→30→40→Game)
 * - Deuce/Advantage or No-Ad/Golden Point
 * - Tiebreak at 6-6 (7-point, win by 2)
 * - Match Tiebreak to 10
 * - Fast4 format support
 * - Set completion (6 games, win by 2)
 */

class TennisScoreCalculator {
  constructor(config = {}) {
    this.setsPerMatch = config.setsPerMatch || 3; // Best of 3 or 5
    this.useAdvantage = config.useAdvantage !== false; // Default true
    this.useGoldenPoint = config.useGoldenPoint || false;
    this.useMatchTiebreak = config.useMatchTiebreak || false;
    this.useFast4 = config.useFast4 || false;
  }

  /**
   * Initialize score for new match
   */
  initializeScore() {
    return {
      sets: [],
      current_set: { player_a: 0, player_b: 0 },
      current_game: { player_a: '0', player_b: '0' },
      serving_player: 'player_a',
      in_tiebreak: false,
      tiebreak_score: { player_a: 0, player_b: 0 },
      match_complete: false
    };
  }

  /**
   * Calculate new score after point_won event
   */
  calculatePointWon(currentScore, eventData) {
    const { scoring_player } = eventData;
    const score = JSON.parse(JSON.stringify(currentScore));

    if (score.in_tiebreak) {
      return this.calculateTiebreakPoint(score, scoring_player);
    }

    return this.calculateRegularPoint(score, scoring_player);
  }

  /**
   * Calculate regular game point
   */
  calculateRegularPoint(score, scoringPlayer) {
    const points = ['0', '15', '30', '40'];
    const playerKey = scoringPlayer;
    const opponentKey = scoringPlayer === 'player_a' ? 'player_b' : 'player_a';

    const playerPoint = score.current_game[playerKey];
    const opponentPoint = score.current_game[opponentKey];

    // Handle deuce and advantage
    if (playerPoint === '40' && opponentPoint === '40') {
      if (this.useGoldenPoint) {
        // Golden Point - next point wins
        return this.handleGameWon(score, scoringPlayer);
      } else if (!this.useAdvantage) {
        // No-Ad scoring - next point wins
        return this.handleGameWon(score, scoringPlayer);
      } else {
        // Advantage
        score.current_game[playerKey] = 'adv';
        return {
          ...score,
          status: 'advantage',
          message: `Advantage ${scoringPlayer}`
        };
      }
    }

    if (playerPoint === 'adv') {
      // Game won from advantage
      return this.handleGameWon(score, scoringPlayer);
    }

    if (opponentPoint === 'adv') {
      // Back to deuce
      score.current_game = { player_a: '40', player_b: '40' };
      return {
        ...score,
        status: 'deuce',
        message: 'Deuce'
      };
    }

    // Normal point progression
    if (playerPoint === '40') {
      // Game won
      return this.handleGameWon(score, scoringPlayer);
    }

    // Increment point
    const currentIndex = points.indexOf(playerPoint);
    score.current_game[playerKey] = points[currentIndex + 1];

    return {
      ...score,
      status: 'point_won',
      message: `${score.current_game.player_a}-${score.current_game.player_b}`
    };
  }

  /**
   * Handle game won
   */
  handleGameWon(score, winner) {
    score.current_set[winner]++;
    score.current_game = { player_a: '0', player_b: '0' };

    // Rotate serve
    score.serving_player = score.serving_player === 'player_a' ? 'player_b' : 'player_a';

    const winnerGames = score.current_set[winner];
    const opponentGames = score.current_set[winner === 'player_a' ? 'player_b' : 'player_a'];

    // Fast4: Tiebreak at 3-3
    if (this.useFast4 && winnerGames === 3 && opponentGames === 3) {
      score.in_tiebreak = true;
      score.tiebreak_score = { player_a: 0, player_b: 0 };
      return {
        ...score,
        status: 'tiebreak_start',
        message: 'Tiebreak! First to 7, win by 2'
      };
    }

    // Regular: Tiebreak at 6-6
    if (winnerGames === 6 && opponentGames === 6) {
      score.in_tiebreak = true;
      score.tiebreak_score = { player_a: 0, player_b: 0 };
      return {
        ...score,
        status: 'tiebreak_start',
        message: 'Tiebreak! First to 7, win by 2'
      };
    }

    // Check for set won
    const minGames = this.useFast4 ? 4 : 6;
    if (winnerGames >= minGames && winnerGames - opponentGames >= 2) {
      return this.handleSetWon(score, winner);
    }

    return {
      ...score,
      status: 'game_won',
      message: `Game to ${winner}. Set: ${score.current_set.player_a}-${score.current_set.player_b}`
    };
  }

  /**
   * Calculate tiebreak point
   */
  calculateTiebreakPoint(score, scoringPlayer) {
    score.tiebreak_score[scoringPlayer]++;

    const playerScore = score.tiebreak_score[scoringPlayer];
    const opponentScore = score.tiebreak_score[scoringPlayer === 'player_a' ? 'player_b' : 'player_a'];

    // Check for tiebreak won
    const target = this.useMatchTiebreak ? 10 : 7;
    if (playerScore >= target && playerScore - opponentScore >= 2) {
      return this.handleTiebreakWon(score, scoringPlayer);
    }

    // Change ends every 6 points
    const totalPoints = score.tiebreak_score.player_a + score.tiebreak_score.player_b;
    if (totalPoints % 6 === 0) {
      return {
        ...score,
        status: 'change_ends',
        message: `Tiebreak: ${score.tiebreak_score.player_a}-${score.tiebreak_score.player_b}. Change ends`
      };
    }

    return {
      ...score,
      status: 'tiebreak_point',
      message: `Tiebreak: ${score.tiebreak_score.player_a}-${score.tiebreak_score.player_b}`
    };
  }

  /**
   * Handle tiebreak won
   */
  handleTiebreakWon(score, winner) {
    score.current_set[winner] = this.useFast4 ? 4 : 7;
    score.in_tiebreak = false;
    
    return this.handleSetWon(score, winner);
  }

  /**
   * Handle set won
   */
  handleSetWon(score, winner) {
    score.sets.push({ ...score.current_set });
    
    // Count sets won
    const setsWon = score.sets.filter(set => set[winner] > set[winner === 'player_a' ? 'player_b' : 'player_a']).length;
    const setsNeeded = Math.ceil(this.setsPerMatch / 2);

    // Check for match won
    if (setsWon >= setsNeeded) {
      return {
        ...score,
        match_complete: true,
        match_winner: winner,
        status: 'match_won',
        message: `Match won by ${winner}! ${this.formatSets(score.sets)}`
      };
    }

    // Check if final set and using Match Tiebreak
    if (this.useMatchTiebreak && score.sets.length === this.setsPerMatch - 1) {
      score.in_tiebreak = true;
      score.tiebreak_score = { player_a: 0, player_b: 0 };
      score.current_set = { player_a: 0, player_b: 0 };
      return {
        ...score,
        status: 'match_tiebreak_start',
        message: 'Match Tiebreak! First to 10, win by 2'
      };
    }

    // Start new set
    score.current_set = { player_a: 0, player_b: 0 };
    score.current_game = { player_a: '0', player_b: '0' };

    return {
      ...score,
      status: 'set_won',
      message: `Set won by ${winner}. Sets: ${this.formatSets(score.sets)}`
    };
  }

  /**
   * Format sets for display
   */
  formatSets(sets) {
    return sets.map(set => `${set.player_a}-${set.player_b}`).join(', ');
  }

  /**
   * Get score display
   */
  getScoreDisplay(score) {
    if (score.in_tiebreak) {
      return {
        sets: this.formatSets(score.sets),
        current_set: `${score.current_set.player_a}-${score.current_set.player_b}`,
        tiebreak: `${score.tiebreak_score.player_a}-${score.tiebreak_score.player_b}`,
        serving: score.serving_player
      };
    }

    return {
      sets: this.formatSets(score.sets),
      current_set: `${score.current_set.player_a}-${score.current_set.player_b}`,
      current_game: `${score.current_game.player_a}-${score.current_game.player_b}`,
      serving: score.serving_player
    };
  }

  /**
   * Main calculation entry point
   */
  calculate(currentScore, eventType, eventData) {
    switch (eventType) {
      case 'point_won':
        return this.calculatePointWon(currentScore, eventData);
      
      case 'game_won':
        return this.handleGameWon(currentScore, eventData.winner);
      
      case 'set_won':
        return this.handleSetWon(currentScore, eventData.winner);
      
      case 'tiebreak_start':
        return {
          ...currentScore,
          in_tiebreak: true,
          tiebreak_score: { player_a: 0, player_b: 0 },
          status: 'tiebreak_start'
        };
      
      case 'deuce':
        return {
          ...currentScore,
          current_game: { player_a: '40', player_b: '40' },
          status: 'deuce'
        };
      
      case 'advantage':
        return {
          ...currentScore,
          current_game: {
            ...currentScore.current_game,
            [eventData.player]: 'adv'
          },
          status: 'advantage'
        };
      
      case 'match_tiebreak':
        return {
          ...currentScore,
          in_tiebreak: true,
          tiebreak_score: { player_a: 0, player_b: 0 },
          tiebreak_target: 10,
          status: 'match_tiebreak',
          message: 'Match Tiebreak! First to 10, win by 2'
        };
      
      case 'match_won':
        return {
          ...currentScore,
          match_complete: true,
          match_winner: eventData.winner || eventData.player_id,
          status: 'match_won',
          message: `Match won by ${eventData.winner || eventData.player_id}! ${this.formatSets(currentScore.sets)}`
        };
      
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }
}

module.exports = TennisScoreCalculator;

/**
 * Squash Score Calculator
 * Implements complete Squash scoring rules including:
 * - PAR-11 (Point-a-Rally to 11, win by 2)
 * - HIHO-9 (Hand-in-Hand-out to 9, server-only scoring)
 * - Let/Stroke referee decisions
 * - Best of 5 or 3 games
 */

class SquashScoreCalculator {
  constructor(config = {}) {
    this.scoringType = config.scoringType || 'PAR'; // PAR or HIHO
    
    // Use config values from tournament match_config
    this.targetScore = config.points_per_game || (this.scoringType === 'PAR' ? 11 : 9);
    this.winBy = config.win_by_margin || 2;
    this.gamesPerMatch = config.total_games || 5; // Best of 5
    this.gamesToWin = config.games_to_win || Math.ceil(this.gamesPerMatch / 2);
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
      match_complete: false
    };
  }

  /**
   * Calculate new score after point_scored event (PAR scoring)
   */
  calculatePointScoredPAR(currentScore, eventData) {
    const { scoring_player } = eventData;
    const score = { ...currentScore };

    // Award point (rally point - anyone can score)
    score[scoring_player]++;

    // Winner becomes server
    score.serving_player = scoring_player;

    // Check for game won
    if (this.isGameWon(score)) {
      return this.handleGameWon(score, scoring_player);
    }

    return {
      ...score,
      status: 'point_scored',
      message: `Point to ${scoring_player}. Score: ${score.player_a}-${score.player_b}`
    };
  }

  /**
   * Calculate new score after point_scored event (HIHO scoring)
   */
  calculatePointScoredHIHO(currentScore, eventData) {
    const { rally_winner } = eventData;
    const score = { ...currentScore };

    if (rally_winner === score.serving_player) {
      // Server wins rally - scores point
      score[rally_winner]++;

      // Check for game won
      if (this.isGameWon(score)) {
        return this.handleGameWon(score, rally_winner);
      }

      return {
        ...score,
        status: 'point_scored',
        message: `Point to ${rally_winner}. Score: ${score.player_a}-${score.player_b}`
      };
    } else {
      // Receiver wins rally - hand-out (no point, just serve change)
      score.serving_player = rally_winner;

      return {
        ...score,
        status: 'hand_out',
        message: `Hand-out. ${rally_winner} serves. Score: ${score.player_a}-${score.player_b}`
      };
    }
  }

  /**
   * Handle let called (replay point)
   */
  handleLet(currentScore, eventData) {
    return {
      ...currentScore,
      status: 'let',
      message: 'Let. Replay point.',
      reason: eventData.reason || 'Interference'
    };
  }

  /**
   * Handle stroke awarded (point to striker)
   */
  handleStroke(currentScore, eventData) {
    const { awarded_to } = eventData;
    const score = { ...currentScore };

    score[awarded_to]++;
    score.serving_player = awarded_to;

    // Check for game won
    if (this.isGameWon(score)) {
      return this.handleGameWon(score, awarded_to);
    }

    return {
      ...score,
      status: 'stroke',
      message: `Stroke to ${awarded_to}. Score: ${score.player_a}-${score.player_b}`,
      reason: eventData.reason || 'Obstruction'
    };
  }

  /**
   * Check if game is won
   */
  isGameWon(score) {
    const playerA = score.player_a;
    const playerB = score.player_b;

    // HIHO: Check for 8-8 (receiver chooses Set 1 or Set 2)
    if (this.scoringType === 'HIHO' && playerA === 8 && playerB === 8) {
      return false; // Waiting for set choice
    }

    // Must reach target score
    if (playerA < this.targetScore && playerB < this.targetScore) {
      return false;
    }

    // PAR: Must win by 2
    if (this.scoringType === 'PAR') {
      const diff = Math.abs(playerA - playerB);
      return diff >= this.winBy;
    }

    // HIHO: First to 9 (or 10 if Set 2 chosen)
    return true;
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

    return {
      ...newScore,
      status: 'game_won',
      message: `Game won by ${winner}. Games: ${newScore.games_won.player_a}-${newScore.games_won.player_b}`
    };
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
      scoring_type: this.scoringType
    };
  }

  /**
   * Main calculation entry point
   */
  calculate(currentScore, eventType, eventData) {
    switch (eventType) {
      case 'point_scored':
        if (this.scoringType === 'PAR') {
          return this.calculatePointScoredPAR(currentScore, eventData);
        } else {
          return this.calculatePointScoredHIHO(currentScore, eventData);
        }
      
      case 'let_called':
        return this.handleLet(currentScore, eventData);
      
      case 'stroke_awarded':
        return this.handleStroke(currentScore, eventData);
      
      case 'hand_out':
        return {
          ...currentScore,
          serving_player: eventData.new_server || (currentScore.serving_player === 'player_a' ? 'player_b' : 'player_a'),
          status: 'hand_out',
          message: `Hand-out. ${eventData.new_server || (currentScore.serving_player === 'player_a' ? 'player_b' : 'player_a')} serves`
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

module.exports = SquashScoreCalculator;

/**
 * Pickleball Score Calculator
 * Implements complete Pickleball scoring rules including:
 * - Side-out scoring (only serving team scores)
 * - A-B-C format (Score-Score-Server)
 * - Server rotation (1→2→side-out)
 * - Win by 2 rule
 * - Configurable targets (11, 15, 21)
 */

class PickleballScoreCalculator {
  constructor(config = {}) {
    this.targetScore = config.targetScore || 11;
    this.winBy = config.winBy || 2;
    this.gamesPerMatch = config.gamesPerMatch || 3; // Best of 3
    this.isSingles = config.isSingles || false;
  }

  /**
   * Initialize score for new game
   */
  initializeScore() {
    return {
      team_a: 0,
      team_b: 0,
      server: 1,
      serving_team: 'team_a',
      games_won: { team_a: 0, team_b: 0 },
      current_game: 1,
      match_complete: false
    };
  }

  /**
   * Calculate new score after point_scored event
   */
  calculatePointScored(currentScore, eventData) {
    const { scoring_team } = eventData;
    const score = { ...currentScore };

    // Only serving team can score
    if (scoring_team === score.serving_team) {
      // Award point
      score[scoring_team]++;

      // Check for game won
      if (this.isGameWon(score)) {
        return this.handleGameWon(score, scoring_team);
      }

      // Continue serving (same server)
      return {
        ...score,
        status: 'point_scored',
        message: `Point to ${scoring_team}. Score: ${this.formatScore(score)}`
      };
    } else {
      // Serving team lost rally - side-out or server change
      return this.handleSideOut(score);
    }
  }

  /**
   * Handle side-out logic
   */
  handleSideOut(score) {
    if (this.isSingles) {
      // Singles: Direct side-out
      return {
        ...score,
        serving_team: score.serving_team === 'team_a' ? 'team_b' : 'team_a',
        server: 1,
        status: 'side_out',
        message: `Side-out to ${score.serving_team === 'team_a' ? 'team_b' : 'team_a'}`
      };
    } else {
      // Doubles: Server 1 → Server 2 → Side-out
      if (score.server === 1) {
        // Switch to server 2
        return {
          ...score,
          server: 2,
          status: 'server_change',
          message: `Server 2 serves. Score: ${this.formatScore(score)}`
        };
      } else {
        // Side-out to other team
        const newServingTeam = score.serving_team === 'team_a' ? 'team_b' : 'team_a';
        return {
          ...score,
          serving_team: newServingTeam,
          server: 1,
          status: 'side_out',
          message: `Side-out to ${newServingTeam}. Score: ${this.formatScore({ ...score, serving_team: newServingTeam })}`
        };
      }
    }
  }

  /**
   * Check if game is won
   */
  isGameWon(score) {
    const teamA = score.team_a;
    const teamB = score.team_b;

    // Must reach target score
    if (teamA < this.targetScore && teamB < this.targetScore) {
      return false;
    }

    // Must win by 2
    const diff = Math.abs(teamA - teamB);
    return diff >= this.winBy;
  }

  /**
   * Handle game won
   */
  handleGameWon(score, winner) {
    const newScore = {
      ...score,
      games_won: {
        ...score.games_won,
        [winner]: score.games_won[winner] + 1
      },
      game_won: true,
      game_winner: winner
    };

    // Check if match is won
    const gamesNeeded = Math.ceil(this.gamesPerMatch / 2);
    if (newScore.games_won[winner] >= gamesNeeded) {
      return {
        ...newScore,
        match_complete: true,
        match_winner: winner,
        status: 'match_won',
        message: `Match won by ${winner}! Final: ${newScore.games_won.team_a}-${newScore.games_won.team_b}`
      };
    }

    // Start new game
    return {
      team_a: 0,
      team_b: 0,
      server: 1,
      serving_team: winner === 'team_a' ? 'team_b' : 'team_a', // Loser serves first
      games_won: newScore.games_won,
      current_game: score.current_game + 1,
      match_complete: false,
      status: 'game_won',
      message: `Game ${score.current_game} won by ${winner}. Games: ${newScore.games_won.team_a}-${newScore.games_won.team_b}`
    };
  }

  /**
   * Handle technical foul (opponent gets point)
   */
  calculateTechnicalFoul(currentScore, eventData) {
    const { foul_team } = eventData;
    const opponent = foul_team === 'team_a' ? 'team_b' : 'team_a';

    // Opponent gets point (regardless of who's serving)
    const score = { ...currentScore };
    score[opponent]++;

    // Check for game won
    if (this.isGameWon(score)) {
      return this.handleGameWon(score, opponent);
    }

    return {
      ...score,
      status: 'technical_foul',
      message: `Technical foul on ${foul_team}. Point to ${opponent}. Score: ${this.formatScore(score)}`
    };
  }

  /**
   * Format score in A-B-C format
   */
  formatScore(score) {
    if (score.serving_team === 'team_a') {
      return `${score.team_a}-${score.team_b}-${score.server}`;
    } else {
      return `${score.team_b}-${score.team_a}-${score.server}`;
    }
  }

  /**
   * Get score display (always shows serving team first)
   */
  getScoreDisplay(score) {
    return {
      display: this.formatScore(score),
      team_a_score: score.team_a,
      team_b_score: score.team_b,
      server: score.server,
      serving_team: score.serving_team,
      games: `${score.games_won.team_a}-${score.games_won.team_b}`
    };
  }

  /**
   * Main calculation entry point
   */
  calculate(currentScore, eventType, eventData) {
    switch (eventType) {
      case 'point_scored':
        return this.calculatePointScored(currentScore, eventData);
      
      case 'side_out':
        return this.handleSideOut(currentScore);
      
      case 'server_change':
        return {
          ...currentScore,
          server: currentScore.server === 1 ? 2 : 1,
          status: 'server_change'
        };
      
      case 'technical_foul':
        return this.calculateTechnicalFoul(currentScore, eventData);
      
      case 'game_won':
        return this.handleGameWon(currentScore, eventData.winner);
      
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }
}

module.exports = PickleballScoreCalculator;

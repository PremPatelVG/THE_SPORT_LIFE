/**
 * Padel Score Calculator
 * Implements complete Padel scoring rules including:
 * - Point progression (0→15→30→40→Game)
 * - Deuce/Advantage or Golden Point
 * - Tiebreak at 6-6 (7-point, win by 2)
 * - Match Tiebreak to 10
 * - Set completion (6 games, win by 2)
 * - Serve rotation in doubles
 */

class PadelScoreCalculator {
  constructor(config = {}) {
    this.setsPerMatch = config.setsPerMatch || 3; // Best of 3
    this.useGoldenPoint = config.useGoldenPoint || false;
    this.useMatchTiebreak = config.useMatchTiebreak || false; // For final set
    this.winByMargin = config.win_by_margin || 2; // Configurable win margin
  }

  /**
   * Initialize score for new match
   */
  initializeScore() {
    return {
      sets: [],
      current_set: { team_a: 0, team_b: 0 },
      current_game: { team_a: '0', team_b: '0' },
      serving_team: 'team_a',
      in_tiebreak: false,
      tiebreak_score: { team_a: 0, team_b: 0 },
      match_complete: false
    };
  }

  /**
   * Calculate new score after point_won event
   */
  calculatePointWon(currentScore, eventData) {
    const { team_id, scoring_team } = eventData;
    const score = JSON.parse(JSON.stringify(currentScore));

    if (score.in_tiebreak) {
      return this.calculateTiebreakPoint(score, scoring_team);
    }

    return this.calculateRegularPoint(score, scoring_team);
  }

  /**
   * Calculate regular game point
   */
  calculateRegularPoint(score, scoringTeam) {
    const points = ['0', '15', '30', '40'];
    const teamKey = scoringTeam;
    const opponentKey = scoringTeam === 'team_a' ? 'team_b' : 'team_a';

    const teamPoint = score.current_game[teamKey];
    const opponentPoint = score.current_game[opponentKey];

    // Handle deuce and advantage
    if (teamPoint === '40' && opponentPoint === '40') {
      if (this.useGoldenPoint) {
        // Golden Point - next point wins
        return this.handleGameWon(score, scoringTeam);
      } else {
        // Advantage (respects win_by_margin in deuce situation)
        score.current_game[teamKey] = 'adv';
        return {
          ...score,
          status: 'advantage',
          message: `Advantage ${scoringTeam}`
        };
      }
    }

    if (teamPoint === 'adv') {
      // Game won from advantage
      return this.handleGameWon(score, scoringTeam);
    }

    if (opponentPoint === 'adv') {
      // Back to deuce
      score.current_game = { team_a: '40', team_b: '40' };
      return {
        ...score,
        status: 'deuce',
        message: 'Deuce'
      };
    }

    // Normal point progression
    if (teamPoint === '40') {
      // Game won
      return this.handleGameWon(score, scoringTeam);
    }

    // Increment point
    const currentIndex = points.indexOf(teamPoint);
    score.current_game[teamKey] = points[currentIndex + 1];

    return {
      ...score,
      status: 'point_won',
      message: `Point to ${scoringTeam}. Score: ${score.current_game.team_a}-${score.current_game.team_b}`
    };
  }

  /**
   * Handle game won
   */
  handleGameWon(score, winner) {
    score.current_set[winner]++;
    score.current_game = { team_a: '0', team_b: '0' };

    // Rotate serve
    score.serving_team = score.serving_team === 'team_a' ? 'team_b' : 'team_a';

    const teamGames = score.current_set[winner];
    const opponentGames = score.current_set[winner === 'team_a' ? 'team_b' : 'team_a'];

    // Check for tiebreak at 6-6
    if (teamGames === 6 && opponentGames === 6) {
      score.in_tiebreak = true;
      score.tiebreak_score = { team_a: 0, team_b: 0 };
      return {
        ...score,
        status: 'tiebreak_start',
        message: `Tiebreak! First to 7, win by ${this.winByMargin}`
      };
    }

    // Check for set won (use configurable win_by_margin)
    if (teamGames >= 6 && teamGames - opponentGames >= this.winByMargin) {
      return this.handleSetWon(score, winner);
    }

    return {
      ...score,
      status: 'game_won',
      message: `Game to ${winner}. Set: ${score.current_set.team_a}-${score.current_set.team_b}`
    };
  }

  /**
   * Calculate tiebreak point
   */
  calculateTiebreakPoint(score, scoringTeam) {
    score.tiebreak_score[scoringTeam]++;

    const teamScore = score.tiebreak_score[scoringTeam];
    const opponentScore = score.tiebreak_score[scoringTeam === 'team_a' ? 'team_b' : 'team_a'];

    // Check for tiebreak won (use configurable win_by_margin)
    if (teamScore >= 7 && teamScore - opponentScore >= this.winByMargin) {
      return this.handleTiebreakWon(score, scoringTeam);
    }

    // Change ends every 6 points
    const totalPoints = score.tiebreak_score.team_a + score.tiebreak_score.team_b;
    if (totalPoints % 6 === 0) {
      return {
        ...score,
        status: 'change_ends',
        message: `Tiebreak: ${score.tiebreak_score.team_a}-${score.tiebreak_score.team_b}. Change ends`
      };
    }

    return {
      ...score,
      status: 'tiebreak_point',
      message: `Tiebreak: ${score.tiebreak_score.team_a}-${score.tiebreak_score.team_b}`
    };
  }

  /**
   * Handle tiebreak won
   */
  handleTiebreakWon(score, winner) {
    score.current_set[winner] = 7;
    score.in_tiebreak = false;
    
    return this.handleSetWon(score, winner);
  }

  /**
   * Handle set won
   */
  handleSetWon(score, winner) {
    score.sets.push({ ...score.current_set });
    
    // Count sets won
    const setsWon = score.sets.filter(set => set[winner] > set[winner === 'team_a' ? 'team_b' : 'team_a']).length;
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
      score.tiebreak_score = { team_a: 0, team_b: 0 };
      score.current_set = { team_a: 0, team_b: 0 };
      return {
        ...score,
        status: 'match_tiebreak_start',
        message: 'Match Tiebreak! First to 10, win by 2'
      };
    }

    // Start new set
    score.current_set = { team_a: 0, team_b: 0 };
    score.current_game = { team_a: '0', team_b: '0' };

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
    return sets.map(set => `${set.team_a}-${set.team_b}`).join(', ');
  }

  /**
   * Get score display
   */
  getScoreDisplay(score) {
    if (score.in_tiebreak) {
      return {
        sets: this.formatSets(score.sets),
        current_set: `${score.current_set.team_a}-${score.current_set.team_b}`,
        tiebreak: `${score.tiebreak_score.team_a}-${score.tiebreak_score.team_b}`,
        serving: score.serving_team
      };
    }

    return {
      sets: this.formatSets(score.sets),
      current_set: `${score.current_set.team_a}-${score.current_set.team_b}`,
      current_game: `${score.current_game.team_a}-${score.current_game.team_b}`,
      serving: score.serving_team
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
          tiebreak_score: { team_a: 0, team_b: 0 },
          status: 'tiebreak_start'
        };
      
      case 'deuce':
        return {
          ...currentScore,
          current_game: { team_a: '40', team_b: '40' },
          status: 'deuce',
          message: 'Deuce'
        };
      
      case 'advantage':
        return {
          ...currentScore,
          current_game: {
            ...currentScore.current_game,
            [eventData.team_id]: 'adv'
          },
          status: 'advantage',
          message: `Advantage ${eventData.team_id}`
        };
      
      case 'match_tiebreak':
        return {
          ...currentScore,
          in_tiebreak: true,
          tiebreak_score: { team_a: 0, team_b: 0 },
          tiebreak_target: 10,
          status: 'match_tiebreak',
          message: 'Match Tiebreak! First to 10, win by 2'
        };
      
      case 'match_won':
        return {
          ...currentScore,
          match_complete: true,
          match_winner: eventData.winner || eventData.team_id,
          status: 'match_won',
          message: `Match won by ${eventData.winner || eventData.team_id}! ${this.formatSets(currentScore.sets)}`
        };
      
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }
}

module.exports = PadelScoreCalculator;

/**
 * Volleyball Score Calculator
 * Implements complete Volleyball scoring rules including:
 * - Rally point scoring (0-25, 0-15 in 5th set)
 * - Win by 2 rule
 * - Rotation tracking (6 positions, clockwise)
 * - Automatic rotation on side-out
 * - Substitution limits (6 per set)
 * - Timeout limits (2 per set)
 * - Best of 5 sets
 */

class VolleyballScoreCalculator {
  constructor(config = {}) {
    // Use config values from tournament match_config
    this.regularSetTarget = config.points_per_set || 25;
    this.decidingSetTarget = config.deciding_set_points || config.points_per_set || 15; // Use points_per_set if deciding_set_points not specified
    this.winBy = config.win_by_margin || 2;
    this.setsPerMatch = config.total_sets || 5; // Best of 5
    this.setsToWin = config.sets_to_win || Math.ceil(this.setsPerMatch / 2);
    this.maxSubstitutions = config.max_substitutions || 6;
    this.maxTimeouts = config.max_timeouts || 2;
  }

  /**
   * Initialize score for new match
   */
  initializeScore() {
    return {
      team_a: 0,
      team_b: 0,
      sets_won: { team_a: 0, team_b: 0 },
      current_set: 1,
      serving_team: 'team_a',
      rotation_team_a: [1, 2, 3, 4, 5, 6], // Position 1 is server
      rotation_team_b: [1, 2, 3, 4, 5, 6],
      substitutions_team_a: 0,
      substitutions_team_b: 0,
      timeouts_team_a: 0,
      timeouts_team_b: 0,
      match_complete: false
    };
  }

  /**
   * Calculate new score after point_scored event
   */
  calculatePointScored(currentScore, eventData) {
    const { scoring_team } = eventData;
    const score = { ...currentScore };

    const wasServingTeam = score.serving_team === scoring_team;

    // Award point
    score[scoring_team]++;

    // Check if side-out (receiving team won rally)
    if (!wasServingTeam) {
      // Side-out: rotate and change server
      score.serving_team = scoring_team;
      score = this.rotateTeam(score, scoring_team);
    }

    // Check for set won
    if (this.isSetWon(score)) {
      return this.handleSetWon(score, scoring_team);
    }

    // Check for technical timeout (indoor only)
    if (this.shouldTechnicalTimeout(score)) {
      return {
        ...score,
        status: 'technical_timeout',
        message: `Technical timeout at ${score.team_a}-${score.team_b}`
      };
    }

    return {
      ...score,
      status: wasServingTeam ? 'point_scored' : 'side_out',
      message: `Point to ${scoring_team}. Score: ${score.team_a}-${score.team_b}`
    };
  }

  /**
   * Rotate team clockwise
   */
  rotateTeam(score, team) {
    const rotationKey = `rotation_${team}`;
    const rotation = [...score[rotationKey]];
    
    // Rotate clockwise: last player moves to position 1 (server)
    const lastPlayer = rotation.pop();
    rotation.unshift(lastPlayer);
    
    score[rotationKey] = rotation;
    
    return score;
  }

  /**
   * Check if technical timeout should occur (at 8 and 16 points)
   */
  shouldTechnicalTimeout(score) {
    const totalPoints = score.team_a + score.team_b;
    return totalPoints === 8 || totalPoints === 16;
  }

  /**
   * Check if set is won
   */
  isSetWon(score) {
    const teamA = score.team_a;
    const teamB = score.team_b;

    // Determine target based on set number
    const isDecidingSet = score.current_set === 5;
    const target = isDecidingSet ? this.decidingSetTarget : this.regularSetTarget;

    // Must reach target score
    if (teamA < target && teamB < target) {
      return false;
    }

    // Must win by 2
    const diff = Math.abs(teamA - teamB);
    return diff >= this.winBy;
  }

  /**
   * Handle set won
   */
  handleSetWon(score, winner) {
    const newScore = {
      team_a: 0,
      team_b: 0,
      sets_won: {
        ...score.sets_won,
        [winner]: score.sets_won[winner] + 1
      },
      current_set: score.current_set + 1,
      serving_team: winner === 'team_a' ? 'team_b' : 'team_a', // Loser serves first
      rotation_team_a: [1, 2, 3, 4, 5, 6],
      rotation_team_b: [1, 2, 3, 4, 5, 6],
      substitutions_team_a: 0, // Reset per set
      substitutions_team_b: 0,
      timeouts_team_a: 0, // Reset per set
      timeouts_team_b: 0,
      match_complete: false
    };

    // Check if match is won (use sets_to_win from config)
    if (newScore.sets_won[winner] >= this.setsToWin) {
      return {
        ...newScore,
        match_complete: true,
        match_winner: winner,
        status: 'match_won',
        message: `Match won by ${winner}! Sets: ${newScore.sets_won.team_a}-${newScore.sets_won.team_b}`
      };
    }

    return {
      ...newScore,
      status: 'set_won',
      message: `Set won by ${winner}. Sets: ${newScore.sets_won.team_a}-${newScore.sets_won.team_b}`
    };
  }

  /**
   * Handle substitution
   */
  handleSubstitution(currentScore, eventData) {
    const { team, player_out, player_in } = eventData;
    const score = { ...currentScore };
    const subKey = `substitutions_${team}`;

    // Check substitution limit
    if (score[subKey] >= this.maxSubstitutions) {
      throw new Error(`${team} has reached maximum substitutions (${this.maxSubstitutions}) for this set`);
    }

    score[subKey]++;

    return {
      ...score,
      status: 'substitution',
      message: `${team} substitution: #${player_out} out, #${player_in} in. (${score[subKey]}/${this.maxSubstitutions})`
    };
  }

  /**
   * Handle timeout
   */
  handleTimeout(currentScore, eventData) {
    const { team } = eventData;
    const score = { ...currentScore };
    const timeoutKey = `timeouts_${team}`;

    // Check timeout limit
    if (score[timeoutKey] >= this.maxTimeouts) {
      throw new Error(`${team} has reached maximum timeouts (${this.maxTimeouts}) for this set`);
    }

    score[timeoutKey]++;

    return {
      ...score,
      status: 'timeout',
      message: `${team} timeout. (${score[timeoutKey]}/${this.maxTimeouts})`
    };
  }

  /**
   * Get score display
   */
  getScoreDisplay(score) {
    return {
      score: `${score.team_a}-${score.team_b}`,
      sets: `${score.sets_won.team_a}-${score.sets_won.team_b}`,
      serving: score.serving_team,
      set: score.current_set,
      rotation_a: score.rotation_team_a.join(','),
      rotation_b: score.rotation_team_b.join(','),
      subs_a: `${score.substitutions_team_a}/${this.maxSubstitutions}`,
      subs_b: `${score.substitutions_team_b}/${this.maxSubstitutions}`,
      timeouts_a: `${score.timeouts_team_a}/${this.maxTimeouts}`,
      timeouts_b: `${score.timeouts_team_b}/${this.maxTimeouts}`
    };
  }

  /**
   * Main calculation entry point
   */
  calculate(currentScore, eventType, eventData) {
    switch (eventType) {
      case 'point_scored':
        return this.calculatePointScored(currentScore, eventData);
      
      case 'rotation':
        return {
          ...this.rotateTeam(currentScore, eventData.team),
          status: 'rotation',
          message: `${eventData.team} rotates`
        };
      
      case 'substitution':
        return this.handleSubstitution(currentScore, eventData);
      
      case 'timeout':
        return this.handleTimeout(currentScore, eventData);
      
      case 'technical_timeout':
        return {
          ...currentScore,
          status: 'technical_timeout',
          message: `Technical timeout at ${currentScore.team_a}-${currentScore.team_b}`
        };
      
      case 'side_out':
        const newServingTeam = eventData.new_serving_team || (currentScore.serving_team === 'team_a' ? 'team_b' : 'team_a');
        return {
          ...this.rotateTeam(currentScore, newServingTeam),
          serving_team: newServingTeam,
          status: 'side_out',
          message: `Side-out to ${newServingTeam}`
        };
      
      case 'set_won':
        return this.handleSetWon(currentScore, eventData.winner);
      
      case 'match_won':
        return {
          ...currentScore,
          match_complete: true,
          match_winner: eventData.winner || eventData.team_id,
          status: 'match_won',
          message: `Match won by ${eventData.winner || eventData.team_id}! Sets: ${currentScore.sets_won.team_a}-${currentScore.sets_won.team_b}`
        };
      
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }
}

module.exports = VolleyballScoreCalculator;

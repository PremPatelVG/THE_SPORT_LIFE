/**
 * Football Score Calculator
 * Implements complete Football scoring rules including:
 * - Goal-based scoring
 * - Time tracking (90 minutes + stoppage)
 * - Half-time at 45 minutes
 * - Extra time (2×15 minutes)
 * - Penalty shootout
 * - Yellow/Red card tracking
 * - Substitution limits
 */

class FootballScoreCalculator {
  constructor(config = {}) {
    this.matchDuration = config.matchDuration || 90; // minutes
    this.halfDuration = this.matchDuration / 2;
    this.extraTimeDuration = 15; // per half
    this.maxSubstitutions = config.maxSubstitutions || 5;
  }

  /**
   * Initialize score for new match
   */
  initializeScore() {
    return {
      team_a: 0,
      team_b: 0,
      period: 'first_half',
      minute: 0,
      stoppage_time: 0,
      yellow_cards: { team_a: [], team_b: [] },
      red_cards: { team_a: [], team_b: [] },
      substitutions: { team_a: 0, team_b: 0 },
      extra_time: { team_a: 0, team_b: 0 },
      penalties: { team_a: [], team_b: [] },
      match_complete: false
    };
  }

  /**
   * Calculate new score after goal event
   */
  calculateGoal(currentScore, eventData) {
    const { scoring_team, player_id, minute, goal_type, assist_by } = eventData;
    const score = { ...currentScore };

    // Award goal
    if (score.period.includes('extra_time')) {
      score.extra_time[scoring_team]++;
    } else {
      score[scoring_team]++;
    }

    return {
      ...score,
      status: 'goal',
      message: `GOAL! ${scoring_team} scores. ${this.getScoreDisplay(score)}`,
      goal_details: {
        scorer: player_id,
        assist: assist_by,
        minute,
        type: goal_type
      }
    };
  }

  /**
   * Handle yellow card
   */
  handleYellowCard(currentScore, eventData) {
    const { team, player_id, minute, reason } = eventData;
    const score = { ...currentScore };

    // Check if player already has yellow card
    const existingYellow = score.yellow_cards[team].find(card => card.player_id === player_id);
    
    if (existingYellow) {
      // Second yellow = red card
      score.red_cards[team].push({
        player_id,
        minute,
        reason: 'Second yellow card'
      });

      return {
        ...score,
        status: 'red_card',
        message: `RED CARD! ${team} player #${player_id} sent off (second yellow)`
      };
    }

    // Add yellow card
    score.yellow_cards[team].push({
      player_id,
      minute,
      reason
    });

    return {
      ...score,
      status: 'yellow_card',
      message: `Yellow card for ${team} player #${player_id}`
    };
  }

  /**
   * Handle red card
   */
  handleRedCard(currentScore, eventData) {
    const { team, player_id, minute, reason } = eventData;
    const score = { ...currentScore };

    score.red_cards[team].push({
      player_id,
      minute,
      reason
    });

    return {
      ...score,
      status: 'red_card',
      message: `RED CARD! ${team} player #${player_id} sent off`
    };
  }

  /**
   * Handle substitution
   */
  handleSubstitution(currentScore, eventData) {
    const { team, player_out, player_in, minute } = eventData;
    const score = { ...currentScore };

    // Check substitution limit
    if (score.substitutions[team] >= this.maxSubstitutions) {
      throw new Error(`${team} has reached maximum substitutions (${this.maxSubstitutions})`);
    }

    score.substitutions[team]++;

    return {
      ...score,
      status: 'substitution',
      message: `${team} substitution: #${player_out} off, #${player_in} on (${score.substitutions[team]}/${this.maxSubstitutions})`
    };
  }

  /**
   * Handle half-time
   */
  handleHalfTime(currentScore, eventData) {
    return {
      ...currentScore,
      period: 'half_time',
      status: 'half_time',
      message: `Half-time. Score: ${currentScore.team_a}-${currentScore.team_b}`,
      stoppage_time: eventData.stoppage_time || 0
    };
  }

  /**
   * Handle full-time
   */
  handleFullTime(currentScore, eventData) {
    const score = { ...currentScore };
    score.period = 'full_time';

    // Check if extra time needed (knockout format)
    if (eventData.is_knockout && score.team_a === score.team_b) {
      return {
        ...score,
        status: 'full_time_draw',
        message: `Full-time: ${score.team_a}-${score.team_b}. Extra time required.`
      };
    }

    return {
      ...score,
      match_complete: !eventData.is_knockout || score.team_a !== score.team_b,
      status: 'full_time',
      message: `Full-time. Final score: ${score.team_a}-${score.team_b}`
    };
  }

  /**
   * Handle extra time start
   */
  handleExtraTimeStart(currentScore) {
    return {
      ...currentScore,
      period: 'extra_time_first',
      extra_time: { team_a: 0, team_b: 0 },
      status: 'extra_time_start',
      message: 'Extra time begins (2×15 minutes)'
    };
  }

  /**
   * Handle penalty shootout
   */
  handlePenaltyKick(currentScore, eventData) {
    const { team, player_id, result } = eventData; // result: 'goal', 'miss', 'save'
    const score = { ...currentScore };

    score.penalties[team].push({
      player_id,
      result
    });

    const teamAPenalties = score.penalties.team_a.filter(p => p.result === 'goal').length;
    const teamBPenalties = score.penalties.team_b.filter(p => p.result === 'goal').length;

    // Check if shootout is decided
    const teamAKicks = score.penalties.team_a.length;
    const teamBKicks = score.penalties.team_b.length;

    if (teamAKicks >= 5 && teamBKicks >= 5) {
      const diff = Math.abs(teamAPenalties - teamBPenalties);
      const remaining = 5 - Math.min(teamAKicks, teamBKicks);
      
      if (diff > remaining) {
        // Winner decided
        const winner = teamAPenalties > teamBPenalties ? 'team_a' : 'team_b';
        return {
          ...score,
          match_complete: true,
          match_winner: winner,
          status: 'penalties_won',
          message: `${winner} wins on penalties! ${teamAPenalties}-${teamBPenalties}`
        };
      }
    }

    return {
      ...score,
      status: 'penalty_kick',
      message: `Penalty ${result} by ${team}. Score: ${teamAPenalties}-${teamBPenalties}`
    };
  }

  /**
   * Get score display
   */
  getScoreDisplay(score) {
    let display = `${score.team_a}-${score.team_b}`;
    
    if (score.period.includes('extra_time')) {
      display += ` (ET: ${score.extra_time.team_a}-${score.extra_time.team_b})`;
    }
    
    if (score.penalties.team_a.length > 0 || score.penalties.team_b.length > 0) {
      const penA = score.penalties.team_a.filter(p => p.result === 'goal').length;
      const penB = score.penalties.team_b.filter(p => p.result === 'goal').length;
      display += ` (Pens: ${penA}-${penB})`;
    }
    
    return display;
  }

  /**
   * Main calculation entry point
   */
  calculate(currentScore, eventType, eventData) {
    switch (eventType) {
      case 'goal':
        return this.calculateGoal(currentScore, eventData);
      
      case 'yellow_card':
        return this.handleYellowCard(currentScore, eventData);
      
      case 'red_card':
        return this.handleRedCard(currentScore, eventData);
      
      case 'substitution':
        return this.handleSubstitution(currentScore, eventData);
      
      case 'half_time':
        return this.handleHalfTime(currentScore, eventData);
      
      case 'full_time':
        return this.handleFullTime(currentScore, eventData);
      
      case 'extra_time_start':
        return this.handleExtraTimeStart(currentScore);
      
      case 'extra_time_half':
        return {
          ...currentScore,
          period: 'extra_time_second',
          status: 'extra_time_half',
          message: 'Extra time - second half'
        };
      
      case 'penalty_shootout':
        return {
          ...currentScore,
          period: 'penalty_shootout',
          penalties: { team_a: [], team_b: [] },
          status: 'penalty_shootout_start',
          message: 'Penalty shootout begins'
        };
      
      case 'penalty_kick':
        return this.handlePenaltyKick(currentScore, eventData);
      
      case 'match_won':
        return {
          ...currentScore,
          match_complete: true,
          match_winner: eventData.winner || eventData.team_id,
          status: 'match_won',
          message: `Match won by ${eventData.winner || eventData.team_id}! Final: ${this.getScoreDisplay(currentScore)}`
        };
      
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }
}

module.exports = FootballScoreCalculator;

/**
 * Event Type Validator - FIXED VERSION
 * Matches database predefined events from ADD_PREDEFINED_EVENTS.sql
 * Validates scoring events against sport-specific rules for ALL 8 SPORTS
 */

const SPORT_EVENT_TYPES = {
  // =====================================================
  // TENNIS (sport_id = 1) - 8 events
  // =====================================================
  tennis: {
    scoring: ['point_won', 'game_won', 'set_won', 'tiebreak_point', 'match_won'],
    non_scoring: ['tiebreak_start', 'deuce', 'advantage'],
    critical: [],
    required_fields: {
      point_won: ['player_id', 'point_type', 'current_score'],
      game_won: ['player_id', 'games_score', 'set_number'],
      set_won: ['player_id', 'set_score', 'sets_won'],
      tiebreak_start: ['set_number', 'games_score'],
      tiebreak_point: ['player_id', 'tiebreak_score', 'set_number'],
      deuce: ['score', 'set_number', 'game_number'],
      advantage: ['player_id', 'set_number', 'game_number'],
      match_won: ['player_id', 'final_score', 'sets_won']
    }
  },

  // =====================================================
  // BADMINTON (sport_id = 2) - 6 events
  // =====================================================
  badminton: {
    scoring: ['rally_won', 'service_ace', 'game_won', 'match_won'],
    non_scoring: ['interval', 'deuce_reached'],
    critical: [],
    required_fields: {
      rally_won: ['player_id', 'winning_shot', 'current_score'],
      service_ace: ['player_id', 'current_score'],
      interval: ['score', 'game_number'],
      deuce_reached: ['score', 'game_number'],
      game_won: ['player_id', 'game_score', 'games_won'],
      match_won: ['player_id', 'final_score', 'games_won']
    }
  },

  // =====================================================
  // TABLE TENNIS (sport_id = 3) - 7 events
  // =====================================================
  'table tennis': {
    scoring: ['point_scored', 'game_won', 'match_won'],
    non_scoring: ['service_change', 'deuce_reached', 'change_ends', 'expedite_enable'],
    critical: [],
    required_fields: {
      point_scored: ['player_id', 'point_type', 'current_score'],
      service_change: ['new_server', 'current_score'],
      deuce_reached: ['score', 'game_number'],
      change_ends: ['game_number', 'score'],
      expedite_enable: ['game_number', 'reason'],
      game_won: ['player_id', 'game_score', 'games_won'],
      match_won: ['player_id', 'final_score', 'games_won']
    }
  },

  // =====================================================
  // PICKLEBALL (sport_id = 4) - 5 events
  // =====================================================
  pickleball: {
    scoring: ['point_scored', 'game_won', 'match_won'],
    non_scoring: ['side_out', 'server_change'],
    critical: [],
    required_fields: {
      point_scored: ['team_id', 'point_type', 'current_score'],
      side_out: ['new_serving_team', 'current_score'],
      server_change: ['team_id', 'new_server_number', 'current_score'],
      game_won: ['team_id', 'game_score', 'games_won'],
      match_won: ['team_id', 'final_score', 'games_won']
    }
  },

  // =====================================================
  // PADEL (sport_id = 5) - 8 events
  // =====================================================
  padel: {
    scoring: ['point_won', 'game_won', 'set_won', 'match_won'],
    non_scoring: ['tiebreak_start', 'deuce', 'advantage', 'match_tiebreak'],
    critical: [],
    required_fields: {
      point_won: ['team_id', 'player_id', 'point_type', 'current_score'],
      deuce: ['score', 'set_number', 'game_number'],
      advantage: ['team_id', 'set_number', 'game_number'],
      game_won: ['team_id', 'games_score', 'set_number'],
      set_won: ['team_id', 'set_score', 'sets_won'],
      tiebreak_start: ['set_number', 'games_score'],
      match_tiebreak: ['set_number', 'score'],
      match_won: ['team_id', 'final_score', 'sets_won']
    }
  },

  // =====================================================
  // SQUASH (sport_id = 6) - 6 events
  // =====================================================
  squash: {
    scoring: ['point_scored', 'game_won', 'match_won'],
    non_scoring: ['hand_out', 'let_called', 'stroke_awarded'],
    critical: [],
    required_fields: {
      point_scored: ['player_id', 'point_type', 'current_score'],
      hand_out: ['new_server', 'current_score'],
      let_called: ['current_score', 'reason'],
      stroke_awarded: ['awarded_to', 'current_score', 'reason'],
      game_won: ['player_id', 'game_score', 'games_won'],
      match_won: ['player_id', 'final_score', 'games_won']
    }
  },

  // =====================================================
  // VOLLEYBALL (sport_id = 7) - 8 events
  // =====================================================
  volleyball: {
    scoring: ['point_scored', 'set_won', 'match_won'],
    non_scoring: ['side_out', 'rotation', 'substitution', 'timeout', 'technical_timeout'],
    critical: [],
    required_fields: {
      point_scored: ['team_id', 'player_id', 'point_type', 'current_score'],
      side_out: ['new_serving_team', 'current_score'],
      rotation: ['team_id', 'new_server_position', 'rotation_order'],
      substitution: ['team_id', 'player_out', 'player_in', 'position'],
      timeout: ['team_id', 'timeout_type', 'timeouts_remaining'],
      technical_timeout: ['score'],
      set_won: ['team_id', 'set_score', 'sets_won'],
      match_won: ['team_id', 'final_score', 'sets_won']
    }
  },

  // =====================================================
  // FOOTBALL (sport_id = 8) - 11 events
  // =====================================================
  football: {
    scoring: ['goal', 'penalty_kick', 'match_won'],
    non_scoring: ['yellow_card', 'red_card', 'substitution', 'half_time', 'full_time', 
                  'extra_time_start', 'extra_time_half', 'penalty_shootout'],
    critical: [],
    required_fields: {
      goal: ['team_id', 'player_id', 'goal_type', 'minute'],
      yellow_card: ['team_id', 'player_id', 'minute', 'reason'],
      red_card: ['team_id', 'player_id', 'minute', 'reason'],
      substitution: ['team_id', 'player_out', 'player_in', 'minute'],
      half_time: ['score', 'stoppage_time'],
      full_time: ['regular_time_score', 'stoppage_time'],
      extra_time_start: ['score'],
      extra_time_half: ['half', 'score'],
      penalty_shootout: ['score_after_extra_time'],
      penalty_kick: ['team_id', 'player_id', 'result'],
      match_won: ['team_id', 'final_score']
    }
  }
};

/**
 * Get all valid event types for a sport
 */
const getValidEventTypes = (sportName) => {
  const sport = SPORT_EVENT_TYPES[sportName.toLowerCase()];
  if (!sport) {
    return null;
  }
  return [...sport.scoring, ...sport.non_scoring, ...sport.critical];
};

/**
 * Validate if an event type is valid for a sport
 */
const validateEventType = (sportName, eventType) => {
  const validTypes = getValidEventTypes(sportName);
  
  if (!validTypes) {
    throw new Error(`Unknown sport: ${sportName}. Valid sports: ${Object.keys(SPORT_EVENT_TYPES).join(', ')}`);
  }
  
  if (!validTypes.includes(eventType)) {
    throw new Error(
      `Invalid event type '${eventType}' for ${sportName}. ` +
      `Valid types: ${validTypes.join(', ')}`
    );
  }
  
  return true;
};

/**
 * Check if an event type affects the score
 */
const isScoringEvent = (sportName, eventType) => {
  const sport = SPORT_EVENT_TYPES[sportName.toLowerCase()];
  if (!sport) return false;
  return sport.scoring.includes(eventType);
};

/**
 * Check if an event type is critical (match/set/game point)
 */
const isCriticalEventType = (sportName, eventType) => {
  const sport = SPORT_EVENT_TYPES[sportName.toLowerCase()];
  if (!sport) return false;
  return sport.critical.includes(eventType);
};

/**
 * Get event category for timeline
 */
const getEventCategory = (sportName, eventType) => {
  const sport = SPORT_EVENT_TYPES[sportName.toLowerCase()];
  if (!sport) return 'other';
  
  if (sport.scoring.includes(eventType)) return 'score';
  if (['yellow_card', 'red_card'].includes(eventType)) return 'card';
  if (eventType === 'substitution') return 'substitution';
  if (eventType === 'timeout') return 'timeout';
  
  return 'other';
};

/**
 * Get required fields for an event type
 */
const getRequiredFields = (sportName, eventType) => {
  const sport = SPORT_EVENT_TYPES[sportName.toLowerCase()];
  if (!sport || !sport.required_fields) return [];
  return sport.required_fields[eventType] || [];
};

/**
 * Validate event data has required fields
 */
const validateEventData = (sportName, eventType, eventData) => {
  const requiredFields = getRequiredFields(sportName, eventType);
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (!(field in eventData)) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields for ${sportName} ${eventType}: ${missingFields.join(', ')}`
    );
  }
  
  return true;
};

/**
 * Get all supported sports
 */
const getSupportedSports = () => {
  return Object.keys(SPORT_EVENT_TYPES);
};

/**
 * Get sport event configuration
 */
const getSportConfig = (sportName) => {
  return SPORT_EVENT_TYPES[sportName.toLowerCase()] || null;
};

module.exports = {
  SPORT_EVENT_TYPES,
  getValidEventTypes,
  validateEventType,
  isScoringEvent,
  isCriticalEventType,
  getEventCategory,
  getRequiredFields,
  validateEventData,
  getSupportedSports,
  getSportConfig
};


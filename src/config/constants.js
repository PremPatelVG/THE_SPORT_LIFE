// Sport Event Constants
const SPORT_EVENTS = {
  TENNIS: {
    POINT_WON: 'point_won',
    GAME_WON: 'game_won',
    SET_WON: 'set_won',
    TIEBREAK_START: 'tiebreak_start',
    TIEBREAK_POINT: 'tiebreak_point',
    DEUCE: 'deuce',
    ADVANTAGE: 'advantage',
    MATCH_WON: 'match_won'
  },
  BADMINTON: {
    RALLY_WON: 'rally_won',
    SERVICE_ACE: 'service_ace',
    INTERVAL: 'interval',
    DEUCE_REACHED: 'deuce_reached',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  TABLE_TENNIS: {
    POINT_SCORED: 'point_scored',
    SERVICE_CHANGE: 'service_change',
    DEUCE_REACHED: 'deuce_reached',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  PICKLEBALL: {
    POINT_SCORED: 'point_scored',
    SIDE_OUT: 'side_out',
    SERVER_CHANGE: 'server_change',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  PADEL: {
    POINT_WON: 'point_won',
    GAME_WON: 'game_won',
    SET_WON: 'set_won',
    TIEBREAK_START: 'tiebreak_start',
    MATCH_WON: 'match_won'
  },
  SQUASH: {
    POINT_SCORED: 'point_scored',
    LET_CALLED: 'let_called',
    STROKE_AWARDED: 'stroke_awarded',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  VOLLEYBALL: {
    POINT_SCORED: 'point_scored',
    ROTATION: 'rotation',
    SUBSTITUTION: 'substitution',
    TIMEOUT: 'timeout',
    SET_WON: 'set_won',
    MATCH_WON: 'match_won'
  },
  FOOTBALL: {
    GOAL: 'goal',
    YELLOW_CARD: 'yellow_card',
    RED_CARD: 'red_card',
    SUBSTITUTION: 'substitution',
    HALF_TIME: 'half_time',
    FULL_TIME: 'full_time',
    EXTRA_TIME_START: 'extra_time_start',
    EXTRA_TIME_HALF: 'extra_time_half',
    PENALTY_SHOOTOUT: 'penalty_shootout',
    PENALTY_KICK: 'penalty_kick',
    MATCH_WON: 'match_won'
  }
};

const SPORT_IDS = {
  TENNIS: 1,
  BADMINTON: 2,
  TABLE_TENNIS: 3,
  PICKLEBALL: 4,
  PADEL: 5,
  SQUASH: 6,
  VOLLEYBALL: 7,
  FOOTBALL: 8
};

const USER_ROLES = {
  ADMIN: 'admin',
  PLAYER: 'player',
  REFEREE: 'referee',
  ORGANIZER: 'organizer',
  SPECTATOR: 'spectator'
};

module.exports = {
  SPORT_EVENTS,
  SPORT_IDS,
  USER_ROLES
};

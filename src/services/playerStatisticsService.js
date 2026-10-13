const { query } = require('../config/database');
const matchService = require('./matchService');

/**
 * Get comprehensive statistics for a player
 * Uses existing getUserMatches which fetches both tournament and standalone matches
 * @param {number} userId - User ID
 * @param {number|null} sportId - Optional sport filter
 * @returns {object} Player statistics
 */
const getUserStatistics = async (userId, sportId = null) => {
  try {
    // Get all matches (tournament + standalone) using existing service
    // This includes singles, doubles, and team matches
    const allMatches = await matchService.getUserMatches(userId);
    
    // Filter by sport if specified
    const filteredMatches = sportId 
      ? allMatches.filter(m => m.sport_id === parseInt(sportId))
      : allMatches;
    
    // Only process completed matches for statistics
    const completedMatches = filteredMatches.filter(m => m.status === 'completed');
    
    // Calculate overall statistics
    const overall = calculateOverallStats(completedMatches, userId);
    
    // Calculate sport-specific statistics
    const bySport = calculateSportStats(completedMatches, userId);
    
    return {
      overall,
      by_sport: bySport
    };
  } catch (error) {
    console.error('Get user statistics error:', error);
    throw error;
  }
};


/**
 * Calculate overall statistics across all sports
 */
const calculateOverallStats = (matches, userId) => {
  const stats = {
    total_matches: matches.length,
    wins: 0,
    losses: 0,
    win_rate: 0,
    tournaments_played: 0,
    championships: 0,
    runner_up: 0,
    semi_finals: 0
  };
  
  // Count wins and losses
  matches.forEach(match => {
    const isWinner = determineIfWinner(match, userId);
    if (isWinner) {
      stats.wins++;
    } else {
      stats.losses++;
    }
  });
  
  // Calculate win rate
  if (stats.total_matches > 0) {
    stats.win_rate = parseFloat(((stats.wins / stats.total_matches) * 100).toFixed(2));
  }
  
  // Get unique tournaments (exclude standalone matches where is_standalone = 1 or tournament_id is null)
  const tournamentMatches = matches.filter(m => m.tournament_id && !m.is_standalone);
  const uniqueTournaments = [...new Set(tournamentMatches.map(m => m.tournament_id))];
  stats.tournaments_played = uniqueTournaments.length;
  
  return stats;
};

/**
 * Calculate sport-specific statistics
 */
const calculateSportStats = (matches, userId) => {
  const sportMap = {};
  
  matches.forEach(match => {
    const sportId = match.sport_id;
    const sportName = match.sport_name;
    
    if (!sportMap[sportId]) {
      sportMap[sportId] = {
        sport_id: sportId,
        sport_name: sportName,
        total_matches: 0,
        wins: 0,
        losses: 0,
        win_rate: 0,
        tournaments_played: new Set(),
        championships: 0,
        runner_up: 0,
        semi_finals: 0,
        by_type: {
          singles: { matches: 0, wins: 0, losses: 0 },
          doubles: { matches: 0, wins: 0, losses: 0 },
          teams: { matches: 0, wins: 0, losses: 0 }
        }
      };
    }
    
    const sport = sportMap[sportId];
    const isWinner = determineIfWinner(match, userId);
    
    // Determine match type from tournament_category or category field
    const matchType = match.tournament_category || match.category || 'singles';
    
    // Overall stats
    sport.total_matches++;
    if (isWinner) {
      sport.wins++;
    } else {
      sport.losses++;
    }
    
    // By type stats
    if (sport.by_type[matchType]) {
      sport.by_type[matchType].matches++;
      if (isWinner) {
        sport.by_type[matchType].wins++;
      } else {
        sport.by_type[matchType].losses++;
      }
    }
    
    // Track tournaments (only if not standalone and has tournament_id)
    if (match.tournament_id && !match.is_standalone) {
      sport.tournaments_played.add(match.tournament_id);
    }
  });
  
  // Convert to array and calculate win rates
  return Object.values(sportMap).map(sport => {
    if (sport.total_matches > 0) {
      sport.win_rate = parseFloat(((sport.wins / sport.total_matches) * 100).toFixed(2));
    }
    sport.tournaments_played = sport.tournaments_played.size;
    return sport;
  });
};

/**
 * Determine if user won the match
 * Works with match data from getUserMatches which includes participant1_user_ids and participant2_user_ids arrays
 */
const determineIfWinner = (match, userId) => {
  const { winner_participant_id, winner_id } = match;
  
  // Use winner_id if available (from getUserMatches), otherwise use winner_participant_id
  const winnerId = winner_id || winner_participant_id;
  
  if (!winnerId) {
    return false; // No winner determined yet
  }
  
  // Check if user is in participant1's team/pair/individual
  const isInParticipant1 = match.participant1_user_ids && 
    match.participant1_user_ids.includes(userId);
  
  // Check if user is in participant2's team/pair/individual
  const isInParticipant2 = match.participant2_user_ids && 
    match.participant2_user_ids.includes(userId);
  
  // Determine if user won
  if (isInParticipant1) {
    return winnerId === match.participant1_id;
  } else if (isInParticipant2) {
    return winnerId === match.participant2_id;
  }
  
  return false;
};

module.exports = {
  getUserStatistics
};

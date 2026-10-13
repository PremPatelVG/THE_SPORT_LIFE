/**
 * Helper functions for displaying participant information
 * Handles singles, doubles/pairs, and teams tournaments
 */

/**
 * Get participant display name based on tournament category
 * @param {Object} participant - Participant object from backend
 * @returns {string} Display name
 */
export const getParticipantName = (participant) => {
  if (!participant) return 'TBD';
  
  // Check all possible name fields from different API responses
  if (participant.team_name) return participant.team_name;
  if (participant.pair_name) return participant.pair_name;
  if (participant.participant_name) return participant.participant_name;
  
  // For singles - show player name
  if (participant.name && !participant.player1_name && !participant.player2_name) {
    return participant.name;
  }
  
  // For doubles/pairs - show pair name or "Player1 & Player2"
  if (participant.player1_name && participant.player2_name) {
    return participant.name || `${participant.player1_name} & ${participant.player2_name}`;
  }
  
  // Fallback to first_name + last_name
  if (participant.first_name && participant.last_name) {
    return `${participant.first_name} ${participant.last_name}`;
  }
  
  // For teams - show team name
  if (participant.name) {
    return participant.name;
  }
  
  return 'TBD';
};

/**
 * Get short participant name (for compact displays)
 * @param {Object} participant - Participant object from backend
 * @param {number} maxLength - Maximum length of name
 * @returns {string} Shortened display name
 */
export const getShortParticipantName = (participant, maxLength = 20) => {
  const fullName = getParticipantName(participant);
  if (fullName.length <= maxLength) return fullName;
  return fullName.substring(0, maxLength - 3) + '...';
};

/**
 * Get participant details for tooltip/hover
 * @param {Object} participant - Participant object from backend
 * @returns {string} Detailed information
 */
export const getParticipantDetails = (participant) => {
  if (!participant) return 'To Be Determined';
  
  // For singles
  if (participant.user_id && participant.name) {
    return `Player: ${participant.name}${participant.skill_level ? ` (${participant.skill_level})` : ''}`;
  }
  
  // For doubles/pairs
  if (participant.player1_name && participant.player2_name) {
    return `Pair: ${participant.player1_name} & ${participant.player2_name}`;
  }
  
  // For teams
  if (participant.member_count) {
    return `Team: ${participant.name} (${participant.member_count} members)`;
  }
  
  return participant.name || 'TBD';
};

/**
 * Format match participants for display
 * @param {Object} match - Match object with participant1 and participant2
 * @returns {Object} Formatted participant names
 */
export const formatMatchParticipants = (match) => {
  return {
    participant1Name: getParticipantName(match.participant1),
    participant2Name: getParticipantName(match.participant2),
    participant1Details: getParticipantDetails(match.participant1),
    participant2Details: getParticipantDetails(match.participant2)
  };
};

export default {
  getParticipantName,
  getShortParticipantName,
  getParticipantDetails,
  formatMatchParticipants
};

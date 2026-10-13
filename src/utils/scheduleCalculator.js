/**
 * Schedule Calculator Utility
 * Centralized match scheduling logic with timezone-safe date formatting
 */

/**
 * Calculate match schedule based on configuration
 * @param {number} matchIndex - Zero-based match index
 * @param {object} scheduleConfig - Schedule configuration
 * @returns {object} - { match_date, match_time }
 */
const calculateMatchSchedule = (matchIndex, scheduleConfig) => {
  if (!scheduleConfig || !scheduleConfig.start_date) {
    return { match_date: null, match_time: null };
  }

  const matchesPerDay = scheduleConfig.matches_per_day || 4;
  const startTime = scheduleConfig.start_time || '09:00';
  const matchDuration = scheduleConfig.match_duration || 60;
  const breakBetween = scheduleConfig.break_between_matches || 15;

  // Calculate which day this match falls on
  const dayIndex = Math.floor(matchIndex / matchesPerDay);
  const matchOfDay = matchIndex % matchesPerDay;

  // Calculate match time with proper overflow handling
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const totalMinutesFromStart = matchOfDay * (matchDuration + breakBetween);

  // Add total minutes to start time
  let totalMinutes = startHour * 60 + startMinute + totalMinutesFromStart;

  // Handle time overflow - calculate additional days needed
  const additionalDays = Math.floor(totalMinutes / (24 * 60));
  totalMinutes = totalMinutes % (24 * 60);

  // Calculate final match date (base day + additional overflow days)
  const startDate = new Date(scheduleConfig.start_date);
  const matchDate = new Date(startDate);
  matchDate.setDate(startDate.getDate() + dayIndex + additionalDays);

  // Calculate final hour and minute
  const matchHour = Math.floor(totalMinutes / 60);
  const matchMinute = totalMinutes % 60;

  const matchTime = `${String(matchHour).padStart(2, '0')}:${String(matchMinute).padStart(2, '0')}:00`;

  // TIMEZONE-SAFE DATE FORMATTING (avoid UTC conversion)
  const formattedDate = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')
    }-${String(matchDate.getDate()).padStart(2, '0')
    }`;

  return {
    match_date: formattedDate,
    match_time: matchTime
  };
};

/**
 * Get match status based on schedule availability
 * @param {string} matchDate - Match date
 * @param {string} matchTime - Match time
 * @returns {string} - 'scheduled' or 'pending'
 */
const getMatchStatus = (matchDate, matchTime) => {
  return 'scheduled';
};

/**
 * Calculate total days needed for tournament
 * @param {number} totalMatches - Total number of matches
 * @param {number} matchesPerDay - Matches per day
 * @returns {number} - Total days needed
 */
const calculateTournamentDays = (totalMatches, matchesPerDay = 4) => {
  return Math.ceil(totalMatches / matchesPerDay);
};

/**
 * Validate schedule configuration
 * @param {object} scheduleConfig - Schedule configuration
 * @returns {object} - { valid: boolean, errors: string[] }
 */
const validateScheduleConfig = (scheduleConfig) => {
  const errors = [];

  if (!scheduleConfig) {
    return { valid: true, errors: [] }; // Optional config
  }

  if (scheduleConfig.start_date) {
    const startDate = new Date(scheduleConfig.start_date);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start_date format');
    }
  }

  if (scheduleConfig.start_time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduleConfig.start_time)) {
      errors.push('Invalid start_time format (use HH:MM)');
    }
  }

  if (scheduleConfig.matches_per_day && scheduleConfig.matches_per_day < 1) {
    errors.push('matches_per_day must be at least 1');
  }

  if (scheduleConfig.match_duration && scheduleConfig.match_duration < 1) {
    errors.push('match_duration must be at least 1 minute');
  }

  if (scheduleConfig.break_between_matches && scheduleConfig.break_between_matches < 0) {
    errors.push('break_between_matches cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  calculateMatchSchedule,
  getMatchStatus,
  calculateTournamentDays,
  validateScheduleConfig
};

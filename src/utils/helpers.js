const generateMatchCode = () => {
  return 'M' + Date.now().toString(36).toUpperCase();
};

const generateTournamentCode = () => {
  return 'T' + Date.now().toString(36).toUpperCase();
};

const formatScore = (score) => {
  if (typeof score === 'object') {
    return JSON.stringify(score);
  }
  return score;
};

module.exports = {
  generateMatchCode,
  generateTournamentCode,
  formatScore
};

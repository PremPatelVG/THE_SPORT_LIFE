const { getUserStatistics } = require('../services/playerStatisticsService');

/**
 * Get player statistics
 * GET /api/v1/users/:userId/statistics?sportId=2
 */
const getPlayerStatistics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sportId } = req.query;
    
    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Get statistics
    const statistics = await getUserStatistics(parseInt(userId), sportId ? parseInt(sportId) : null);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get player statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch player statistics',
      error: error.message
    });
  }
};

module.exports = {
  getPlayerStatistics
};

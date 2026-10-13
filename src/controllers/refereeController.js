const refereeService = require('../services/refereeService');
const logger = require('../utils/logger');

/**
 * Get referee profile
 * GET /api/v1/referees/:refereeId
 */
const getRefereeProfile = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const profile = await refereeService.getRefereeProfile(refereeId);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Get referee profile error:', error);
    res.status(error.message === 'Referee not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all referees
 * GET /api/v1/referees
 */
const getAllReferees = async (req, res) => {
  try {
    const filters = {
      sport_id: req.query.sport_id,
      certification_level: req.query.certification_level,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      min_rating: req.query.min_rating,
      limit: req.query.limit
    };

    const referees = await refereeService.getAllReferees(filters);

    res.json({
      success: true,
      data: referees,
      total: referees.length
    });
  } catch (error) {
    logger.error('Get all referees error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add certification
 * POST /api/v1/referees/:refereeId/certifications
 */
const addCertification = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const certificationData = req.body;
    const requesterId = req.user.id;

    const certification = await refereeService.addCertification(
      refereeId,
      certificationData,
      requesterId
    );

    res.status(201).json({
      success: true,
      data: certification[0],
      message: 'Certification added successfully'
    });
  } catch (error) {
    logger.error('Add certification error:', error);
    res.status(error.message.includes('Only admin') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update certification
 * PATCH /api/v1/referees/certifications/:certificationId
 */
const updateCertification = async (req, res) => {
  try {
    const { certificationId } = req.params;
    const updateData = req.body;
    const requesterId = req.user.id;

    const certification = await refereeService.updateCertification(
      certificationId,
      updateData,
      requesterId
    );

    res.json({
      success: true,
      data: certification[0],
      message: 'Certification updated successfully'
    });
  } catch (error) {
    logger.error('Update certification error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Only admin') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get certifications
 * GET /api/v1/referees/:refereeId/certifications
 */
const getCertifications = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const certifications = await refereeService.getCertifications(refereeId);

    res.json({
      success: true,
      data: certifications
    });
  } catch (error) {
    logger.error('Get certifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Set availability
 * POST /api/v1/referees/:refereeId/availability
 */
const setAvailability = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const availabilityData = req.body;
    const requesterId = req.user.id;

    const result = await refereeService.setAvailability(
      refereeId,
      availabilityData,
      requesterId
    );

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Set availability error:', error);
    res.status(error.message.includes('Only the referee') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get availability
 * GET /api/v1/referees/:refereeId/availability
 */
const getAvailability = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const filters = {
      date: req.query.date,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      is_available: req.query.is_available !== undefined ? req.query.is_available === 'true' : undefined
    };

    const availability = await refereeService.getAvailability(refereeId, filters);

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    logger.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get assignments
 * GET /api/v1/referees/:refereeId/assignments
 */
const getAssignments = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const filters = {
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit
    };

    const assignments = await refereeService.getAssignments(refereeId, filters);

    res.json({
      success: true,
      data: assignments,
      total: assignments.length
    });
  } catch (error) {
    logger.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get assignment requests
 * GET /api/v1/referees/:refereeId/requests
 */
const getAssignmentRequests = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const status = req.query.status;

    const requests = await refereeService.getAssignmentRequests(refereeId, status);

    res.json({
      success: true,
      data: requests,
      total: requests.length
    });
  } catch (error) {
    logger.error('Get assignment requests error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Assign referee to match
 * POST /api/v1/referees/assign
 */
const assignToMatch = async (req, res) => {
  try {
    const { match_id, referee_id } = req.body;
    const assignedBy = req.user.id;

    if (!match_id || !referee_id) {
      return res.status(400).json({
        success: false,
        error: 'match_id and referee_id are required'
      });
    }

    const result = await refereeService.assignToMatch(match_id, referee_id, assignedBy);

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Assign to match error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('not certified') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Respond to assignment request
 * POST /api/v1/referees/requests/:requestId/respond
 */
const respondToAssignment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { response, reason } = req.body;
    const refereeId = req.user.id;

    if (!response || !['accepted', 'declined'].includes(response)) {
      return res.status(400).json({
        success: false,
        error: 'response must be "accepted" or "declined"'
      });
    }

    const result = await refereeService.respondToAssignment(
      requestId,
      response,
      refereeId,
      reason
    );

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Respond to assignment error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('already been responded') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel assignment
 * DELETE /api/v1/referees/assign/:matchId
 */
const cancelAssignment = async (req, res) => {
  try {
    const { matchId } = req.params;
    const requesterId = req.user.id;

    const result = await refereeService.cancelAssignment(matchId, requesterId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Cancel assignment error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Only tournament') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available referees for match
 * GET /api/v1/referees/available/:matchId
 */
const getAvailableForMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const referees = await refereeService.getAvailableForMatch(matchId);

    res.json({
      success: true,
      data: referees,
      total: referees.length
    });
  } catch (error) {
    logger.error('Get available referees error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get pending assignment requests for a match
 * GET /api/v1/referees/match/:matchId/pending
 */
const getPendingRequestsForMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const requests = await refereeService.getPendingRequestsForMatch(matchId);

    res.json({
      success: true,
      data: requests,
      total: requests.length
    });
  } catch (error) {
    logger.error('Get pending requests for match error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get pending assignment requests for multiple matches (batch)
 * POST /api/v1/referees/matches/pending/batch
 * Body: { matchIds: [1, 2, 3, ...] }
 */
const getBatchPendingRequestsForMatches = async (req, res) => {
  try {
    const { matchIds } = req.body;

    if (!matchIds || !Array.isArray(matchIds)) {
      return res.status(400).json({
        success: false,
        error: 'matchIds array is required'
      });
    }

    if (matchIds.length === 0) {
      return res.json({
        success: true,
        data: {}
      });
    }

    const statusMap = await refereeService.getBatchPendingRequestsForMatches(matchIds);

    res.json({
      success: true,
      data: statusMap
    });
  } catch (error) {
    logger.error('Get batch pending requests for matches error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get referee performance
 * GET /api/v1/referees/:refereeId/performance
 */
const getPerformance = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const performance = await refereeService.getPerformance(refereeId);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Rate referee performance
 * POST /api/v1/referees/rate
 */
const ratePerformance = async (req, res) => {
  try {
    const { match_id, rating, feedback } = req.body;
    const ratedBy = req.user.id;

    if (!match_id || !rating) {
      return res.status(400).json({
        success: false,
        error: 'match_id and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'rating must be between 1 and 5'
      });
    }

    const result = await refereeService.ratePerformance(match_id, rating, feedback, ratedBy);

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Rate performance error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Only tournament') ? 403 :
               error.message.includes('already been rated') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get referee statistics
 * GET /api/v1/referees/:refereeId/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const { refereeId } = req.params;
    const statistics = await refereeService.getStatistics(refereeId);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getRefereeProfile,
  getAllReferees,
  addCertification,
  updateCertification,
  getCertifications,
  setAvailability,
  getAvailability,
  getAssignments,
  getAssignmentRequests,
  assignToMatch,
  respondToAssignment,
  cancelAssignment,
  getAvailableForMatch,
  getPerformance,
  ratePerformance,
  getStatistics,
  getPendingRequestsForMatch,
  getBatchPendingRequestsForMatches
};

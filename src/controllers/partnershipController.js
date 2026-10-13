const partnershipService = require('../services/partnershipService');
const logger = require('../utils/logger');

/**
 * Create partnership
 * POST /api/v1/partnerships
 */
const createPartnership = async (req, res) => {
  try {
    const partnership = await partnershipService.createPartnership(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Partnership created successfully',
      data: partnership
    });
  } catch (error) {
    logger.error('Create partnership controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get user's partnerships
 * GET /api/v1/partnerships/my/partnerships
 */
const getMyPartnerships = async (req, res) => {
  try {
    const partnerships = await partnershipService.getUserPartnerships(req.user.id, req.query);
    
    res.json({
      success: true,
      data: partnerships
    });
  } catch (error) {
    logger.error('Get my partnerships controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get partnership by ID
 * GET /api/v1/partnerships/:id
 */
const getPartnership = async (req, res) => {
  try {
    const partnership = await partnershipService.getPartnership(req.params.id, req.user.id);
    
    res.json({
      success: true,
      data: partnership
    });
  } catch (error) {
    logger.error('Get partnership controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update partnership
 * PUT /api/v1/partnerships/:id
 */
const updatePartnership = async (req, res) => {
  try {
    const partnership = await partnershipService.updatePartnership(
      req.params.id,
      req.user.id,
      req.body
    );
    
    res.json({
      success: true,
      message: 'Partnership updated successfully',
      data: partnership
    });
  } catch (error) {
    logger.error('Update partnership controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete partnership
 * DELETE /api/v1/partnerships/:id
 */
const deletePartnership = async (req, res) => {
  try {
    await partnershipService.deletePartnership(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Partnership deleted successfully'
    });
  } catch (error) {
    logger.error('Delete partnership controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createPartnership,
  getMyPartnerships,
  getPartnership,
  updatePartnership,
  deletePartnership
};

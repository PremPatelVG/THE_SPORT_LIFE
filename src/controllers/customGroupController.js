const customGroupService = require('../services/customGroupService');
const logger = require('../utils/logger');

/**
 * Create custom groups for a tournament
 * POST /api/v1/tournaments/:id/custom-groups
 */
const createCustomGroups = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;
    const { groups, autoAssign = true } = req.body; // Default to auto-assign
    
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Groups array is required and must not be empty'
      });
    }
    
    const result = await customGroupService.createCustomGroups(tournamentId, userId, groups, autoAssign);
    
    res.status(201).json({
      success: true,
      message: result.message,
      auto_assigned: result.auto_assigned,
      data: result.groups
    });
    
  } catch (error) {
    logger.error('Create custom groups error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create custom groups'
    });
  }
};

/**
 * Assign participants to groups
 * POST /api/v1/tournaments/:id/custom-groups/assign
 */
const assignParticipants = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;
    const { assignments } = req.body;
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Assignments array is required and must not be empty'
      });
    }
    
    const result = await customGroupService.assignParticipantsToGroups(tournamentId, userId, assignments);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        assigned: result.assigned
      }
    });
    
  } catch (error) {
    logger.error('Assign participants error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign participants'
    });
  }
};

/**
 * Get custom groups with participants
 * GET /api/v1/tournaments/:id/custom-groups
 */
const getCustomGroups = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    const groups = await customGroupService.getCustomGroups(tournamentId);
    
    res.status(200).json({
      success: true,
      data: groups
    });
    
  } catch (error) {
    logger.error('Get custom groups error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get custom groups'
    });
  }
};

/**
 * Update custom groups for a tournament
 * PUT /api/v1/tournaments/:id/custom-groups
 */
const updateCustomGroups = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;
    const { groups, autoAssign = true } = req.body;
    
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Groups array is required and must not be empty'
      });
    }
    
    const result = await customGroupService.updateCustomGroups(tournamentId, userId, groups, autoAssign);
    
    res.status(200).json({
      success: true,
      message: result.message,
      auto_assigned: result.auto_assigned,
      data: result.groups
    });
    
  } catch (error) {
    logger.error('Update custom groups error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update custom groups'
    });
  }
};

/**
 * Delete custom groups
 * DELETE /api/v1/tournaments/:id/custom-groups
 */
const deleteCustomGroups = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    const result = await customGroupService.deleteCustomGroups(tournamentId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        deleted: result.deleted
      }
    });
    
  } catch (error) {
    logger.error('Delete custom groups error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete custom groups'
    });
  }
};

/**
 * Validate group assignments
 * GET /api/v1/tournaments/:id/custom-groups/validate
 */
const validateAssignments = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    const validation = await customGroupService.validateGroupAssignments(tournamentId);
    
    res.status(200).json({
      success: true,
      data: validation
    });
    
  } catch (error) {
    logger.error('Validate assignments error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to validate assignments'
    });
  }
};

/**
 * Get unassigned participants
 * GET /api/v1/tournaments/:id/custom-groups/unassigned
 */
const getUnassignedParticipants = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    const participants = await customGroupService.getUnassignedParticipants(tournamentId);
    
    res.status(200).json({
      success: true,
      data: participants
    });
    
  } catch (error) {
    logger.error('Get unassigned participants error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get unassigned participants'
    });
  }
};

/**
 * Fix duplicate group assignments
 * POST /api/v1/tournaments/:id/custom-groups/fix-duplicates
 */
const fixDuplicates = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    const result = await customGroupService.fixDuplicateAssignments(tournamentId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        fixed: result.fixed,
        participants_affected: result.participants_affected
      }
    });
    
  } catch (error) {
    logger.error('Fix duplicates error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fix duplicate assignments'
    });
  }
};

module.exports = {
  createCustomGroups,
  assignParticipants,
  getCustomGroups,
  updateCustomGroups,
  deleteCustomGroups,
  validateAssignments,
  getUnassignedParticipants,
  fixDuplicates
};

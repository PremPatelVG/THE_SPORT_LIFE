const Partnership = require('../models/Partnership');
const logger = require('../utils/logger');

/**
 * Create a new partnership
 */
const createPartnership = async (userId, partnershipData) => {
  try {
    const { partner_email, tournament_id, name, sport_id } = partnershipData;
    
    // Get partner user by email
    const { query } = require('../config/database');
    const partnerSql = 'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL';
    const partners = await query(partnerSql, [partner_email]);
    
    if (partners.length === 0) {
      throw new Error('Partner not found with this email');
    }
    
    const partnerId = partners[0].id;
    
    // Check if user is trying to partner with themselves
    if (userId === partnerId) {
      throw new Error('Cannot create partnership with yourself');
    }
    
    // Check if partnership already exists
    const exists = await Partnership.existsBetweenUsers(userId, partnerId, tournament_id);
    if (exists) {
      throw new Error('Partnership already exists between these users');
    }
    
    // Create partnership
    const partnershipId = await Partnership.create({
      player1_id: userId,
      player2_id: partnerId,
      tournament_id: tournament_id || null,
      name: name || `${userId}-${partnerId}`,
      sport_id
    });
    
    logger.info(`Partnership created: ${partnershipId} between users ${userId} and ${partnerId}`);
    
    return await Partnership.findById(partnershipId);
  } catch (error) {
    logger.error('Create partnership error:', error);
    throw error;
  }
};

/**
 * Get user's partnerships
 */
const getUserPartnerships = async (userId, filters = {}) => {
  try {
    return await Partnership.getUserPartnerships(userId, filters);
  } catch (error) {
    logger.error('Get user partnerships error:', error);
    throw error;
  }
};

/**
 * Get eligible partnerships for tournament
 */
const getEligiblePartnerships = async (userId, tournamentId) => {
  try {
    // Get tournament details
    const Tournament = require('../models/Tournament');
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    if (tournament.category !== 'doubles') {
      return [];
    }
    
    // Get eligible partnerships
    const partnerships = await Partnership.getEligibleForTournament(
      userId,
      tournamentId,
      tournament.sport_id
    );
    
    // Add eligibility information
    return partnerships.map(partnership => {
      const canRegister = !partnership.is_registered;
      const reasons = [];
      
      if (partnership.is_registered) {
        reasons.push('Partnership already registered for this tournament');
      }
      
      return {
        ...partnership,
        can_register: canRegister,
        reasons
      };
    });
  } catch (error) {
    logger.error('Get eligible partnerships error:', error);
    throw error;
  }
};

/**
 * Get partnership by ID
 */
const getPartnership = async (partnershipId, userId) => {
  try {
    const partnership = await Partnership.findById(partnershipId);
    
    if (!partnership) {
      throw new Error('Partnership not found');
    }
    
    // Check if user is part of partnership
    const isPartner = await Partnership.isPartner(partnershipId, userId);
    if (!isPartner) {
      throw new Error('You are not part of this partnership');
    }
    
    // Get statistics
    const stats = await Partnership.getStatistics(partnershipId);
    
    return {
      ...partnership,
      statistics: stats
    };
  } catch (error) {
    logger.error('Get partnership error:', error);
    throw error;
  }
};

/**
 * Update partnership
 */
const updatePartnership = async (partnershipId, userId, updateData) => {
  try {
    // Check if user is part of partnership
    const isPartner = await Partnership.isPartner(partnershipId, userId);
    if (!isPartner) {
      throw new Error('You are not part of this partnership');
    }
    
    return await Partnership.update(partnershipId, updateData);
  } catch (error) {
    logger.error('Update partnership error:', error);
    throw error;
  }
};

/**
 * Delete partnership
 */
const deletePartnership = async (partnershipId, userId) => {
  try {
    // Check if user is part of partnership
    const isPartner = await Partnership.isPartner(partnershipId, userId);
    if (!isPartner) {
      throw new Error('You are not part of this partnership');
    }
    
    // Check if partnership is registered for any active tournaments
    const partnership = await Partnership.findById(partnershipId);
    if (partnership.tournament_id) {
      const Tournament = require('../models/Tournament');
      const tournament = await Tournament.findById(partnership.tournament_id);
      
      if (tournament && ['open', 'ongoing'].includes(tournament.status)) {
        throw new Error('Cannot delete partnership registered for active tournament');
      }
    }
    
    await Partnership.remove(partnershipId);
    logger.info(`Partnership ${partnershipId} deleted by user ${userId}`);
  } catch (error) {
    logger.error('Delete partnership error:', error);
    throw error;
  }
};

module.exports = {
  createPartnership,
  getUserPartnerships,
  getEligiblePartnerships,
  getPartnership,
  updatePartnership,
  deletePartnership
};

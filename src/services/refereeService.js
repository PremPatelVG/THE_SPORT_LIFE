const Referee = require('../models/Referee');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const twilio = require('twilio');

/**
 * Send SMS using Twilio
 */
const sendSMS = async (phone, message) => {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.warn('Twilio credentials not configured. SMS not sent.');
      return false;
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Ensure phone number is in E.164 format
    let cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: cleanPhone
    });

    logger.info(`SMS sent to ${cleanPhone}`);
    return true;
  } catch (error) {
    logger.error('SMS send error:', error);
    return false;
  }
};

/**
 * Get referee profile
 */
const getRefereeProfile = async (refereeId) => {
  try {
    const referee = await Referee.findById(refereeId);
    
    if (!referee) {
      throw new Error('Referee not found');
    }
    
    // Get certifications
    const certifications = await Referee.getCertifications(refereeId);
    
    // Get performance stats
    const performance = await Referee.getPerformance(refereeId);
    
    return {
      ...referee,
      certifications,
      performance
    };
  } catch (error) {
    logger.error('Get referee profile error:', error);
    throw error;
  }
};

/**
 * Get all referees with filters
 */
const getAllReferees = async (filters = {}) => {
  try {
    return await Referee.findAll(filters);
  } catch (error) {
    logger.error('Get all referees error:', error);
    throw error;
  }
};

/**
 * Add certification to referee
 */
const addCertification = async (refereeId, certificationData, requesterId) => {
  try {
    // Only admin or the referee themselves can add certifications
    if (requesterId !== refereeId) {
      const requester = await query('SELECT role FROM users WHERE id = ?', [requesterId]);
      if (!requester[0] || requester[0].role !== 'admin') {
        throw new Error('Only admin or the referee can add certifications');
      }
    }
    
    certificationData.referee_id = refereeId;
    
    const certificationId = await Referee.addCertification(certificationData);
    
    logger.info(`Certification added for referee ${refereeId}: ${certificationId}`);
    
    return await query('SELECT * FROM referee_certifications WHERE id = ?', [certificationId]);
  } catch (error) {
    logger.error('Add certification error:', error);
    throw error;
  }
};

/**
 * Update certification
 */
const updateCertification = async (certificationId, updateData, requesterId) => {
  try {
    // Get certification to check ownership
    const cert = await query('SELECT referee_id FROM referee_certifications WHERE id = ?', [certificationId]);
    
    if (!cert[0]) {
      throw new Error('Certification not found');
    }
    
    // Only admin or the referee can update
    if (requesterId !== cert[0].referee_id) {
      const requester = await query('SELECT role FROM users WHERE id = ?', [requesterId]);
      if (!requester[0] || requester[0].role !== 'admin') {
        throw new Error('Only admin or the referee can update certifications');
      }
    }
    
    await Referee.updateCertification(certificationId, updateData);
    
    logger.info(`Certification updated: ${certificationId}`);
    
    return await query('SELECT * FROM referee_certifications WHERE id = ?', [certificationId]);
  } catch (error) {
    logger.error('Update certification error:', error);
    throw error;
  }
};

/**
 * Get referee certifications
 */
const getCertifications = async (refereeId) => {
  try {
    return await Referee.getCertifications(refereeId);
  } catch (error) {
    logger.error('Get certifications error:', error);
    throw error;
  }
};

/**
 * Set referee availability
 */
const setAvailability = async (refereeId, availabilityData, requesterId) => {
  try {
    // Only the referee themselves can set availability
    if (requesterId !== refereeId) {
      throw new Error('Only the referee can set their own availability');
    }
    
    availabilityData.referee_id = refereeId;
    
    await Referee.setAvailability(availabilityData);
    
    logger.info(`Availability set for referee ${refereeId} on ${availabilityData.available_date}`);
    
    return { success: true, message: 'Availability updated successfully' };
  } catch (error) {
    logger.error('Set availability error:', error);
    throw error;
  }
};

/**
 * Get referee availability
 */
const getAvailability = async (refereeId, filters = {}) => {
  try {
    return await Referee.getAvailability(refereeId, filters);
  } catch (error) {
    logger.error('Get availability error:', error);
    throw error;
  }
};

/**
 * Get referee assignments
 */
const getAssignments = async (refereeId, filters = {}) => {
  try {
    return await Referee.getAssignments(refereeId, filters);
  } catch (error) {
    logger.error('Get assignments error:', error);
    throw error;
  }
};

/**
 * Get assignment requests for referee
 */
const getAssignmentRequests = async (refereeId, status = null) => {
  try {
    return await Referee.getAssignmentRequests(refereeId, status);
  } catch (error) {
    logger.error('Get assignment requests error:', error);
    throw error;
  }
};

/**
 * Assign referee to match
 */
const assignToMatch = async (matchId, refereeId, assignedBy) => {
  try {
    return await transaction(async (conn) => {
      // Check if match exists
      const matches = await conn.query('SELECT * FROM matches WHERE id = ?', [matchId]);
      if (matches.length === 0) {
        throw new Error('Match not found');
      }
      
      const match = matches[0];
      
      // COMMENTED OUT: Check if referee is available
      // Allows sending invitation to anyone, even if they're playing or already assigned
      // const availabilityStatus = await Referee.isAvailableForMatch(refereeId, matchId);
      // 
      // if (availabilityStatus !== 'available') {
      //   throw new Error(`Referee is ${availabilityStatus.replace('_', ' ')}`);
      // }
      
      // COMMENTED OUT: Check if referee has certification for this sport
      // Allows sending invitation to anyone regardless of certification
      // const tournament = await conn.query('SELECT sport_id FROM tournaments WHERE id = ?', [match.tournament_id]);
      // const certifications = await conn.query(
      //   'SELECT * FROM referee_certifications WHERE referee_id = ? AND sport_id = ? AND is_active = TRUE',
      //   [refereeId, tournament[0].sport_id]
      // );
      // 
      // if (certifications.length === 0) {
      //   throw new Error('Referee is not certified for this sport');
      // }
      
      // Create assignment request
      await conn.query(
        `INSERT INTO referee_assignment_requests 
         (match_id, referee_id, assigned_by, status, notification_sent)
         VALUES (?, ?, ?, 'pending', FALSE)
         ON DUPLICATE KEY UPDATE status = 'pending', assigned_at = NOW()`,
        [matchId, refereeId, assignedBy]
      );
      
      // Get referee details for SMS
      const refereeDetails = await conn.query(
        'SELECT first_name, last_name, phone FROM users WHERE id = ?',
        [refereeId]
      );
      
      // Get tournament and match details
      const tournamentDetails = await conn.query(
        `SELECT t.name as tournament_name, s.name as sport_name 
         FROM tournaments t 
         JOIN sports s ON t.sport_id = s.id 
         WHERE t.id = ?`,
        [match.tournament_id]
      );
      
      // Send SMS notification to referee
      if (refereeDetails.length > 0 && refereeDetails[0].phone) {
        const referee = refereeDetails[0];
        const tournament = tournamentDetails[0];
        
        const matchDate = match.match_date 
          ? new Date(match.match_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })
          : 'TBD';
        
        const matchTime = match.match_time || 'TBD';
        
        const smsMessage = `Hi ${referee.first_name}, You've been assigned as a referee for "${tournament.tournament_name}" (${tournament.sport_name}). Match Date: ${matchDate} ${matchTime}. Please accept or decline the assignment.`;
        
        const smsSent = await sendSMS(referee.phone, smsMessage);
        
        // Update notification_sent flag
        if (smsSent) {
          await conn.query(
            'UPDATE referee_assignment_requests SET notification_sent = TRUE WHERE match_id = ? AND referee_id = ?',
            [matchId, refereeId]
          );
        }
      }
      
      logger.info(`Referee ${refereeId} assigned to match ${matchId} by user ${assignedBy}`);
      
      return {
        success: true,
        message: 'Referee assignment request created and notification sent',
        matchId,
        refereeId
      };
    });
  } catch (error) {
    logger.error('Assign to match error:', error);
    throw error;
  }
};

/**
 * Respond to assignment request
 */
const respondToAssignment = async (requestId, response, refereeId, reason = null) => {
  try {
    // Verify the request belongs to this referee
    const requests = await query(
      'SELECT * FROM referee_assignment_requests WHERE id = ? AND referee_id = ?',
      [requestId, refereeId]
    );
    
    if (requests.length === 0) {
      throw new Error('Assignment request not found or does not belong to you');
    }
    
    const request = requests[0];
    
    if (request.status !== 'pending') {
      throw new Error('Assignment request has already been responded to');
    }
    
    if (!['accepted', 'declined'].includes(response)) {
      throw new Error('Invalid response. Must be "accepted" or "declined"');
    }
    
    await Referee.respondToAssignment(requestId, response, reason);
    
    logger.info(`Referee ${refereeId} ${response} assignment request ${requestId}`);
    
    return {
      success: true,
      message: `Assignment ${response} successfully`,
      requestId,
      response
    };
  } catch (error) {
    logger.error('Respond to assignment error:', error);
    throw error;
  }
};

/**
 * Cancel assignment
 */
const cancelAssignment = async (matchId, requesterId) => {
  try {
    return await transaction(async (conn) => {
      // Get match
      const matches = await conn.query('SELECT * FROM matches WHERE id = ?', [matchId]);
      if (matches.length === 0) {
        throw new Error('Match not found');
      }
      
      const match = matches[0];
      
      // Check if requester is tournament organizer
      const tournaments = await conn.query(
        'SELECT organizer_id FROM tournaments WHERE id = ?',
        [match.tournament_id]
      );
      
      if (tournaments[0].organizer_id !== requesterId) {
        const requester = await conn.query('SELECT role FROM users WHERE id = ?', [requesterId]);
        if (!requester[0] || requester[0].role !== 'admin') {
          throw new Error('Only tournament organizer or admin can cancel assignments');
        }
      }
      
      // Cancel assignment request
      await conn.query(
        'UPDATE referee_assignment_requests SET status = "cancelled" WHERE match_id = ? AND status = "pending"',
        [matchId]
      );
      
      // Remove referee from match
      await conn.query('UPDATE matches SET referee_id = NULL WHERE id = ?', [matchId]);
      
      logger.info(`Referee assignment cancelled for match ${matchId}`);
      
      return {
        success: true,
        message: 'Referee assignment cancelled successfully'
      };
    });
  } catch (error) {
    logger.error('Cancel assignment error:', error);
    throw error;
  }
};

/**
 * Get available referees for a match
 */
const getAvailableForMatch = async (matchId) => {
  try {
    return await Referee.getAvailableForMatch(matchId);
  } catch (error) {
    logger.error('Get available referees error:', error);
    throw error;
  }
};

/**
 * Get referee performance stats
 */
const getPerformance = async (refereeId) => {
  try {
    const performance = await Referee.getPerformance(refereeId);
    
    if (!performance) {
      return {
        referee_id: refereeId,
        total_matches_assigned: 0,
        matches_completed: 0,
        matches_missed: 0,
        reliability_score: 100.0,
        average_rating: 0.0
      };
    }
    
    return performance;
  } catch (error) {
    logger.error('Get performance error:', error);
    throw error;
  }
};

/**
 * Get pending assignment requests for a match
 */
const getPendingRequestsForMatch = async (matchId) => {
  try {
    return await Referee.getPendingRequestsForMatch(matchId);
  } catch (error) {
    logger.error('Get pending requests for match error:', error);
    throw error;
  }
};

/**
 * Get pending assignment requests for multiple matches (batch)
 */
const getBatchPendingRequestsForMatches = async (matchIds) => {
  try {
    return await Referee.getBatchPendingRequestsForMatches(matchIds);
  } catch (error) {
    logger.error('Get batch pending requests for matches error:', error);
    throw error;
  }
};

/**
 * Rate referee performance
 */
const ratePerformance = async (matchId, rating, feedback, ratedBy) => {
  try {
    return await transaction(async (conn) => {
      // Get match and verify it's completed
      const matches = await conn.query('SELECT * FROM matches WHERE id = ?', [matchId]);
      if (matches.length === 0) {
        throw new Error('Match not found');
      }
      
      const match = matches[0];
      
      if (match.status !== 'completed') {
        throw new Error('Can only rate referee after match is completed');
      }
      
      if (!match.referee_id) {
        throw new Error('No referee assigned to this match');
      }
      
      // Check if rater is tournament organizer
      const tournaments = await conn.query(
        'SELECT organizer_id FROM tournaments WHERE id = ?',
        [match.tournament_id]
      );
      
      if (tournaments[0].organizer_id !== ratedBy) {
        throw new Error('Only tournament organizer can rate referee performance');
      }
      
      // Check if already rated
      const existingRating = await conn.query(
        'SELECT id FROM referee_ratings WHERE match_id = ?',
        [matchId]
      );
      
      if (existingRating.length > 0) {
        throw new Error('Referee has already been rated for this match');
      }
      
      // Insert rating
      await conn.query(
        `INSERT INTO referee_ratings (match_id, referee_id, rating, feedback, rated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [matchId, match.referee_id, rating, feedback, ratedBy]
      );
      
      // Update average rating in performance table
      const avgRating = await conn.query(
        `SELECT AVG(rating) as avg_rating FROM referee_ratings WHERE referee_id = ?`,
        [match.referee_id]
      );
      
      await conn.query(
        `UPDATE referee_performance SET average_rating = ? WHERE referee_id = ?`,
        [avgRating[0].avg_rating, match.referee_id]
      );
      
      logger.info(`Referee ${match.referee_id} rated ${rating}/5 for match ${matchId}`);
      
      return {
        success: true,
        message: 'Referee rated successfully',
        rating
      };
    });
  } catch (error) {
    logger.error('Rate performance error:', error);
    throw error;
  }
};

/**
 * Get referee statistics
 */
const getStatistics = async (refereeId, filters = {}) => {
  try {
    const performance = await Referee.getPerformance(refereeId);
    const certifications = await Referee.getCertifications(refereeId);
    const assignments = await Referee.getAssignments(refereeId, { limit: 1000 });
    
    // Calculate additional stats
    const upcomingMatches = assignments.filter(a => a.status === 'scheduled').length;
    const completedMatches = assignments.filter(a => a.status === 'completed').length;
    const activeSports = certifications.filter(c => c.is_active).length;
    
    return {
      performance,
      certifications: {
        total: certifications.length,
        active: activeSports,
        sports: certifications.map(c => ({
          sport_name: c.sport_name,
          level: c.certification_level,
          is_active: c.is_active
        }))
      },
      assignments: {
        total: assignments.length,
        upcoming: upcomingMatches,
        completed: completedMatches
      }
    };
  } catch (error) {
    logger.error('Get statistics error:', error);
    throw error;
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

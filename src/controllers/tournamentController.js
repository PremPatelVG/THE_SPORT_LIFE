const tournamentService = require('../services/tournamentService');
const logger = require('../utils/logger');

  /**
   * Create tournament
   * POST /api/v1/tournaments
   */
const createTournament = async (req, res) => {
  try {
    const tournament = await tournamentService.createTournament(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: tournament
    });
  } catch (error) {
    logger.error('Create tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}


/**
 * Get all tournaments
 * GET /api/v1/tournaments
 */
const getTournaments = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      sport_id: req.query.sport_id,
      category: req.query.category,
      format_type: req.query.format_type,
      search: req.query.search,
      limit: req.query.limit || 20,
      offset: req.query.offset || 0,
      user_id: req.user?.id // Pass user ID to filter closed tournaments
    };

    const tournaments = await tournamentService.getTournaments(filters);
    
    res.json({
      success: true,
      data: tournaments,
      pagination: {
        limit: parseInt(filters.limit),
        offset: parseInt(filters.offset),
        total: tournaments.length
      }
    });
  } catch (error) {
    logger.error('Get tournaments controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
}

/**
 * Get tournament by ID
 * GET /api/v1/tournaments/:id
 */
const getTournament = async (req, res) => {
  try {
    console.log("check vbalue====", req.params.id)
    const tournament = await tournamentService.getTournament(req.params.id);
    
    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    logger.error('Get tournament controller error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Update tournament
 * PUT /api/v1/tournaments/:id
 */
const updateTournament = async (req, res) => {
  try {
    const tournament = await tournamentService.updateTournament(
      req.params.id,
      req.body,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Tournament updated successfully',
      data: tournament
    });
  } catch (error) {
    logger.error('Update tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Delete tournament
 * DELETE /api/v1/tournaments/:id
 */
const deleteTournament = async (req, res) => {
  try {
    const result = await tournamentService.deleteTournament(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Publish tournament
 * POST /api/v1/tournaments/:id/publish
 */
const publishTournament = async (req, res) => {
  try {
    const tournament = await tournamentService.publishTournament(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Tournament published successfully',
      data: tournament
    });
  } catch (error) {
    logger.error('Publish tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Close registration
 * POST /api/v1/tournaments/:id/close-registration
 */
const closeRegistration = async (req, res) => {
  try {
    const tournament = await tournamentService.closeRegistration(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Registration closed successfully',
      data: tournament
    });
  } catch (error) {
    logger.error('Close registration controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Register for tournament
 * POST /api/v1/tournaments/:id/register
 */
const registerForTournament = async (req, res) => {
  try {
    const participation = await tournamentService.registerForTournament(
      req.params.id,
      req.user.id,
      req.body
    );
    
    res.status(201).json({
      success: true,
      message: 'Successfully registered for tournament',
      data: participation
    });
  } catch (error) {
    logger.error('Register for tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Withdraw from tournament
 * POST /api/v1/tournaments/:id/withdraw
 */
const withdrawFromTournament = async (req, res) => {
  try {
    const result = await tournamentService.withdrawFromTournament(
      req.params.id,
      req.user.id,
      req.body.reason
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Withdraw from tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Preview matches before generation
 * POST /api/v1/tournaments/:id/preview-matches
 */
const previewMatches = async (req, res) => {
  try {
    // Extract schedule configuration from request body
    const scheduleConfig = {
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      matches_per_day: req.body.matches_per_day,
      match_duration: req.body.match_duration,
      break_between_matches: req.body.break_between_matches,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      group_size: req.body.group_size,
      qualifiers_per_group: req.body.qualifiers_per_group
    };

    const result = await tournamentService.previewMatches(
      req.params.id, 
      req.user.id,
      scheduleConfig
    );
    
    res.json({
      success: true,
      message: 'Match preview generated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Preview matches controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Generate brackets
 * POST /api/v1/tournaments/:id/generate-brackets
 */
const generateBrackets = async (req, res) => {
  try {
    // Extract schedule configuration from request body
    const scheduleConfig = {
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      matches_per_day: req.body.matches_per_day,
      match_duration: req.body.match_duration,
      break_between_matches: req.body.break_between_matches,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      // Groups+Knockout specific config
      group_size: req.body.group_size  // Optional: teams per group (auto-generate)
      // qualifiers_per_group: Automatically calculated based on international rules
    };

    const result = await tournamentService.generateBrackets(
      req.params.id, 
      req.user.id,
      scheduleConfig
    );
    
    res.json({
      success: true,
      message: 'Brackets generated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Generate brackets controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get tournament participants
 * GET /api/v1/tournaments/:id/participants
 */
const getParticipants = async (req, res) => {
  try {
    const Tournament = require('../models/Tournament');
    const participants = await Tournament.getParticipants(req.params.id);
    
    res.json({
      success: true,
      data: participants
    });
  } catch (error) {
    logger.error('Get participants controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants'
    });
  }
}

/**
 * Get locked participants for tournament (ready for bracket generation)
 * GET /api/v1/tournaments/:id/locked-participants
 */
const getLockedParticipants = async (req, res) => {
  try {
    const participants = await tournamentService.getLockedParticipants(req.params.id);
    
    res.json({
      success: true,
      data: participants,
      count: participants.length
    });
  } catch (error) {
    logger.error('Get locked participants controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch locked participants'
    });
  }
}

/**
 * Get tournament brackets
 * GET /api/v1/tournaments/:id/brackets
 */
const getBrackets = async (req, res) => {
  try {
    const { query } = require('../config/database');
    const bracketService = require('../services/bracketService');
    
    // Get brackets from database
    const brackets = await query(
      `SELECT * FROM tournament_brackets 
       WHERE tournament_id = ? 
       ORDER BY round_number, position_number`,
      [req.params.id]
    );
    
    // Format brackets with participant details if requested
    if (req.query.include_participants === 'true') {
      const formattedBrackets = await Promise.all(
        brackets.map(async (bracket) => {
          if (bracket.participant_id) {
            const participant = await bracketService.getParticipantDetails(
              bracket.tournament_id,
              bracket.participant_id
            );
            return {
              ...bracket,
              participant
            };
          }
          return bracket;
        })
      );
      
      return res.json({
        success: true,
        data: formattedBrackets
      });
    }
    
    res.json({
      success: true,
      data: brackets
    });
  } catch (error) {
    logger.error('Get brackets controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch brackets'
    });
  }
}

/**
 * Get tournament standings (enhanced with comprehensive statistics)
 * GET /api/v1/tournaments/:id/standings
 */
const getStandings = async (req, res) => {
  try {
    const standings = await tournamentService.getStandings(
      req.params.id,
      req.query.group_id
    );
    
    res.json({
      success: true,
      data: standings
    });
  } catch (error) {
    logger.error('Get standings controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch standings'
    });
  }
}

/**
 * Get formatted points table
 * GET /api/v1/tournaments/:id/points-table
 */
const getPointsTable = async (req, res) => {
  try {
    const pointsTable = await tournamentService.getPointsTable(
      req.params.id,
      req.query.group_id
    );
    
    res.json({
      success: true,
      data: pointsTable
    });
  } catch (error) {
    logger.error('Get points table controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch points table'
    });
  }
}

/**
 * Get tournament matches with participant details
 * GET /api/v1/tournaments/:id/matches
 */
const getMatches = async (req, res) => {
  try {
    const filters = {
      round_number: req.query.round,
      status: req.query.status,
      include_participants: req.query.include_participants
    };

    const matches = await tournamentService.getMatches(req.params.id, filters);
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Get matches controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches'
    });
  }
}

/**
 * Get tournament statistics
 * GET /api/v1/tournaments/:id/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const Tournament = require('../models/Tournament');
    const statistics = await Tournament.getStatistics(req.params.id);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get statistics controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
}

/**
 * Complete tournament
 * POST /api/v1/tournaments/:id/complete
 */
const completeTournament = async (req, res) => {
  try {
    const tournament = await tournamentService.completeTournament(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Tournament completed successfully',
      data: tournament
    });
  } catch (error) {
    logger.error('Complete tournament controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get user's tournaments
 * GET /api/v1/tournaments/my-tournaments
 */
const getMyTournaments = async (req, res) => {
  try {
    const tournaments = await tournamentService.getUserTournaments(req.user.id);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    logger.error('Get my tournaments controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
}

/**
 * Get upcoming tournaments
 * GET /api/v1/tournaments/upcoming
 */
const getUpcomingTournaments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const tournaments = await tournamentService.getUpcomingTournaments(limit);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    logger.error('Get upcoming tournaments controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
}

/**
 * Get ongoing tournaments
 * GET /api/v1/tournaments/ongoing
 */
const getOngoingTournaments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const tournaments = await tournamentService.getOngoingTournaments(limit);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    logger.error('Get ongoing tournaments controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
}

/**
 * Assign seeds to participants
 * POST /api/v1/tournaments/:id/assign-seeds
 */
const assignSeeds = async (req, res) => {
  try {
    const result = await tournamentService.assignSeeds(
      req.params.id,
      req.user.id,
      req.body.seeds
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Assign seeds controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get seeded participants for tournament
 * GET /api/v1/tournaments/:id/seeds
 */
const getSeeds = async (req, res) => {
  try {
    const seeds = await tournamentService.getSeededParticipants(req.params.id);
    
    res.json({
      success: true,
      data: seeds
    });
  } catch (error) {
    logger.error('Get seeds controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get eligible teams for tournament
 * GET /api/v1/tournaments/:id/eligible-teams
 */
const getEligibleTeams = async (req, res) => {
  try {
    const teams = await tournamentService.getEligibleTeams(
      req.params.id,
      req.user.id
    );
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error('Get eligible teams controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get tournament join options
 * GET /api/v1/tournaments/:id/join-options
 */
const getJoinOptions = async (req, res) => {
  try {
    const options = await tournamentService.getTournamentJoinOptions(
      req.params.id,
      req.user.id
    );
    
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    logger.error('Get join options controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check team eligibility for tournament
 * GET /api/v1/tournaments/:id/check-team-eligibility/:teamId
 */
const checkTeamEligibility = async (req, res) => {
  try {
    const eligibility = await tournamentService.checkTeamEligibility(
      req.params.teamId,
      req.params.id
    );
    
    res.json({
      success: true,
      data: eligibility
    });
  } catch (error) {
    logger.error('Check team eligibility controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get eligible partnerships for tournament
 * GET /api/v1/tournaments/:id/eligible-partnerships
 */
const getEligiblePartnerships = async (req, res) => {
  try {
    const partnershipService = require('../services/partnershipService');
    const partnerships = await partnershipService.getEligiblePartnerships(
      req.user.id,
      req.params.id
    );
    
    res.json({
      success: true,
      data: partnerships
    });
  } catch (error) {
    logger.error('Get eligible partnerships controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Finalize group stage and advance to knockout
 * POST /api/v1/tournaments/:id/finalize-groups
 */
const finalizeGroupStage = async (req, res) => {
  try {
    const bracketService = require('../services/bracketService');
    const Tournament = require('../models/Tournament');
    
    // Verify user is organizer
    const isOrganizer = await Tournament.isOrganizer(req.params.id, req.user.id);
    if (!isOrganizer) {
      return res.status(403).json({
        success: false,
        error: 'Only tournament organizer can finalize group stage'
      });
    }
    
    // Check if group stage is complete
    const isComplete = await bracketService.isGroupStageComplete(req.params.id);
    
    if (!isComplete) {
      return res.status(400).json({
        success: false,
        error: 'Group stage is not complete yet. All group matches must be finished.'
      });
    }
    
    // Finalize group stage
    const result = await bracketService.finalizeGroupStage(req.params.id);
    
    res.json({
      success: true,
      message: 'Group stage finalized successfully. Knockout stage participants assigned.',
      data: result
    });
  } catch (error) {
    logger.error('Finalize group stage controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check if group stage is complete
 * GET /api/v1/tournaments/:id/group-stage-status
 */
const getGroupStageStatus = async (req, res) => {
  try {
    const bracketService = require('../services/bracketService');
    
    const isComplete = await bracketService.isGroupStageComplete(req.params.id);
    
    res.json({
      success: true,
      data: {
        isComplete,
        message: isComplete 
          ? 'Group stage is complete. Ready to finalize.' 
          : 'Group stage is still in progress.'
      }
    });
  } catch (error) {
    logger.error('Get group stage status controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Recalculate tournament positions
 * POST /api/v1/tournaments/:id/recalculate-positions
 */
const recalculatePositions = async (req, res) => {
  try {
    const standingsService = require('../services/standingsService');
    const Tournament = require('../models/Tournament');
    const { query } = require('../config/database');
    
    // Verify user is organizer
    const isOrganizer = await Tournament.isOrganizer(req.params.id, req.user.id);
    if (!isOrganizer) {
      return res.status(403).json({
        success: false,
        error: 'Only tournament organizer can recalculate positions'
      });
    }
    
    logger.info(`🔄 Recalculating positions for tournament ${req.params.id}`);
    
    // Get all groups for this tournament
    const groups = await query(
      `SELECT DISTINCT group_id FROM tournament_standings WHERE tournament_id = ? AND group_id IS NOT NULL`,
      [req.params.id]
    );
    
    if (groups && groups.length > 0) {
      logger.info(`Found ${groups.length} groups in tournament ${req.params.id}`);
      
      // Recalculate for each group
      for (const { group_id } of groups) {
        logger.info(`Recalculating Group ${group_id}...`);
        await standingsService.recalculateStandings(req.params.id, group_id);
      }
    }
    
    // Also recalculate overall standings (for participants without groups)
    logger.info(`Recalculating overall standings...`);
    await standingsService.recalculateStandings(req.params.id, null);
    
    logger.info(`✅ Successfully recalculated all positions for tournament ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Positions recalculated successfully using updated tiebreaker rules',
      data: {
        groupsProcessed: groups ? groups.length : 0
      }
    });
  } catch (error) {
    logger.error('Recalculate positions controller error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createTournament,
  getTournaments,
  getTournament,
  updateTournament,
  deleteTournament,
  publishTournament,
  closeRegistration,
  registerForTournament,
  withdrawFromTournament,
  previewMatches,
  generateBrackets,
  getParticipants,
  getLockedParticipants,
  getBrackets,
  getStandings,
  getPointsTable,
  getMatches,
  getStatistics,
  completeTournament,
  getMyTournaments,
  getUpcomingTournaments,
  getOngoingTournaments,
  assignSeeds,
  getSeeds,
  getEligibleTeams,
  getEligiblePartnerships,
  getJoinOptions,
  checkTeamEligibility,
  finalizeGroupStage,
  getGroupStageStatus,
  recalculatePositions
};

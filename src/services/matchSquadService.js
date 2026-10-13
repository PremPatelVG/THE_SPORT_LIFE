const MatchSquad = require('../models/MatchSquad');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get team members for squad selection
 */
const getTeamMembersForSquad = async (matchId, teamId, userId) => {
  try {
    // Verify match exists and user has permission (referee or organizer)
    // Handle both tournament matches and standalone matches
    const matchSql = `
      SELECT 
        m.*,
        t.organizer_id,
        COALESCE(m.match_config, t.match_config) as match_config,
        t.category as tournament_category,
        COALESCE(m.sport_id, t.sport_id) as sport_id,
        s.name as sport_name,
        m.created_by
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ?
    `;
    
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Check permission (referee, organizer, or creator for standalone matches)
    const isAuthorized = match.referee_id === userId || 
                        match.organizer_id === userId || 
                        match.created_by === userId;
    
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only referee, organizer, or match creator can manage squad');
    }

    // Get team members
    const members = await MatchSquad.getTeamMembersForSquad(teamId);

    // Get position presets for the sport
    const positions = await MatchSquad.getPositionPresetsBySport(match.sport_id);

    // Get existing squad if any
    const existingSquad = await MatchSquad.getSquadByMatchAndTeam(matchId, teamId);

    // Parse match_config if it's a string
    let matchConfig = null;
    if (match.match_config) {
      try {
        matchConfig = typeof match.match_config === 'string' 
          ? JSON.parse(match.match_config) 
          : match.match_config;
      } catch (e) {
        logger.warn('Failed to parse match_config:', e);
      }
    }

    return {
      match: {
        id: match.id,
        tournament_id: match.tournament_id,
        sport_id: match.sport_id,
        sport_name: match.sport_name,
        tournament_category: match.tournament_category,
        match_config: matchConfig
      },
      team_members: members,
      position_presets: positions,
      existing_squad: existingSquad
    };
  } catch (error) {
    logger.error('Get team members for squad error:', error);
    throw error;
  }
};

/**
 * Save match squad
 */
const saveMatchSquad = async (matchId, teamId, squadMembers, userId) => {
  try {
    // Verify match exists and user has permission
    // Handle both tournament matches and standalone matches
    const matchSql = `
      SELECT 
        m.*,
        t.organizer_id,
        COALESCE(m.match_config, t.match_config) as match_config,
        s.name as sport_name,
        m.created_by
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN sports s ON COALESCE(m.sport_id, t.sport_id) = s.id
      WHERE m.id = ?
    `;
    
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Check permission (referee, organizer, or creator for standalone matches)
    const isAuthorized = match.referee_id === userId || 
                        match.organizer_id === userId || 
                        match.created_by === userId;
    
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only referee, organizer, or match creator can manage squad');
    }

    // Validate squad members
    if (!Array.isArray(squadMembers) || squadMembers.length === 0) {
      throw new Error('Squad members array is required');
    }

    // Verify all members belong to the team
    const teamMemberIds = await query(
      'SELECT user_id FROM team_members WHERE team_id = ? AND is_active = TRUE',
      [teamId]
    );
    
    const validUserIds = teamMemberIds.map(tm => tm.user_id);
    
    for (const member of squadMembers) {
      if (!validUserIds.includes(member.user_id)) {
        throw new Error(`User ${member.user_id} is not a member of team ${teamId}`);
      }
    }

    // For football, validate minimum starting players based on match_config
    if (match.sport_name?.toLowerCase() === 'football' && match.match_config) {
      try {
        const matchConfig = typeof match.match_config === 'string' 
          ? JSON.parse(match.match_config) 
          : match.match_config;
        
        const requiredStartingPlayers = matchConfig.players_per_side;
        if (requiredStartingPlayers) {
          const startingPlayers = squadMembers.filter(m => m.is_starting);
          if (startingPlayers.length < requiredStartingPlayers) {
            throw new Error(`Football requires at least ${requiredStartingPlayers} starting players. You have selected ${startingPlayers.length}.`);
          }
        }
      } catch (e) {
        if (e.message.includes('Football requires')) {
          throw e; // Re-throw validation error
        }
        logger.warn('Failed to parse match_config for validation:', e);
      }
    }

    // Check for duplicate players across teams
    const userIds = squadMembers.map(m => m.user_id);
    const duplicateCheckSql = `
      SELECT 
        ms.user_id,
        ms.team_id,
        u.first_name,
        u.last_name,
        t.name as team_name
      FROM match_squads ms
      JOIN users u ON ms.user_id = u.id
      JOIN teams t ON ms.team_id = t.id
      WHERE ms.match_id = ? 
        AND ms.team_id != ? 
        AND ms.user_id IN (?)
    `;
    
    const duplicatePlayers = await query(duplicateCheckSql, [matchId, teamId, userIds]);
    
    if (duplicatePlayers.length > 0) {
      const playerNames = duplicatePlayers.map(p => 
        `${p.first_name} ${p.last_name} (already in ${p.team_name})`
      ).join(', ');
      
      throw new Error(`Cannot add player(s) to squad: ${playerNames}. A player cannot be in both teams.`);
    }

    // Save squad
    const savedSquad = await MatchSquad.saveSquad(matchId, teamId, squadMembers);

    logger.info(`Squad saved for match ${matchId}, team ${teamId} by user ${userId}`);

    return {
      success: true,
      message: 'Squad saved successfully',
      squad: savedSquad
    };
  } catch (error) {
    logger.error('Save match squad error:', error);
    throw error;
  }
};

/**
 * Get match squads (both teams)
 */
const getMatchSquads = async (matchId) => {
  try {
    const squads = await MatchSquad.getSquadsByMatch(matchId);

    // Group by team
    const squadsByTeam = {};
    squads.forEach(member => {
      if (!squadsByTeam[member.team_id]) {
        squadsByTeam[member.team_id] = {
          team_id: member.team_id,
          team_name: member.team_name,
          members: []
        };
      }
      squadsByTeam[member.team_id].members.push(member);
    });

    return {
      success: true,
      squads: Object.values(squadsByTeam)
    };
  } catch (error) {
    logger.error('Get match squads error:', error);
    throw error;
  }
};

/**
 * Check if both squads are set for a match
 */
const checkSquadsStatus = async (matchId) => {
  try {
    // Get match with participant details
    // Handle both tournament matches and standalone matches
    const matchSql = `
      SELECT 
        m.id,
        m.participant1_id,
        m.participant2_id,
        m.category as match_category,
        t.category as tournament_category,
        tp1.team_id as team1_id_from_tp,
        tp2.team_id as team2_id_from_tp
      FROM matches m
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN tournament_participants tp1 ON m.participant1_id = tp1.id
      LEFT JOIN tournament_participants tp2 ON m.participant2_id = tp2.id
      WHERE m.id = ?
    `;
    
    const [match] = await query(matchSql, [matchId]);
    
    if (!match) {
      throw new Error('Match not found');
    }

    const status = {
      team1_squad_set: false,
      team2_squad_set: false,
      both_squads_set: false
    };

    // Check squad status for team matches (tournament or standalone)
    const matchCategory = match.match_category || match.tournament_category;
    if (matchCategory === 'teams') {
      // Check if squads exist by querying match_squads directly
      const squadsSql = `
        SELECT DISTINCT team_id
        FROM match_squads
        WHERE match_id = ?
      `;
      
      const squads = await query(squadsSql, [matchId]);
      const teamIdsWithSquads = squads.map(s => s.team_id);
      
      // Determine actual team IDs
      // If team_id_from_tp is NULL, participant_id IS the team_id directly
      const team1_id = match.team1_id_from_tp || match.participant1_id;
      const team2_id = match.team2_id_from_tp || match.participant2_id;
      
      logger.info('Squad status check:', {
        matchId,
        participant1_id: match.participant1_id,
        participant2_id: match.participant2_id,
        team1_id_from_tp: match.team1_id_from_tp,
        team2_id_from_tp: match.team2_id_from_tp,
        resolved_team1_id: team1_id,
        resolved_team2_id: team2_id,
        teamIdsWithSquads,
        category: match.tournament_category
      });

      // Check if team1 has squad
      if (team1_id && teamIdsWithSquads.includes(team1_id)) {
        status.team1_squad_set = true;
      }

      // Check if team2 has squad
      if (team2_id && teamIdsWithSquads.includes(team2_id)) {
        status.team2_squad_set = true;
      }

      status.both_squads_set = status.team1_squad_set && status.team2_squad_set;
    } else {
      // For non-team tournaments, squads are not required
      status.both_squads_set = true;
    }

    logger.info('Final squad status:', status);
    return status;
  } catch (error) {
    logger.error('Check squads status error:', error);
    throw error;
  }
};

module.exports = {
  getTeamMembersForSquad,
  saveMatchSquad,
  getMatchSquads,
  checkSquadsStatus
};

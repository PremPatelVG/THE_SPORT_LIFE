const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Custom Group Service
 * Handles manual group configuration for groups_knockout format
 * Allows organizers to create custom groups with variable sizes
 */

/**
 * Create custom groups for a tournament
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} userId - Organizer user ID
 * @param {Array} groupsConfig - Array of group configurations
 * Example:
 * [
 *   { name: "Group A", max_participants: 4 },
 *   { name: "Group B", max_participants: 3 },
 *   { name: "Group C", max_participants: 5 }
 * ]
 */
const createCustomGroups = async (tournamentId, userId, groupsConfig, autoAssign = true) => {
  return await transaction(async (conn) => {
    try {
      logger.info(`Creating ${groupsConfig.length} custom groups for tournament ${tournamentId}`);
      
      // Validate tournament format
      const [tournaments] = await conn.query(
        'SELECT format_type, status, category FROM tournaments WHERE id = ?',
        [tournamentId]
      );
      
      if (!tournaments || tournaments.length === 0) {
        throw new Error('Tournament not found');
      }
      
      const tournament = tournaments[0];
      
      if (tournament.format_type !== 'groups_knockout') {
        throw new Error('Custom groups are only supported for groups_knockout format');
      }
      
      if (tournament.status === 'ongoing' || tournament.status === 'completed') {
        throw new Error('Cannot modify groups after tournament has started');
      }
      
      // Check if groups already exist and delete them
      const [existingGroupsCount] = await conn.query(
        'SELECT COUNT(*) as count FROM tournament_groups WHERE tournament_id = ?',
        [tournamentId]
      );
      
      if (existingGroupsCount[0].count > 0) {
        logger.info(`Deleting ${existingGroupsCount[0].count} existing groups for tournament ${tournamentId}`);
        
        // Get all group IDs
        const [existingGroups] = await conn.query(
          'SELECT id FROM tournament_groups WHERE tournament_id = ?',
          [tournamentId]
        );
        
        if (existingGroups && existingGroups.length > 0) {
          const groupIds = existingGroups.map(g => g.id);
          
          // Delete tournament_standings records that reference these groups
          await conn.query(
            'DELETE FROM tournament_standings WHERE group_id IN (?)',
            [groupIds]
          );
          logger.info(`Deleted standings for ${groupIds.length} groups`);
          
          // Delete matches that reference these groups
          await conn.query(
            'DELETE FROM matches WHERE group_id IN (?)',
            [groupIds]
          );
          logger.info(`Deleted matches for ${groupIds.length} groups`);
        }
        
        // Delete existing groups (cascade will delete group_participants)
        await conn.query(
          'DELETE FROM tournament_groups WHERE tournament_id = ?',
          [tournamentId]
        );
        
        logger.info('Existing groups deleted successfully');
      }
      
      // Validate group names are unique
      const groupNames = groupsConfig.map(g => g.name);
      const uniqueNames = new Set(groupNames);
      if (groupNames.length !== uniqueNames.size) {
        throw new Error('Group names must be unique');
      }
      
      // Create custom groups
      const createdGroups = [];
      for (let i = 0; i < groupsConfig.length; i++) {
        const groupConfig = groupsConfig[i];
        
        // Validate group configuration
        if (!groupConfig.name || groupConfig.name.trim() === '') {
          throw new Error(`Group at index ${i} must have a name`);
        }
        
        const maxParticipants = groupConfig.max_participants || null;
        if (maxParticipants !== null && maxParticipants < 2) {
          throw new Error(`Group "${groupConfig.name}" must allow at least 2 participants`);
        }
        
        const [result] = await conn.query(
          `INSERT INTO tournament_groups 
           (tournament_id, group_name, description, is_custom, max_participants, display_order, created_by)
           VALUES (?, ?, ?, TRUE, ?, ?, ?)`,
          [
            tournamentId,
            groupConfig.name.trim(),
            groupConfig.description || null,
            maxParticipants,
            i + 1,
            userId
          ]
        );
        
        createdGroups.push({
          id: result.insertId,
          name: groupConfig.name.trim(),
          max_participants: maxParticipants,
          display_order: i + 1,
          participants: []
        });
        
        logger.info(`Created custom group: ${groupConfig.name} (max: ${maxParticipants || 'unlimited'})`);
      }
      
      // AUTO-ASSIGN participants based on seed/ranking (snake seeding)
      if (autoAssign) {
        logger.info('Auto-assigning participants to groups using snake seeding...');
        
        // Get all locked participants sorted by seed_number
        let participants = [];
        const category = tournament.category;
        
        if (category === 'singles') {
          [participants] = await conn.query(
            `SELECT tr.id, COALESCE(ts.seed_number, 999) as seed_number 
             FROM tournament_registrations tr
             LEFT JOIN tournament_seeds ts ON ts.player_registration_id = tr.id AND ts.tournament_id = ?
             WHERE tr.tournament_id = ? AND tr.status = 'locked'
             ORDER BY COALESCE(ts.seed_number, 999) ASC, tr.id ASC`,
            [tournamentId, tournamentId]
          );
        } else if (category === 'doubles' || category === 'pairs') {
          [participants] = await conn.query(
            `SELECT p.id, COALESCE(ts.seed_number, 999) as seed_number 
             FROM pairs p
             LEFT JOIN tournament_seeds ts ON ts.pair_id = p.id AND ts.tournament_id = ?
             WHERE p.tournament_id = ? AND p.status = 'locked'
             ORDER BY COALESCE(ts.seed_number, 999) ASC, p.id ASC`,
            [tournamentId, tournamentId]
          );
        } else if (category === 'teams') {
          // For teams: query teams table directly (teams have tournament_id column)
          [participants] = await conn.query(
            `SELECT t.id, NULL as seed_number 
             FROM teams t
             WHERE t.tournament_id = ? AND t.status = 'locked'
             ORDER BY t.id ASC`,
            [tournamentId]
          );
        }
        
        if (participants && participants.length > 0) {
          // Snake seeding: distribute participants across groups
          // Group 1, Group 2, Group 3, Group 3, Group 2, Group 1, repeat...
          const groupCount = createdGroups.length;
          let currentGroupIndex = 0;
          let direction = 1; // 1 = forward, -1 = backward
          
          for (let i = 0; i < participants.length; i++) {
            const participant = participants[i];
            const targetGroup = createdGroups[currentGroupIndex];
            
            // Check if group is full
            if (targetGroup.max_participants && targetGroup.participants.length >= targetGroup.max_participants) {
              // Skip this group, move to next
              currentGroupIndex += direction;
              if (currentGroupIndex >= groupCount || currentGroupIndex < 0) {
                direction *= -1;
                currentGroupIndex += direction;
              }
              continue;
            }
            
            // Assign participant to group
            await conn.query(
              `INSERT INTO group_participants (group_id, participant_id, position, assigned_by)
               VALUES (?, ?, ?, ?)`,
              [targetGroup.id, participant.id, targetGroup.participants.length + 1, userId]
            );
            
            targetGroup.participants.push(participant);
            logger.info(`Auto-assigned participant ${participant.id} (seed: ${participant.seed_number}) to ${targetGroup.name}`);
            
            // Move to next group (snake pattern)
            currentGroupIndex += direction;
            if (currentGroupIndex >= groupCount || currentGroupIndex < 0) {
              direction *= -1;
              currentGroupIndex += direction;
            }
          }
          
          logger.info(`Auto-assigned ${participants.length} participants using snake seeding`);
        }
      }
      
      return {
        success: true,
        groups: createdGroups,
        auto_assigned: autoAssign,
        message: autoAssign 
          ? `${createdGroups.length} custom groups created and participants auto-assigned. You can drag-and-drop to adjust.`
          : `${createdGroups.length} custom groups created successfully`
      };
      
    } catch (error) {
      logger.error('Create custom groups error:', error);
      throw error;
    }
  });
};

/**
 * Assign participants to custom groups
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} userId - Organizer user ID
 * @param {Array} assignments - Array of participant assignments
 * Example:
 * [
 *   { group_id: 1, participant_id: 10 },
 *   { group_id: 1, participant_id: 11 },
 *   { group_id: 2, participant_id: 12 }
 * ]
 */
const assignParticipantsToGroups = async (tournamentId, userId, assignments) => {
  return await transaction(async (conn) => {
    try {
      logger.info(`Assigning ${assignments.length} participants to groups for tournament ${tournamentId}`);
      
      // Validate tournament
      const [tournaments] = await conn.query(
        'SELECT format_type, status FROM tournaments WHERE id = ?',
        [tournamentId]
      );
      
      if (!tournaments || tournaments.length === 0) {
        throw new Error('Tournament not found');
      }
      
      const tournament = tournaments[0];
      
      if (tournament.status === 'ongoing' || tournament.status === 'completed') {
        throw new Error('Cannot modify group assignments after tournament has started');
      }
      
      // Get all custom groups for this tournament
      const [groups] = await conn.query(
        'SELECT id, group_name, max_participants, is_custom FROM tournament_groups WHERE tournament_id = ?',
        [tournamentId]
      );
      
      if (!groups || groups.length === 0) {
        throw new Error('No groups found. Create groups first.');
      }
      
      const groupMap = new Map(groups.map(g => [g.id, g]));
      
      // Validate all assignments
      for (const assignment of assignments) {
        if (!assignment.group_id || !assignment.participant_id) {
          throw new Error('Each assignment must have group_id and participant_id');
        }
        
        const group = groupMap.get(assignment.group_id);
        if (!group) {
          throw new Error(`Group ID ${assignment.group_id} not found in this tournament`);
        }
        
        // Verify participant exists based on tournament category
        // Get tournament category first
        const [tournamentInfo] = await conn.query(
          'SELECT category FROM tournaments WHERE id = ?',
          [tournamentId]
        );
        
        if (!tournamentInfo || tournamentInfo.length === 0) {
          throw new Error('Tournament not found');
        }
        
        const category = tournamentInfo[0].category;
        let participantExists = false;
        
        logger.info(`Validating participant ${assignment.participant_id} for category: ${category}`);
        
        if (category === 'singles') {
          // For singles: check tournament_registrations table
          const [rows] = await conn.query(
            `SELECT id FROM tournament_registrations 
             WHERE id = ? AND tournament_id = ? AND status = 'locked'`,
            [assignment.participant_id, tournamentId]
          );
          participantExists = rows && rows.length > 0;
          logger.info(`Singles check: found ${rows ? rows.length : 0} rows`);
        } else if (category === 'doubles' || category === 'pairs') {
          // For doubles: check pairs table directly
          const [rows] = await conn.query(
            `SELECT id FROM pairs
             WHERE id = ? AND tournament_id = ? AND status = 'locked'`,
            [assignment.participant_id, tournamentId]
          );
          participantExists = rows && rows.length > 0;
          logger.info(`Pairs check: found ${rows ? rows.length : 0} rows`);
        } else if (category === 'teams') {
          // For teams: check teams table directly (teams have tournament_id column)
          const [rows] = await conn.query(
            `SELECT id, name, status 
             FROM teams 
             WHERE id = ? AND tournament_id = ?`,
            [assignment.participant_id, tournamentId]
          );
          
          logger.info(`Teams check for ID ${assignment.participant_id}:`, JSON.stringify(rows));
          
          if (rows && rows.length > 0) {
            const row = rows[0];
            if (row.status === 'locked') {
              participantExists = true;
            } else {
              logger.error(`Team ${assignment.participant_id} found but status is: ${row.status}`);
            }
          } else {
            logger.error(`Team ${assignment.participant_id} not found in tournament ${tournamentId}`);
          }
        }
        
        if (!participantExists) {
          throw new Error(`Participant ID ${assignment.participant_id} not found or not locked in ${category} tournament`);
        }
      }
      
      // Check for duplicate assignments (participant assigned to multiple groups)
      const participantIds = assignments.map(a => a.participant_id);
      const uniqueParticipants = new Set(participantIds);
      if (participantIds.length !== uniqueParticipants.size) {
        const duplicates = participantIds.filter((id, index) => participantIds.indexOf(id) !== index);
        throw new Error(`A participant cannot be assigned to multiple groups. Duplicate participant IDs: ${[...new Set(duplicates)].join(', ')}`);
      }
      
      // Check if any participants are already assigned to OTHER groups in this tournament
      if (participantIds.length > 0) {
        const [existingAssignments] = await conn.query(
          `SELECT gp.participant_id, tg.group_name, gp.group_id
           FROM group_participants gp
           JOIN tournament_groups tg ON gp.group_id = tg.id
           WHERE tg.tournament_id = ? AND gp.participant_id IN (?)`,
          [tournamentId, participantIds]
        );
        
        if (existingAssignments && existingAssignments.length > 0) {
          // Check if any existing assignments are to groups NOT in our current assignment list
          const targetGroupIds = [...new Set(assignments.map(a => a.group_id))];
          const conflictingAssignments = existingAssignments.filter(ea => !targetGroupIds.includes(ea.group_id));
          
          if (conflictingAssignments.length > 0) {
            const conflicts = conflictingAssignments.map(ca => 
              `Participant ${ca.participant_id} is already in group "${ca.group_name}"`
            ).join('; ');
            throw new Error(`Cannot assign participants: ${conflicts}. Please remove them from existing groups first.`);
          }
        }
      }
      
      // Check group capacity constraints
      const groupCounts = new Map();
      for (const assignment of assignments) {
        const count = groupCounts.get(assignment.group_id) || 0;
        groupCounts.set(assignment.group_id, count + 1);
      }
      
      for (const [groupId, count] of groupCounts) {
        const group = groupMap.get(groupId);
        if (group.max_participants && count > group.max_participants) {
          throw new Error(`Group "${group.group_name}" exceeds maximum capacity (${group.max_participants}). Trying to assign ${count} participants.`);
        }
      }
      
      // Clear existing assignments for these participants
      const participantIdsList = assignments.map(a => a.participant_id);
      if (participantIdsList.length > 0) {
        await conn.query(
          `DELETE FROM group_participants 
           WHERE group_id IN (SELECT id FROM tournament_groups WHERE tournament_id = ?) 
           AND participant_id IN (?)`,
          [tournamentId, participantIdsList]
        );
      }
      
      // Insert new assignments
      const assignedParticipants = [];
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        
        const [result] = await conn.query(
          `INSERT INTO group_participants 
           (group_id, participant_id, position, assigned_by)
           VALUES (?, ?, ?, ?)`,
          [assignment.group_id, assignment.participant_id, i + 1, userId]
        );
        
        assignedParticipants.push({
          id: result.insertId,
          group_id: assignment.group_id,
          participant_id: assignment.participant_id,
          position: i + 1
        });
        
        logger.info(`Assigned participant ${assignment.participant_id} to group ${assignment.group_id}`);
      }
      
      return {
        success: true,
        assigned: assignedParticipants.length,
        message: `${assignedParticipants.length} participants assigned successfully`
      };
      
    } catch (error) {
      logger.error('Assign participants to groups error:', error);
      throw error;
    }
  });
};

/**
 * Get custom groups with participants for a tournament
 * @param {Number} tournamentId - Tournament ID
 */
const getCustomGroups = async (tournamentId) => {
  try {
    // Get all groups
    const groups = await query(
      `SELECT 
        tg.id,
        tg.group_name,
        tg.description,
        tg.is_custom,
        tg.max_participants,
        tg.display_order,
        tg.created_by,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
       FROM tournament_groups tg
       LEFT JOIN users u ON tg.created_by = u.id
       WHERE tg.tournament_id = ?
       ORDER BY tg.display_order ASC, tg.group_name ASC`,
      [tournamentId]
    );
    
    if (!groups || groups.length === 0) {
      return [];
    }
    
    // Get tournament category to determine how to fetch participant data
    const tournaments = await query(
      'SELECT category FROM tournaments WHERE id = ?',
      [tournamentId]
    );
    
    const tournamentCategory = tournaments && tournaments.length > 0 ? tournaments[0].category : 'singles';
    
    logger.info(`Getting custom groups for tournament ${tournamentId}, category: ${tournamentCategory}`);
    
    // Get participants for each group
    for (const group of groups) {
      let participants = [];
      
      if (tournamentCategory === 'teams') {
        // For teams: participant_id is team.id from teams table (teams have tournament_id)
        participants = await query(
          `SELECT 
            gp.id,
            gp.participant_id,
            gp.position,
            gp.assigned_at,
            t.id as team_id,
            t.name as participant_name,
            t.logo as profile_image
           FROM group_participants gp
           JOIN teams t ON gp.participant_id = t.id
           WHERE gp.group_id = ?
           ORDER BY gp.position ASC`,
          [group.id]
        );
      } else if (tournamentCategory === 'pairs' || tournamentCategory === 'doubles') {
        // For pairs: participant_id is pair.id from pairs table
        participants = await query(
          `SELECT 
            gp.id,
            gp.participant_id,
            gp.position,
            gp.assigned_at,
            p.id as pair_id,
            p.name as participant_name,
            NULL as profile_image
           FROM group_participants gp
           JOIN pairs p ON gp.participant_id = p.id
           WHERE gp.group_id = ?
           ORDER BY gp.position ASC`,
          [group.id]
        );
      } else {
        // For singles: participant_id is tournament_registrations.id
        participants = await query(
          `SELECT 
            gp.id,
            gp.participant_id,
            gp.position,
            gp.assigned_at,
            tr.user_id,
            CONCAT(u.first_name, ' ', u.last_name) as participant_name,
            u.profile_image
           FROM group_participants gp
           JOIN tournament_registrations tr ON gp.participant_id = tr.id
           JOIN users u ON tr.user_id = u.id
           WHERE gp.group_id = ?
           ORDER BY gp.position ASC`,
          [group.id]
        );
      }
      
      group.participants = participants || [];
      group.current_size = participants ? participants.length : 0;
      group.is_full = group.max_participants ? group.current_size >= group.max_participants : false;
    }
    
    return groups;
    
  } catch (error) {
    logger.error('Get custom groups error:', error);
    throw error;
  }
};

/**
 * Update custom groups for a tournament
 * This deletes all existing groups and creates new ones
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} userId - Organizer user ID
 * @param {Array} groupsConfig - Array of group configurations
 * @param {Boolean} autoAssign - Whether to auto-assign participants
 */
const updateCustomGroups = async (tournamentId, userId, groupsConfig, autoAssign = true) => {
  return await transaction(async (conn) => {
    try {
      logger.info(`Updating custom groups for tournament ${tournamentId}`);
      
      // Validate tournament format and status
      const [tournaments] = await conn.query(
        'SELECT format_type, status, category FROM tournaments WHERE id = ?',
        [tournamentId]
      );
      
      if (!tournaments || tournaments.length === 0) {
        throw new Error('Tournament not found');
      }
      
      const tournament = tournaments[0];
      
      if (tournament.format_type !== 'groups_knockout') {
        throw new Error('Custom groups are only supported for groups_knockout format');
      }
      
      if (tournament.status === 'ongoing' || tournament.status === 'completed') {
        throw new Error('Cannot modify groups after tournament has started');
      }
      
      // Step 1: Delete all existing groups and related data
      logger.info('Deleting existing groups and related data...');
      
      // First, get all group IDs for this tournament
      const [existingGroups] = await conn.query(
        'SELECT id FROM tournament_groups WHERE tournament_id = ?',
        [tournamentId]
      );
      
      if (existingGroups && existingGroups.length > 0) {
        const groupIds = existingGroups.map(g => g.id);
        
        // Delete tournament_standings records that reference these groups
        await conn.query(
          'DELETE FROM tournament_standings WHERE group_id IN (?)',
          [groupIds]
        );
        logger.info(`Deleted standings for ${groupIds.length} groups`);
        
        // Delete matches that reference these groups
        await conn.query(
          'DELETE FROM matches WHERE group_id IN (?)',
          [groupIds]
        );
        logger.info(`Deleted matches for ${groupIds.length} groups`);
      }
      
      // Now delete the groups (cascade will delete group_participants)
      await conn.query(
        'DELETE FROM tournament_groups WHERE tournament_id = ?',
        [tournamentId]
      );
      logger.info('Existing groups deleted successfully');
      
      // Step 2: Create new groups (reuse the create logic)
      // Validate group names are unique
      const groupNames = groupsConfig.map(g => g.name);
      const uniqueNames = new Set(groupNames);
      if (groupNames.length !== uniqueNames.size) {
        throw new Error('Group names must be unique');
      }
      
      // Create custom groups
      const createdGroups = [];
      for (let i = 0; i < groupsConfig.length; i++) {
        const groupConfig = groupsConfig[i];
        
        // Validate group configuration
        if (!groupConfig.name || groupConfig.name.trim() === '') {
          throw new Error(`Group at index ${i} must have a name`);
        }
        
        const maxParticipants = groupConfig.max_participants || null;
        if (maxParticipants !== null && maxParticipants < 2) {
          throw new Error(`Group "${groupConfig.name}" must allow at least 2 participants`);
        }
        
        const [result] = await conn.query(
          `INSERT INTO tournament_groups 
           (tournament_id, group_name, description, is_custom, max_participants, display_order, created_by)
           VALUES (?, ?, ?, TRUE, ?, ?, ?)`,
          [
            tournamentId,
            groupConfig.name.trim(),
            groupConfig.description || null,
            maxParticipants,
            i + 1,
            userId
          ]
        );
        
        createdGroups.push({
          id: result.insertId,
          name: groupConfig.name.trim(),
          max_participants: maxParticipants,
          display_order: i + 1,
          participants: []
        });
        
        logger.info(`Created custom group: ${groupConfig.name} (max: ${maxParticipants || 'unlimited'})`);
      }
      
      // Step 3: AUTO-ASSIGN participants if requested
      if (autoAssign) {
        logger.info('Auto-assigning participants to updated groups using snake seeding...');
        
        // Get all locked participants sorted by seed_number
        let participants = [];
        const category = tournament.category;
        
        if (category === 'singles') {
          [participants] = await conn.query(
            `SELECT tr.id, COALESCE(ts.seed_number, 999) as seed_number 
             FROM tournament_registrations tr
             LEFT JOIN tournament_seeds ts ON ts.player_registration_id = tr.id AND ts.tournament_id = ?
             WHERE tr.tournament_id = ? AND tr.status = 'locked'
             ORDER BY COALESCE(ts.seed_number, 999) ASC, tr.id ASC`,
            [tournamentId, tournamentId]
          );
        } else if (category === 'doubles' || category === 'pairs') {
          [participants] = await conn.query(
            `SELECT p.id, COALESCE(ts.seed_number, 999) as seed_number 
             FROM pairs p
             LEFT JOIN tournament_seeds ts ON ts.pair_id = p.id AND ts.tournament_id = ?
             WHERE p.tournament_id = ? AND p.status = 'locked'
             ORDER BY COALESCE(ts.seed_number, 999) ASC, p.id ASC`,
            [tournamentId, tournamentId]
          );
        } else if (category === 'teams') {
          [participants] = await conn.query(
            `SELECT t.id, NULL as seed_number 
             FROM teams t
             WHERE t.tournament_id = ? AND t.status = 'locked'
             ORDER BY t.id ASC`,
            [tournamentId]
          );
        }
        
        if (participants && participants.length > 0) {
          // Snake seeding: distribute participants across groups
          const groupCount = createdGroups.length;
          let currentGroupIndex = 0;
          let direction = 1;
          
          for (let i = 0; i < participants.length; i++) {
            const participant = participants[i];
            const targetGroup = createdGroups[currentGroupIndex];
            
            // Check if group is full
            if (targetGroup.max_participants && targetGroup.participants.length >= targetGroup.max_participants) {
              currentGroupIndex += direction;
              if (currentGroupIndex >= groupCount || currentGroupIndex < 0) {
                direction *= -1;
                currentGroupIndex += direction;
              }
              continue;
            }
            
            // Assign participant to group
            await conn.query(
              `INSERT INTO group_participants (group_id, participant_id, position, assigned_by)
               VALUES (?, ?, ?, ?)`,
              [targetGroup.id, participant.id, targetGroup.participants.length + 1, userId]
            );
            
            targetGroup.participants.push(participant);
            logger.info(`Auto-assigned participant ${participant.id} to ${targetGroup.name}`);
            
            // Move to next group (snake pattern)
            currentGroupIndex += direction;
            if (currentGroupIndex >= groupCount || currentGroupIndex < 0) {
              direction *= -1;
              currentGroupIndex += direction;
            }
          }
          
          logger.info(`Auto-assigned ${participants.length} participants using snake seeding`);
        }
      }
      
      return {
        success: true,
        groups: createdGroups,
        auto_assigned: autoAssign,
        message: autoAssign 
          ? `Groups updated successfully! ${createdGroups.length} groups created and participants auto-assigned.`
          : `Groups updated successfully! ${createdGroups.length} groups created.`
      };
      
    } catch (error) {
      logger.error('Update custom groups error:', error);
      throw error;
    }
  });
};

/**
 * Delete custom groups for a tournament
 * @param {Number} tournamentId - Tournament ID
 */
const deleteCustomGroups = async (tournamentId) => {
  return await transaction(async (conn) => {
    try {
      // Check tournament status
      const [tournaments] = await conn.query(
        'SELECT status FROM tournaments WHERE id = ?',
        [tournamentId]
      );
      
      if (!tournaments || tournaments.length === 0) {
        throw new Error('Tournament not found');
      }
      
      if (tournaments[0].status === 'ongoing' || tournaments[0].status === 'completed') {
        throw new Error('Cannot delete groups after tournament has started');
      }
      
      // Get all group IDs for this tournament
      const [existingGroups] = await conn.query(
        'SELECT id FROM tournament_groups WHERE tournament_id = ?',
        [tournamentId]
      );
      
      if (existingGroups && existingGroups.length > 0) {
        const groupIds = existingGroups.map(g => g.id);
        
        // Delete tournament_standings records that reference these groups
        await conn.query(
          'DELETE FROM tournament_standings WHERE group_id IN (?)',
          [groupIds]
        );
        logger.info(`Deleted standings for ${groupIds.length} groups`);
        
        // Delete matches that reference these groups
        await conn.query(
          'DELETE FROM matches WHERE group_id IN (?)',
          [groupIds]
        );
        logger.info(`Deleted matches for ${groupIds.length} groups`);
      }
      
      // Delete groups (cascade will delete group_participants)
      const [result] = await conn.query(
        'DELETE FROM tournament_groups WHERE tournament_id = ?',
        [tournamentId]
      );
      
      logger.info(`Deleted ${result.affectedRows} groups for tournament ${tournamentId}`);
      
      return {
        success: true,
        deleted: result.affectedRows,
        message: `${result.affectedRows} groups deleted successfully`
      };
      
    } catch (error) {
      logger.error('Delete custom groups error:', error);
      throw error;
    }
  });
};

/**
 * Validate if all participants are assigned to groups
 * @param {Number} tournamentId - Tournament ID
 */
const validateGroupAssignments = async (tournamentId) => {
  try {
    // Get tournament category
    const tournaments = await query(
      'SELECT category FROM tournaments WHERE id = ?',
      [tournamentId]
    );
    
    const category = tournaments && tournaments.length > 0 ? tournaments[0].category : 'singles';
    
    let totalParticipants;
    
    // Get total locked participants based on category
    if (category === 'teams') {
      // For teams: count from teams table
      totalParticipants = await query(
        `SELECT COUNT(*) as count FROM teams 
         WHERE tournament_id = ? AND status = 'locked'`,
        [tournamentId]
      );
    } else if (category === 'singles') {
      // For singles: count from tournament_registrations
      totalParticipants = await query(
        `SELECT COUNT(*) as count FROM tournament_registrations 
         WHERE tournament_id = ? AND status = 'locked'`,
        [tournamentId]
      );
    } else {
      // For pairs/doubles: count from pairs table
      totalParticipants = await query(
        `SELECT COUNT(*) as count FROM pairs 
         WHERE tournament_id = ? AND status = 'locked'`,
        [tournamentId]
      );
    }
    
    // Get total assigned participants
    const assignedParticipants = await query(
      `SELECT COUNT(DISTINCT gp.participant_id) as count 
       FROM group_participants gp
       JOIN tournament_groups tg ON gp.group_id = tg.id
       WHERE tg.tournament_id = ?`,
      [tournamentId]
    );
    
    const total = totalParticipants[0].count;
    const assigned = assignedParticipants[0].count;
    const unassigned = total - assigned;
    
    return {
      total_participants: total,
      assigned_participants: assigned,
      unassigned_participants: unassigned,
      all_assigned: unassigned === 0,
      ready_for_bracket_generation: unassigned === 0 && assigned >= 4
    };
    
  } catch (error) {
    logger.error('Validate group assignments error:', error);
    throw error;
  }
};

/**
 * Fix duplicate group assignments
 * Removes duplicate assignments where a participant is in multiple groups
 * Keeps only the first assignment for each participant
 * @param {Number} tournamentId - Tournament ID
 */
const fixDuplicateAssignments = async (tournamentId) => {
  return await transaction(async (conn) => {
    try {
      logger.info(`Fixing duplicate group assignments for tournament ${tournamentId}`);
      
      // Find duplicates
      const [duplicates] = await conn.query(
        `SELECT 
          gp.participant_id,
          COUNT(DISTINCT gp.group_id) as group_count,
          GROUP_CONCAT(DISTINCT tg.group_name ORDER BY tg.group_name) as groups
         FROM group_participants gp
         JOIN tournament_groups tg ON gp.group_id = tg.id
         WHERE tg.tournament_id = ?
         GROUP BY gp.participant_id
         HAVING COUNT(DISTINCT gp.group_id) > 1`,
        [tournamentId]
      );
      
      if (!duplicates || duplicates.length === 0) {
        return {
          success: true,
          message: 'No duplicate assignments found',
          fixed: 0
        };
      }
      
      logger.info(`Found ${duplicates.length} participants with duplicate assignments`);
      
      // For each duplicate participant, keep only the first assignment
      let totalFixed = 0;
      for (const dup of duplicates) {
        // Get all assignments for this participant
        const [assignments] = await conn.query(
          `SELECT gp.id, gp.group_id, tg.group_name
           FROM group_participants gp
           JOIN tournament_groups tg ON gp.group_id = tg.id
           WHERE tg.tournament_id = ? AND gp.participant_id = ?
           ORDER BY gp.id ASC`,
          [tournamentId, dup.participant_id]
        );
        
        if (assignments.length > 1) {
          // Keep the first, delete the rest
          const keepId = assignments[0].id;
          const deleteIds = assignments.slice(1).map(a => a.id);
          
          await conn.query(
            'DELETE FROM group_participants WHERE id IN (?)',
            [deleteIds]
          );
          
          totalFixed += deleteIds.length;
          logger.info(`Fixed participant ${dup.participant_id}: kept assignment in ${assignments[0].group_name}, removed ${deleteIds.length} duplicate(s)`);
        }
      }
      
      return {
        success: true,
        message: `Fixed ${totalFixed} duplicate assignments for ${duplicates.length} participants`,
        fixed: totalFixed,
        participants_affected: duplicates.length
      };
      
    } catch (error) {
      logger.error('Fix duplicate assignments error:', error);
      throw error;
    }
  });
};

/**
 * Get unassigned participants for a tournament
 * @param {Number} tournamentId - Tournament ID
 */
const getUnassignedParticipants = async (tournamentId) => {
  try {
    // Get tournament category
    const [tournaments] = await query(
      'SELECT category FROM tournaments WHERE id = ?',
      [tournamentId]
    );
    
    const tournamentCategory = tournaments && tournaments.length > 0 ? tournaments[0].category : 'singles';
    
    let participants = [];
    
    if (tournamentCategory === 'teams') {
      // For teams: query teams table directly (teams have tournament_id column)
      participants = await query(
        `SELECT 
          t.id,
          t.id as team_id,
          t.name,
          t.logo as profile_image,
          NULL as seed_number
         FROM teams t
         WHERE t.tournament_id = ? 
         AND t.status = 'locked'
         AND t.id NOT IN (
           SELECT gp.participant_id 
           FROM group_participants gp
           JOIN tournament_groups tg ON gp.group_id = tg.id
           WHERE tg.tournament_id = ?
         )
         ORDER BY t.name ASC`,
        [tournamentId, tournamentId]
      );
    } else if (tournamentCategory === 'pairs' || tournamentCategory === 'doubles') {
      // For pairs/doubles: participant_id is pair.id from pairs table
      participants = await query(
        `SELECT 
          p.id,
          p.id as pair_id,
          p.name,
          NULL as profile_image,
          COALESCE(ts.seed_number, 999) as seed_number
         FROM pairs p
         LEFT JOIN tournament_seeds ts ON ts.pair_id = p.id AND ts.tournament_id = ?
         WHERE p.tournament_id = ? 
         AND p.status = 'locked'
         AND p.id NOT IN (
           SELECT gp.participant_id 
           FROM group_participants gp
           JOIN tournament_groups tg ON gp.group_id = tg.id
           WHERE tg.tournament_id = ?
         )
         ORDER BY COALESCE(ts.seed_number, 999) ASC, p.name ASC`,
        [tournamentId, tournamentId, tournamentId]
      );
    } else {
      // For singles: query from tournament_registrations table
      participants = await query(
        `SELECT 
          tr.id,
          tr.user_id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.profile_image,
          COALESCE(ts.seed_number, 999) as seed_number
         FROM tournament_registrations tr
         JOIN users u ON tr.user_id = u.id
         LEFT JOIN tournament_seeds ts ON ts.player_registration_id = tr.id AND ts.tournament_id = ?
         WHERE tr.tournament_id = ? 
         AND tr.status = 'locked'
         AND tr.id NOT IN (
           SELECT gp.participant_id 
           FROM group_participants gp
           JOIN tournament_groups tg ON gp.group_id = tg.id
           WHERE tg.tournament_id = ?
         )
         ORDER BY COALESCE(ts.seed_number, 999) ASC, u.first_name ASC`,
        [tournamentId, tournamentId, tournamentId]
      );
    }
    
    return participants || [];
    
  } catch (error) {
    logger.error('Get unassigned participants error:', error);
    throw error;
  }
};

module.exports = {
  createCustomGroups,
  assignParticipantsToGroups,
  getCustomGroups,
  updateCustomGroups,
  deleteCustomGroups,
  validateGroupAssignments,
  fixDuplicateAssignments,
  getUnassignedParticipants
};

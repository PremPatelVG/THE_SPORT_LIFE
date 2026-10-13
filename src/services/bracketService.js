const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const standingsService = require('./standingsService');
const { calculateMatchSchedule, getMatchStatus } = require('../utils/scheduleCalculator');

/**
 * Helper: Get bye winner from two bracket positions
 * Handles both directions of bye scenarios
 */
const getByeWinner = (pos1, pos2) => {
  if (pos1?.participant_id && !pos2?.participant_id) {
    return pos1.participant_id;
  }

  if (!pos1?.participant_id && pos2?.participant_id) {
    return pos2.participant_id;
  }

  return null;
};

/**
 * Generate tournament brackets based on format
 */
const generateBrackets = async (tournamentId, participants, scheduleConfig = null) => {
  const tournament = await getTournamentInfo(tournamentId);

  switch (tournament.format_type) {
    case 'knockout':
      return await generateKnockoutBracket(tournamentId, participants, scheduleConfig);
    case 'round_robin':
      return await generateRoundRobinBracket(tournamentId, participants, scheduleConfig);
    case 'league':
      // League format is same as round robin (everyone plays everyone once)
      return await generateRoundRobinBracket(tournamentId, participants, scheduleConfig);
    case 'groups_knockout':
      return await generateGroupsKnockoutBracket(tournamentId, participants, scheduleConfig);
    default:
      throw new Error(`Unsupported format type: ${tournament.format_type}`);
  }
};

/**
 * Generate knockout bracket
 */
const generateKnockoutBracket = async (tournamentId, participants, scheduleConfig = null) => {
  const participantCount = participants.length;

  // Find next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantCount)));
  const byesNeeded = bracketSize - participantCount;

  logger.info(`🚀 ========== KNOCKOUT BRACKET GENERATION WITH DEPENDENCIES ========== 🚀`);
  logger.info(`Generating knockout bracket: ${participantCount} participants, ${bracketSize} bracket size, ${byesNeeded} byes`);
  logger.info(`Participants structure:`, JSON.stringify(participants.slice(0, 2)));
  if (scheduleConfig) {
    logger.info(`Schedule config:`, JSON.stringify(scheduleConfig));
  }

  return await transaction(async (conn) => {
    // Clear existing data - order matters for foreign key constraints
    await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
    await conn.query('DELETE FROM tournament_brackets WHERE tournament_id = ?', [tournamentId]);

    // Calculate number of rounds
    const totalRounds = Math.log2(bracketSize);

    // Calculate total matches across all rounds
    const totalMatches = bracketSize - 1; // For knockout: total matches = participants - 1

    // Match index counter for scheduling
    let currentMatchIndex = 0;

    // Create bracket positions for first round
    const bracketPositions = [];
    for (let i = 0; i < bracketSize; i++) {
      bracketPositions.push({
        tournament_id: tournamentId,
        bracket_type: 'main',
        round_number: 1,
        position_number: i + 1,
        participant_id: null,
        seed_number: null,
        status: 'waiting'
      });
    }

    // Assign participants using standard seeding
    const seeding = generateStandardSeeding(bracketSize);

    for (let i = 0; i < participantCount; i++) {
      const participant = participants[i];
      const seedPosition = seeding.indexOf(i + 1);

      // Handle both id and participant_id fields (for seeded vs non-seeded participants)
      const participantId = participant.participant_id || participant.id;

      bracketPositions[seedPosition].participant_id = participantId;
      bracketPositions[seedPosition].seed_number = participant.seed_number || (i + 1);
      bracketPositions[seedPosition].status = 'active';

      logger.info(`Assigned participant ${participantId} to seed position ${seedPosition + 1}`);
    }

    // Insert bracket positions
    for (const position of bracketPositions) {
      await conn.query(
        `INSERT INTO tournament_brackets 
           (tournament_id, bracket_type, round_number, position_number, participant_id, seed_number, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          position.tournament_id,
          position.bracket_type,
          position.round_number,
          position.position_number,
          position.participant_id,
          position.seed_number,
          position.status
        ]
      );
    }

    // Create first round matches with schedule
    // Track matches by round for dependency linking
    const matchesByRound = {};
    matchesByRound[1] = [];

    // Global match counter for sequential numbering across tournament
    let globalMatchNumber = 1;

    for (let i = 0; i < bracketSize / 2; i++) {
      const pos1 = bracketPositions[i * 2];
      const pos2 = bracketPositions[i * 2 + 1];

      // Only create match if both participants exist (no bye)
      if (pos1.participant_id && pos2.participant_id) {
        const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);
        const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

        const [matchResult] = await conn.query(
          `INSERT INTO matches 
             (tournament_id, round_number, match_number, round_name, participant1_id, participant2_id, 
              match_date, match_time, estimated_duration, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tournamentId, 1, globalMatchNumber,
            getRoundName(1, totalRounds),
            pos1.participant_id, pos2.participant_id,
            schedule.match_date, schedule.match_time,
            scheduleConfig?.match_duration || 60, matchStatus
          ]
        );

        const matchId = matchResult.insertId;
        logger.info(`✅ Created Round 1 Match ${globalMatchNumber} with ID ${matchId}`);

        matchesByRound[1].push({
          id: matchId,
          round: 1,
          match_number: globalMatchNumber,
          participant1: pos1.participant_id,
          participant2: pos2.participant_id,
          match_date: schedule.match_date,
          match_time: schedule.match_time
        });

        globalMatchNumber++;
      } else if (pos1.participant_id && !pos2.participant_id) {
        // Participant 1 gets a bye - store null to maintain position
        matchesByRound[1].push(null);
        logger.info(`Participant ${pos1.participant_id} receives a bye in round 1`);
      } else if (!pos1.participant_id && pos2.participant_id) {
        // Participant 2 gets a bye - store null to maintain position
        matchesByRound[1].push(null);
        logger.info(`Participant ${pos2.participant_id} receives a bye in round 1`);
      } else {
        // Both empty - store null
        matchesByRound[1].push(null);
      }
    }

    // Create matches for subsequent rounds with dependencies
    logger.info(`🔧 Round 1 complete. matchesByRound[1] has ${matchesByRound[1].length} elements`);
    logger.info(`🔧 matchesByRound[1]:`, JSON.stringify(matchesByRound[1].map(m => m ? m.id : 'null')));
    logger.info(`🔧 Creating matches for rounds 2 to ${totalRounds} with dependencies`);

    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const roundName = getRoundName(round, totalRounds);
      matchesByRound[round] = [];

      logger.info(`🔧 Round ${round} (${roundName}): Creating ${matchesInRound} matches`);

      for (let i = 0; i < matchesInRound; i++) {
        const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);

        let participant1Id = null;
        let participant2Id = null;
        let dependsOnMatch1Id = null;
        let dependsOnMatch2Id = null;

        // Calculate which previous round matches feed into this match
        const prevRoundMatch1Index = i * 2;
        const prevRoundMatch2Index = i * 2 + 1;

        logger.info(`🔧 Round ${round} Match ${i + 1}: Looking for dependencies at indexes ${prevRoundMatch1Index}, ${prevRoundMatch2Index}`);

        // Get previous round matches (could be null if bye)
        const prevMatch1 = matchesByRound[round - 1][prevRoundMatch1Index];
        const prevMatch2 = matchesByRound[round - 1][prevRoundMatch2Index];

        // Set dependencies
        if (prevMatch1) {
          dependsOnMatch1Id = prevMatch1.id;
          logger.info(`🔧 Round ${round} Match ${i + 1}: depends_on_match1_id = ${dependsOnMatch1Id}`);
        } else {
          // FIX #3: Removed `round === 2` guard — bye propagation works for ALL rounds
          // Walk back through previous rounds to find the bye winner
          logger.info(`🔧 Round ${round} Match ${i + 1}: No prevMatch1 (checking for bye)`);
          const pos1Index = prevRoundMatch1Index * 2;
          const pos2Index = pos1Index + 1;
          if (pos1Index < bracketPositions.length && pos2Index < bracketPositions.length) {
            const byeWinner = getByeWinner(bracketPositions[pos1Index], bracketPositions[pos2Index]);
            if (byeWinner) {
              participant1Id = byeWinner;
              logger.info(`🔧 Round ${round} Match ${i + 1}: Participant ${participant1Id} advanced via bye`);
            }
          }
        }

        if (prevMatch2) {
          dependsOnMatch2Id = prevMatch2.id;
          logger.info(`🔧 Round ${round} Match ${i + 1}: depends_on_match2_id = ${dependsOnMatch2Id}`);
        } else {
          // FIX #3: Removed `round === 2` guard — bye propagation works for ALL rounds
          logger.info(`🔧 Round ${round} Match ${i + 1}: No prevMatch2 (checking for bye)`);
          const pos1Index = prevRoundMatch2Index * 2;
          const pos2Index = pos1Index + 1;
          if (pos1Index < bracketPositions.length && pos2Index < bracketPositions.length) {
            const byeWinner = getByeWinner(bracketPositions[pos1Index], bracketPositions[pos2Index]);
            if (byeWinner) {
              participant2Id = byeWinner;
              logger.info(`🔧 Round ${round} Match ${i + 1}: Participant ${participant2Id} advanced via bye`);
            }
          }
        }

        // Create match with dependencies
        const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

        logger.info(`🔧 Inserting Round ${round} Match ${i + 1} with dependencies: ${dependsOnMatch1Id}, ${dependsOnMatch2Id}`);

        const [matchResult] = await conn.query(
          `INSERT INTO matches 
             (tournament_id, round_number, match_number, round_name, participant1_id, participant2_id, 
              match_date, match_time, estimated_duration, status, depends_on_match1_id, depends_on_match2_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tournamentId, round, globalMatchNumber, roundName, participant1Id, participant2Id,
            schedule.match_date, schedule.match_time, scheduleConfig?.match_duration || 60, matchStatus,
            dependsOnMatch1Id, dependsOnMatch2Id
          ]
        );

        logger.info(`✅ Created Match ID ${matchResult.insertId} (Round ${round} Match ${globalMatchNumber}) with dependencies: ${dependsOnMatch1Id}, ${dependsOnMatch2Id}`);

        // Store match for next round dependencies
        matchesByRound[round].push({
          id: matchResult.insertId,
          round: round,
          match_number: globalMatchNumber,
          depends_on_match1_id: dependsOnMatch1Id,
          depends_on_match2_id: dependsOnMatch2Id
        });

        globalMatchNumber++;
      }
    }

    return {
      format: 'knockout',
      total_rounds: totalRounds,
      bracket_size: bracketSize,
      participants: participantCount,
      byes: byesNeeded,
      first_round_matches: matchesByRound[1].filter(m => m !== null).length,
      total_matches: totalMatches
    };
  });
};

/**
 * Generate round robin bracket
 * FIX #2: Removed local redeclaration of calculateMatchSchedule that was shadowing the import.
 *         Now uses the imported utility consistently, same as knockout bracket.
 */
const generateRoundRobinBracket = async (tournamentId, participants, scheduleConfig = null) => {
  const participantCount = participants.length;

  logger.info(`Generating round robin bracket: ${participantCount} participants`);
  if (scheduleConfig) {
    logger.info(`Schedule config:`, JSON.stringify(scheduleConfig));
  }

  return await transaction(async (conn) => {
    // Clear existing matches
    await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);

    // Calculate total matches for round robin: n * (n-1) / 2
    const totalMatches = (participantCount * (participantCount - 1)) / 2;

    // Match index counter for scheduling
    let currentMatchIndex = 0;

    // Generate all possible matches (each participant plays every other participant once)
    const matches = [];
    let matchNumber = 1;

    for (let i = 0; i < participantCount; i++) {
      for (let j = i + 1; j < participantCount; j++) {
        // Use participant_id if available (from seeded participants), otherwise use id
        const participant1Id = participants[i].participant_id || participants[i].id;
        const participant2Id = participants[j].participant_id || participants[j].id;

        // FIX #2: Use the imported calculateMatchSchedule and getMatchStatus consistently
        const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);
        const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

        const [result] = await conn.query(
          `INSERT INTO matches 
             (tournament_id, round_number, match_number, round_name, participant1_id, participant2_id, 
              match_date, match_time, estimated_duration, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tournamentId, 1, matchNumber, 'Round Robin', participant1Id, participant2Id,
            schedule.match_date, schedule.match_time, scheduleConfig?.match_duration || 60, matchStatus
          ]
        );

        matches.push({
          id: result.insertId,
          match_number: matchNumber,
          participant1: participant1Id,
          participant2: participant2Id,
          match_date: schedule.match_date,
          match_time: schedule.match_time
        });

        matchNumber++;
      }
    }

    // Create standings entries
    for (const participant of participants) {
      const participantId = participant.participant_id || participant.id;
      await conn.query(
        `INSERT INTO tournament_standings 
           (tournament_id, participant_id, matches_played, matches_won, matches_lost, points)
           VALUES (?, ?, 0, 0, 0, 0)`,
        [tournamentId, participantId]
      );
    }

    return {
      format: 'round_robin',
      total_matches: matches.length,
      participants: participantCount
    };
  });
};

/**
 * Generate round robin rounds using STANDARD CIRCLE METHOD (professional scheduling)
 * This ensures balanced scheduling where each team plays once per round
 * Algorithm: Fix position 0, rotate all others clockwise
 */
const generateRoundRobinRounds = (participants) => {
  const n = participants.length;
  const rounds = [];

  // If odd number of participants, add a BYE
  const teams = [...participants];
  if (n % 2 === 1) {
    teams.push({ participant_id: null, isBye: true }); // BYE team
  }

  const totalTeams = teams.length;
  const roundsCount = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  // Create rotation array (position 0 is fixed, others rotate)
  const rotation = Array.from({ length: totalTeams }, (_, i) => i);

  // STANDARD CIRCLE METHOD
  for (let round = 0; round < roundsCount; round++) {
    const roundMatches = [];

    // Pair teams: first with last, second with second-last, etc.
    for (let match = 0; match < matchesPerRound; match++) {
      const homeIndex = rotation[match];
      const awayIndex = rotation[totalTeams - 1 - match];

      const team1 = teams[homeIndex];
      const team2 = teams[awayIndex];

      // Skip matches with BYE
      if (!team1.isBye && !team2.isBye) {
        roundMatches.push({
          participant1_id: team1.participant_id,
          participant2_id: team2.participant_id
        });
      }
    }

    if (roundMatches.length > 0) {
      rounds.push(roundMatches);
    }

    // Rotate: keep position 0 fixed, rotate others clockwise
    // [0, 1, 2, 3, 4, 5] -> [0, 5, 1, 2, 3, 4]
    if (round < roundsCount - 1) {
      const last = rotation[totalTeams - 1];
      for (let i = totalTeams - 1; i > 1; i--) {
        rotation[i] = rotation[i - 1];
      }
      rotation[1] = last;
    }
  }

  return rounds;
};

/**
 * Check if all groups have equal team counts
 */
const areGroupsEqual = (groupSizes) => {
  if (!groupSizes || groupSizes.length === 0) return true;
  const firstSize = groupSizes[0];
  return groupSizes.every(size => size === firstSize);
};

/**
 * Generate dynamic knockout structure based on actual qualified teams
 * Creates ONLY necessary matches, avoiding TBD placeholders
 * Returns structure with proper round names and match counts
 */
const generateDynamicKnockoutStructure = (totalQualifiers) => {
  if (totalQualifiers < 2) {
    return { rounds: [], totalMatches: 0, bracketSize: 0, byesNeeded: 0 };
  }

  // Find next power of 2 for bracket size
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalQualifiers)));
  const byesNeeded = bracketSize - totalQualifiers;

  // Calculate number of rounds needed
  const totalRounds = Math.log2(bracketSize);

  const rounds = [];

  // Generate rounds from first to final
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);

    // Participants IN this round (who are playing)
    const participantsThisRound = matchesInRound * 2;

    // Determine professional round name
    const roundName = getRoundNameByParticipants(participantsThisRound);

    rounds.push({
      roundNumber: round,
      matchesInRound: matchesInRound,
      participantsThisRound: participantsThisRound,
      roundName: roundName
    });
  }

  const totalMatches = bracketSize - 1; // Total knockout matches = participants - 1

  return {
    rounds: rounds,
    totalMatches: totalMatches,
    bracketSize: bracketSize,
    byesNeeded: byesNeeded,
    totalRounds: totalRounds
  };
};

/**
 * Calculate dynamic qualification based on group size (INTERNATIONAL STANDARD RULES)
 * PRIORITY 1: If all groups have same size → same qualifiers for all
 * PRIORITY 2: If groups have different sizes → proportional qualifiers
 *
 * International Professional Standards (FIFA/UEFA/FIVB):
 * - 2 teams → Top 1 qualifies (50%)
 * - 3 teams → Top 1 qualifies (33%) - FIFA World Cup old format
 * - 4 teams → Top 2 qualifies (50%) - FIFA standard
 * - 5 teams → Top 2 qualifies (40%)
 * - 6 teams → Top 2 qualifies (33%) - UEFA Champions League
 * - 7 teams → Top 4 qualifies (57%)
 * - 8 teams → Top 4 qualifies (50%)
 *
 * Note: For 8+ qualifiers (Quarter Finals), manually set qualifiers_per_group: 4 in config
 */
const calculateQualificationPerGroup = (groupSize, groupCount, totalParticipants, allGroupSizes = [], configuredQualifiers = null) => {
  // RULE 0: If manually configured, use that (for custom tournaments)
  if (configuredQualifiers !== null && configuredQualifiers > 0) {
    const maxFromThisGroup = groupSize - 1; // Must have elimination
    return Math.min(configuredQualifiers, maxFromThisGroup);
  }

  // RULE 1: International Standard Qualification Rules
  if (groupSize === 2) return 1;  // 2 teams → only 1 qualifies
  if (groupSize === 3) return 2;  // 3 teams → Top 1 (FIFA World Cup old format)
  if (groupSize === 4) return 2;  // 4 teams → Top 2 (FIFA standard)
  if (groupSize === 5) return 2;  // 5 teams → Top 2 (40%)
  if (groupSize === 6) return 2;  // 6 teams → Top 2 (UEFA Champions League)
  if (groupSize === 7) return 4;  // 7 teams → Top 4
  if (groupSize === 8) return 4;  // 8 teams → Top 4 (50%)

  // RULE 2: Default for larger groups - 50% qualification
  return Math.max(1, Math.floor(groupSize / 2));
};

/**
 * Generate professional cross-group knockout pairings using POT SYSTEM
 * Prevents same-group rematches in early knockout rounds
 * Uses seeding pots for fair bracket distribution
 */
const generateCrossGroupPairings = (qualifiers, groupCount) => {
  const pairings = [];

  logger.info(`\n🔧 [PAIRING ENGINE] groups=${groupCount}, qualifiers=${qualifiers.length}`);

  if (!qualifiers || qualifiers.length < 2) return pairings;

  // Group qualifiers by their group index
  const byGroup = {};
  qualifiers.forEach(q => {
    if (!byGroup[q.groupIndex]) byGroup[q.groupIndex] = [];
    byGroup[q.groupIndex].push(q);
  });

  // Sort each group's qualifiers by rank (1st, 2nd, etc.)
  Object.keys(byGroup).forEach(gi => {
    byGroup[gi].sort((a, b) => a.rank - b.rank);
  });

  const groupIndices = Object.keys(byGroup).map(Number).sort();
  const totalGroups = groupIndices.length;

  logger.info(`Groups found: ${groupIndices.map(gi => 
    `Group${gi}(${byGroup[gi].length}q)`).join(', ')}`);

  if (totalGroups === 2) {
    // STANDARD: A1 vs B2, B1 vs A2
    const groupA = byGroup[groupIndices[0]];
    const groupB = byGroup[groupIndices[1]];
    const maxPairs = Math.min(groupA.length, groupB.length);

    for (let rank = 0; rank < maxPairs; rank++) {
      const p1 = groupA[rank];                    // A1, A2...
      const p2 = groupB[maxPairs - 1 - rank];     // B2, B1...
      pairings.push({ p1, p2 });
      logger.info(`✅ Pairing: ${p1.groupName} Rank ${p1.rank} vs ${p2.groupName} Rank ${p2.rank}`);
    }

  } else if (totalGroups === 4) {
    // 4 groups: A1vsB2, B1vsA2, C1vsD2, D1vsC2
    for (let i = 0; i < groupIndices.length; i += 2) {
      const gA = byGroup[groupIndices[i]];
      const gB = byGroup[groupIndices[i + 1]];
      if (!gA || !gB) continue;

      const maxPairs = Math.min(gA.length, gB.length);
      for (let rank = 0; rank < maxPairs; rank++) {
        const p1 = gA[rank];
        const p2 = gB[maxPairs - 1 - rank];
        pairings.push({ p1, p2 });
        logger.info(`✅ Pairing: ${p1.groupName} R${p1.rank} vs ${p2.groupName} R${p2.rank}`);
      }
    }

  } else {
    // Generic: Best vs Worst, cross-group preferred
    const used = new Set();
    const allSorted = [...qualifiers].sort((a, b) =>
      a.rank !== b.rank ? a.rank - b.rank : b.points - a.points
    );

    for (let i = 0; i < allSorted.length; i++) {
      if (used.has(i)) continue;
      const p1 = allSorted[i];

      // Different group opponent prefer karo
      let opponentIndex = -1;
      for (let j = allSorted.length - 1; j > i; j--) {
        if (!used.has(j) && allSorted[j].groupIndex !== p1.groupIndex) {
          opponentIndex = j;
          break;
        }
      }

      // Fallback: same group bhi chalega
      if (opponentIndex === -1) {
        for (let j = allSorted.length - 1; j > i; j--) {
          if (!used.has(j)) { opponentIndex = j; break; }
        }
      }

      if (opponentIndex === -1) { used.add(i); continue; }

      const p2 = allSorted[opponentIndex];
      pairings.push({ p1, p2 });
      used.add(i);
      used.add(opponentIndex);
      logger.info(`✅ Pairing: ${p1.groupName} R${p1.rank} vs ${p2.groupName} R${p2.rank}`);
    }
  }

  logger.info(`✅ Total pairings: ${pairings.length}`);
  return pairings;
};

/**
 * Generate groups + knockout bracket
 */
const generateGroupsKnockoutBracket = async (tournamentId, participants, scheduleConfig = null) => {
  const participantCount = participants.length;

  // Validate minimum participants for groups+knockout format
  if (participantCount < 4) {
    throw new Error('Groups+Knockout format requires at least 4 participants. Use Knockout or League format for fewer participants.');
  }

  return await transaction(async (conn) => {
    // Check if custom groups already exist
    const [existingGroups] = await conn.query(
      'SELECT id, group_name, is_custom FROM tournament_groups WHERE tournament_id = ? ORDER BY display_order ASC, group_name ASC',
      [tournamentId]
    );

    let groups = [];
    let useCustomGroups = false;
    let groupCount = 0;

    if (existingGroups && existingGroups.length > 0) {
      // Custom groups exist - use them
      useCustomGroups = true;
      logger.info(`Using ${existingGroups.length} existing custom groups for tournament ${tournamentId}`);

      // Get participants for each group
      for (const group of existingGroups) {
        const [groupParticipants] = await conn.query(
          'SELECT participant_id FROM group_participants WHERE group_id = ? ORDER BY position ASC',
          [group.id]
        );

        const participantsList = [];
        for (const gp of groupParticipants) {
          // Find participant details from the participants array
          const participantDetails = participants.find(p =>
            (p.participant_id || p.id) === gp.participant_id
          );

          if (participantDetails) {
            participantsList.push({
              ...participantDetails,
              participant_id: gp.participant_id
            });
          }
        }

        groups.push({
          id: group.id,
          name: group.group_name,
          participants: participantsList,
          is_custom: group.is_custom
        });

        logger.info(`Group ${group.group_name}: ${participantsList.length} participants`);
      }

      // Validate each group has at least 2 participants
      for (const group of groups) {
        if (group.participants.length < 2) {
          throw new Error(`Group "${group.name}" has only ${group.participants.length} participant(s). Each group must have at least 2 participants.`);
        }
      }

      // Set groupCount for custom groups
      groupCount = groups.length;

    } else {
      // No custom groups - auto-generate using group_size
      useCustomGroups = false;

      // Use configurable group size from scheduleConfig, default to 4 if not provided
      const groupSize = scheduleConfig?.group_size || 4;

      // Validate group size
      if (groupSize < 2) {
        throw new Error('Group size must be at least 2');
      }
      if (groupSize > participantCount) {
        throw new Error(`Group size (${groupSize}) cannot exceed total participants (${participantCount})`);
      }

      groupCount = Math.ceil(participantCount / groupSize);

      logger.info(`Auto-generating groups: ${participantCount} participants, ${groupCount} groups (${groupSize} per group)`);

      // Clear existing data - order matters due to foreign key constraints
      await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
      await conn.query('DELETE FROM tournament_standings WHERE tournament_id = ?', [tournamentId]);
      await conn.query('DELETE gp FROM group_participants gp JOIN tournament_groups tg ON gp.group_id = tg.id WHERE tg.tournament_id = ?)', [tournamentId]);
      await conn.query('DELETE FROM tournament_groups WHERE tournament_id = ?', [tournamentId]);

      // Create groups
      for (let i = 0; i < groupCount; i++) {
        const groupName = String.fromCharCode(65 + i); // A, B, C, etc.
        const [result] = await conn.query(
          'INSERT INTO tournament_groups (tournament_id, group_name, is_custom) VALUES (?, ?, FALSE)',
          [tournamentId, `Group ${groupName}`]
        );

        groups.push({
          id: result.insertId,
          name: `Group ${groupName}`,
          participants: [],
          is_custom: false
        });
      }

      // Distribute participants across groups (snake seeding)
      for (let i = 0; i < participantCount; i++) {
        const groupIndex = i % groupCount;
        const participantId = participants[i].participant_id || participants[i].id;

        groups[groupIndex].participants.push({
          ...participants[i],
          participant_id: participantId
        });

        await conn.query(
          'INSERT INTO group_participants (group_id, participant_id, position) VALUES (?, ?, ?)',
          [groups[groupIndex].id, participantId, groups[groupIndex].participants.length]
        );
      }
    }

    // Clear existing matches and standings (preserve groups)
    await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
    await conn.query('DELETE FROM tournament_standings WHERE tournament_id = ?', [tournamentId]);

    // Match index counter for scheduling
    let currentMatchIndex = 0;

    // Generate round robin matches within each group with PROPER ROUND SCHEDULING
    let totalGroupMatches = 0;
    let totalGroupRounds = 0;

    // CRITICAL: Global match number OUTSIDE group loop to prevent duplicates
    let globalMatchNumber = 1;

    logger.info(`\n========== GENERATING GROUP STAGE MATCHES ==========`);

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];
      const groupParticipants = group.participants;
      const groupSize = groupParticipants.length;

      // All matches in this group get the SAME round_number = groupIndex + 1
      const groupRoundNumber = groupIndex + 1;

      logger.info(`\n${group.name}: ${groupSize} teams (Round Number: ${groupRoundNumber})`);

      // Generate professional round robin rounds using circle method
      const rounds = generateRoundRobinRounds(groupParticipants);
      const totalRounds = rounds.length;

      // Calculate expected matches: n * (n-1) / 2
      const expectedMatches = (groupSize * (groupSize - 1)) / 2;

      logger.info(`  Rounds: ${totalRounds}`);
      logger.info(`  Expected matches: ${expectedMatches}`);
      logger.info(`  Matches per round: ${groupSize % 2 === 0 ? groupSize / 2 : Math.floor(groupSize / 2)}`);

      totalGroupRounds = Math.max(totalGroupRounds, totalRounds);

      // Insert matches round by round
      for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
        const roundMatches = rounds[roundIndex];

        logger.info(`  Round ${roundIndex + 1}: ${roundMatches.length} matches`);

        for (const match of roundMatches) {
          const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);
          const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

          await conn.query(
            `INSERT INTO matches 
               (tournament_id, group_id, round_number, match_number, round_name, participant1_id, participant2_id, 
                match_date, match_time, estimated_duration, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tournamentId, group.id, groupRoundNumber, globalMatchNumber,
              `Group Stage - ${group.name}`,
              match.participant1_id, match.participant2_id,
              schedule.match_date, schedule.match_time,
              scheduleConfig?.match_duration || 60, matchStatus
            ]
          );

          globalMatchNumber++;
          totalGroupMatches++;
        }
      }

      logger.info(`  Total matches created: ${globalMatchNumber - 1}`);

      // Create standings for group
      for (const participant of groupParticipants) {
        await conn.query(
          `INSERT INTO tournament_standings 
             (tournament_id, group_id, participant_id, matches_played, matches_won, matches_lost, points)
             VALUES (?, ?, ?, 0, 0, 0, 0)`,
          [tournamentId, group.id, participant.participant_id]
        );
      }
    }

    logger.info(`\nTotal group stage matches: ${totalGroupMatches}`);
    logger.info(`Maximum rounds in any group: ${totalGroupRounds}`);

    // Generate knockout stage placeholder matches
    // PROFESSIONAL DYNAMIC QUALIFICATION RULE
    logger.info(`\n========== GENERATING KNOCKOUT STAGE ==========`);

    // STEP 1: Collect all group sizes first
    const allGroupSizes = groups.map(g => g.participants.length);
    const groupsAreEqual = areGroupsEqual(allGroupSizes);

    logger.info(`\nGroup Analysis:`);
    logger.info(`  Group sizes: ${allGroupSizes.join(', ')}`);
    logger.info(`  All groups equal: ${groupsAreEqual}`);

    // STEP 2: Calculate qualifiers based on professional rules
    let totalQualifiers = 0;
    const qualifiersPerGroupArray = []; // Track qualifiers for each group

    logger.info(`\nCalculating qualifiers per group (Professional Rules):`);

    if (groupsAreEqual) {
      // PRIORITY 1: All groups have same size → same qualifiers for all
      const standardGroupSize = allGroupSizes[0];
      const standardQualifiers = calculateQualificationPerGroup(
        standardGroupSize, groupCount, participantCount, allGroupSizes, scheduleConfig?.qualifiers_per_group
      );

      logger.info(`  ✓ Equal groups detected: ${standardGroupSize} teams per group`);
      logger.info(`  ✓ Standard qualifiers: ${standardQualifiers} from each group`);

      for (const group of groups) {
        qualifiersPerGroupArray.push(standardQualifiers);
        totalQualifiers += standardQualifiers;
        logger.info(`  ${group.name}: ${standardGroupSize} teams → ${standardQualifiers} qualifiers`);
      }
    } else {
      // PRIORITY 2: Unequal groups → proportional qualifiers
      logger.info(`  ⚠ Unequal groups detected - using proportional qualification`);

      for (const group of groups) {
        const groupSize = group.participants.length;
        const qualifiersForThisGroup = calculateQualificationPerGroup(
          groupSize, groupCount, participantCount, allGroupSizes, scheduleConfig?.qualifiers_per_group
        );

        totalQualifiers += qualifiersForThisGroup;
        qualifiersPerGroupArray.push(qualifiersForThisGroup);
        logger.info(`  ${group.name}: ${groupSize} teams → ${qualifiersForThisGroup} qualifiers`);
      }
    }

    // For backward compatibility, calculate average qualifiers per group
    const qualifiersPerGroup = Math.round(totalQualifiers / groupCount);

    // STEP 3: Validate minimum knockout viability
    logger.info(`\n========== KNOCKOUT VIABILITY CHECK ==========`);

    if (totalQualifiers < 2) {
      logger.error(`❌ INSUFFICIENT QUALIFIERS: Only ${totalQualifiers} team(s) qualified`);
      logger.error(`❌ Minimum 2 teams required for knockout stage`);
      throw new Error(`Cannot generate knockout stage: Only ${totalQualifiers} team(s) qualified. Minimum 2 teams required.`);
    }

    logger.info(`✓ Knockout viable: ${totalQualifiers} teams qualified`);

    // STEP 4: Generate dynamic knockout structure
    logger.info(`\n========== DYNAMIC KNOCKOUT STRUCTURE ==========`);
    const knockoutStructure = generateDynamicKnockoutStructure(totalQualifiers);

    logger.info(`Total qualifiers: ${totalQualifiers}`);
    logger.info(`Knockout bracket size: ${knockoutStructure.bracketSize}`);
    logger.info(`Byes needed: ${knockoutStructure.byesNeeded}`);
    logger.info(`Total knockout rounds: ${knockoutStructure.totalRounds}`);
    logger.info(`Total knockout matches: ${knockoutStructure.totalMatches}`);

    let knockoutMatches = 0;

    // Track knockout matches by round for dependency linking
    const knockoutMatchesByRound = {};

    // Knockout rounds start after number of groups (not totalGroupRounds)
    // Group A = round 1, Group B = round 2, so knockout starts at groupCount + 1
    let knockoutRoundNumber = groupCount + 1;

    logger.info(`Starting knockout at round number: ${knockoutRoundNumber} (after ${groupCount} group rounds)`);

    if (totalQualifiers >= 2) {
      // STEP 5: Generate knockout matches using dynamic structure
      logger.info(`\n========== GENERATING KNOCKOUT MATCHES ==========`);

      for (const roundInfo of knockoutStructure.rounds) {
        const { roundNumber, matchesInRound, participantsThisRound, roundName } = roundInfo;

        knockoutMatchesByRound[roundNumber] = [];

        logger.info(`\nRound ${roundNumber} - ${roundName}:`);
        logger.info(`  Matches: ${matchesInRound}`);
        logger.info(`  Participants: ${participantsThisRound}`);

        for (let i = 0; i < matchesInRound; i++) {
          const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);
          const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

          // Determine dependencies
          let dependsOnMatch1Id = null;
          let dependsOnMatch2Id = null;

          if (roundNumber === 1) {
            // First knockout round - no match dependencies (depends on group standings)
            // Participants will be filled after group stage completes via finalizeGroupStage
            dependsOnMatch1Id = null;
            dependsOnMatch2Id = null;
          } else {
            // Later rounds - depend on previous knockout round matches
            const prevRound = roundNumber - 1;
            const match1Index = i * 2;
            const match2Index = i * 2 + 1;

            if (knockoutMatchesByRound[prevRound] && knockoutMatchesByRound[prevRound][match1Index]) {
              dependsOnMatch1Id = knockoutMatchesByRound[prevRound][match1Index].id;
            }
            if (knockoutMatchesByRound[prevRound] && knockoutMatchesByRound[prevRound][match2Index]) {
              dependsOnMatch2Id = knockoutMatchesByRound[prevRound][match2Index].id;
            }
          }

          const [matchResult] = await conn.query(
            `INSERT INTO matches 
               (tournament_id, group_id, round_number, match_number, round_name, participant1_id, participant2_id, 
                match_date, match_time, estimated_duration, status, depends_on_match1_id, depends_on_match2_id)
               VALUES (?, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
            [
              tournamentId, knockoutRoundNumber, globalMatchNumber, `Knockout - ${roundName}`,
              schedule.match_date, schedule.match_time, scheduleConfig?.match_duration || 60, matchStatus,
              dependsOnMatch1Id, dependsOnMatch2Id
            ]
          );

          // Store match for next round dependencies
          knockoutMatchesByRound[roundNumber].push({
            id: matchResult.insertId,
            round: roundNumber,
            roundNumber: knockoutRoundNumber,
            match_number: globalMatchNumber
          });

          globalMatchNumber++;
          knockoutMatches++;

          logger.info(`    Match ${globalMatchNumber - 1}: ID ${matchResult.insertId} (depends: ${dependsOnMatch1Id || 'N/A'}, ${dependsOnMatch2Id || 'N/A'})`);
        }

        knockoutRoundNumber++;
      }
    }

    logger.info(`\nTotal knockout matches: ${knockoutMatches}`);
    logger.info(`========== TOURNAMENT GENERATION COMPLETE ==========\n`);

    return {
      format: 'groups_knockout',
      groups: groupCount,
      group_stage_rounds: totalGroupRounds,
      group_stage_matches: totalGroupMatches,
      qualifiers_per_group: qualifiersPerGroup,
      qualifiers_per_group_array: qualifiersPerGroupArray,
      total_qualifiers: totalQualifiers,
      knockout_bracket_size: knockoutStructure.bracketSize,
      knockout_byes: knockoutStructure.byesNeeded,
      knockout_stage_matches: knockoutMatches,
      total_matches: totalGroupMatches + knockoutMatches,
      participants: participantCount
    };
  });
};

/**
 * Generate standard tournament seeding
 */
const generateStandardSeeding = (size) => {
  if (size === 2) return [1, 2];

  const half = size / 2;
  const upper = generateStandardSeeding(half);
  const lower = upper.map(seed => size + 1 - seed);

  const seeding = [];
  for (let i = 0; i < half; i++) {
    seeding.push(upper[i]);
    seeding.push(lower[i]);
  }

  return seeding;
};

/**
 * Get round name based on number of participants
 * Follows PROFESSIONAL TOURNAMENT NAMING STANDARDS (FIFA/UEFA/BWF/ITF)
 * This is the SINGLE SOURCE OF TRUTH for round names — used by both
 * generateKnockoutBracket and generateDynamicKnockoutStructure
 */
const getRoundNameByParticipants = (participants) => {
  if (participants <= 1) return 'Winner';
  if (participants === 2)  return 'Final';
  if (participants === 4)  return 'Semi Finals';
  if (participants === 8)  return 'Quarter Finals';
  if (participants === 16) return 'Round of 16';
  if (participants === 32) return 'Round of 32';
  if (participants === 64) return 'Round of 64';
  if (participants === 128) return 'Round of 128';

  // For non-power-of-2 counts (dynamic knockout with byes)
  return `Knockout Round (${participants} teams)`;
};

/**
 * FIX #1: getRoundName now delegates to getRoundNameByParticipants()
 * — single source of truth, no divergence between knockout and groups_knockout paths.
 *
 * Example for 8-team bracket (totalRounds=3):
 *   round=1 → participants=8  → "Quarter Finals"
 *   round=2 → participants=4  → "Semi Finals"
 *   round=3 → participants=2  → "Final"
 */
const getRoundName = (round, totalRounds) => {
  const matchesInRound = Math.pow(2, totalRounds - round);
  const participantsThisRound = matchesInRound * 2;
  return getRoundNameByParticipants(participantsThisRound);
};

/**
 * Get tournament info
 */
const getTournamentInfo = async (tournamentId) => {
  const sql = 'SELECT * FROM tournaments WHERE id = ?';
  const tournaments = await query(sql, [tournamentId]);

  if (tournaments.length === 0) {
    throw new Error('Tournament not found');
  }

  return tournaments[0];
};

/**
 * Advance winner to next round (knockout)
 * Uses dependency tracking to correctly place winners
 */
const advanceWinner = async (matchId, winnerId) => {
  return await transaction(async (conn) => {
    logger.info(`\n========== ADVANCE WINNER START ==========`);
    logger.info(`Match ID: ${matchId}`);
    logger.info(`Winner ID: ${winnerId}`);
    
    // Get match details
    const [matchRows] = await conn.query(
      'SELECT * FROM matches WHERE id = ?',
      [matchId]
    );

    const match = matchRows[0];

    if (!match) {
      logger.error(`❌ Match ${matchId} not found in database`);
      throw new Error('Match not found');
    }

    // logger.info(`✅ Match found:`, {
    //   id: match.id,
    //   tournament_id: match.tournament_id,
    //   round_number: match.round_number,
    //   round_name: match.round_name,
    //   participant1_id: match.participant1_id,
    //   participant2_id: match.participant2_id,
    //   winner_participant_id: match.winner_participant_id
    // });

    logger.info(`🏆 Advancing winner ${winnerId} from match ${matchId}`);

    // Find matches that depend on this match
    // logger.info(`\n🔍 Searching for dependent matches...`);
    // logger.info(`Query: SELECT * FROM matches WHERE tournament_id = ${match.tournament_id} AND (depends_on_match1_id = ${matchId} OR depends_on_match2_id = ${matchId})`);
    
    const [dependentMatches] = await conn.query(
      `SELECT * FROM matches 
         WHERE tournament_id = ? 
         AND (depends_on_match1_id = ? OR depends_on_match2_id = ?)`,
      [match.tournament_id, matchId, matchId]
    );

    logger.info(`🔍 Found ${dependentMatches.length} dependent matches`);

    if (!dependentMatches || dependentMatches.length === 0) {
      // This was the final match (no dependent matches)
      logger.info(`✅ Match ${matchId} was the FINAL match. Winner: ${winnerId}`);
      logger.info(`========== ADVANCE WINNER END (NO DEPENDENT MATCHES) ==========\n`);
      return;
    }

    // Update each dependent match
    logger.info(`\n📋 Processing ${dependentMatches.length} dependent match(es)...`);
    
    for (let i = 0; i < dependentMatches.length; i++) {
      const nextMatch = dependentMatches[i];
      logger.info(`\n--- Dependent Match ${i + 1}/${dependentMatches.length} ---`);
      logger.info(`Next Match ID: ${nextMatch.id}`);
      logger.info(`Next Match Round: ${nextMatch.round_name}`);
      logger.info(`Current Participants: P1=${nextMatch.participant1_id}, P2=${nextMatch.participant2_id}`);
      logger.info(`Dependencies: depends_on_match1_id=${nextMatch.depends_on_match1_id}, depends_on_match2_id=${nextMatch.depends_on_match2_id}`);
      
      let field = null;

      logger.info(`🔧 Checking match ${nextMatch.id}: depends_on_match1_id=${nextMatch.depends_on_match1_id} (type: ${typeof nextMatch.depends_on_match1_id}), depends_on_match2_id=${nextMatch.depends_on_match2_id} (type: ${typeof nextMatch.depends_on_match2_id})`);
      logger.info(`🔧 Comparing with matchId=${matchId} (type: ${typeof matchId})`);

      // Determine which participant field to update based on dependency
      // Convert to numbers for comparison
      const match1Dep = nextMatch.depends_on_match1_id ? parseInt(nextMatch.depends_on_match1_id) : null;
      const match2Dep = nextMatch.depends_on_match2_id ? parseInt(nextMatch.depends_on_match2_id) : null;
      const matchIdNum = parseInt(matchId);

      logger.info(`🔧 After conversion: match1Dep=${match1Dep}, match2Dep=${match2Dep}, matchIdNum=${matchIdNum}`);

      if (match1Dep === matchIdNum) {
        field = 'participant1_id';
        logger.info(`🎯 Match! Setting field to participant1_id`);
      } else if (match2Dep === matchIdNum) {
        field = 'participant2_id';
        logger.info(`🎯 Match! Setting field to participant2_id`);
      }

      if (field) {
        // Check if the target field already has a participant (e.g., BYE)
        const currentValue = nextMatch[field];
        logger.info(`Current value of ${field}: ${currentValue}`);

        if (currentValue) {
          logger.info(`⚠️ Field ${field} already occupied with participant ${currentValue}`);
          const alternateField =
            field === 'participant1_id'
              ? 'participant2_id'
              : 'participant1_id';

          if (nextMatch[alternateField]) {
            logger.error(`❌ Both slots already filled! P1=${nextMatch.participant1_id}, P2=${nextMatch.participant2_id}`);
            throw new Error(
              `Match ${nextMatch.id} already has both participant slots filled`
            );
          }

          logger.info(`✅ Using alternate field: ${alternateField}`);
          field = alternateField;
        }

        // Update next match with winner
        logger.info(`\n💾 Executing UPDATE: UPDATE matches SET ${field} = ${winnerId} WHERE id = ${nextMatch.id}`);
        
        await conn.query(
          `UPDATE matches SET ${field} = ? WHERE id = ?`,
          [winnerId, nextMatch.id]
        );

        logger.info(`✅ Successfully advanced winner ${winnerId} from match ${matchId} to match ${nextMatch.id} as ${field}`);
        
        // Verify the update
        const [verifyRows] = await conn.query('SELECT participant1_id, participant2_id FROM matches WHERE id = ?', [nextMatch.id]);
        logger.info(`✅ Verification - Match ${nextMatch.id} now has: P1=${verifyRows[0].participant1_id}, P2=${verifyRows[0].participant2_id}`);
      } else {
        logger.warn(`⚠️ Could not determine field for match ${nextMatch.id} - no matching dependency found`);
      }
    }
    
    logger.info(`\n========== ADVANCE WINNER END (SUCCESS) ==========\n`);
  });
};

/**
 * Update standings after match (round robin)
 * Now uses comprehensive standingsService for enhanced statistics
 */
const updateStandings = async (matchId, winnerId, isDraw = false) => {
  logger.info(`📊 [BRACKET SERVICE] Delegating standings update for match ${matchId}, winner: ${winnerId}, isDraw: ${isDraw}`);

  // Delegate to standingsService for comprehensive updates
  // This now includes: goals, averages, streaks, form guide, positions
  const result = await standingsService.updateStandingsAfterMatch(matchId, winnerId, isDraw);

  logger.info(`✅ [BRACKET SERVICE] Standings update completed for match ${matchId}`);
  return result;
};

/**
 * Recalculate standings positions
 * Kept for backward compatibility - delegates to standingsService
 */
const recalculatePositions = async (tournamentId, groupId = null) => {
  // Use the new comprehensive recalculation
  return await standingsService.recalculateStandings(tournamentId, groupId);
};

/**
 * Finalize group stage and advance qualified teams to knockout
 * Uses DYNAMIC QUALIFICATION based on group size and PROFESSIONAL CROSS-GROUP PAIRINGS
 */
const finalizeGroupStage = async (tournamentId) => {
  return await transaction(async (conn) => {
    try {
      logger.info(`\n========== FINALIZING GROUP STAGE ==========`);
      logger.info(`Tournament ID: ${tournamentId}`);

      // Get tournament info
      const tournament = await getTournamentInfo(tournamentId);

      if (tournament.format_type !== 'groups_knockout') {
        throw new Error('Tournament is not groups+knockout format');
      }

      // Get all groups for this tournament
      const [groups] = await conn.query(
        'SELECT id, group_name FROM tournament_groups WHERE tournament_id = ? ORDER BY group_name',
        [tournamentId]
      );

      if (!groups || groups.length === 0) {
        throw new Error('No groups found for this tournament');
      }

      logger.info(`Found ${groups.length} groups`);

      // Check if all group stage matches are completed
      const [incompleteMatches] = await conn.query(
        `SELECT COUNT(*) as count FROM matches 
         WHERE tournament_id = ? 
         AND group_id IS NOT NULL 
         AND status NOT IN ('completed', 'cancelled')`,
        [tournamentId]
      );

      if (incompleteMatches[0].count > 0) {
        throw new Error(`Cannot finalize: ${incompleteMatches[0].count} group stage matches are still pending`);
      }

      // Calculate group size to determine qualification rule
      const [participantCount] = await conn.query(
        `SELECT COUNT(DISTINCT participant_id) as count 
         FROM tournament_standings 
         WHERE tournament_id = ?`,
        [tournamentId]
      );

      // STEP 1: Collect all group sizes first (PROFESSIONAL RULE)
      logger.info(`\n========== PROFESSIONAL QUALIFICATION ANALYSIS ==========`);

      // CRITICAL: Validate minimum knockout viability
      const [totalParticipantCount] = await conn.query(
        `SELECT COUNT(DISTINCT participant_id) as count FROM tournament_standings WHERE tournament_id = ?`,
        [tournamentId]
      );

      if (totalParticipantCount[0].count < 2) {
        throw new Error(`Cannot finalize: Tournament has less than 2 participants`);
      }

      const groupSizeMap = new Map();
      for (const group of groups) {
        const [groupSizeResult] = await conn.query(
          `SELECT COUNT(*) as size FROM tournament_standings WHERE tournament_id = ? AND group_id = ?`,
          [tournamentId, group.id]
        );
        groupSizeMap.set(group.id, groupSizeResult[0].size);
      }

      const allGroupSizes = Array.from(groupSizeMap.values());
      const groupsAreEqual = areGroupsEqual(allGroupSizes);

      logger.info(`Group Analysis:`);
      logger.info(`  Total groups: ${groups.length}`);
      logger.info(`  Group sizes: ${allGroupSizes.join(', ')}`);
      logger.info(`  All groups equal: ${groupsAreEqual}`);

      // STEP 2: Calculate qualifiers using professional rules
      const allQualifiers = [];
      const qualifiersPerGroupArray = [];

      logger.info(`\nQualification Rule (Professional Standards):`);

      if (groupsAreEqual) {
        // PRIORITY 1: All groups have same size → same qualifiers for all
        const standardGroupSize = allGroupSizes[0];
        const standardQualifiers = calculateQualificationPerGroup(
          standardGroupSize, groups.length, participantCount[0].count, allGroupSizes
        );

        logger.info(`  ✓ Equal groups: ${standardGroupSize} teams per group`);
        logger.info(`  ✓ Standard qualifiers: ${standardQualifiers} from each group`);
        logger.info(``);

        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
          const group = groups[groupIndex];
          qualifiersPerGroupArray.push(standardQualifiers);

          logger.info(`Processing ${group.group_name}:`);

          // Get top N participants from this group
          const [topParticipants] = await conn.query(
            `SELECT ts.participant_id, ts.position, ts.points, ts.matches_won, 
                    ts.matches_lost, ts.goal_difference, ts.goals_for, 
                    ts.sets_won, ts.sets_lost, ts.set_ratio, tg.group_name
             FROM tournament_standings ts
             JOIN tournament_groups tg ON ts.group_id = tg.id
             WHERE ts.tournament_id = ? AND ts.group_id = ?
             ORDER BY ts.position ASC
             LIMIT ?`,
            [tournamentId, group.id, standardQualifiers]
          );

          if (!topParticipants || topParticipants.length < 1) {
            throw new Error(`Group ${group.group_name} does not have any participants in standings`);
          }

          // Add all qualifiers from this group
          for (let rank = 0; rank < topParticipants.length; rank++) {
            const participant = topParticipants[rank];
            allQualifiers.push({
              groupId: group.id,
              groupIndex: groupIndex,
              groupName: group.group_name,
              participantId: participant.participant_id,
              rank: rank + 1,
              position: participant.position,
              points: participant.points,
              goalDifference: participant.goal_difference,
              goalsFor: participant.goals_for,
              setsWon: participant.sets_won,
              setsLost: participant.sets_lost,
              setRatio: participant.set_ratio
            });

            logger.info(`  Rank ${rank + 1}: Participant ${participant.participant_id} (${participant.points} pts, SR: ${participant.set_ratio}, SW: ${participant.sets_won})`);
          }
        }
      } else {
        // PRIORITY 2: Unequal groups → proportional qualifiers
        logger.info(`  ⚠ Unequal groups detected - using proportional qualification`);
        logger.info(``);

        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
          const group = groups[groupIndex];
          const groupSize = groupSizeMap.get(group.id);

          const qualifiersForThisGroup = calculateQualificationPerGroup(
            groupSize, groups.length, participantCount[0].count, allGroupSizes
          );

          qualifiersPerGroupArray.push(qualifiersForThisGroup);

          logger.info(`Processing ${group.group_name}:`);
          logger.info(`  Group size: ${groupSize}, Qualifiers: ${qualifiersForThisGroup}`);

          // Get top N participants from this group
          const [topParticipants] = await conn.query(
            `SELECT ts.participant_id, ts.position, ts.points, ts.matches_won, 
                    ts.matches_lost, ts.goal_difference, ts.goals_for,
                    ts.sets_won, ts.sets_lost, ts.set_ratio, tg.group_name
             FROM tournament_standings ts
             JOIN tournament_groups tg ON ts.group_id = tg.id
             WHERE ts.tournament_id = ? AND ts.group_id = ?
             ORDER BY ts.position ASC
             LIMIT ?`,
            [tournamentId, group.id, qualifiersForThisGroup]
          );

          if (!topParticipants || topParticipants.length < 1) {
            throw new Error(`Group ${group.group_name} does not have any participants in standings`);
          }

          // Add all qualifiers from this group
          for (let rank = 0; rank < topParticipants.length; rank++) {
            const participant = topParticipants[rank];
            allQualifiers.push({
              groupId: group.id,
              groupIndex: groupIndex,
              groupName: group.group_name,
              participantId: participant.participant_id,
              rank: rank + 1,
              position: participant.position,
              points: participant.points,
              goalDifference: participant.goal_difference,
              goalsFor: participant.goals_for,
              setsWon: participant.sets_won,
              setsLost: participant.sets_lost,
              setRatio: participant.set_ratio
            });

            logger.info(`  Rank ${rank + 1}: Participant ${participant.participant_id} (${participant.points} pts, SR: ${participant.set_ratio}, SW: ${participant.sets_won})`);
          }
        }
      }

      logger.info(`\nTotal qualified teams: ${allQualifiers.length}`);

      // CRITICAL: Validate minimum knockout viability
      if (allQualifiers.length < 2) {
        logger.error(`\n❌ CANNOT FINALIZE: Only ${allQualifiers.length} team(s) qualified`);
        logger.error(`❌ Minimum 2 teams required for knockout stage`);
        throw new Error(`Cannot finalize group stage: Only ${allQualifiers.length} team(s) qualified. Minimum 2 teams required for knockout.`);
      }

      logger.info(`✓ Knockout viable: ${allQualifiers.length} teams qualified`);

      // For backward compatibility, calculate average qualifiers per group
      const qualifiersPerGroup = Math.round(allQualifiers.length / groups.length);

      // STEP 3: Generate professional cross-group pairings
      logger.info(`\n========== CROSS-GROUP PAIRINGS ==========`);
      const pairings = generateCrossGroupPairings(allQualifiers, groups.length);

      logger.info(`Generated ${pairings.length} pairings:`);
      pairings.forEach((pairing, idx) => {
        logger.info(`  Pairing ${idx + 1}: ${pairing.p1.groupName} Rank ${pairing.p1.rank} vs ${pairing.p2.groupName} Rank ${pairing.p2.rank}`);
      });

      // Get knockout stage matches (group_id IS NULL)
      const [knockoutMatches] = await conn.query(
        `SELECT id, round_number, match_number, round_name 
         FROM matches 
         WHERE tournament_id = ? 
         AND group_id IS NULL
         ORDER BY round_number ASC, match_number ASC`,
        [tournamentId]
      );

      if (!knockoutMatches || knockoutMatches.length === 0) {
        throw new Error('No knockout stage matches found');
      }

      logger.info(`\nFound ${knockoutMatches.length} knockout matches`);

      // Find the first knockout round (minimum round_number)
      const firstKnockoutRound = Math.min(...knockoutMatches.map(m => m.round_number));
      logger.info(`First knockout round number: ${firstKnockoutRound}`);

      // Populate first round of knockout with cross-group pairings
      const firstRoundKnockout = knockoutMatches.filter(m => m.round_number === firstKnockoutRound);

      if (firstRoundKnockout.length === 0) {
        throw new Error('No first round knockout matches found');
      }

      logger.info(`\nPopulating ${firstRoundKnockout.length} first round knockout matches...`);

      // STEP 4: Calculate byes and assign matches professionally
      const knockoutBracketSize = Math.pow(2, Math.ceil(Math.log2(allQualifiers.length)));
      const byesNeeded = knockoutBracketSize - allQualifiers.length;

      logger.info(`\n========== KNOCKOUT BRACKET ASSIGNMENT ==========`);
      logger.info(`Knockout bracket size: ${knockoutBracketSize}`);
      logger.info(`Total qualifiers: ${allQualifiers.length}`);
      logger.info(`Byes needed: ${byesNeeded}`);
      logger.info(`Actual matches in round 1: ${pairings.length}`);

      let matchIndex = 0;
      let byesAssigned = 0;

      // PROFESSIONAL BYE HANDLING
      // Top-seeded teams get byes and advance directly to round 2
      if (byesNeeded > 0) {
        logger.info(`\n--- Assigning ${byesNeeded} BYEs to Top Seeds ---`);

        // Sort qualifiers by performance (points, then goal difference)
        const sortedQualifiers = [...allQualifiers].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });

        // Assign top teams to round 2 matches
        const round2Matches = knockoutMatches.filter(m => m.round_number === firstKnockoutRound + 1);

        for (let i = 0; i < byesNeeded && i < sortedQualifiers.length; i++) {
          const byeTeam = sortedQualifiers[i];

          if (round2Matches && round2Matches[byesAssigned]) {
            const round2Match = round2Matches[byesAssigned];

            // Assign bye team to participant2 of round 2 match
            // Winner from round 1 will go to participant1 via depends_on_match1_id
            await conn.query(
              'UPDATE matches SET participant2_id = ? WHERE id = ?',
              [byeTeam.participantId, round2Match.id]
            );

            logger.info(`  BYE ${i + 1}: ${byeTeam.groupName} Rank ${byeTeam.rank} (ID: ${byeTeam.participantId}) → Round 2 Match ${round2Match.match_number}`);
            logger.info(`         (${byeTeam.points} pts, GD: ${byeTeam.goalDifference})`);
            byesAssigned++;
          }
        }

        logger.info(`✓ ${byesAssigned} BYEs assigned successfully`);
      }

      // STEP 5: Assign actual first-round matches
      logger.info(`\n--- Assigning ${pairings.length} First Round Matches ---`);

      for (const pairing of pairings) {
        if (matchIndex >= firstRoundKnockout.length) {
          logger.warn(`⚠ More pairings (${pairings.length}) than available matches (${firstRoundKnockout.length})`);
          break;
        }

        const match = firstRoundKnockout[matchIndex];

        // Update match with both participants and set status to scheduled
        await conn.query(
          'UPDATE matches SET participant1_id = ?, participant2_id = ?, status = ? WHERE id = ?',
          [pairing.p1.participantId, pairing.p2.participantId, 'scheduled', match.id]
        );

        logger.info(`  Match ${matchIndex + 1} (ID: ${match.id}):`);
        logger.info(`    ${pairing.p1.groupName} Rank ${pairing.p1.rank} (${pairing.p1.participantId})`);
        logger.info(`    vs`);
        logger.info(`    ${pairing.p2.groupName} Rank ${pairing.p2.rank} (${pairing.p2.participantId})`);

        matchIndex++;
      }

      logger.info(`✓ ${matchIndex} matches assigned successfully`);

      // STEP 6: Mark remaining first-round matches as TBD (if any)
      const remainingFirstRoundMatches = firstRoundKnockout.length - matchIndex;
      if (remainingFirstRoundMatches > 0) {
        logger.info(`\n⚠ ${remainingFirstRoundMatches} first-round matches remain as TBD (no participants assigned)`);
      }

      logger.info(`\n========== GROUP STAGE FINALIZED ==========`);
      logger.info(`Groups: ${groups.length}`);
      logger.info(`Qualifiers per group: ${qualifiersPerGroup}`);
      logger.info(`Total qualifiers: ${allQualifiers.length}`);
      logger.info(`Byes assigned: ${byesAssigned}`);
      logger.info(`Knockout matches populated: ${matchIndex}`);
      logger.info(`===========================================\n`);

      return {
        success: true,
        groups: groups.length,
        qualifiersPerGroup: qualifiersPerGroup,
        totalQualifiers: allQualifiers.length,
        knockoutBracketSize: knockoutBracketSize,
        byesAssigned: byesAssigned,
        knockoutMatchesPopulated: matchIndex,
        qualifierDetails: allQualifiers,
        pairings: pairings
      };

    } catch (error) {
      logger.error('Finalize group stage error:', error);
      throw error;
    }
  });
};

/**
 * Check if group stage is complete and ready to finalize
 */
const isGroupStageComplete = async (tournamentId) => {
  try {
    const tournament = await getTournamentInfo(tournamentId);

    if (tournament.format_type !== 'groups_knockout') {
      return false;
    }

    // Check if all group stage matches are completed
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM matches 
       WHERE tournament_id = ? AND group_id IS NOT NULL`,
      [tournamentId]
    );

    if (!result || result.length === 0) {
      return false;
    }

    const { total, completed } = result[0];

    // Convert to numbers to ensure proper comparison (completed can be string from SUM)
    const totalNum = parseInt(total);
    const completedNum = parseInt(completed);

    logger.info(`Group stage check: ${completedNum}/${totalNum} matches completed`);

    return totalNum > 0 && totalNum === completedNum;
  } catch (error) {
    logger.error('Check group stage complete error:', error);
    return false;
  }
};

/**
 * Get participant details based on tournament category
 * Returns formatted participant information for display
 */
const getParticipantDetails = async (tournamentId, participantId) => {
  try {
    const tournament = await getTournamentInfo(tournamentId);

    switch (tournament.category) {
      case 'singles':
        // Get player details from tournament_registrations
        const players = await query(`
          SELECT 
            tr.id,
            tr.user_id,
            u.first_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as name,
            u.profile_image,
            us.skill_level
          FROM tournament_registrations tr
          JOIN users u ON tr.user_id = u.id
          LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
          WHERE tr.id = ? AND tr.status = 'locked'
        `, [tournament.sport_id, participantId]);
        return players[0] || null;

      case 'doubles':
      case 'pairs':
        // Get pair details
        const pairs = await query(`
          SELECT 
            p.id,
            p.name,
            p.player1_id,
            p.player2_id,
            CONCAT(u1.first_name, ' ', u1.last_name) as player1_name,
            CONCAT(u2.first_name, ' ', u2.last_name) as player2_name,
            u1.profile_image as player1_image,
            u2.profile_image as player2_image
          FROM pairs p
          JOIN users u1 ON p.player1_id = u1.id
          JOIN users u2 ON p.player2_id = u2.id
          WHERE p.id = ? AND p.status = 'locked'
        `, [participantId]);
        return pairs[0] || null;

      case 'teams':
        // Get team details with member count
        const teams = await query(`
          SELECT 
            t.id,
            t.name,
            t.logo,
            t.captain_id,
            CONCAT(u.first_name, ' ', u.last_name) as captain_name,
            COUNT(tm.id) as member_count
          FROM teams t
          JOIN users u ON t.captain_id = u.id
          LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
          WHERE t.id = ? AND t.status = 'locked'
          GROUP BY t.id
        `, [participantId]);
        return teams[0] || null;

      default:
        throw new Error(`Unknown tournament category: ${tournament.category}`);
    }
  } catch (error) {
    logger.error('Get participant details error:', error);
    throw error;
  }
};

/**
 * Format match with participant details for display
 */
const formatMatchForDisplay = async (match) => {
  try {
    const tournament = await getTournamentInfo(match.tournament_id);

    // Get participant1 details
    const participant1 = match.participant1_id
      ? await getParticipantDetails(match.tournament_id, match.participant1_id)
      : null;

    // Get participant2 details
    const participant2 = match.participant2_id
      ? await getParticipantDetails(match.tournament_id, match.participant2_id)
      : null;

    return {
      ...match,
      participant1,
      participant2,
      category: tournament.category,
      format_type: tournament.format_type
    };
  } catch (error) {
    logger.error('Format match for display error:', error);
    throw error;
  }
};

/**
 * Preview matches before generation
 * Returns exact match structure that will be created without saving to database
 * Uses same logic as actual bracket generation for 100% accuracy
 */
const previewMatches = async (tournamentId, participants, scheduleConfig = null) => {
  try {
    const tournament = await getTournamentInfo(tournamentId);
    
    logger.info(`🔍 Generating match preview for tournament ${tournamentId}, format: ${tournament.format_type}`);
    logger.info(`📊 Participants: ${participants.length}, Schedule config:`, scheduleConfig);

    const matchups = [];
    let matchNumber = 1;

    switch (tournament.format_type) {
      case 'knockout':
        return previewKnockoutMatches(participants, matchNumber);

      case 'round_robin':
      case 'league':
        return previewRoundRobinMatches(participants, matchNumber);

      case 'groups_knockout':
        return await previewGroupsKnockoutMatches(tournamentId, participants, scheduleConfig, matchNumber);

      default:
        throw new Error(`Unsupported format type: ${tournament.format_type}`);
    }
  } catch (error) {
    logger.error('Preview matches error:', error);
    throw error;
  }
};

/**
 * Preview knockout matches
 */
const previewKnockoutMatches = (participants, startMatchNumber) => {
  const count = participants.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(count)));
  const totalRounds = Math.log2(bracketSize);
  const byesNeeded = bracketSize - count;

  logger.info(`🥊 Knockout preview: ${count} participants, ${bracketSize} bracket size, ${byesNeeded} byes`);

  // Generate standard seeding
  const seeding = generateStandardSeeding(bracketSize);
  
  // Create bracket positions
  const bracketPositions = new Array(bracketSize).fill(null);
  for (let i = 0; i < count; i++) {
    const seedPosition = seeding.indexOf(i + 1);
    bracketPositions[seedPosition] = participants[i];
  }

  const matchups = [];
  let matchNumber = startMatchNumber;

  // Round 1: Create matches with actual participants or show byes
  for (let i = 0; i < bracketSize / 2; i++) {
    const participant1 = bracketPositions[i * 2];
    const participant2 = bracketPositions[i * 2 + 1];
    
    // Show match if both participants exist
    if (participant1 && participant2) {
      matchups.push({
        id: matchNumber++,
        participant1,
        participant2,
        round: 1,
        roundName: getRoundName(1, totalRounds)
      });
    }
  }

  // Round 2+: Create placeholder matches with bye participants pre-filled
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    
    for (let i = 0; i < matchesInRound; i++) {
      let participant1 = null;
      let participant2 = null;
      
      // For Round 2, check if participants got byes
      if (round === 2) {
        const pos1Index = i * 4;
        const pos2Index = i * 4 + 2;
        
        if (pos1Index < bracketPositions.length && pos2Index < bracketPositions.length) {
          const pos1 = bracketPositions[pos1Index];
          const pos2 = bracketPositions[pos1Index + 1];
          const pos3 = bracketPositions[pos2Index];
          const pos4 = bracketPositions[pos2Index + 1];
          
          // Check if pos1 got a bye
          if (pos1 && !pos2) {
            participant1 = { ...pos1, isBye: true };
          }
          
          // Check if pos3 got a bye
          if (pos3 && !pos4) {
            participant2 = { ...pos3, isBye: true };
          }
        }
      }
      
      matchups.push({
        id: matchNumber++,
        participant1,
        participant2,
        round,
        roundName: getRoundName(round, totalRounds)
      });
    }
  }

  return {
    format: 'knockout',
    totalMatches: matchups.length,
    totalRounds,
    bracketSize,
    byes: byesNeeded,
    matchups
  };
};

/**
 * Preview round robin matches
 */
const previewRoundRobinMatches = (participants, startMatchNumber) => {
  const count = participants.length;
  const matchups = [];
  let matchNumber = startMatchNumber;

  logger.info(`🔄 Round Robin preview: ${count} participants`);

  // Generate all possible matches (each participant plays every other participant once)
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      matchups.push({
        id: matchNumber++,
        participant1: participants[i],
        participant2: participants[j],
        round: 1,
        roundName: 'Round Robin'
      });
    }
  }

  return {
    format: 'round_robin',
    totalMatches: matchups.length,
    matchups
  };
};

/**
 * Preview groups + knockout matches
 * Uses SAME LOGIC as generateGroupsKnockoutBracket for 100% accuracy
 */
const previewGroupsKnockoutMatches = async (tournamentId, participants, scheduleConfig, startMatchNumber) => {
  const count = participants.length;
  const matchups = [];
  let matchNumber = startMatchNumber;

  logger.info(`🏆 Groups + Knockout preview: ${count} participants`);

  // Check if custom groups exist
  logger.info(`🔍 Checking for custom groups in tournament ${tournamentId}...`);
  const existingGroups = await query(
    'SELECT id, group_name FROM tournament_groups WHERE tournament_id = ? ORDER BY display_order ASC, group_name ASC',
    [tournamentId]
  );

  logger.info(`📋 Query result: ${existingGroups ? existingGroups.length : 0} groups found`);
  if (existingGroups && existingGroups.length > 0) {
    logger.info(`   Groups: ${existingGroups.map(g => g.group_name).join(', ')}`);
  }

  let groups = [];
  let useCustomGroups = false;

  if (existingGroups && existingGroups.length > 0) {
    // Custom groups exist - use them
    useCustomGroups = true;
    logger.info(`📋 Using ${existingGroups.length} custom groups`);

    for (const group of existingGroups) {
      const groupParticipants = await query(
        'SELECT participant_id FROM group_participants WHERE group_id = ? ORDER BY position ASC',
        [group.id]
      );

      logger.info(`📋 Group ${group.group_name}: ${groupParticipants.length} participants in DB`);

      const participantsList = [];
      for (const gp of groupParticipants) {
        // Match by participant_id (the registration ID, not team/player ID)
        const participantDetails = participants.find(p => 
          p.participant_id === gp.participant_id || p.id === gp.participant_id
        );
        if (participantDetails) {
          participantsList.push(participantDetails);
        } else {
          logger.warn(`⚠️ Could not find participant ${gp.participant_id} in participants list`);
        }
      }

      logger.info(`✅ Group ${group.group_name}: ${participantsList.length} participants matched`);

      groups.push({
        id: group.id,
        name: group.group_name,
        participants: participantsList
      });
    }
  } else {
    // Auto-generate groups
    useCustomGroups = false;
    const groupSize = scheduleConfig?.group_size || 4;
    const groupCount = Math.ceil(count / groupSize);

    logger.info(`🔧 Auto-generating ${groupCount} groups (size: ${groupSize})`);

    const autoGroups = Array.from({ length: groupCount }, () => []);
    
    // Distribute participants across groups (snake seeding)
    for (let i = 0; i < count; i++) {
      const groupIndex = i % groupCount;
      autoGroups[groupIndex].push(participants[i]);
    }
    
    groups = autoGroups.map((group, index) => ({
      name: `Group ${String.fromCharCode(65 + index)}`,
      participants: group
    }));
  }

  // Generate round robin within each group
  groups.forEach((group) => {
    const groupName = group.name;
    const groupParticipants = group.participants;
    
    for (let i = 0; i < groupParticipants.length; i++) {
      for (let j = i + 1; j < groupParticipants.length; j++) {
        matchups.push({
          id: matchNumber++,
          participant1: groupParticipants[i],
          participant2: groupParticipants[j],
          round: 1,
          roundName: `${groupName} - Round Robin`,
          groupName: groupName,
          isKnockout: false
        });
      }
    }
  });

  const groupStageMatches = matchups.length;

  // Calculate qualifiers using SAME LOGIC as backend
  const allGroupSizes = groups.map(g => g.participants.length);
  const groupsAreEqual = areGroupsEqual(allGroupSizes);
  
  let totalQualifiers = 0;
  const qualifiersPerGroupArray = [];

  logger.info(`\n📊 Qualification Analysis:`);
  logger.info(`  Group sizes: ${allGroupSizes.join(', ')}`);
  logger.info(`  All groups equal: ${groupsAreEqual}`);

  if (groupsAreEqual) {
    // PRIORITY 1: All groups have same size → same qualifiers for all
    const standardGroupSize = allGroupSizes[0];
    const standardQualifiers = calculateQualificationPerGroup(
      standardGroupSize, 
      groups.length, 
      count, 
      allGroupSizes, 
      scheduleConfig?.qualifiers_per_group
    );

    logger.info(`  ✓ Equal groups: ${standardGroupSize} teams per group`);
    logger.info(`  ✓ Standard qualifiers: ${standardQualifiers} from each group`);

    for (const group of groups) {
      qualifiersPerGroupArray.push(standardQualifiers);
      totalQualifiers += standardQualifiers;
      logger.info(`  ${group.name}: ${standardGroupSize} teams → ${standardQualifiers} qualifiers`);
    }
  } else {
    // PRIORITY 2: Unequal groups → proportional qualifiers
    logger.info(`  ⚠ Unequal groups - using proportional qualification`);

    for (const group of groups) {
      const groupSize = group.participants.length;
      const qualifiersForThisGroup = calculateQualificationPerGroup(
        groupSize, 
        groups.length, 
        count, 
        allGroupSizes, 
        scheduleConfig?.qualifiers_per_group
      );

      totalQualifiers += qualifiersForThisGroup;
      qualifiersPerGroupArray.push(qualifiersForThisGroup);
      logger.info(`  ${group.name}: ${groupSize} teams → ${qualifiersForThisGroup} qualifiers`);
    }
  }

  logger.info(`\n🎯 Total qualifiers: ${totalQualifiers}`);

  // Generate knockout stage placeholder matches using dynamic structure
  const knockoutStructure = generateDynamicKnockoutStructure(totalQualifiers);

  logger.info(`🥊 Knockout structure:`);
  logger.info(`  Bracket size: ${knockoutStructure.bracketSize}`);
  logger.info(`  Byes needed: ${knockoutStructure.byesNeeded}`);
  logger.info(`  Total rounds: ${knockoutStructure.totalRounds}`);
  logger.info(`  Total matches: ${knockoutStructure.totalMatches}`);

  // Generate knockout matches
  for (const roundInfo of knockoutStructure.rounds) {
    const { roundNumber, matchesInRound, roundName } = roundInfo;
    
    for (let i = 0; i < matchesInRound; i++) {
      matchups.push({
        id: matchNumber++,
        participant1: null, // TBD - will be filled after group stage
        participant2: null, // TBD - will be filled after group stage
        round: roundNumber,
        roundName: `Knockout - ${roundName}`,
        isKnockout: true
      });
    }
  }

  return {
    format: 'groups_knockout',
    totalMatches: matchups.length,
    groupStageMatches,
    knockoutMatches: knockoutStructure.totalMatches,
    groups: groups.length,
    totalQualifiers,
    qualifiersPerGroup: qualifiersPerGroupArray,
    knockoutBracketSize: knockoutStructure.bracketSize,
    knockoutByes: knockoutStructure.byesNeeded,
    matchups
  };
};

module.exports = {
  generateBrackets,
  generateKnockoutBracket,
  generateRoundRobinBracket,
  generateGroupsKnockoutBracket,
  generateStandardSeeding,
  getRoundName,
  getRoundNameByParticipants,
  getTournamentInfo,
  advanceWinner,
  updateStandings,
  recalculatePositions,
  finalizeGroupStage,
  isGroupStageComplete,
  getParticipantDetails,
  formatMatchForDisplay,
  previewMatches
};

// const { query, transaction } = require('../config/database');
// const logger = require('../utils/logger');
// const standingsService = require('./standingsService');
// const { calculateMatchSchedule, getMatchStatus } = require('../utils/scheduleCalculator');

// /**
//  * Helper: Get bye winner from two bracket positions
//  * Handles both directions of bye scenarios
//  */
// const getByeWinner = (pos1, pos2) => {
//   if (pos1?.participant_id && !pos2?.participant_id) {
//     return pos1.participant_id;
//   }

//   if (!pos1?.participant_id && pos2?.participant_id) {
//     return pos2.participant_id;
//   }

//   return null;
// };

// /**
//  * Generate tournament brackets based on format
//  */
// const generateBrackets = async (tournamentId, participants, scheduleConfig = null) => {
//   const tournament = await getTournamentInfo(tournamentId);

//   switch (tournament.format_type) {
//     case 'knockout':
//       return await generateKnockoutBracket(tournamentId, participants, scheduleConfig);
//     case 'round_robin':
//       return await generateRoundRobinBracket(tournamentId, participants, scheduleConfig);
//     case 'league':
//       // League format is same as round robin (everyone plays everyone once)
//       return await generateRoundRobinBracket(tournamentId, participants, scheduleConfig);
//     case 'groups_knockout':
//       return await generateGroupsKnockoutBracket(tournamentId, participants, scheduleConfig);
//     default:
//       throw new Error(`Unsupported format type: ${tournament.format_type}`);
//   }
// };

// /**
//  * Generate knockout bracket
//  */
// const generateKnockoutBracket = async (tournamentId, participants, scheduleConfig = null) => {
//   const participantCount = participants.length;

//   // Find next power of 2
//   const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantCount)));
//   const byesNeeded = bracketSize - participantCount;

//   logger.info(`🚀 ========== KNOCKOUT BRACKET GENERATION WITH DEPENDENCIES ========== 🚀`);
//   logger.info(`Generating knockout bracket: ${participantCount} participants, ${bracketSize} bracket size, ${byesNeeded} byes`);
//   logger.info(`Participants structure:`, JSON.stringify(participants.slice(0, 2)));
//   if (scheduleConfig) {
//     logger.info(`Schedule config:`, JSON.stringify(scheduleConfig));
//   }

//   return await transaction(async (conn) => {
//     // Clear existing data - order matters for foreign key constraints
//     await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
//     await conn.query('DELETE FROM tournament_brackets WHERE tournament_id = ?', [tournamentId]);

//     // Calculate number of rounds
//     const totalRounds = Math.log2(bracketSize);

//     // Calculate total matches across all rounds
//     const totalMatches = bracketSize - 1; // For knockout: total matches = participants - 1

//     // Match index counter for scheduling
//     let currentMatchIndex = 0;

//     // Create bracket positions for first round
//     const bracketPositions = [];
//     for (let i = 0; i < bracketSize; i++) {
//       bracketPositions.push({
//         tournament_id: tournamentId,
//         bracket_type: 'main',
//         round_number: 1,
//         position_number: i + 1,
//         participant_id: null,
//         seed_number: null,
//         status: 'waiting'
//       });
//     }

//     // Assign participants using standard seeding
//     const seeding = generateStandardSeeding(bracketSize);

//     for (let i = 0; i < participantCount; i++) {
//       const participant = participants[i];
//       const seedPosition = seeding.indexOf(i + 1);

//       // Handle both id and participant_id fields (for seeded vs non-seeded participants)
//       const participantId = participant.participant_id || participant.id;

//       bracketPositions[seedPosition].participant_id = participantId;
//       bracketPositions[seedPosition].seed_number = participant.seed_number || (i + 1);
//       bracketPositions[seedPosition].status = 'active';

//       logger.info(`Assigned participant ${participantId} to seed position ${seedPosition + 1}`);
//     }

//     // Insert bracket positions
//     for (const position of bracketPositions) {
//       await conn.query(
//         `INSERT INTO tournament_brackets 
//            (tournament_id, bracket_type, round_number, position_number, participant_id, seed_number, status)
//            VALUES (?, ?, ?, ?, ?, ?, ?)`,
//         [
//           position.tournament_id,
//           position.bracket_type,
//           position.round_number,
//           position.position_number,
//           position.participant_id,
//           position.seed_number,
//           position.status
//         ]
//       );
//     }

//     // Create first round matches with schedule
//     // Track matches by round for dependency linking
//     const matchesByRound = {};
//     matchesByRound[1] = [];

//     // Global match counter for sequential numbering across tournament
//     let globalMatchNumber = 1;

//     for (let i = 0; i < bracketSize / 2; i++) {
//       const pos1 = bracketPositions[i * 2];
//       const pos2 = bracketPositions[i * 2 + 1];

//       // Only create match if both participants exist (no bye)
//       if (pos1.participant_id && pos2.participant_id) {
//         const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);
//         const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

//         const [matchResult] = await conn.query(
//           `INSERT INTO matches 
//              (tournament_id, round_number, match_number, round_name, participant1_id, participant2_id, 
//               match_date, match_time, estimated_duration, status)
//              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             tournamentId, 1, globalMatchNumber, 'Round 1', pos1.participant_id, pos2.participant_id,
//             schedule.match_date, schedule.match_time, scheduleConfig?.match_duration || 60, matchStatus
//           ]
//         );

//         const matchId = matchResult.insertId;
//         logger.info(`✅ Created Round 1 Match ${globalMatchNumber} with ID ${matchId}`);

//         matchesByRound[1].push({
//           id: matchId,
//           round: 1,
//           match_number: globalMatchNumber,
//           participant1: pos1.participant_id,
//           participant2: pos2.participant_id,
//           match_date: schedule.match_date,
//           match_time: schedule.match_time
//         });

//         globalMatchNumber++;
//       } else if (pos1.participant_id && !pos2.participant_id) {
//         // Participant 1 gets a bye - store null to maintain position
//         matchesByRound[1].push(null);
//         logger.info(`Participant ${pos1.participant_id} receives a bye in round 1`);
//       } else if (!pos1.participant_id && pos2.participant_id) {
//         // Participant 2 gets a bye - store null to maintain position
//         matchesByRound[1].push(null);
//         logger.info(`Participant ${pos2.participant_id} receives a bye in round 1`);
//       } else {
//         // Both empty - store null
//         matchesByRound[1].push(null);
//       }
//     }

//     // Create matches for subsequent rounds with dependencies
//     logger.info(`🔧 Round 1 complete. matchesByRound[1] has ${matchesByRound[1].length} elements`);
//     logger.info(`🔧 matchesByRound[1]:`, JSON.stringify(matchesByRound[1].map(m => m ? m.id : 'null')));
//     logger.info(`🔧 Creating matches for rounds 2 to ${totalRounds} with dependencies`);

//     for (let round = 2; round <= totalRounds; round++) {
//       const matchesInRound = Math.pow(2, totalRounds - round);
//       const roundName = getRoundName(round, totalRounds);
//       matchesByRound[round] = [];

//       logger.info(`🔧 Round ${round} (${roundName}): Creating ${matchesInRound} matches`);

//       for (let i = 0; i < matchesInRound; i++) {
//         const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);

//         let participant1Id = null;
//         let participant2Id = null;
//         let dependsOnMatch1Id = null;
//         let dependsOnMatch2Id = null;

//         // Calculate which previous round matches feed into this match
//         const prevRoundMatch1Index = i * 2;
//         const prevRoundMatch2Index = i * 2 + 1;

//         logger.info(`🔧 Round ${round} Match ${i + 1}: Looking for dependencies at indexes ${prevRoundMatch1Index}, ${prevRoundMatch2Index}`);

//         // Get previous round matches (could be null if bye)
//         const prevMatch1 = matchesByRound[round - 1][prevRoundMatch1Index];
//         const prevMatch2 = matchesByRound[round - 1][prevRoundMatch2Index];

//         // Set dependencies
//         if (prevMatch1) {
//           dependsOnMatch1Id = prevMatch1.id;
//           logger.info(`🔧 Round ${round} Match ${i + 1}: depends_on_match1_id = ${dependsOnMatch1Id}`);
//         } else {
//           logger.info(`🔧 Round ${round} Match ${i + 1}: No prevMatch1 (checking for bye)`);
//           // Check if there was a bye in round 1
//           if (round === 2) {
//             const pos1Index = prevRoundMatch1Index * 2;
//             const pos2Index = pos1Index + 1;
//             if (pos1Index < bracketPositions.length && pos2Index < bracketPositions.length) {
//               const pos1 = bracketPositions[pos1Index];
//               const pos2 = bracketPositions[pos2Index];
//               const byeWinner = getByeWinner(pos1, pos2);
//               if (byeWinner) {
//                 participant1Id = byeWinner;
//                 logger.info(`🔧 Round ${round} Match ${i + 1}: Participant ${participant1Id} advanced via bye`);
//               }
//             }
//           }
//         }

//         if (prevMatch2) {
//           dependsOnMatch2Id = prevMatch2.id;
//           logger.info(`🔧 Round ${round} Match ${i + 1}: depends_on_match2_id = ${dependsOnMatch2Id}`);
//         } else {
//           logger.info(`🔧 Round ${round} Match ${i + 1}: No prevMatch2 (checking for bye)`);
//           // Check if there was a bye in round 1
//           if (round === 2) {
//             const pos1Index = prevRoundMatch2Index * 2;
//             const pos2Index = pos1Index + 1;
//             if (pos1Index < bracketPositions.length && pos2Index < bracketPositions.length) {
//               const pos1 = bracketPositions[pos1Index];
//               const pos2 = bracketPositions[pos2Index];
//               const byeWinner = getByeWinner(pos1, pos2);
//               if (byeWinner) {
//                 participant2Id = byeWinner;
//                 logger.info(`🔧 Round ${round} Match ${i + 1}: Participant ${participant2Id} advanced via bye`);
//               }
//             }
//           }
//         }

//         // Create match with dependencies
//         const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

//         logger.info(`🔧 Inserting Round ${round} Match ${i + 1} with dependencies: ${dependsOnMatch1Id}, ${dependsOnMatch2Id}`);

//         const [matchResult] = await conn.query(
//           `INSERT INTO matches 
//              (tournament_id, round_number, match_number, round_name, participant1_id, participant2_id, 
//               match_date, match_time, estimated_duration, status, depends_on_match1_id, depends_on_match2_id)
//              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             tournamentId, round, globalMatchNumber, roundName, participant1Id, participant2Id,
//             schedule.match_date, schedule.match_time, scheduleConfig?.match_duration || 60, matchStatus,
//             dependsOnMatch1Id, dependsOnMatch2Id
//           ]
//         );

//         logger.info(`✅ Created Match ID ${matchResult.insertId} (Round ${round} Match ${globalMatchNumber}) with dependencies: ${dependsOnMatch1Id}, ${dependsOnMatch2Id}`);

//         // Store match for next round dependencies
//         matchesByRound[round].push({
//           id: matchResult.insertId,
//           round: round,
//           match_number: globalMatchNumber,
//           depends_on_match1_id: dependsOnMatch1Id,
//           depends_on_match2_id: dependsOnMatch2Id
//         });

//         globalMatchNumber++;
//       }
//     }

//     return {
//       format: 'knockout',
//       total_rounds: totalRounds,
//       bracket_size: bracketSize,
//       participants: participantCount,
//       byes: byesNeeded,
//       first_round_matches: matchesByRound[1].filter(m => m !== null).length,
//       total_matches: totalMatches
//     };
//   });
// };

// /**
//  * Generate round robin bracket
//  */
// const generateRoundRobinBracket = async (tournamentId, participants, scheduleConfig = null) => {
//   const participantCount = participants.length;

//   logger.info(`Generating round robin bracket: ${participantCount} participants`);
//   if (scheduleConfig) {
//     logger.info(`Schedule config:`, JSON.stringify(scheduleConfig));
//   }

//   return await transaction(async (conn) => {
//     // Clear existing matches
//     await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);

//     // Calculate total matches for round robin: n * (n-1) / 2
//     const totalMatches = (participantCount * (participantCount - 1)) / 2;

//     // Prepare schedule calculator
//     let currentMatchIndex = 0;
//     const calculateMatchSchedule = (matchIndex) => {
//       if (!scheduleConfig || !scheduleConfig.start_date) {
//         return { match_date: null, match_time: null };
//       }

//       const matchesPerDay = scheduleConfig.matches_per_day || 4;
//       const startTime = scheduleConfig.start_time || '09:00';
//       const matchDuration = scheduleConfig.match_duration || 60;
//       const breakBetween = scheduleConfig.break_between_matches || 15;

//       // Calculate which day this match falls on
//       const dayIndex = Math.floor(matchIndex / matchesPerDay);
//       const matchOfDay = matchIndex % matchesPerDay;

//       // Calculate match time with proper overflow handling
//       const [startHour, startMinute] = startTime.split(':').map(Number);
//       const totalMinutesFromStart = matchOfDay * (matchDuration + breakBetween);

//       // Add total minutes to start time
//       let totalMinutes = startHour * 60 + startMinute + totalMinutesFromStart;

//       // Handle time overflow - calculate additional days needed
//       const additionalDays = Math.floor(totalMinutes / (24 * 60));
//       totalMinutes = totalMinutes % (24 * 60);

//       // Calculate final match date (base day + additional overflow days)
//       const startDate = new Date(scheduleConfig.start_date);
//       const matchDate = new Date(startDate);
//       matchDate.setDate(startDate.getDate() + dayIndex + additionalDays);

//       // Calculate final hour and minute
//       const matchHour = Math.floor(totalMinutes / 60);
//       const matchMinute = totalMinutes % 60;

//       const matchTime = `${String(matchHour).padStart(2, '0')}:${String(matchMinute).padStart(2, '0')}:00`;
//       const formattedDate = matchDate.toISOString().split('T')[0];

//       return {
//         match_date: formattedDate,
//         match_time: matchTime
//       };
//     };

//     // Generate all possible matches (each participant plays every other participant once)
//     const matches = [];
//     let matchNumber = 1;

//     for (let i = 0; i < participantCount; i++) {
//       for (let j = i + 1; j < participantCount; j++) {
//         // Use participant_id if available (from seeded participants), otherwise use id
//         const participant1Id = participants[i].participant_id || participants[i].id;
//         const participant2Id = participants[j].participant_id || participants[j].id;

//         const schedule = calculateMatchSchedule(currentMatchIndex++);

//         // Set status based on whether schedule is provided
//         // const matchStatus = schedule.match_date && schedule.match_time ? 'scheduled' : 'scheduled';
//         const matchStatus = 'scheduled';

//         const [result] = await conn.query(
//           `INSERT INTO matches 
//              (tournament_id, round_number, match_number, round_name, participant1_id, participant2_id, 
//               match_date, match_time, estimated_duration, status)
//              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             tournamentId, 1, matchNumber, 'Round Robin', participant1Id, participant2Id,
//             schedule.match_date, schedule.match_time, scheduleConfig?.match_duration || 60, matchStatus
//           ]
//         );

//         matches.push({
//           id: result.insertId,
//           match_number: matchNumber,
//           participant1: participant1Id,
//           participant2: participant2Id,
//           match_date: schedule.match_date,
//           match_time: schedule.match_time
//         });

//         matchNumber++;
//       }
//     }

//     // Create standings entries
//     for (const participant of participants) {
//       const participantId = participant.participant_id || participant.id;
//       await conn.query(
//         `INSERT INTO tournament_standings 
//            (tournament_id, participant_id, matches_played, matches_won, matches_lost, points)
//            VALUES (?, ?, 0, 0, 0, 0)`,
//         [tournamentId, participantId]
//       );
//     }

//     return {
//       format: 'round_robin',
//       total_matches: matches.length,
//       participants: participantCount
//     };
//   });
// };

// /**
//  * Generate round robin rounds using STANDARD CIRCLE METHOD (professional scheduling)
//  * This ensures balanced scheduling where each team plays once per round
//  * Algorithm: Fix position 0, rotate all others clockwise
//  */
// const generateRoundRobinRounds = (participants) => {
//   const n = participants.length;
//   const rounds = [];

//   // If odd number of participants, add a BYE
//   const teams = [...participants];
//   if (n % 2 === 1) {
//     teams.push({ participant_id: null, isBye: true }); // BYE team
//   }

//   const totalTeams = teams.length;
//   const roundsCount = totalTeams - 1;
//   const matchesPerRound = totalTeams / 2;

//   // Create rotation array (position 0 is fixed, others rotate)
//   const rotation = Array.from({ length: totalTeams }, (_, i) => i);

//   // STANDARD CIRCLE METHOD
//   for (let round = 0; round < roundsCount; round++) {
//     const roundMatches = [];

//     // Pair teams: first with last, second with second-last, etc.
//     for (let match = 0; match < matchesPerRound; match++) {
//       const homeIndex = rotation[match];
//       const awayIndex = rotation[totalTeams - 1 - match];

//       const team1 = teams[homeIndex];
//       const team2 = teams[awayIndex];

//       // Skip matches with BYE
//       if (!team1.isBye && !team2.isBye) {
//         roundMatches.push({
//           participant1_id: team1.participant_id,
//           participant2_id: team2.participant_id
//         });
//       }
//     }

//     if (roundMatches.length > 0) {
//       rounds.push(roundMatches);
//     }

//     // Rotate: keep position 0 fixed, rotate others clockwise
//     // [0, 1, 2, 3, 4, 5] -> [0, 5, 1, 2, 3, 4]
//     if (round < roundsCount - 1) {
//       const last = rotation[totalTeams - 1];
//       for (let i = totalTeams - 1; i > 1; i--) {
//         rotation[i] = rotation[i - 1];
//       }
//       rotation[1] = last;
//     }
//   }

//   return rounds;
// };

// /**
//  * Check if all groups have equal team counts
//  */
// const areGroupsEqual = (groupSizes) => {
//   if (!groupSizes || groupSizes.length === 0) return true;
//   const firstSize = groupSizes[0];
//   return groupSizes.every(size => size === firstSize);
// };

// /**
//  * Generate dynamic knockout structure based on actual qualified teams
//  * Creates ONLY necessary matches, avoiding TBD placeholders
//  * Returns structure with proper round names and match counts
//  */
// const generateDynamicKnockoutStructure = (totalQualifiers) => {
//   if (totalQualifiers < 2) {
//     return { rounds: [], totalMatches: 0, bracketSize: 0, byesNeeded: 0 };
//   }

//   // Find next power of 2 for bracket size
//   const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalQualifiers)));
//   const byesNeeded = bracketSize - totalQualifiers;
  
//   // Calculate number of rounds needed
//   const totalRounds = Math.log2(bracketSize);
  
//   const rounds = [];
  
//   // Generate rounds from first to final
//   for (let round = 1; round <= totalRounds; round++) {
//     const matchesInRound = Math.pow(2, totalRounds - round);
    
//     // FIX: Participants IN this round (who are playing)
//     const participantsThisRound = matchesInRound * 2;
    
//     // Determine professional round name
//     const roundName = getRoundNameByParticipants(participantsThisRound);
    
//     rounds.push({
//       roundNumber: round,
//       matchesInRound: matchesInRound,
//       participantsThisRound: participantsThisRound,
//       roundName: roundName
//     });
//   }
  
//   const totalMatches = bracketSize - 1; // Total knockout matches = participants - 1
  
//   return {
//     rounds: rounds,
//     totalMatches: totalMatches,
//     bracketSize: bracketSize,
//     byesNeeded: byesNeeded,
//     totalRounds: totalRounds
//   };
// };

// /**
//  * Calculate dynamic qualification based on group size (INTERNATIONAL STANDARD RULES)
//  * PRIORITY 1: If all groups have same size → same qualifiers for all
//  * PRIORITY 2: If groups have different sizes → proportional qualifiers
//  * 
//  * International Professional Standards (FIFA/UEFA/FIVB):
//  * - 2 teams → Top 1 qualifies (50%)
//  * - 3 teams → Top 1 qualifies (33%) - FIFA World Cup old format
//  * - 4 teams → Top 2 qualifies (50%) - FIFA standard
//  * - 5 teams → Top 2 qualifies (40%)
//  * - 6 teams → Top 2 qualifies (33%) - UEFA Champions League
//  * - 7 teams → Top 4 qualifies (57%)
//  * - 8 teams → Top 4 qualifies (50%)
//  * 
//  * Note: For 8+ qualifiers (Quarter Finals), manually set qualifiers_per_group: 4 in config
//  */
// const calculateQualificationPerGroup = (groupSize, groupCount, totalParticipants, allGroupSizes = [], configuredQualifiers = null) => {
//   // RULE 0: If manually configured, use that (for custom tournaments)
//   if (configuredQualifiers !== null && configuredQualifiers > 0) {
//     const maxFromThisGroup = groupSize - 1; // Must have elimination
//     return Math.min(configuredQualifiers, maxFromThisGroup);
//   }

//   // RULE 1: International Standard Qualification Rules
//   if (groupSize === 2) return 1;  // 2 teams → only 1 qualifies
//   if (groupSize === 3) return 1;  // 3 teams → Top 1 (FIFA World Cup old format)
//   if (groupSize === 4) return 2;  // 4 teams → Top 2 (FIFA standard)
//   if (groupSize === 5) return 2;  // 5 teams → Top 2 (40%)
//   if (groupSize === 6) return 2;  // 6 teams → Top 2 (UEFA Champions League)
//   if (groupSize === 7) return 4;  // 7 teams → Top 4
//   if (groupSize === 8) return 4;  // 8 teams → Top 4 (50%)
  
//   // RULE 2: Default for larger groups - 50% qualification
//   return Math.max(1, Math.floor(groupSize / 2));
// };

// /**
//  * Generate professional cross-group knockout pairings using POT SYSTEM
//  * Prevents same-group rematches in early knockout rounds
//  * Uses seeding pots for fair bracket distribution
//  */
// // const generateCrossGroupPairings = (qualifiers, groupCount) => {
// //   const pairings = [];

// //   logger.info(`\n🔧 [PAIRING DEBUG] groupCount: ${groupCount}, qualifiers: ${qualifiers.length}`);

// //   if (groupCount === 2) {
// //     // Standard 2-group pairing: A1 vs B2, B1 vs A2
// //     const groupA = qualifiers.filter(q => q.groupIndex === 0);
// //     const groupB = qualifiers.filter(q => q.groupIndex === 1);

// //     logger.info(`🔧 [PAIRING DEBUG] Group A: ${groupA.length} qualifiers, Group B: ${groupB.length} qualifiers`);

// //     if (groupA.length >= 2 && groupB.length >= 2) {
// //       // Both groups have 2+ qualifiers: standard cross-group pairing
// //       logger.info(`🔧 [PAIRING DEBUG] Standard pairing (both groups have 2+)`);
// //       pairings.push({ p1: groupA[0], p2: groupB[1] }); // A1 vs B2
// //       pairings.push({ p1: groupB[0], p2: groupA[1] }); // B1 vs A2
// //     } else if (groupA.length === 1 && groupB.length === 1) {
// //       // SPECIAL CASE: Exactly 1 qualifier from each group → Direct Final
// //       logger.info(`🔧 [PAIRING DEBUG] Single qualifier from each group - creating direct Final pairing`);
// //       pairings.push({ p1: groupA[0], p2: groupB[0] }); // A1 vs B1 (Final)
// //     } else if (groupA.length >= 1 && groupB.length >= 1) {
// //       // Unequal qualifiers: pair available teams
// //       logger.info(`🔧 [PAIRING DEBUG] Unequal qualifiers - pairing remaining teams`);
      
// //       // Top team from larger group gets BYE (handled separately)
// //       // Pair remaining teams cross-group
// //       const allTeams = [...groupA, ...groupB].sort((a, b) => {
// //         // Sort by points, then goal difference
// //         if (b.points !== a.points) return b.points - a.points;
// //         return b.goalDifference - a.goalDifference;
// //       });
      
// //       logger.info(`🔧 [PAIRING DEBUG] All teams sorted: ${allTeams.map(t => `${t.participantId}(${t.points}pts)`).join(', ')}`);
      
// //       // Skip top team (gets BYE), pair remaining teams
// //       for (let i = 1; i < allTeams.length; i += 2) {
// //         logger.info(`🔧 [PAIRING DEBUG] Loop i=${i}, checking ${i+1} < ${allTeams.length}`);
// //         if (i + 1 < allTeams.length) {
// //           logger.info(`🔧 [PAIRING DEBUG] Creating pairing: ${allTeams[i].participantId} vs ${allTeams[i+1].participantId}`);
// //           pairings.push({ p1: allTeams[i], p2: allTeams[i + 1] });
// //         }
// //       }
// //     }
// //   } else if (groupCount === 4) {
// //     // 4-group pairing: A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2
// //     const groups = [];
// //     for (let i = 0; i < groupCount; i++) {
// //       groups.push(qualifiers.filter(q => q.groupIndex === i));
// //     }

// //     if (groups.every(g => g.length >= 2)) {
// //       pairings.push({ p1: groups[0][0], p2: groups[1][1] }); // A1 vs B2
// //       pairings.push({ p1: groups[1][0], p2: groups[0][1] }); // B1 vs A2
// //       pairings.push({ p1: groups[2][0], p2: groups[3][1] }); // C1 vs D2
// //       pairings.push({ p1: groups[3][0], p2: groups[2][1] }); // D1 vs C2
// //     }
// //   } else {
// //     // POT SYSTEM for multiple groups
// //     // Create pots by rank: Pot 1 = all rank 1, Pot 2 = all rank 2, etc.
// //     const pots = {};

// //     qualifiers.forEach(q => {
// //       if (!pots[q.rank]) {
// //         pots[q.rank] = [];
// //       }
// //       pots[q.rank].push(q);
// //     });

// //     const potKeys = Object.keys(pots).map(Number).sort((a, b) => a - b);

// //     // Pair Pot 1 with Pot 2, ensuring no same-group matches
// //     if (potKeys.length >= 2) {
// //       const pot1 = pots[potKeys[0]];
// //       const pot2 = pots[potKeys[1]];

// //       // Try to pair teams from different groups
// //       const used = new Set();

// //       for (const p1 of pot1) {
// //         // Find best opponent from pot2 (different group, not used)
// //         const opponent = pot2.find(p2 =>
// //           p2.groupIndex !== p1.groupIndex && !used.has(p2.participantId)
// //         );

// //         if (opponent) {
// //           pairings.push({ p1, p2: opponent });
// //           used.add(opponent.participantId);
// //         }
// //       }

// //       // If we have remaining teams (odd qualifiers), they get byes
// //       // Byes are handled in finalizeGroupStage
// //     } else {
// //       // Fallback: simple sequential pairing
// //       for (let i = 0; i < qualifiers.length; i += 2) {
// //         if (i + 1 < qualifiers.length) {
// //           pairings.push({
// //             p1: qualifiers[i],
// //             p2: qualifiers[i + 1]
// //           });
// //         }
// //       }
// //     }
// //   }

// //   return pairings;
// // };

// const generateCrossGroupPairings = (qualifiers, groupCount) => {
//   const pairings = [];

//   logger.info(
//     `\n🔧 [PAIRING ENGINE] groups=${groupCount}, qualifiers=${qualifiers.length}`
//   );

//   if (!qualifiers || qualifiers.length < 2) {
//     return pairings;
//   }

//   /**
//    * STEP 1
//    * Normalize + sort qualifiers
//    */
//   const normalized = qualifiers
//     .filter(q => q && q.participantId)
//     .sort((a, b) => {
//       // Primary: rank
//       if (a.rank !== b.rank) {
//         return a.rank - b.rank;
//       }

//       // Secondary: points
//       if (b.points !== a.points) {
//         return b.points - a.points;
//       }

//       // Third: goal difference
//       if (b.goalDifference !== a.goalDifference) {
//         return b.goalDifference - a.goalDifference;
//       }

//       // Fourth: goals scored
//       return b.goalsFor - a.goalsFor;
//     });

//   logger.info(
//     `🔧 Normalized qualifiers: ${normalized
//       .map(q => `${q.groupName}-R${q.rank}`)
//       .join(', ')}`
//   );

//   /**
//    * STEP 2
//    * Seed distribution
//    *
//    * Highest seed vs lowest seed
//    */
//   const used = new Set();

//   for (let i = 0; i < normalized.length; i++) {
//     if (used.has(i)) continue;

//     const p1 = normalized[i];

//     let opponentIndex = -1;

//     /**
//      * Find best opponent:
//      * - lowest remaining seed
//      * - different group preferred
//      */
//     for (let j = normalized.length - 1; j > i; j--) {
//       if (used.has(j)) continue;

//       const candidate = normalized[j];

//       if (candidate.groupIndex !== p1.groupIndex) {
//         opponentIndex = j;
//         break;
//       }
//     }

//     /**
//      * fallback:
//      * allow same-group if unavoidable
//      */
//     if (opponentIndex === -1) {
//       for (let j = normalized.length - 1; j > i; j--) {
//         if (!used.has(j)) {
//           opponentIndex = j;

//           logger.warn(
//             `⚠️ Same-group clash unavoidable: ${p1.groupName} vs ${normalized[j].groupName}`
//           );

//           break;
//         }
//       }
//     }

//     /**
//      * no opponent = automatic bye
//      */
//     if (opponentIndex === -1) {
//       logger.info(
//         `🏅 Automatic BYE: ${p1.groupName} Rank ${p1.rank}`
//       );

//       used.add(i);
//       continue;
//     }

//     const p2 = normalized[opponentIndex];

//     pairings.push({ p1, p2 });

//     used.add(i);
//     used.add(opponentIndex);

//     logger.info(
//       `✅ Pairing: ${p1.groupName} Rank ${p1.rank} vs ${p2.groupName} Rank ${p2.rank}`
//     );
//   }

//   logger.info(`✅ Total pairings generated: ${pairings.length}`);

//   return pairings;
// };

// /**
//  * Generate groups + knockout bracket
//  */
// const generateGroupsKnockoutBracket = async (tournamentId, participants, scheduleConfig = null) => {
//   const participantCount = participants.length;

//   // Validate minimum participants for groups+knockout format
//   if (participantCount < 4) {
//     throw new Error('Groups+Knockout format requires at least 4 participants. Use Knockout or League format for fewer participants.');
//   }

//   return await transaction(async (conn) => {
//     // Check if custom groups already exist
//     const [existingGroups] = await conn.query(
//       'SELECT id, group_name, is_custom FROM tournament_groups WHERE tournament_id = ? ORDER BY display_order ASC, group_name ASC',
//       [tournamentId]
//     );

//     let groups = [];
//     let useCustomGroups = false;
//     let groupCount = 0;

//     if (existingGroups && existingGroups.length > 0) {
//       // Custom groups exist - use them
//       useCustomGroups = true;
//       logger.info(`Using ${existingGroups.length} existing custom groups for tournament ${tournamentId}`);

//       // Get participants for each group
//       for (const group of existingGroups) {
//         const [groupParticipants] = await conn.query(
//           'SELECT participant_id FROM group_participants WHERE group_id = ? ORDER BY position ASC',
//           [group.id]
//         );

//         const participantsList = [];
//         for (const gp of groupParticipants) {
//           // Find participant details from the participants array
//           const participantDetails = participants.find(p =>
//             (p.participant_id || p.id) === gp.participant_id
//           );

//           if (participantDetails) {
//             participantsList.push({
//               ...participantDetails,
//               participant_id: gp.participant_id
//             });
//           }
//         }

//         groups.push({
//           id: group.id,
//           name: group.group_name,
//           participants: participantsList,
//           is_custom: group.is_custom
//         });

//         logger.info(`Group ${group.group_name}: ${participantsList.length} participants`);
//       }

//       // Validate each group has at least 2 participants
//       for (const group of groups) {
//         if (group.participants.length < 2) {
//           throw new Error(`Group "${group.name}" has only ${group.participants.length} participant(s). Each group must have at least 2 participants.`);
//         }
//       }

//       // Set groupCount for custom groups
//       groupCount = groups.length;

//     } else {
//       // No custom groups - auto-generate using group_size
//       useCustomGroups = false;

//       // Use configurable group size from scheduleConfig, default to 4 if not provided
//       const groupSize = scheduleConfig?.group_size || 4;

//       // Validate group size
//       if (groupSize < 2) {
//         throw new Error('Group size must be at least 2');
//       }
//       if (groupSize > participantCount) {
//         throw new Error(`Group size (${groupSize}) cannot exceed total participants (${participantCount})`);
//       }

//       groupCount = Math.ceil(participantCount / groupSize);

//       logger.info(`Auto-generating groups: ${participantCount} participants, ${groupCount} groups (${groupSize} per group)`);

//       // Clear existing data - order matters due to foreign key constraints
//       await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
//       await conn.query('DELETE FROM tournament_standings WHERE tournament_id = ?', [tournamentId]);
//       await conn.query('DELETE FROM group_participants WHERE group_id IN (SELECT id FROM tournament_groups WHERE tournament_id = ?)', [tournamentId]);
//       await conn.query('DELETE FROM tournament_groups WHERE tournament_id = ?', [tournamentId]);

//       // Create groups
//       for (let i = 0; i < groupCount; i++) {
//         const groupName = String.fromCharCode(65 + i); // A, B, C, etc.
//         const [result] = await conn.query(
//           'INSERT INTO tournament_groups (tournament_id, group_name, is_custom) VALUES (?, ?, FALSE)',
//           [tournamentId, `Group ${groupName}`]
//         );

//         groups.push({
//           id: result.insertId,
//           name: `Group ${groupName}`,
//           participants: [],
//           is_custom: false
//         });
//       }

//       // Distribute participants across groups (snake seeding)
//       for (let i = 0; i < participantCount; i++) {
//         const groupIndex = i % groupCount;
//         const participantId = participants[i].participant_id || participants[i].id;

//         groups[groupIndex].participants.push({
//           ...participants[i],
//           participant_id: participantId
//         });

//         await conn.query(
//           'INSERT INTO group_participants (group_id, participant_id, position) VALUES (?, ?, ?)',
//           [groups[groupIndex].id, participantId, groups[groupIndex].participants.length]
//         );
//       }
//     }

//     // Clear existing matches and standings (preserve groups)
//     await conn.query('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
//     await conn.query('DELETE FROM tournament_standings WHERE tournament_id = ?', [tournamentId]);

//     // Match index counter for scheduling
//     let currentMatchIndex = 0;

//     // Generate round robin matches within each group with PROPER ROUND SCHEDULING
//     let totalGroupMatches = 0;
//     let totalGroupRounds = 0;

//     // CRITICAL: Global match number OUTSIDE group loop to prevent duplicates
//     let globalMatchNumber = 1;

//     logger.info(`\n========== GENERATING GROUP STAGE MATCHES ==========`);

//     for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
//       const group = groups[groupIndex];
//       const groupParticipants = group.participants;
//       const groupSize = groupParticipants.length;

//       // BUG FIX 1: All matches in this group get the SAME round_number = groupIndex + 1
//       const groupRoundNumber = groupIndex + 1;

//       logger.info(`\n${group.name}: ${groupSize} teams (Round Number: ${groupRoundNumber})`);

//       // Generate professional round robin rounds using circle method
//       const rounds = generateRoundRobinRounds(groupParticipants);
//       const totalRounds = rounds.length;

//       // Calculate expected matches: n * (n-1) / 2
//       const expectedMatches = (groupSize * (groupSize - 1)) / 2;

//       logger.info(`  Rounds: ${totalRounds}`);
//       logger.info(`  Expected matches: ${expectedMatches}`);
//       logger.info(`  Matches per round: ${groupSize % 2 === 0 ? groupSize / 2 : Math.floor(groupSize / 2)}`);

//       totalGroupRounds = Math.max(totalGroupRounds, totalRounds);

//       // Insert matches round by round
//       for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
//         const roundMatches = rounds[roundIndex];

//         logger.info(`  Round ${roundIndex + 1}: ${roundMatches.length} matches`);

//         for (const match of roundMatches) {
//           const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);
//           const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

//           await conn.query(
//             `INSERT INTO matches 
//                (tournament_id, group_id, round_number, match_number, round_name, participant1_id, participant2_id, 
//                 match_date, match_time, estimated_duration, status)
//                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//             [
//               tournamentId, group.id, groupRoundNumber, globalMatchNumber,
//               group.name,
//               match.participant1_id, match.participant2_id,
//               schedule.match_date, schedule.match_time,
//               scheduleConfig?.match_duration || 60, matchStatus
//             ]
//           );

//           globalMatchNumber++;
//           totalGroupMatches++;
//         }
//       }

//       logger.info(`  Total matches created: ${globalMatchNumber - 1}`);

//       // Create standings for group
//       for (const participant of groupParticipants) {
//         await conn.query(
//           `INSERT INTO tournament_standings 
//              (tournament_id, group_id, participant_id, matches_played, matches_won, matches_lost, points)
//              VALUES (?, ?, ?, 0, 0, 0, 0)`,
//           [tournamentId, group.id, participant.participant_id]
//         );
//       }
//     }

//     logger.info(`\nTotal group stage matches: ${totalGroupMatches}`);
//     logger.info(`Maximum rounds in any group: ${totalGroupRounds}`);

//     // Generate knockout stage placeholder matches
//     // PROFESSIONAL DYNAMIC QUALIFICATION RULE
//     logger.info(`\n========== GENERATING KNOCKOUT STAGE ==========`);

//     // STEP 1: Collect all group sizes first
//     const allGroupSizes = groups.map(g => g.participants.length);
//     const groupsAreEqual = areGroupsEqual(allGroupSizes);
    
//     logger.info(`\nGroup Analysis:`);
//     logger.info(`  Group sizes: ${allGroupSizes.join(', ')}`);
//     logger.info(`  All groups equal: ${groupsAreEqual}`);

//     // STEP 2: Calculate qualifiers based on professional rules
//     let totalQualifiers = 0;
//     const qualifiersPerGroupArray = []; // Track qualifiers for each group
    
//     logger.info(`\nCalculating qualifiers per group (Professional Rules):`);
    
//     if (groupsAreEqual) {
//       // PRIORITY 1: All groups have same size → same qualifiers for all
//       const standardGroupSize = allGroupSizes[0];
//       const standardQualifiers = calculateQualificationPerGroup(
//         standardGroupSize, groupCount, participantCount, allGroupSizes, scheduleConfig?.qualifiers_per_group
//       );
      
//       logger.info(`  ✓ Equal groups detected: ${standardGroupSize} teams per group`);
//       logger.info(`  ✓ Standard qualifiers: ${standardQualifiers} from each group`);
      
//       for (const group of groups) {
//         qualifiersPerGroupArray.push(standardQualifiers);
//         totalQualifiers += standardQualifiers;
//         logger.info(`  ${group.name}: ${standardGroupSize} teams → ${standardQualifiers} qualifiers`);
//       }
//     } else {
//       // PRIORITY 2: Unequal groups → proportional qualifiers
//       logger.info(`  ⚠ Unequal groups detected - using proportional qualification`);
      
//       for (const group of groups) {
//         const groupSize = group.participants.length;
//         const qualifiersForThisGroup = calculateQualificationPerGroup(
//           groupSize, groupCount, participantCount, allGroupSizes, scheduleConfig?.qualifiers_per_group
//         );
        
//         totalQualifiers += qualifiersForThisGroup;
//         qualifiersPerGroupArray.push(qualifiersForThisGroup);
//         logger.info(`  ${group.name}: ${groupSize} teams → ${qualifiersForThisGroup} qualifiers`);
//       }
//     }
    
//     // For backward compatibility, calculate average qualifiers per group
//     const qualifiersPerGroup = Math.round(totalQualifiers / groupCount);

//     // STEP 3: Validate minimum knockout viability
//     logger.info(`\n========== KNOCKOUT VIABILITY CHECK ==========`);
    
//     if (totalQualifiers < 2) {
//       logger.error(`❌ INSUFFICIENT QUALIFIERS: Only ${totalQualifiers} team(s) qualified`);
//       logger.error(`❌ Minimum 2 teams required for knockout stage`);
//       throw new Error(`Cannot generate knockout stage: Only ${totalQualifiers} team(s) qualified. Minimum 2 teams required.`);
//     }
    
//     logger.info(`✓ Knockout viable: ${totalQualifiers} teams qualified`);
    
//     // STEP 4: Generate dynamic knockout structure
//     logger.info(`\n========== DYNAMIC KNOCKOUT STRUCTURE ==========`);
//     const knockoutStructure = generateDynamicKnockoutStructure(totalQualifiers);
    
//     logger.info(`Total qualifiers: ${totalQualifiers}`);
//     logger.info(`Knockout bracket size: ${knockoutStructure.bracketSize}`);
//     logger.info(`Byes needed: ${knockoutStructure.byesNeeded}`);
//     logger.info(`Total knockout rounds: ${knockoutStructure.totalRounds}`);
//     logger.info(`Total knockout matches: ${knockoutStructure.totalMatches}`);

//     let knockoutMatches = 0;

//     // Track knockout matches by round for dependency linking
//     const knockoutMatchesByRound = {};

//     // BUG FIX 4: Knockout rounds start after number of groups (not totalGroupRounds)
//     // Group A = round 1, Group B = round 2, so knockout starts at groupCount + 1
//     let knockoutRoundNumber = groupCount + 1;

//     logger.info(`Starting knockout at round number: ${knockoutRoundNumber} (after ${groupCount} group rounds)`);

//     if (totalQualifiers >= 2) {
//       // STEP 5: Generate knockout matches using dynamic structure
//       logger.info(`\n========== GENERATING KNOCKOUT MATCHES ==========`);
      
//       for (const roundInfo of knockoutStructure.rounds) {
//         const { roundNumber, matchesInRound, participantsThisRound, roundName } = roundInfo;
        
//         knockoutMatchesByRound[roundNumber] = [];

//         logger.info(`\nRound ${roundNumber} - ${roundName}:`);
//         logger.info(`  Matches: ${matchesInRound}`);
//         logger.info(`  Participants: ${participantsThisRound}`);

//         for (let i = 0; i < matchesInRound; i++) {
//           const schedule = calculateMatchSchedule(currentMatchIndex++, scheduleConfig);
//           const matchStatus = getMatchStatus(schedule.match_date, schedule.match_time);

//           // Determine dependencies
//           let dependsOnMatch1Id = null;
//           let dependsOnMatch2Id = null;

//           if (roundNumber === 1) {
//             // First knockout round - no match dependencies (depends on group standings)
//             // Participants will be filled after group stage completes via finalizeGroupStage
//             dependsOnMatch1Id = null;
//             dependsOnMatch2Id = null;
//           } else {
//             // Later rounds - depend on previous knockout round matches
//             const prevRound = roundNumber - 1;
//             const match1Index = i * 2;
//             const match2Index = i * 2 + 1;

//             if (knockoutMatchesByRound[prevRound] && knockoutMatchesByRound[prevRound][match1Index]) {
//               dependsOnMatch1Id = knockoutMatchesByRound[prevRound][match1Index].id;
//             }
//             if (knockoutMatchesByRound[prevRound] && knockoutMatchesByRound[prevRound][match2Index]) {
//               dependsOnMatch2Id = knockoutMatchesByRound[prevRound][match2Index].id;
//             }
//           }

//           // FIX 3: Use globalMatchNumber for consistent numbering across group and knockout stages
//           const [matchResult] = await conn.query(
//             `INSERT INTO matches 
//                (tournament_id, group_id, round_number, match_number, round_name, participant1_id, participant2_id, 
//                 match_date, match_time, estimated_duration, status, depends_on_match1_id, depends_on_match2_id)
//                VALUES (?, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
//             [
//               tournamentId, knockoutRoundNumber, globalMatchNumber, `Knockout - ${roundName}`,
//               schedule.match_date, schedule.match_time, scheduleConfig?.match_duration || 60, matchStatus,
//               dependsOnMatch1Id, dependsOnMatch2Id
//             ]
//           );

//           // Store match for next round dependencies
//           knockoutMatchesByRound[roundNumber].push({
//             id: matchResult.insertId,
//             round: roundNumber,
//             roundNumber: knockoutRoundNumber,
//             match_number: globalMatchNumber
//           });

//           globalMatchNumber++;
//           knockoutMatches++;
          
//           logger.info(`    Match ${globalMatchNumber - 1}: ID ${matchResult.insertId} (depends: ${dependsOnMatch1Id || 'N/A'}, ${dependsOnMatch2Id || 'N/A'})`);
//         }

//         knockoutRoundNumber++;
//       }
//     }

//     logger.info(`\nTotal knockout matches: ${knockoutMatches}`);
//     logger.info(`========== TOURNAMENT GENERATION COMPLETE ==========\n`);

//     return {
//       format: 'groups_knockout',
//       groups: groupCount,
//       group_stage_rounds: totalGroupRounds,
//       group_stage_matches: totalGroupMatches,
//       qualifiers_per_group: qualifiersPerGroup,
//       qualifiers_per_group_array: qualifiersPerGroupArray,
//       total_qualifiers: totalQualifiers,
//       knockout_bracket_size: knockoutStructure.bracketSize,
//       knockout_byes: knockoutStructure.byesNeeded,
//       knockout_stage_matches: knockoutMatches,
//       total_matches: totalGroupMatches + knockoutMatches,
//       participants: participantCount
//     };
//   });
// };

// /**
//  * Generate standard tournament seeding
//  */
// const generateStandardSeeding = (size) => {
//   if (size === 2) return [1, 2];

//   const half = size / 2;
//   const upper = generateStandardSeeding(half);
//   const lower = upper.map(seed => size + 1 - seed);

//   const seeding = [];
//   for (let i = 0; i < half; i++) {
//     seeding.push(upper[i]);
//     seeding.push(lower[i]);
//   }

//   return seeding;
// };

// /**
//  * Get round name based on number of participants
//  * Follows PROFESSIONAL TOURNAMENT NAMING STANDARDS
//  */
// const getRoundNameByParticipants = (participants) => {
//   if (participants <= 1) return 'Winner';
//   if (participants === 2) return 'Final';
//   if (participants === 4) return 'Semi Finals';
//   if (participants === 8) return 'Quarter Finals';
//   if (participants === 16) return 'Pre Quarter Finals';
//   if (participants === 32) return 'Round of 32';
//   if (participants === 64) return 'Round of 64';
//   if (participants === 128) return 'Round of 128';

//   // For non-power-of-2 counts (dynamic knockout with byes)
//   // Use descriptive label instead of misleading classic names
//   return `Knockout Round (${participants} teams)`;
// };

// /**
//  * Get round name
//  * Follows PROFESSIONAL TOURNAMENT NAMING STANDARDS
//  */
// const getRoundName = (round, totalRounds) => {
//   const roundsFromEnd = totalRounds - round;

//   switch (roundsFromEnd) {
//     case 0:
//       return 'Final';
//     case 1:
//       return 'Semi Finals';
//     case 2:
//       return 'Quarter Finals';
//     case 3:
//       return 'Pre Quarter Finals';
//     case 4:
//       return 'Round of 32';
//     case 5:
//       return 'Round of 64';
//     default:
//       return `Round ${round}`;
//   }
// };

// /**
//  * Get tournament info
//  */
// const getTournamentInfo = async (tournamentId) => {
//   const sql = 'SELECT * FROM tournaments WHERE id = ?';
//   const tournaments = await query(sql, [tournamentId]);

//   if (tournaments.length === 0) {
//     throw new Error('Tournament not found');
//   }

//   return tournaments[0];
// };

// /**
//  * Advance winner to next round (knockout)
//  * Uses dependency tracking to correctly place winners
//  */
// const advanceWinner = async (matchId, winnerId) => {
//   return await transaction(async (conn) => {
//     // Get match details
//     const [matchRows] = await conn.query(
//       'SELECT * FROM matches WHERE id = ?',
//       [matchId]
//     );

//     const match = matchRows[0];

//     if (!match) {
//       throw new Error('Match not found');
//     }

//     logger.info(`🏆 Advancing winner ${winnerId} from match ${matchId}`);

//     // Find matches that depend on this match
//     const [dependentMatches] = await conn.query(
//       `SELECT * FROM matches 
//          WHERE tournament_id = ? 
//          AND (depends_on_match1_id = ? OR depends_on_match2_id = ?)`,
//       [match.tournament_id, matchId, matchId]
//     );

//     logger.info(`🔍 Found ${dependentMatches.length} dependent matches`);

//     if (!dependentMatches || dependentMatches.length === 0) {
//       // This was the final match (no dependent matches)
//       logger.info(`✅ Match ${matchId} was the final. Winner: ${winnerId}`);
//       return;
//     }

//     // Update each dependent match
//     for (const nextMatch of dependentMatches) {
//       let field = null;

//       logger.info(`🔧 Checking match ${nextMatch.id}: depends_on_match1_id=${nextMatch.depends_on_match1_id} (type: ${typeof nextMatch.depends_on_match1_id}), depends_on_match2_id=${nextMatch.depends_on_match2_id} (type: ${typeof nextMatch.depends_on_match2_id})`);
//       logger.info(`🔧 Comparing with matchId=${matchId} (type: ${typeof matchId})`);

//       // Determine which participant field to update based on dependency
//       // Convert to numbers for comparison
//       const match1Dep = nextMatch.depends_on_match1_id ? parseInt(nextMatch.depends_on_match1_id) : null;
//       const match2Dep = nextMatch.depends_on_match2_id ? parseInt(nextMatch.depends_on_match2_id) : null;
//       const matchIdNum = parseInt(matchId);

//       logger.info(`🔧 After conversion: match1Dep=${match1Dep}, match2Dep=${match2Dep}, matchIdNum=${matchIdNum}`);

//       if (match1Dep === matchIdNum) {
//         field = 'participant1_id';
//         logger.info(`🎯 Match! Setting field to participant1_id`);
//       } else if (match2Dep === matchIdNum) {
//         field = 'participant2_id';
//         logger.info(`🎯 Match! Setting field to participant2_id`);
//       }

//       if (field) {
//         // Check if the target field already has a participant (e.g., BYE)
//         const currentValue = nextMatch[field];
        
//         if (currentValue && currentValue !== null) {
//           // Field already occupied (BYE case), use the other field
//           const alternateField = field === 'participant1_id' ? 'participant2_id' : 'participant1_id';
//           logger.info(`⚠️ ${field} already occupied with ${currentValue}, using ${alternateField} instead`);
//           field = alternateField;
//         }
        
//         // Update next match with winner
//         await conn.query(
//           `UPDATE matches SET ${field} = ? WHERE id = ?`,
//           [winnerId, nextMatch.id]
//         );

//         logger.info(`✅ Advanced winner ${winnerId} from match ${matchId} to match ${nextMatch.id} as ${field}`);
//       } else {
//         logger.warn(`⚠️ Could not determine field for match ${nextMatch.id}`);
//       }
//     }
//   });
// };

// /**
//  * Update standings after match (round robin)
//  * Now uses comprehensive standingsService for enhanced statistics
//  */
// const updateStandings = async (matchId, winnerId, isDraw = false) => {
//   logger.info(`📊 [BRACKET SERVICE] Delegating standings update for match ${matchId}, winner: ${winnerId}, isDraw: ${isDraw}`);

//   // Delegate to standingsService for comprehensive updates
//   // This now includes: goals, averages, streaks, form guide, positions
//   const result = await standingsService.updateStandingsAfterMatch(matchId, winnerId, isDraw);

//   logger.info(`✅ [BRACKET SERVICE] Standings update completed for match ${matchId}`);
//   return result;
// };

// /**
//  * Recalculate standings positions
//  * Kept for backward compatibility - delegates to standingsService
//  */
// const recalculatePositions = async (tournamentId, groupId = null) => {
//   // Use the new comprehensive recalculation
//   return await standingsService.recalculateStandings(tournamentId, groupId);
// };

// /**
//  * Finalize group stage and advance qualified teams to knockout
//  * Uses DYNAMIC QUALIFICATION based on group size and PROFESSIONAL CROSS-GROUP PAIRINGS
//  */
// const finalizeGroupStage = async (tournamentId) => {
//   return await transaction(async (conn) => {
//     try {
//       logger.info(`\n========== FINALIZING GROUP STAGE ==========`);
//       logger.info(`Tournament ID: ${tournamentId}`);

//       // Get tournament info
//       const tournament = await getTournamentInfo(tournamentId);

//       if (tournament.format_type !== 'groups_knockout') {
//         throw new Error('Tournament is not groups+knockout format');
//       }

//       // Get all groups for this tournament
//       const [groups] = await conn.query(
//         'SELECT id, group_name FROM tournament_groups WHERE tournament_id = ? ORDER BY group_name',
//         [tournamentId]
//       );

//       if (!groups || groups.length === 0) {
//         throw new Error('No groups found for this tournament');
//       }

//       logger.info(`Found ${groups.length} groups`);

//       // Check if all group stage matches are completed
//       const [incompleteMatches] = await conn.query(
//         `SELECT COUNT(*) as count FROM matches 
//          WHERE tournament_id = ? 
//          AND group_id IS NOT NULL 
//          AND status NOT IN ('completed', 'cancelled')`,
//         [tournamentId]
//       );

//       if (incompleteMatches[0].count > 0) {
//         throw new Error(`Cannot finalize: ${incompleteMatches[0].count} group stage matches are still pending`);
//       }

//       // Calculate group size to determine qualification rule
//       const [participantCount] = await conn.query(
//         `SELECT COUNT(DISTINCT participant_id) as count 
//          FROM tournament_standings 
//          WHERE tournament_id = ?`,
//         [tournamentId]
//       );

//       // STEP 1: Collect all group sizes first (PROFESSIONAL RULE)
//       logger.info(`\n========== PROFESSIONAL QUALIFICATION ANALYSIS ==========`);
      
//       // CRITICAL: Validate minimum knockout viability
//       const [totalParticipantCount] = await conn.query(
//         `SELECT COUNT(DISTINCT participant_id) as count FROM tournament_standings WHERE tournament_id = ?`,
//         [tournamentId]
//       );
      
//       if (totalParticipantCount[0].count < 2) {
//         throw new Error(`Cannot finalize: Tournament has less than 2 participants`);
//       }
      
//       const groupSizeMap = new Map();
//       for (const group of groups) {
//         const [groupSizeResult] = await conn.query(
//           `SELECT COUNT(*) as size FROM tournament_standings WHERE tournament_id = ? AND group_id = ?`,
//           [tournamentId, group.id]
//         );
//         groupSizeMap.set(group.id, groupSizeResult[0].size);
//       }
      
//       const allGroupSizes = Array.from(groupSizeMap.values());
//       const groupsAreEqual = areGroupsEqual(allGroupSizes);
      
//       logger.info(`Group Analysis:`);
//       logger.info(`  Total groups: ${groups.length}`);
//       logger.info(`  Group sizes: ${allGroupSizes.join(', ')}`);
//       logger.info(`  All groups equal: ${groupsAreEqual}`);

//       // STEP 2: Calculate qualifiers using professional rules
//       const allQualifiers = [];
//       const qualifiersPerGroupArray = [];
      
//       logger.info(`\nQualification Rule (Professional Standards):`);

//       if (groupsAreEqual) {
//         // PRIORITY 1: All groups have same size → same qualifiers for all
//         const standardGroupSize = allGroupSizes[0];
//         const standardQualifiers = calculateQualificationPerGroup(
//           standardGroupSize, groups.length, participantCount[0].count, allGroupSizes
//         );
        
//         logger.info(`  ✓ Equal groups: ${standardGroupSize} teams per group`);
//         logger.info(`  ✓ Standard qualifiers: ${standardQualifiers} from each group`);
//         logger.info(``);
        
//         for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
//           const group = groups[groupIndex];
//           qualifiersPerGroupArray.push(standardQualifiers);
          
//           logger.info(`Processing ${group.group_name}:`);
          
//           // Get top N participants from this group
//           const [topParticipants] = await conn.query(
//             `SELECT ts.participant_id, ts.position, ts.points, ts.matches_won, 
//                     ts.matches_lost, ts.goal_difference, ts.goals_for, 
//                     ts.sets_won, ts.sets_lost, ts.set_ratio, tg.group_name
//              FROM tournament_standings ts
//              JOIN tournament_groups tg ON ts.group_id = tg.id
//              WHERE ts.tournament_id = ? AND ts.group_id = ?
//              ORDER BY ts.position ASC
//              LIMIT ?`,
//             [tournamentId, group.id, standardQualifiers]
//           );

//           if (!topParticipants || topParticipants.length < 1) {
//             throw new Error(`Group ${group.group_name} does not have any participants in standings`);
//           }

//           // Add all qualifiers from this group
//           for (let rank = 0; rank < topParticipants.length; rank++) {
//             const participant = topParticipants[rank];
//             allQualifiers.push({
//               groupId: group.id,
//               groupIndex: groupIndex,
//               groupName: group.group_name,
//               participantId: participant.participant_id,
//               rank: rank + 1,
//               position: participant.position,
//               points: participant.points,
//               goalDifference: participant.goal_difference,
//               goalsFor: participant.goals_for,
//               setsWon: participant.sets_won,
//               setsLost: participant.sets_lost,
//               setRatio: participant.set_ratio
//             });

//             logger.info(`  Rank ${rank + 1}: Participant ${participant.participant_id} (${participant.points} pts, SR: ${participant.set_ratio}, SW: ${participant.sets_won})`);
//           }
//         }
//       } else {
//         // PRIORITY 2: Unequal groups → proportional qualifiers
//         logger.info(`  ⚠ Unequal groups detected - using proportional qualification`);
//         logger.info(``);
        
//         for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
//           const group = groups[groupIndex];
//           const groupSize = groupSizeMap.get(group.id);
          
//           const qualifiersForThisGroup = calculateQualificationPerGroup(
//             groupSize, groups.length, participantCount[0].count, allGroupSizes
//           );
          
//           qualifiersPerGroupArray.push(qualifiersForThisGroup);
          
//           logger.info(`Processing ${group.group_name}:`);
//           logger.info(`  Group size: ${groupSize}, Qualifiers: ${qualifiersForThisGroup}`);

//           // Get top N participants from this group
//           const [topParticipants] = await conn.query(
//             `SELECT ts.participant_id, ts.position, ts.points, ts.matches_won, 
//                     ts.matches_lost, ts.goal_difference, ts.goals_for,
//                     ts.sets_won, ts.sets_lost, ts.set_ratio, tg.group_name
//              FROM tournament_standings ts
//              JOIN tournament_groups tg ON ts.group_id = tg.id
//              WHERE ts.tournament_id = ? AND ts.group_id = ?
//              ORDER BY ts.position ASC
//              LIMIT ?`,
//             [tournamentId, group.id, qualifiersForThisGroup]
//           );

//           if (!topParticipants || topParticipants.length < 1) {
//             throw new Error(`Group ${group.group_name} does not have any participants in standings`);
//           }

//           // Add all qualifiers from this group
//           for (let rank = 0; rank < topParticipants.length; rank++) {
//             const participant = topParticipants[rank];
//             allQualifiers.push({
//               groupId: group.id,
//               groupIndex: groupIndex,
//               groupName: group.group_name,
//               participantId: participant.participant_id,
//               rank: rank + 1,
//               position: participant.position,
//               points: participant.points,
//               goalDifference: participant.goal_difference,
//               goalsFor: participant.goals_for,
//               setsWon: participant.sets_won,
//               setsLost: participant.sets_lost,
//               setRatio: participant.set_ratio
//             });

//             logger.info(`  Rank ${rank + 1}: Participant ${participant.participant_id} (${participant.points} pts, SR: ${participant.set_ratio}, SW: ${participant.sets_won})`);
//           }
//         }
//       }

//       logger.info(`\nTotal qualified teams: ${allQualifiers.length}`);
      
//       // CRITICAL: Validate minimum knockout viability
//       if (allQualifiers.length < 2) {
//         logger.error(`\n❌ CANNOT FINALIZE: Only ${allQualifiers.length} team(s) qualified`);
//         logger.error(`❌ Minimum 2 teams required for knockout stage`);
//         throw new Error(`Cannot finalize group stage: Only ${allQualifiers.length} team(s) qualified. Minimum 2 teams required for knockout.`);
//       }
      
//       logger.info(`✓ Knockout viable: ${allQualifiers.length} teams qualified`);
      
//       // For backward compatibility, calculate average qualifiers per group
//       const qualifiersPerGroup = Math.round(allQualifiers.length / groups.length);

//       // STEP 3: Generate professional cross-group pairings
//       logger.info(`\n========== CROSS-GROUP PAIRINGS ==========`);
//       const pairings = generateCrossGroupPairings(allQualifiers, groups.length);

//       logger.info(`Generated ${pairings.length} pairings:`);
//       pairings.forEach((pairing, idx) => {
//         logger.info(`  Pairing ${idx + 1}: ${pairing.p1.groupName} Rank ${pairing.p1.rank} vs ${pairing.p2.groupName} Rank ${pairing.p2.rank}`);
//       });

//       // Get knockout stage matches (group_id IS NULL)
//       const [knockoutMatches] = await conn.query(
//         `SELECT id, round_number, match_number, round_name 
//          FROM matches 
//          WHERE tournament_id = ? 
//          AND group_id IS NULL
//          ORDER BY round_number ASC, match_number ASC`,
//         [tournamentId]
//       );

//       if (!knockoutMatches || knockoutMatches.length === 0) {
//         throw new Error('No knockout stage matches found');
//       }

//       logger.info(`\nFound ${knockoutMatches.length} knockout matches`);

//       // Find the first knockout round (minimum round_number)
//       const firstKnockoutRound = Math.min(...knockoutMatches.map(m => m.round_number));
//       logger.info(`First knockout round number: ${firstKnockoutRound}`);

//       // Populate first round of knockout with cross-group pairings
//       const firstRoundKnockout = knockoutMatches.filter(m => m.round_number === firstKnockoutRound);

//       if (firstRoundKnockout.length === 0) {
//         throw new Error('No first round knockout matches found');
//       }

//       logger.info(`\nPopulating ${firstRoundKnockout.length} first round knockout matches...`);

//       // STEP 4: Calculate byes and assign matches professionally
//       const knockoutBracketSize = Math.pow(2, Math.ceil(Math.log2(allQualifiers.length)));
//       const byesNeeded = knockoutBracketSize - allQualifiers.length;

//       logger.info(`\n========== KNOCKOUT BRACKET ASSIGNMENT ==========`);
//       logger.info(`Knockout bracket size: ${knockoutBracketSize}`);
//       logger.info(`Total qualifiers: ${allQualifiers.length}`);
//       logger.info(`Byes needed: ${byesNeeded}`);
//       logger.info(`Actual matches in round 1: ${pairings.length}`);

//       let matchIndex = 0;
//       let byesAssigned = 0;

//       // PROFESSIONAL BYE HANDLING
//       // Top-seeded teams get byes and advance directly to round 2
//       if (byesNeeded > 0) {
//         logger.info(`\n--- Assigning ${byesNeeded} BYEs to Top Seeds ---`);

//         // Sort qualifiers by performance (points, then goal difference)
//         const sortedQualifiers = [...allQualifiers].sort((a, b) => {
//           if (b.points !== a.points) return b.points - a.points;
//           if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
//           return b.goalsFor - a.goalsFor;
//         });

//         // Assign top teams to round 2 matches
//         const round2Matches = knockoutMatches.filter(m => m.round_number === firstKnockoutRound + 1);
        
//         for (let i = 0; i < byesNeeded && i < sortedQualifiers.length; i++) {
//           const byeTeam = sortedQualifiers[i];

//           if (round2Matches && round2Matches[byesAssigned]) {
//             const round2Match = round2Matches[byesAssigned];

//             // Assign bye team to participant2 of round 2 match
//             // Winner from round 1 will go to participant1 via depends_on_match1_id
//             await conn.query(
//               'UPDATE matches SET participant2_id = ? WHERE id = ?',
//               [byeTeam.participantId, round2Match.id]
//             );

//             logger.info(`  BYE ${i + 1}: ${byeTeam.groupName} Rank ${byeTeam.rank} (ID: ${byeTeam.participantId}) → Round 2 Match ${round2Match.match_number}`);
//             logger.info(`         (${byeTeam.points} pts, GD: ${byeTeam.goalDifference})`);
//             byesAssigned++;
//           }
//         }
        
//         logger.info(`✓ ${byesAssigned} BYEs assigned successfully`);
//       }

//       // STEP 5: Assign actual first-round matches
//       logger.info(`\n--- Assigning ${pairings.length} First Round Matches ---`);
      
//       for (const pairing of pairings) {
//         if (matchIndex >= firstRoundKnockout.length) {
//           logger.warn(`⚠ More pairings (${pairings.length}) than available matches (${firstRoundKnockout.length})`);
//           break;
//         }

//         const match = firstRoundKnockout[matchIndex];

//         // Update match with both participants and set status to scheduled
//         await conn.query(
//           'UPDATE matches SET participant1_id = ?, participant2_id = ?, status = ? WHERE id = ?',
//           [pairing.p1.participantId, pairing.p2.participantId, 'scheduled', match.id]
//         );

//         logger.info(`  Match ${matchIndex + 1} (ID: ${match.id}):`);
//         logger.info(`    ${pairing.p1.groupName} Rank ${pairing.p1.rank} (${pairing.p1.participantId})`);
//         logger.info(`    vs`);
//         logger.info(`    ${pairing.p2.groupName} Rank ${pairing.p2.rank} (${pairing.p2.participantId})`);

//         matchIndex++;
//       }
      
//       logger.info(`✓ ${matchIndex} matches assigned successfully`);
      
//       // STEP 6: Mark remaining first-round matches as TBD (if any)
//       const remainingFirstRoundMatches = firstRoundKnockout.length - matchIndex;
//       if (remainingFirstRoundMatches > 0) {
//         logger.info(`\n⚠ ${remainingFirstRoundMatches} first-round matches remain as TBD (no participants assigned)`);
//       }

//       logger.info(`\n========== GROUP STAGE FINALIZED ==========`);
//       logger.info(`Groups: ${groups.length}`);
//       logger.info(`Qualifiers per group: ${qualifiersPerGroup}`);
//       logger.info(`Total qualifiers: ${allQualifiers.length}`);
//       logger.info(`Byes assigned: ${byesAssigned}`);
//       logger.info(`Knockout matches populated: ${matchIndex}`);
//       logger.info(`===========================================\n`);

//       return {
//         success: true,
//         groups: groups.length,
//         qualifiersPerGroup: qualifiersPerGroup,
//         totalQualifiers: allQualifiers.length,
//         knockoutBracketSize: knockoutBracketSize,
//         byesAssigned: byesAssigned,
//         knockoutMatchesPopulated: matchIndex,
//         qualifierDetails: allQualifiers,
//         pairings: pairings
//       };

//     } catch (error) {
//       logger.error('Finalize group stage error:', error);
//       throw error;
//     }
//   });
// };

// /**
//  * Check if group stage is complete and ready to finalize
//  */
// const isGroupStageComplete = async (tournamentId) => {
//   try {
//     const tournament = await getTournamentInfo(tournamentId);

//     if (tournament.format_type !== 'groups_knockout') {
//       return false;
//     }

//     // Check if all group stage matches are completed
//     const result = await query(
//       `SELECT 
//         COUNT(*) as total,
//         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
//        FROM matches 
//        WHERE tournament_id = ? AND group_id IS NOT NULL`,
//       [tournamentId]
//     );

//     console.log("dev======", result);



//     if (!result || result.length === 0) {
//       return false;
//     }

//     const { total, completed } = result[0];

//     // Convert to numbers to ensure proper comparison (completed can be string from SUM)
//     const totalNum = parseInt(total);
//     const completedNum = parseInt(completed);

//     logger.info(`Group stage check: ${completedNum}/${totalNum} matches completed`);

//     return totalNum > 0 && totalNum === completedNum;
//   } catch (error) {
//     logger.error('Check group stage complete error:', error);
//     return false;
//   }
// };

// /**
//  * Get participant details based on tournament category
//  * Returns formatted participant information for display
//  */
// const getParticipantDetails = async (tournamentId, participantId) => {
//   try {
//     const tournament = await getTournamentInfo(tournamentId);

//     switch (tournament.category) {
//       case 'singles':
//         // Get player details from tournament_registrations
//         const players = await query(`
//           SELECT 
//             tr.id,
//             tr.user_id,
//             u.first_name,
//             u.last_name,
//             CONCAT(u.first_name, ' ', u.last_name) as name,
//             u.profile_image,
//             us.skill_level
//           FROM tournament_registrations tr
//           JOIN users u ON tr.user_id = u.id
//           LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = ?
//           WHERE tr.id = ? AND tr.status = 'locked'
//         `, [tournament.sport_id, participantId]);
//         return players[0] || null;

//       case 'doubles':
//       case 'pairs':
//         // Get pair details
//         const pairs = await query(`
//           SELECT 
//             p.id,
//             p.name,
//             p.player1_id,
//             p.player2_id,
//             CONCAT(u1.first_name, ' ', u1.last_name) as player1_name,
//             CONCAT(u2.first_name, ' ', u2.last_name) as player2_name,
//             u1.profile_image as player1_image,
//             u2.profile_image as player2_image
//           FROM pairs p
//           JOIN users u1 ON p.player1_id = u1.id
//           JOIN users u2 ON p.player2_id = u2.id
//           WHERE p.id = ? AND p.status = 'locked'
//         `, [participantId]);
//         return pairs[0] || null;

//       case 'teams':
//         // Get team details with member count
//         const teams = await query(`
//           SELECT 
//             t.id,
//             t.name,
//             t.logo,
//             t.captain_id,
//             CONCAT(u.first_name, ' ', u.last_name) as captain_name,
//             COUNT(tm.id) as member_count
//           FROM teams t
//           JOIN users u ON t.captain_id = u.id
//           LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
//           WHERE t.id = ? AND t.status = 'locked'
//           GROUP BY t.id
//         `, [participantId]);
//         return teams[0] || null;

//       default:
//         throw new Error(`Unknown tournament category: ${tournament.category}`);
//     }
//   } catch (error) {
//     logger.error('Get participant details error:', error);
//     throw error;
//   }
// };

// /**
//  * Format match with participant details for display
//  */
// const formatMatchForDisplay = async (match) => {
//   try {
//     const tournament = await getTournamentInfo(match.tournament_id);

//     // Get participant1 details
//     const participant1 = match.participant1_id
//       ? await getParticipantDetails(match.tournament_id, match.participant1_id)
//       : null;

//     // Get participant2 details
//     const participant2 = match.participant2_id
//       ? await getParticipantDetails(match.tournament_id, match.participant2_id)
//       : null;

//     return {
//       ...match,
//       participant1,
//       participant2,
//       category: tournament.category,
//       format_type: tournament.format_type
//     };
//   } catch (error) {
//     logger.error('Format match for display error:', error);
//     throw error;
//   }
// };

// module.exports = {
//   generateBrackets,
//   generateKnockoutBracket,
//   generateRoundRobinBracket,
//   generateGroupsKnockoutBracket,
//   generateStandardSeeding,
//   getRoundName,
//   getTournamentInfo,
//   advanceWinner,
//   updateStandings,
//   recalculatePositions,
//   finalizeGroupStage,
//   isGroupStageComplete,
//   getParticipantDetails,
//   formatMatchForDisplay
// };

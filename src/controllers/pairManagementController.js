const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * PAIR MANAGEMENT CONTROLLER
 * Handles pair creation for DOUBLES tournaments
 * Only organizers can create and manage pairs
 */

/**
 * Create a new pair
 * POST /api/v1/tournaments/:tournamentId/pairs
 */
const createPair = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { player1_id, player2_id, name } = req.body;

    if (!player1_id || !player2_id) {
      return res.status(400).json({
        success: false,
        message: 'Both player1_id and player2_id are required'
      });
    }

    if (player1_id === player2_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot pair a player with themselves'
      });
    }

    // Verify organizer and tournament category
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    if (tournament[0].category !== 'doubles') {
      return res.status(400).json({
        success: false,
        message: 'Can only create pairs for DOUBLES category tournaments'
      });
    }

    // Verify both players are locked in tournament
    const player1 = await query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ? AND status = "locked"',
      [tournamentId, player1_id]
    );

    const player2 = await query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ? AND status = "locked"',
      [tournamentId, player2_id]
    );

    if (!player1 || player1.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Player 1 must be locked in tournament'
      });
    }

    if (!player2 || player2.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Player 2 must be locked in tournament'
      });
    }

    // Check if either player is already in a pair
    const existingPair = await query(
      'SELECT * FROM pairs WHERE tournament_id = ? AND (player1_id = ? OR player2_id = ? OR player1_id = ? OR player2_id = ?)',
      [tournamentId, player1_id, player1_id, player2_id, player2_id]
    );

    if (existingPair && existingPair.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or both players are already in a pair'
      });
    }

    // Get player names for auto-naming
    const players = await query(
      'SELECT id, first_name, last_name FROM users WHERE id IN (?, ?)',
      [player1_id, player2_id]
    );

    const p1 = players.find(p => p.id === player1_id);
    const p2 = players.find(p => p.id === player2_id);

    const pairName = name || `${p1.first_name} & ${p2.first_name}`;

    // Create pair
    const result = await query(
      'INSERT INTO pairs (tournament_id, player1_id, player2_id, name, created_by, status) VALUES (?, ?, ?, ?, ?, "draft")',
      [tournamentId, player1_id, player2_id, pairName, organizerId]
    );

    res.status(201).json({
      success: true,
      message: 'Pair created successfully',
      data: {
        id: result.insertId,
        tournament_id: tournamentId,
        player1_id,
        player2_id,
        name: pairName,
        status: 'draft'
      }
    });

  } catch (error) {
    console.error('Create pair error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pair',
      error: error.message
    });
  }
};

/**
 * Get all pairs for a tournament
 * GET /api/v1/tournaments/:tournamentId/pairs
 */
const getPairs = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;

    // Verify organizer
    const tournament = await query(
      'SELECT * FROM tournaments WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL',
      [tournamentId, organizerId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or you are not the organizer'
      });
    }

    // Get all pairs with player details
    const pairs = await query(`
      SELECT 
        p.*,
        u1.first_name as player1_first_name,
        u1.last_name as player1_last_name,
        u1.phone as player1_phone,
        u1.profile_image as player1_image,
        us1.skill_level as player1_skill,
        u2.first_name as player2_first_name,
        u2.last_name as player2_last_name,
        u2.phone as player2_phone,
        u2.profile_image as player2_image,
        us2.skill_level as player2_skill
      FROM pairs p
      INNER JOIN users u1 ON p.player1_id = u1.id
      INNER JOIN users u2 ON p.player2_id = u2.id
      LEFT JOIN user_sports us1 ON us1.user_id = u1.id AND us1.sport_id = ?
      LEFT JOIN user_sports us2 ON us2.user_id = u2.id AND us2.sport_id = ?
      WHERE p.tournament_id = ?
      ORDER BY p.created_at DESC
    `, [tournament[0].sport_id, tournament[0].sport_id, tournamentId]);

    res.status(200).json({
      success: true,
      data: {
        pairs,
        total: pairs.length,
        locked: pairs.filter(p => p.status === 'locked').length,
        draft: pairs.filter(p => p.status === 'draft').length
      }
    });

  } catch (error) {
    console.error('Get pairs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pairs',
      error: error.message
    });
  }
};

/**
 * Lock pair (finalize)
 * PUT /api/v1/pairs/:pairId/lock
 */
const lockPair = async (req, res) => {
  try {
    const { pairId } = req.params;
    const organizerId = req.user.id;

    // Get pair and verify organizer
    const pair = await query(`
      SELECT p.*, t.organizer_id
      FROM pairs p
      INNER JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.id = ?
    `, [pairId]);

    if (!pair || pair.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pair not found'
      });
    }

    if (pair[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can lock pairs'
      });
    }

    if (pair[0].status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Pair is already locked'
      });
    }

    // Lock pair
    await query(
      'UPDATE pairs SET status = "locked", locked_at = NOW() WHERE id = ?',
      [pairId]
    );

    // Register both players for the tournament (if not already registered)
    const tournamentId = pair[0].tournament_id;
    const player1Id = pair[0].player1_id;
    const player2Id = pair[0].player2_id;

    // Register Player 1
    const existing1 = await query(
      'SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, player1Id]
    );

    if (existing1.length === 0) {
      await query(
        `INSERT INTO tournament_registrations 
         (tournament_id, user_id, registration_type, status, created_by, locked_at) 
         VALUES (?, ?, 'invitation', 'locked', ?, NOW())`,
        [tournamentId, player1Id, organizerId]
      );
    } else {
      await query(
        'UPDATE tournament_registrations SET status = "locked", locked_at = NOW() WHERE id = ?',
        [existing1[0].id]
      );
    }

    // Register Player 2
    const existing2 = await query(
      'SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, player2Id]
    );

    if (existing2.length === 0) {
      await query(
        `INSERT INTO tournament_registrations 
         (tournament_id, user_id, registration_type, status, created_by, locked_at) 
         VALUES (?, ?, 'invitation', 'locked', ?, NOW())`,
        [tournamentId, player2Id, organizerId]
      );
    } else {
      await query(
        'UPDATE tournament_registrations SET status = "locked", locked_at = NOW() WHERE id = ?',
        [existing2[0].id]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Pair locked successfully and both players registered',
      data: {
        id: pairId,
        status: 'locked',
        players_registered: 2
      }
    });

  } catch (error) {
    console.error('Lock pair error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock pair',
      error: error.message
    });
  }
};

/**
 * Unlock pair
 * PUT /api/v1/pairs/:pairId/unlock
 */
const unlockPair = async (req, res) => {
  try {
    const { pairId } = req.params;
    const organizerId = req.user.id;

    // Get pair and verify organizer
    const pair = await query(`
      SELECT p.*, t.organizer_id
      FROM pairs p
      INNER JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.id = ?
    `, [pairId]);

    if (!pair || pair.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pair not found'
      });
    }

    if (pair[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can unlock pairs'
      });
    }

    if (pair[0].status !== 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Pair is not locked'
      });
    }

    // Unlock pair
    await query(
      'UPDATE pairs SET status = "draft", locked_at = NULL WHERE id = ?',
      [pairId]
    );

    // Unlock both players' registrations
    const tournamentId = pair[0].tournament_id;
    const player1Id = pair[0].player1_id;
    const player2Id = pair[0].player2_id;

    await query(
      'UPDATE tournament_registrations SET status = "accepted", locked_at = NULL WHERE tournament_id = ? AND user_id IN (?, ?)',
      [tournamentId, player1Id, player2Id]
    );

    res.status(200).json({
      success: true,
      message: 'Pair unlocked successfully and players registration updated',
      data: {
        id: pairId,
        status: 'draft'
      }
    });

  } catch (error) {
    console.error('Unlock pair error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock pair',
      error: error.message
    });
  }
};

/**
 * Delete pair
 * DELETE /api/v1/pairs/:pairId
 */
const deletePair = async (req, res) => {
  try {
    const { pairId } = req.params;
    const organizerId = req.user.id;

    // Get pair and verify organizer
    const pair = await query(`
      SELECT p.*, t.organizer_id
      FROM pairs p
      INNER JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.id = ?
    `, [pairId]);

    if (!pair || pair.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pair not found'
      });
    }

    if (pair[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can delete pairs'
      });
    }

    if (pair[0].status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a locked pair. Unlock it first.'
      });
    }

    // Delete pair
    await query('DELETE FROM pairs WHERE id = ?', [pairId]);

    res.status(200).json({
      success: true,
      message: 'Pair deleted successfully'
    });

  } catch (error) {
    console.error('Delete pair error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pair',
      error: error.message
    });
  }
};

/**
 * Update pair name
 * PUT /api/v1/pairs/:pairId
 */
const updatePair = async (req, res) => {
  try {
    const { pairId } = req.params;
    const organizerId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pair name is required'
      });
    }

    // Get pair and verify organizer
    const pair = await query(`
      SELECT p.*, t.organizer_id
      FROM pairs p
      INNER JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.id = ?
    `, [pairId]);

    if (!pair || pair.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pair not found'
      });
    }

    if (pair[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can update pairs'
      });
    }

    // Update pair name
    await query(
      'UPDATE pairs SET name = ? WHERE id = ?',
      [name.trim(), pairId]
    );

    res.status(200).json({
      success: true,
      message: 'Pair updated successfully'
    });

  } catch (error) {
    console.error('Update pair error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pair',
      error: error.message
    });
  }
};

/**
 * Bulk lock pairs
 * POST /api/v1/tournaments/:tournamentId/pairs/bulk-lock
 */
const bulkLockPairs = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { pairIds } = req.body;
    const organizerId = req.user.id;

    if (!pairIds || !Array.isArray(pairIds) || pairIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'pairIds array is required'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT organizer_id FROM tournaments WHERE id = ?',
      [tournamentId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (tournament[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can lock pairs'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const pairId of pairIds) {
      try {
        // Get pair
        const pair = await query(`
          SELECT * FROM pairs 
          WHERE id = ? AND tournament_id = ?
        `, [pairId, tournamentId]);

        if (!pair || pair.length === 0) {
          results.failed.push({ pairId, reason: 'Pair not found' });
          continue;
        }

        // If already locked, skip silently (consider it success)
        if (pair[0].status === 'locked') {
          results.success.push({ pairId, name: pair[0].name, note: 'Already locked' });
          continue;
        }

        // Lock pair
        await query(
          'UPDATE pairs SET status = "locked", locked_at = NOW() WHERE id = ?',
          [pairId]
        );

        // Register both players for the tournament (if not already registered)
        const player1Id = pair[0].player1_id;
        const player2Id = pair[0].player2_id;

        // Register Player 1
        const existing1 = await query(
          'SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
          [tournamentId, player1Id]
        );

        if (existing1.length === 0) {
          await query(
            `INSERT INTO tournament_registrations 
             (tournament_id, user_id, registration_type, status, created_by, locked_at) 
             VALUES (?, ?, 'invitation', 'locked', ?, NOW())`,
            [tournamentId, player1Id, organizerId]
          );
        } else {
          await query(
            'UPDATE tournament_registrations SET status = "locked", locked_at = NOW() WHERE id = ?',
            [existing1[0].id]
          );
        }

        // Register Player 2
        const existing2 = await query(
          'SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
          [tournamentId, player2Id]
        );

        if (existing2.length === 0) {
          await query(
            `INSERT INTO tournament_registrations 
             (tournament_id, user_id, registration_type, status, created_by, locked_at) 
             VALUES (?, ?, 'invitation', 'locked', ?, NOW())`,
            [tournamentId, player2Id, organizerId]
          );
        } else {
          await query(
            'UPDATE tournament_registrations SET status = "locked", locked_at = NOW() WHERE id = ?',
            [existing2[0].id]
          );
        }

        results.success.push({ pairId, name: pair[0].name });
      } catch (error) {
        results.failed.push({ pairId, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: `Locked ${results.success.length} pairs`,
      data: results
    });
  } catch (error) {
    logger.error('Bulk lock pairs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk lock pairs',
      error: error.message
    });
  }
};

/**
 * Bulk unlock pairs
 * POST /api/v1/tournaments/:tournamentId/pairs/bulk-unlock
 */
const bulkUnlockPairs = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { pairIds } = req.body;
    const organizerId = req.user.id;

    if (!pairIds || !Array.isArray(pairIds) || pairIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'pairIds array is required'
      });
    }

    // Verify organizer
    const tournament = await query(
      'SELECT organizer_id FROM tournaments WHERE id = ?',
      [tournamentId]
    );

    if (!tournament || tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (tournament[0].organizer_id !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can unlock pairs'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const pairId of pairIds) {
      try {
        // Get pair
        const pair = await query(`
          SELECT * FROM pairs 
          WHERE id = ? AND tournament_id = ?
        `, [pairId, tournamentId]);

        if (!pair || pair.length === 0) {
          results.failed.push({ pairId, reason: 'Pair not found' });
          continue;
        }

        // If already unlocked, skip silently (consider it success)
        if (pair[0].status !== 'locked') {
          results.success.push({ pairId, name: pair[0].name, note: 'Already unlocked' });
          continue;
        }

        // Unlock pair
        await query(
          'UPDATE pairs SET status = "draft", locked_at = NULL WHERE id = ?',
          [pairId]
        );

        // Unlock both players' registrations
        const player1Id = pair[0].player1_id;
        const player2Id = pair[0].player2_id;

        await query(
          'UPDATE tournament_registrations SET status = "accepted", locked_at = NULL WHERE tournament_id = ? AND user_id IN (?, ?)',
          [tournamentId, player1Id, player2Id]
        );

        results.success.push({ pairId, name: pair[0].name });
      } catch (error) {
        results.failed.push({ pairId, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: `Unlocked ${results.success.length} pairs`,
      data: results
    });
  } catch (error) {
    logger.error('Bulk unlock pairs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk unlock pairs',
      error: error.message
    });
  }
};

module.exports = {
  createPair,
  getPairs,
  lockPair,
  unlockPair,
  deletePair,
  updatePair,
  bulkLockPairs,
  bulkUnlockPairs
};

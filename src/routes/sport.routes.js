const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/sports
 * @desc    Get all sports
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // get all rows
    const sports = await db.query(`SELECT * FROM sports ORDER BY name ASC`);

    res.json({
      success: true,
      data: sports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sports'
    });
  }
});


/**
//  * @route   GET /api/v1/sports/:id
//  * @desc    Get sport by ID
//  * @access  Public
 */
// router.get('/:id', async (req, res) => {
//   try {
//     const [sports] = await db.query(`
//       SELECT 
//         id,
//         name,
//         category,
//         min_players_per_side,
//         max_players_per_side,
//         scoring_system,
//         default_match_duration
//       FROM sports
//       WHERE id = ?
//     `, [req.params.id]);

//     if (sports.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: 'Sport not found'
//       });
//     }

//     res.json({
//       success: true,
//       data: sports[0]
//     });
//   } catch (error) {
//     logger.error('Get sport error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch sport'
//     });
//   }
// });

module.exports = router;

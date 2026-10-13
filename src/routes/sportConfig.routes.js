const express = require('express');
const router = express.Router();
const sportConfigController = require('../controllers/sportConfigController');

/**
 * @route   GET /api/v1/sport-configs
 * @desc    Get all sport configurations
 * @access  Public
 */
router.get('/', sportConfigController.getAllSportConfigs);

/**
 * @route   GET /api/v1/sport-configs/:sportId
 * @desc    Get sport configuration by sport ID
 * @access  Public
 */
router.get('/:sportId', sportConfigController.getSportConfig);

/**
 * @route   GET /api/v1/sport-configs/:sportId/presets
 * @desc    Get match configuration presets for a sport
 * @access  Public
 */
router.get('/:sportId/presets', sportConfigController.getSportPresets);

/**
 * @route   POST /api/v1/sport-configs/validate
 * @desc    Validate match configuration
 * @access  Public
 */
router.post('/validate', sportConfigController.validateMatchConfig);

/**
 * @route   POST /api/v1/sport-configs/calculate-duration
 * @desc    Calculate estimated match duration
 * @access  Public
 */
router.post('/calculate-duration', sportConfigController.calculateDuration);

module.exports = router;

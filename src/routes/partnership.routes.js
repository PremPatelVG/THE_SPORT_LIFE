const express = require('express');
const router = express.Router();
const partnershipController = require('../controllers/partnershipController');
const { auth } = require('../middleware/auth');

/**
 * @route   POST /api/v1/partnerships
 * @desc    Create a new partnership
 * @access  Private
 */
router.post('/', auth, partnershipController.createPartnership);

/**
 * @route   GET /api/v1/partnerships/my/partnerships
 * @desc    Get user's partnerships
 * @access  Private
 */
router.get('/my/partnerships', auth, partnershipController.getMyPartnerships);

/**
 * @route   GET /api/v1/partnerships/:id
 * @desc    Get partnership by ID
 * @access  Private
 */
router.get('/:id', auth, partnershipController.getPartnership);

/**
 * @route   PUT /api/v1/partnerships/:id
 * @desc    Update partnership
 * @access  Private
 */
router.put('/:id', auth, partnershipController.updatePartnership);

/**
 * @route   DELETE /api/v1/partnerships/:id
 * @desc    Delete partnership
 * @access  Private
 */
router.delete('/:id', auth, partnershipController.deletePartnership);

module.exports = router;

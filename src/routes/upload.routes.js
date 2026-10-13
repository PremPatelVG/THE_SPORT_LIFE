const express = require('express');
const router = express.Router();
const { upload, uploadLogo, deleteLogo } = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

/**
 * @route   POST /api/v1/upload/logo
 * @desc    Upload tournament logo
 * @access  Private
 */
router.post('/logo', auth, upload.single('logo'), uploadLogo);

/**
 * @route   DELETE /api/v1/upload/logo/:filename
 * @desc    Delete uploaded logo
 * @access  Private
 */
router.delete('/logo/:filename', auth, deleteLogo);

module.exports = router;

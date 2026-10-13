const express = require('express');
const router = express.Router();
const refereeController = require('../controllers/refereeController');
const { auth } = require('../middleware/auth');

// Public routes
router.get('/', refereeController.getAllReferees);
router.get('/:refereeId', refereeController.getRefereeProfile);
router.get('/:refereeId/certifications', refereeController.getCertifications);
router.get('/:refereeId/performance', refereeController.getPerformance);
router.get('/:refereeId/statistics', refereeController.getStatistics);

// Protected routes - require authentication
router.post('/:refereeId/certifications', auth, refereeController.addCertification);
router.patch('/certifications/:certificationId', auth, refereeController.updateCertification);

router.post('/:refereeId/availability', auth, refereeController.setAvailability);
router.get('/:refereeId/availability', auth, refereeController.getAvailability);

router.get('/:refereeId/assignments', auth, refereeController.getAssignments);
router.get('/:refereeId/requests', auth, refereeController.getAssignmentRequests);

// Assignment management
router.post('/assign', auth, refereeController.assignToMatch);
router.delete('/assign/:matchId', auth, refereeController.cancelAssignment);
router.post('/requests/:requestId/respond', auth, refereeController.respondToAssignment);

// Match-specific
router.get('/available/:matchId', auth, refereeController.getAvailableForMatch);
router.get('/match/:matchId/pending', auth, refereeController.getPendingRequestsForMatch);
router.post('/matches/pending/batch', auth, refereeController.getBatchPendingRequestsForMatches);

// Rating
router.post('/rate', auth, refereeController.ratePerformance);

module.exports = router;

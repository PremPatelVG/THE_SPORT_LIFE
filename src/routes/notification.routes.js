const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get notifications
router.get('/', notificationController.getUserNotifications);
router.get('/unread/count', notificationController.getUnreadCount);

// Mark as read
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

// Delete notifications
router.delete('/:notificationId', notificationController.deleteNotification);
router.delete('/all/clear', notificationController.deleteAllNotifications);

// Preferences
router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreferences);

// Push tokens
router.post('/push-token', notificationController.registerPushToken);
router.delete('/push-token', notificationController.unregisterPushToken);

// Test notification
router.post('/test', notificationController.sendTestNotification);

module.exports = router;

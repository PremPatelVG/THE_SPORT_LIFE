const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      is_read: req.query.is_read !== undefined ? req.query.is_read === 'true' : undefined,
      type: req.query.type,
      priority: req.query.priority,
      unread_only: req.query.unread_only === 'true',
      limit: req.query.limit
    };

    const notifications = await notificationService.getUserNotifications(userId, filters);

    res.json({
      success: true,
      data: notifications,
      total: notifications.length
    });
  } catch (error) {
    logger.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get unread count
 * GET /api/v1/notifications/unread/count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:notificationId/read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const result = await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(error.message === 'Notification not found' ? 404 : 
               error.message === 'Access denied' ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mark all as read
 * PATCH /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete notification
 * DELETE /api/v1/notifications/:notificationId
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const result = await notificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(error.message === 'Notification not found' ? 404 : 
               error.message === 'Access denied' ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete all notifications
 * DELETE /api/v1/notifications/all
 */
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.deleteAllNotifications(userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get notification preferences
 * GET /api/v1/notifications/preferences
 */
const getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await notificationService.getPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update notification preferences
 * PATCH /api/v1/notifications/preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const updated = await notificationService.updatePreferences(userId, preferences);

    res.json({
      success: true,
      data: updated,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Register push token
 * POST /api/v1/notifications/push-token
 */
const registerPushToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, device_type, device_name } = req.body;

    if (!token || !device_type) {
      return res.status(400).json({
        success: false,
        error: 'token and device_type are required'
      });
    }

    const result = await notificationService.registerPushToken(userId, {
      token,
      device_type,
      device_name
    });

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Unregister push token
 * DELETE /api/v1/notifications/push-token
 */
const unregisterPushToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'token is required'
      });
    }

    const result = await notificationService.unregisterPushToken(token);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Unregister push token error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Send test notification
 * POST /api/v1/notifications/test
 */
const sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;

    const notification = await notificationService.createNotification({
      user_id: userId,
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify your notification settings.',
      priority: 'low',
      sent_via: ['in_app', 'email']
    });

    res.json({
      success: true,
      data: notification,
      message: 'Test notification sent'
    });
  } catch (error) {
    logger.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getPreferences,
  updatePreferences,
  registerPushToken,
  unregisterPushToken,
  sendTestNotification
};

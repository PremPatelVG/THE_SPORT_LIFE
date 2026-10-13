const Notification = require('../models/Notification');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Render template with variables
 */
const renderTemplate = (template, variables) => {
  let rendered = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, variables[key]);
  });
  return rendered;
};

/**
 * Create notification from template
 */
const createFromTemplate = async (userId, templateKey, variables, options = {}) => {
  try {
    const template = await Notification.getTemplate(templateKey);
    
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }
    
    const title = renderTemplate(template.title_template, variables);
    const message = renderTemplate(template.message_template, variables);
    
    const notificationData = {
      user_id: userId,
      type: template.type,
      title,
      message,
      data: options.data || null,
      related_id: options.related_id || null,
      related_type: options.related_type || null,
      priority: options.priority || 'medium',
      sent_via: options.sent_via || ['in_app'],
      expires_at: options.expires_at || null
    };
    
    const notificationId = await Notification.create(notificationData);
    
    logger.info(`Notification created from template: ${templateKey} for user ${userId}`);
    
    // Send via other channels if specified
    await sendNotification(notificationId, notificationData);
    
    return await Notification.findById(notificationId);
  } catch (error) {
    logger.error('Create from template error:', error);
    throw error;
  }
};

/**
 * Create custom notification
 */
const createNotification = async (notificationData) => {
  try {
    const notificationId = await Notification.create(notificationData);
    
    logger.info(`Notification created: ${notificationId} for user ${notificationData.user_id}`);
    
    // Send via channels
    await sendNotification(notificationId, notificationData);
    
    return await Notification.findById(notificationId);
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Send notification via channels
 */
const sendNotification = async (notificationId, notificationData) => {
  try {
    // Get user preferences
    const preferences = await Notification.getPreferences(notificationData.user_id);
    
    if (!preferences) {
      // Create default preferences
      await Notification.upsertPreferences(notificationData.user_id, {
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true
      });
      return;
    }
    
    // Check quiet hours
    if (preferences.quiet_hours_enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      
      if (currentTime >= preferences.quiet_hours_start && currentTime <= preferences.quiet_hours_end) {
        logger.info(`Notification ${notificationId} delayed due to quiet hours`);
        return;
      }
    }
    
    const channels = notificationData.sent_via || ['in_app'];
    
    // Send via email
    if (channels.includes('email') && preferences.email_enabled) {
      await sendEmail(notificationData);
    }
    
    // Send via push
    if (channels.includes('push') && preferences.push_enabled) {
      await sendPush(notificationData);
    }
    
    // Send via SMS
    if (channels.includes('sms') && preferences.sms_enabled) {
      await sendSMS(notificationData);
    }
    
  } catch (error) {
    logger.error('Send notification error:', error);
  }
};

/**
 * Send email notification
 */
const sendEmail = async (notificationData) => {
  try {
    const emailService = require('./emailService');
    const users = await query('SELECT email, first_name FROM users WHERE id = ?', [notificationData.user_id]);
    
    if (users[0]) {
      await emailService.sendEmail({
        to: users[0].email,
        subject: notificationData.title,
        html: `
          <h2>${notificationData.title}</h2>
          <p>${notificationData.message}</p>
        `
      });
      
      logger.info(`Email notification sent to user ${notificationData.user_id}`);
    }
  } catch (error) {
    logger.error('Send email notification error:', error);
  }
};

/**
 * Send push notification
 */
const sendPush = async (notificationData) => {
  try {
    const tokens = await Notification.getUserPushTokens(notificationData.user_id);
    
    // TODO: Integrate with Firebase Cloud Messaging or similar service
    logger.info(`Push notification queued for ${tokens.length} devices`);
  } catch (error) {
    logger.error('Send push notification error:', error);
  }
};

/**
 * Send SMS notification
 */
const sendSMS = async (notificationData) => {
  try {
    // TODO: Integrate with Twilio or similar SMS service
    logger.info(`SMS notification queued for user ${notificationData.user_id}`);
  } catch (error) {
    logger.error('Send SMS notification error:', error);
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, filters = {}) => {
  try {
    return await Notification.getUserNotifications(userId, filters);
  } catch (error) {
    logger.error('Get user notifications error:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    if (notification.user_id !== userId) {
      throw new Error('Access denied');
    }
    
    await Notification.markAsRead(notificationId);
    
    logger.info(`Notification marked as read: ${notificationId}`);
    
    return { success: true, message: 'Notification marked as read' };
  } catch (error) {
    logger.error('Mark as read error:', error);
    throw error;
  }
};

/**
 * Mark all as read
 */
const markAllAsRead = async (userId) => {
  try {
    await Notification.markAllAsRead(userId);
    
    logger.info(`All notifications marked as read for user ${userId}`);
    
    return { success: true, message: 'All notifications marked as read' };
  } catch (error) {
    logger.error('Mark all as read error:', error);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    if (notification.user_id !== userId) {
      throw new Error('Access denied');
    }
    
    await Notification.deleteNotification(notificationId);
    
    logger.info(`Notification deleted: ${notificationId}`);
    
    return { success: true, message: 'Notification deleted' };
  } catch (error) {
    logger.error('Delete notification error:', error);
    throw error;
  }
};

/**
 * Delete all notifications
 */
const deleteAllNotifications = async (userId) => {
  try {
    await Notification.deleteAllUserNotifications(userId);
    
    logger.info(`All notifications deleted for user ${userId}`);
    
    return { success: true, message: 'All notifications deleted' };
  } catch (error) {
    logger.error('Delete all notifications error:', error);
    throw error;
  }
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  try {
    return await Notification.getUnreadCount(userId);
  } catch (error) {
    logger.error('Get unread count error:', error);
    throw error;
  }
};

/**
 * Get preferences
 */
const getPreferences = async (userId) => {
  try {
    let preferences = await Notification.getPreferences(userId);
    
    if (!preferences) {
      // Create default preferences
      await Notification.upsertPreferences(userId, {
        email_enabled: true,
        push_enabled: true,
        sms_enabled: false,
        in_app_enabled: true
      });
      
      preferences = await Notification.getPreferences(userId);
    }
    
    return preferences;
  } catch (error) {
    logger.error('Get preferences error:', error);
    throw error;
  }
};

/**
 * Update preferences
 */
const updatePreferences = async (userId, preferences) => {
  try {
    await Notification.upsertPreferences(userId, preferences);
    
    logger.info(`Notification preferences updated for user ${userId}`);
    
    return await Notification.getPreferences(userId);
  } catch (error) {
    logger.error('Update preferences error:', error);
    throw error;
  }
};

/**
 * Register push token
 */
const registerPushToken = async (userId, tokenData) => {
  try {
    tokenData.user_id = userId;
    await Notification.addPushToken(tokenData);
    
    logger.info(`Push token registered for user ${userId}`);
    
    return { success: true, message: 'Push token registered' };
  } catch (error) {
    logger.error('Register push token error:', error);
    throw error;
  }
};

/**
 * Unregister push token
 */
const unregisterPushToken = async (token) => {
  try {
    await Notification.deactivatePushToken(token);
    
    logger.info(`Push token unregistered: ${token}`);
    
    return { success: true, message: 'Push token unregistered' };
  } catch (error) {
    logger.error('Unregister push token error:', error);
    throw error;
  }
};

/**
 * Send bulk notifications
 */
const sendBulkNotifications = async (userIds, notificationData) => {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      ...notificationData
    }));
    
    await Notification.bulkCreate(notifications);
    
    logger.info(`Bulk notifications sent to ${userIds.length} users`);
    
    return {
      success: true,
      message: `Notifications sent to ${userIds.length} users`
    };
  } catch (error) {
    logger.error('Send bulk notifications error:', error);
    throw error;
  }
};

/**
 * Notify match participants
 */
const notifyMatchParticipants = async (matchId, templateKey, variables) => {
  try {
    // Get match participants
    const participants = await query(`
      SELECT DISTINCT u.id
      FROM matches m
      JOIN tournament_participants tp ON (m.participant1_id = tp.id OR m.participant2_id = tp.id)
      JOIN users u ON tp.user_id = u.id
      WHERE m.id = ?
    `, [matchId]);
    
    for (const participant of participants) {
      await createFromTemplate(participant.id, templateKey, variables, {
        related_id: matchId,
        related_type: 'match'
      });
    }
    
    logger.info(`Match notifications sent to ${participants.length} participants`);
  } catch (error) {
    logger.error('Notify match participants error:', error);
  }
};

/**
 * Notify tournament participants
 */
const notifyTournamentParticipants = async (tournamentId, templateKey, variables) => {
  try {
    const participants = await query(`
      SELECT DISTINCT u.id
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
    `, [tournamentId]);
    
    for (const participant of participants) {
      await createFromTemplate(participant.id, templateKey, variables, {
        related_id: tournamentId,
        related_type: 'tournament'
      });
    }
    
    logger.info(`Tournament notifications sent to ${participants.length} participants`);
  } catch (error) {
    logger.error('Notify tournament participants error:', error);
  }
};

/**
 * Clean up expired notifications
 */
const cleanupExpired = async () => {
  try {
    await Notification.deleteExpired();
    logger.info('Expired notifications cleaned up');
  } catch (error) {
    logger.error('Cleanup expired error:', error);
  }
};

module.exports = {
  createFromTemplate,
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  getPreferences,
  updatePreferences,
  registerPushToken,
  unregisterPushToken,
  sendBulkNotifications,
  notifyMatchParticipants,
  notifyTournamentParticipants,
  cleanupExpired
};

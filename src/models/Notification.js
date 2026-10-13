const { query } = require('../config/database');

/**
 * Create notification
 */
const create = async (notificationData) => {
  const sql = `
    INSERT INTO notifications 
    (user_id, type, title, message, data, related_id, related_type, 
     priority, sent_via, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    notificationData.user_id,
    notificationData.type,
    notificationData.title,
    notificationData.message,
    notificationData.data ? JSON.stringify(notificationData.data) : null,
    notificationData.related_id || null,
    notificationData.related_type || null,
    notificationData.priority || 'medium',
    notificationData.sent_via ? JSON.stringify(notificationData.sent_via) : null,
    notificationData.expires_at || null
  ]);
  
  return result.insertId;
};

/**
 * Find notification by ID
 */
const findById = async (notificationId) => {
  const sql = 'SELECT * FROM notifications WHERE id = ?';
  const notifications = await query(sql, [notificationId]);
  return notifications[0] || null;
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, filters = {}) => {
  let sql = `
    SELECT * FROM notifications
    WHERE user_id = ?
  `;
  
  const params = [userId];
  
  if (filters.is_read !== undefined) {
    sql += ' AND is_read = ?';
    params.push(filters.is_read);
  }
  
  if (filters.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  
  if (filters.priority) {
    sql += ' AND priority = ?';
    params.push(filters.priority);
  }
  
  if (filters.unread_only) {
    sql += ' AND is_read = FALSE';
  }
  
  sql += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId) => {
  await query(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?',
    [notificationId]
  );
};

/**
 * Mark all user notifications as read
 */
const markAllAsRead = async (userId) => {
  await query(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId) => {
  await query('DELETE FROM notifications WHERE id = ?', [notificationId]);
};

/**
 * Delete all user notifications
 */
const deleteAllUserNotifications = async (userId) => {
  await query('DELETE FROM notifications WHERE user_id = ?', [userId]);
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  return result[0].count;
};

/**
 * Delete expired notifications
 */
const deleteExpired = async () => {
  await query('DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()');
};

/**
 * Get notification preferences
 */
const getPreferences = async (userId) => {
  const sql = 'SELECT * FROM notification_preferences WHERE user_id = ?';
  const prefs = await query(sql, [userId]);
  return prefs[0] || null;
};

/**
 * Create or update preferences
 */
const upsertPreferences = async (userId, preferences) => {
  const fields = [];
  const values = [];
  
  Object.keys(preferences).forEach(key => {
    if (preferences[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(preferences[key]);
    }
  });
  
  if (fields.length === 0) return;
  
  const sql = `
    INSERT INTO notification_preferences (user_id, ${Object.keys(preferences).join(', ')})
    VALUES (?, ${Object.keys(preferences).map(() => '?').join(', ')})
    ON DUPLICATE KEY UPDATE ${fields.join(', ')}
  `;
  
  await query(sql, [userId, ...Object.values(preferences), ...values]);
};

/**
 * Add push token
 */
const addPushToken = async (tokenData) => {
  const sql = `
    INSERT INTO push_tokens (user_id, token, device_type, device_name)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      is_active = TRUE,
      last_used_at = CURRENT_TIMESTAMP,
      device_name = VALUES(device_name)
  `;
  
  await query(sql, [
    tokenData.user_id,
    tokenData.token,
    tokenData.device_type,
    tokenData.device_name || null
  ]);
};

/**
 * Get user push tokens
 */
const getUserPushTokens = async (userId) => {
  const sql = `
    SELECT * FROM push_tokens
    WHERE user_id = ? AND is_active = TRUE
  `;
  
  return await query(sql, [userId]);
};

/**
 * Deactivate push token
 */
const deactivatePushToken = async (token) => {
  await query('UPDATE push_tokens SET is_active = FALSE WHERE token = ?', [token]);
};

/**
 * Get notification template
 */
const getTemplate = async (templateKey) => {
  const sql = 'SELECT * FROM notification_templates WHERE template_key = ? AND is_active = TRUE';
  const templates = await query(sql, [templateKey]);
  return templates[0] || null;
};

/**
 * Get all templates
 */
const getAllTemplates = async (type = null) => {
  let sql = 'SELECT * FROM notification_templates WHERE is_active = TRUE';
  const params = [];
  
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  
  sql += ' ORDER BY type, template_key';
  
  return await query(sql, params);
};

/**
 * Bulk create notifications
 */
const bulkCreate = async (notifications) => {
  if (notifications.length === 0) return [];
  
  const values = notifications.map(n => [
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.data ? JSON.stringify(n.data) : null,
    n.related_id || null,
    n.related_type || null,
    n.priority || 'medium',
    n.sent_via ? JSON.stringify(n.sent_via) : null,
    n.expires_at || null
  ]);
  
  const sql = `
    INSERT INTO notifications 
    (user_id, type, title, message, data, related_id, related_type, priority, sent_via, expires_at)
    VALUES ?
  `;
  
  await query(sql, [values]);
};

module.exports = {
  create,
  findById,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllUserNotifications,
  getUnreadCount,
  deleteExpired,
  getPreferences,
  upsertPreferences,
  addPushToken,
  getUserPushTokens,
  deactivatePushToken,
  getTemplate,
  getAllTemplates,
  bulkCreate
};

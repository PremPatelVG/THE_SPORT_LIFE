const logger = require('../utils/logger');

/**
 * Setup WebSocket handlers for notifications
 */
const setupNotificationSocket = (io) => {
  const notificationNamespace = io.of('/notifications');

  notificationNamespace.on('connection', (socket) => {
    logger.info(`Client connected to notifications namespace: ${socket.id}`);

    // User joins their personal notification room
    socket.on('join', (userId) => {
      const room = `user_${userId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} joined notification room: ${room}`);
      
      socket.emit('joined', {
        userId,
        message: 'Successfully joined notification room'
      });
    });

    // User leaves notification room
    socket.on('leave', (userId) => {
      const room = `user_${userId}`;
      socket.leave(room);
      logger.info(`Socket ${socket.id} left notification room: ${room}`);
    });

    // Ping/Pong for connection health check
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: Date.now()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected from notifications namespace: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return notificationNamespace;
};

/**
 * Broadcast notification to user
 */
const broadcastToUser = (io, userId, notification) => {
  const room = `user_${userId}`;
  io.of('/notifications').to(room).emit('new_notification', {
    notification,
    timestamp: new Date().toISOString()
  });
  
  logger.info(`Notification broadcasted to user ${userId}`);
};

/**
 * Broadcast unread count update
 */
const broadcastUnreadCount = (io, userId, count) => {
  const room = `user_${userId}`;
  io.of('/notifications').to(room).emit('unread_count_update', {
    count,
    timestamp: new Date().toISOString()
  });
};

/**
 * Broadcast notification read status
 */
const broadcastNotificationRead = (io, userId, notificationId) => {
  const room = `user_${userId}`;
  io.of('/notifications').to(room).emit('notification_read', {
    notificationId,
    timestamp: new Date().toISOString()
  });
};

/**
 * Broadcast notification deleted
 */
const broadcastNotificationDeleted = (io, userId, notificationId) => {
  const room = `user_${userId}`;
  io.of('/notifications').to(room).emit('notification_deleted', {
    notificationId,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  setupNotificationSocket,
  broadcastToUser,
  broadcastUnreadCount,
  broadcastNotificationRead,
  broadcastNotificationDeleted
};

const socketIO = require('socket.io');
const logger = require('../utils/logger');
const { setupScoringSocket } = require('./scoringSocket');
const { setupNotificationSocket } = require('./notificationSocket');

/**
 * Initialize Socket.IO with the HTTP server
 */
const initializeWebSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  logger.info('🔌 Initializing WebSocket server...');

  // Main namespace connection handler
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Setup scoring namespace
  setupScoringSocket(io);
  
  // Setup notification namespace
  setupNotificationSocket(io);

  logger.info('✅ WebSocket server initialized successfully');
  logger.info('   - Main namespace: /');
  logger.info('   - Scoring namespace: /scoring');
  logger.info('   - Notifications namespace: /notifications');

  return io;
};

module.exports = { initializeWebSocket };

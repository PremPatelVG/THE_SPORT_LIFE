require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const { initializeWebSocket } = require('./src/websocket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(server);
app.set('io', io); // make io available in routes

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    // Start listening
    server.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      
      // Resume timers for in-progress matches (after server restart)
      try {
        const matchTimerService = require('./src/services/matchTimerService');
        await matchTimerService.resumeAllActiveMatches(io);
      } catch (error) {
        console.error('⚠️ Error resuming timers:', error.message);
        // Don't exit - server can still run
      }
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🛑 Shutting down server...');
  
  // Stop all active timers
  const matchTimerService = require('./src/services/matchTimerService');
  matchTimerService.stopAllTimers();
  
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

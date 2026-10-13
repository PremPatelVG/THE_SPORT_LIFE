const logger = require('../utils/logger');

/**
 * Setup WebSocket handlers for live scoring
 */
const setupScoringSocket = (io) => {
  const scoringNamespace = io.of('/scoring');

  scoringNamespace.on('connection', (socket) => {
    logger.info(`Client connected to scoring namespace: ${socket.id}`);

    /**
     * Join a match room to receive live updates
     */
    socket.on('join_match', async (matchId) => {
      const room = `match_${matchId}`;
      socket.join(room);
      socket.matchId = matchId; // Store matchId on socket
      logger.info(`Socket ${socket.id} joined match room: ${room}`);
      
      socket.emit('joined_match', {
        matchId,
        message: 'Successfully joined match room'
      });
      
      // Broadcast updated viewer count to all in room
      const viewerCount = await getMatchViewersCount(io, matchId);
      scoringNamespace.to(room).emit('viewer_count', {
        matchId,
        count: viewerCount
      });
    });

    /**
     * Leave a match room
     */
    socket.on('leave_match', async (matchId) => {
      const room = `match_${matchId}`;
      socket.leave(room);
      logger.info(`Socket ${socket.id} left match room: ${room}`);
      
      socket.emit('left_match', {
        matchId,
        message: 'Successfully left match room'
      });
      
      // Broadcast updated viewer count
      const viewerCount = await getMatchViewersCount(io, matchId);
      scoringNamespace.to(room).emit('viewer_count', {
        matchId,
        count: viewerCount
      });
    });

    /**
     * Request current viewer count
     */
    socket.on('request_viewer_count', async (matchId) => {
      const viewerCount = await getMatchViewersCount(io, matchId);
      socket.emit('viewer_count', {
        matchId,
        count: viewerCount
      });
    });

    /**
     * Request current match state
     */
    socket.on('request_match_state', async (matchId) => {
      try {
        const scoringService = require('../services/scoringService');
        const liveState = await scoringService.getLiveState(matchId);
        
        socket.emit('match_state', {
          matchId,
          liveState
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to fetch match state',
          error: error.message
        });
      }
    });

    /**
     * Ping/Pong for connection health check
     */
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: Date.now()
      });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', async () => {
      logger.info(`Client disconnected from scoring namespace: ${socket.id}`);
      
      // Broadcast updated viewer count if socket was in a match room
      if (socket.matchId) {
        const room = `match_${socket.matchId}`;
        const viewerCount = await getMatchViewersCount(io, socket.matchId);
        scoringNamespace.to(room).emit('viewer_count', {
          matchId: socket.matchId,
          count: viewerCount
        });
      }
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return scoringNamespace;
};

/**
 * Broadcast match update to all clients in match room
 */
const broadcastMatchUpdate = (io, matchId, eventType, data) => {
  const room = `match_${matchId}`;
  io.of('/scoring').to(room).emit('match_update', {
    matchId,
    eventType,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Broadcast match started event
 */
const broadcastMatchStarted = (io, matchId, liveState) => {
  const room = `match_${matchId}`;
  io.of('/scoring').to(room).emit('match_started', {
    matchId,
    liveState,
    timestamp: new Date().toISOString()
  });
};

/**
 * Broadcast match completed event
 */
const broadcastMatchCompleted = (io, matchId, winnerParticipantId, finalScore) => {
  const room = `match_${matchId}`;
  io.of('/scoring').to(room).emit('match_completed', {
    matchId,
    winnerParticipantId,
    finalScore,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get connected clients count for a match
 */
const getMatchViewersCount = async (io, matchId) => {
  const room = `match_${matchId}`;
  const sockets = await io.of('/scoring').in(room).fetchSockets();
  return sockets.length;
};

module.exports = {
  setupScoringSocket,
  broadcastMatchUpdate,
  broadcastMatchStarted,
  broadcastMatchCompleted,
  getMatchViewersCount
};

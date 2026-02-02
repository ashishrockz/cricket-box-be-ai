const { Server } = require('socket.io');
const { SOCKET_EVENTS } = require('../config/constants');

let io;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 */
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Connection handling
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a match room for live updates
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (roomId) => {
      socket.join(`room:${roomId}`);
      console.log(`👤 Socket ${socket.id} joined room: ${roomId}`);
    });

    // Leave a match room
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (roomId) => {
      socket.leave(`room:${roomId}`);
      console.log(`👤 Socket ${socket.id} left room: ${roomId}`);
    });

    // Join a specific match for live scoring
    socket.on('join_match', (matchId) => {
      socket.join(`match:${matchId}`);
      console.log(`👤 Socket ${socket.id} joined match: ${matchId}`);
    });

    // Leave a match
    socket.on('leave_match', (matchId) => {
      socket.leave(`match:${matchId}`);
      console.log(`👤 Socket ${socket.id} left match: ${matchId}`);
    });

    // Join user's personal room for notifications
    socket.on(SOCKET_EVENTS.JOIN_USER_ROOM, (userId) => {
      socket.join(`user:${userId}`);
      console.log(`👤 Socket ${socket.id} joined user room: ${userId}`);
    });

    // Leave user's personal room
    socket.on(SOCKET_EVENTS.LEAVE_USER_ROOM, (userId) => {
      socket.leave(`user:${userId}`);
      console.log(`👤 Socket ${socket.id} left user room: ${userId}`);
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Error handling
    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

/**
 * Get Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit event to a specific room
 * @param {string} roomId - Room ID
 * @param {string} event - Event name
 * @param {Object} data - Data to emit
 */
const emitToRoom = (roomId, event, data) => {
  if (io) {
    io.to(`room:${roomId}`).emit(event, data);
  }
};

/**
 * Emit event to a specific match
 * @param {string} matchId - Match ID
 * @param {string} event - Event name
 * @param {Object} data - Data to emit
 */
const emitToMatch = (matchId, event, data) => {
  if (io) {
    io.to(`match:${matchId}`).emit(event, data);
  }
};

/**
 * Emit room update
 * @param {string} roomId - Room ID
 * @param {Object} room - Room data
 */
const emitRoomUpdate = (roomId, room) => {
  emitToRoom(roomId, SOCKET_EVENTS.ROOM_UPDATE, room);
};

/**
 * Emit player joined
 * @param {string} roomId - Room ID
 * @param {Object} player - Player data
 */
const emitPlayerJoined = (roomId, player) => {
  emitToRoom(roomId, SOCKET_EVENTS.PLAYER_JOINED, player);
};

/**
 * Emit player left
 * @param {string} roomId - Room ID
 * @param {Object} player - Player data
 */
const emitPlayerLeft = (roomId, player) => {
  emitToRoom(roomId, SOCKET_EVENTS.PLAYER_LEFT, player);
};

/**
 * Emit match start
 * @param {string} roomId - Room ID
 * @param {Object} match - Match data
 */
const emitMatchStart = (roomId, match) => {
  emitToRoom(roomId, SOCKET_EVENTS.MATCH_START, match);
};

/**
 * Emit toss result
 * @param {string} matchId - Match ID
 * @param {Object} toss - Toss data
 */
const emitTossResult = (matchId, toss) => {
  emitToMatch(matchId, SOCKET_EVENTS.TOSS_RESULT, toss);
};

/**
 * Emit ball update (after each delivery)
 * @param {string} matchId - Match ID
 * @param {Object} ballData - Ball data including score update
 */
const emitBallUpdate = (matchId, ballData) => {
  emitToMatch(matchId, SOCKET_EVENTS.BALL_UPDATE, ballData);
};

/**
 * Emit score update
 * @param {string} matchId - Match ID
 * @param {Object} score - Score data
 */
const emitScoreUpdate = (matchId, score) => {
  emitToMatch(matchId, SOCKET_EVENTS.SCORE_UPDATE, score);
};

/**
 * Emit wicket
 * @param {string} matchId - Match ID
 * @param {Object} wicket - Wicket data
 */
const emitWicket = (matchId, wicket) => {
  emitToMatch(matchId, SOCKET_EVENTS.WICKET, wicket);
};

/**
 * Emit over complete
 * @param {string} matchId - Match ID
 * @param {Object} overData - Over summary data
 */
const emitOverComplete = (matchId, overData) => {
  emitToMatch(matchId, SOCKET_EVENTS.OVER_COMPLETE, overData);
};

/**
 * Emit innings start
 * @param {string} matchId - Match ID
 * @param {Object} innings - Innings data
 */
const emitInningsStart = (matchId, innings) => {
  emitToMatch(matchId, SOCKET_EVENTS.INNINGS_START, innings);
};

/**
 * Emit innings end
 * @param {string} matchId - Match ID
 * @param {Object} innings - Innings summary
 */
const emitInningsEnd = (matchId, innings) => {
  emitToMatch(matchId, SOCKET_EVENTS.INNINGS_END, innings);
};

/**
 * Emit match end
 * @param {string} matchId - Match ID
 * @param {Object} result - Match result
 */
const emitMatchEnd = (matchId, result) => {
  emitToMatch(matchId, SOCKET_EVENTS.MATCH_END, result);
};

/**
 * Emit event to a specific user's personal room
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Data to emit
 */
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit notification to a user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */
const emitNotification = (userId, notification) => {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, notification);
};

/**
 * Emit friend event to a user
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitFriendEvent = (userId, event, data) => {
  emitToUser(userId, event, data);
};

module.exports = {
  initializeSocket,
  getIO,
  emitToRoom,
  emitToMatch,
  emitToUser,
  emitRoomUpdate,
  emitPlayerJoined,
  emitPlayerLeft,
  emitMatchStart,
  emitTossResult,
  emitBallUpdate,
  emitScoreUpdate,
  emitWicket,
  emitOverComplete,
  emitInningsStart,
  emitInningsEnd,
  emitMatchEnd,
  emitNotification,
  emitFriendEvent
};

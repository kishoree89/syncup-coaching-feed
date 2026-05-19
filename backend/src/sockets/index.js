// Socket.IO setup. Attaches to an existing HTTP server so it shares the port
// with Express. Returns the `io` instance so server.js can stash it on the app.
const { Server } = require('socket.io');
const logger = require('../utils/logger');

function initSockets(httpServer) {
  // Same comma-separated-list parsing as the Express CORS layer.
  // CORS_ORIGIN=* is a temporary "allow everything" knob for debugging.
  const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const allowAll = rawOrigin.trim() === '*';
  const allowedOrigins = rawOrigin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowAll ? true : allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

module.exports = { initSockets };

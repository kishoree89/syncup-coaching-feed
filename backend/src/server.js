// Entrypoint. Creates an HTTP server, attaches Socket.IO, and starts listening.
require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initSockets } = require('./sockets');
const logger = require('./utils/logger');

const PORT = Number(process.env.PORT || 4000);

const server = http.createServer(app);
const io = initSockets(server);

// Stash io on the app so controllers can do `req.app.get('io').emit(...)`
// without creating a circular dependency between routes and sockets.
app.set('io', io);

server.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT}`);
});

// Graceful shutdown: close the HTTP server, then exit. Avoids dropping in-flight requests.
const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

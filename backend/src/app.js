// Builds the Express app. No .listen() here so it stays test-friendly
// and so server.js can wrap it in an http.Server (needed for Socket.IO).
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const feedRoutes = require('./routes/feed.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// CORS_ORIGIN may be a single URL or a comma-separated list,
// so we can allow both local dev (http://localhost:3000) and the deployed
// frontend (https://your-app.vercel.app) at the same time.
//
// Set CORS_ORIGIN=* in your environment to temporarily allow everything
// while debugging (NOT recommended for real production).
const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const allowAll = rawOrigin.trim() === '*';
const allowedOrigins = rawOrigin
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = allowAll
  ? { origin: true, credentials: true }
  : {
      // Passing an array (or `false`) — NOT a throwing callback — is what
      // makes the cors library respond to disallowed preflights with a clean
      // 204 + no Access-Control-Allow-Origin header. Throwing in the callback
      // would bubble up to the error handler and return a 500, which is what
      // we previously hit in production.
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    };

app.use(cors(corsOptions));
// Explicit preflight handler — same options. Some hosts don't run the
// app-level CORS middleware on OPTIONS unless we wire this too.
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

// Health check — handy for uptime probes.
app.get('/health', (req, res) => res.json({ ok: true }));

// Feature routes are mounted under /api so the frontend has a clean namespace.
app.use('/api/feed', feedRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

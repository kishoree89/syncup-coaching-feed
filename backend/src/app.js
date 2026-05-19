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
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl requests (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

// Health check — handy for uptime probes.
app.get('/health', (req, res) => res.json({ ok: true }));

// Feature routes are mounted under /api so the frontend has a clean namespace.
app.use('/api/feed', feedRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

// Thin HTTP layer. Validates input, calls the service, emits over Socket.IO.
const feedService = require('../services/feed.service');

// GET /api/feed
async function getFeeds(req, res, next) {
  try {
    const feeds = await feedService.getFeeds();
    res.json({ data: feeds });
  } catch (err) {
    next(err);
  }
}

// POST /api/feed
async function createFeed(req, res, next) {
  try {
    const { title, content, author } = req.body || {};

    // Lightweight validation. Keep it inline so the assessment is easy to read;
    // for a real app, swap for zod/joi.
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: 'title must be <= 200 chars' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'content must be <= 2000 chars' });
    }

    const feed = await feedService.createFeed({ title, content, author });

    // Realtime fanout: every connected client receives 'feed:new'.
    // `io` is attached to the app in server.js so we avoid circular imports.
    const io = req.app.get('io');
    if (io) io.emit('feed:new', feed);

    res.status(201).json({ data: feed });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFeeds, createFeed };

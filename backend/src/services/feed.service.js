// All feed business logic lives here: DB access + cache-aside Redis.
// Keeping it out of controllers makes it easy to test and easy to talk through.
const prisma = require('../config/db');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_KEY = process.env.FEED_CACHE_KEY || 'feed:list';
const CACHE_TTL = Number(process.env.FEED_CACHE_TTL || 60);

// Read path — cache-aside pattern.
// 1) Try Redis. If hit, return parsed JSON (fast path, no DB).
// 2) Miss → query Postgres → write back to Redis with TTL → return.
async function getFeeds() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      logger.info('Cache HIT', CACHE_KEY);
      return JSON.parse(cached);
    }
  } catch (err) {
    // Redis being down should never break reads — fall through to DB.
    logger.warn('Redis GET failed, falling back to DB:', err.message);
  }

  logger.info('Cache MISS', CACHE_KEY);
  const feeds = await prisma.feed.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  try {
    await redis.set(CACHE_KEY, JSON.stringify(feeds), 'EX', CACHE_TTL);
  } catch (err) {
    logger.warn('Redis SET failed:', err.message);
  }

  return feeds;
}

// Write path — write to Postgres, then invalidate the cache.
// We invalidate (DEL) instead of update-in-place to keep things race-free.
// TTL is a backstop in case DEL ever fails silently.
async function createFeed({ title, content, author }) {
  const feed = await prisma.feed.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      author: (author && author.trim()) || 'Coach',
    },
  });

  try {
    await redis.del(CACHE_KEY);
    logger.info('Cache INVALIDATED', CACHE_KEY);
  } catch (err) {
    logger.warn('Redis DEL failed:', err.message);
  }

  return feed;
}

module.exports = { getFeeds, createFeed };

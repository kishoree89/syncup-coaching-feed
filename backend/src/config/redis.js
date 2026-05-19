// Single Redis client. ioredis auto-reconnects with exponential backoff out of the box.
const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Optional: limit reconnect attempts in dev so a broken Redis doesn't spam logs forever.
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err.message));

module.exports = redis;

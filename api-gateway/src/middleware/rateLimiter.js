const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Since we are creating a singleton client, we should connect it.
// In a real app, you'd handle connection errors gracefully.
redisClient.connect().catch(console.error);

const rateLimiterMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  message: {
    error: 'Too many requests, please try again later.'
  }
});

module.exports = { rateLimiterMiddleware, redisClient };

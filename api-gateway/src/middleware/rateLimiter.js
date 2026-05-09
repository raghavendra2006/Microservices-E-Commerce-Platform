const rateLimit = require('express-rate-limit');

const rateLimiterMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: true, // Send `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.'
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

module.exports = { rateLimiterMiddleware };

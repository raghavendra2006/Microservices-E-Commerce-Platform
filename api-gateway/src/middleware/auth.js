const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

function createAuthMiddleware() {
  return async (req, res, next) => {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate`, { token }, {
        headers: { 'X-Request-ID': correlationId },
        timeout: 5000
      });

      if (!response.data.valid) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      // Inject user info into headers for downstream services
      req.headers['x-user-id'] = response.data.claims.sub;
      req.headers['x-user-email'] = response.data.claims.email;
      req.headers['x-user-role'] = response.data.claims.role;
      req.userClaims = response.data.claims;

      next();
    } catch (error) {
      console.log(JSON.stringify({
        level: 'error',
        message: 'Token validation failed',
        correlationId,
        error: error.message,
        service: 'api-gateway',
        timestamp: new Date().toISOString()
      }));
      return res.status(401).json({ error: 'Unauthorized: Token validation failed' });
    }
  };
}

function createAdminMiddleware() {
  return (req, res, next) => {
    if (!req.userClaims || req.userClaims.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  };
}

module.exports = { createAuthMiddleware, createAdminMiddleware };

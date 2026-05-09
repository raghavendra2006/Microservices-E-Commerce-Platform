const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// POST /auth/token - Mock OAuth flow
router.post('/token', async (req, res, next) => {
  try {
    const { email, name, provider, providerId } = req.body;
    const correlationId = req.headers['x-request-id'] || 'unknown';

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'Processing OAuth token request',
      correlationId,
      email,
      service: 'auth-service',
      timestamp: new Date().toISOString()
    }));

    const result = await authService.handleOAuthToken({ email, name, provider, providerId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /auth/validate - Validate JWT
router.post('/validate', async (req, res, next) => {
  try {
    const { token } = req.body;
    const correlationId = req.headers['x-request-id'] || 'unknown';

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'Validating token',
      correlationId,
      service: 'auth-service',
      timestamp: new Date().toISOString()
    }));

    const result = await authService.validateToken(token);

    if (!result.valid) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

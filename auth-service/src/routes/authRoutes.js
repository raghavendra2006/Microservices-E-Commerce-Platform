const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authService = require('../services/authService');

const tokenSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  provider: Joi.string().optional(),
  providerId: Joi.string().optional()
});

const validateSchema = Joi.object({
  token: Joi.string().required()
});

// POST /auth/token - Mock OAuth flow
router.post('/token', async (req, res, next) => {
  try {
    const { error, value } = tokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { email, name, provider, providerId } = value;

    if (req.log) {
      req.log.info({ email }, 'Processing OAuth token request');
    }

    const result = await authService.handleOAuthToken({ email, name, provider, providerId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /auth/validate - Validate JWT
router.post('/validate', async (req, res, next) => {
  try {
    const { error, value } = validateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { token } = value;

    if (req.log) {
      req.log.info('Validating token');
    }

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

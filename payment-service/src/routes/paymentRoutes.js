const express = require('express');
const router = express.Router();
const Joi = require('joi');
const paymentService = require('../services/paymentService');

const webhookSchema = Joi.object({
  type: Joi.string().required(),
  data: Joi.object({
    object: Joi.object({
      id: Joi.string().required(),
      amount: Joi.number().required(),
      currency: Joi.string().required(),
      metadata: Joi.object({
        orderId: Joi.string().required()
      }).unknown(true).required()
    }).unknown(true).required()
  }).unknown(true).required()
}).unknown(true);

// POST /payments/webhooks/stripe - Stripe webhook
router.post('/webhooks/stripe', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    const { error, value } = webhookSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    if (req.log) req.log.info({ eventType: value.type }, 'Processing Stripe webhook');

    await paymentService.processWebhook(value, correlationId);
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

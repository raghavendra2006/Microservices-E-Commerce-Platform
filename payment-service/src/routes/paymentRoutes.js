const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');

// POST /payments/webhooks/stripe - Stripe webhook
router.post('/webhooks/stripe', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';

    console.log(JSON.stringify({
      level: 'info',
      message: 'Processing Stripe webhook',
      correlationId,
      eventType: req.body.type,
      service: 'payment-service',
      timestamp: new Date().toISOString()
    }));

    await paymentService.processWebhook(req.body, correlationId);
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const axios = require('axios');
const paymentRepository = require('../repositories/paymentRepository');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3003';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'dev-internal-service-key-2024';

class PaymentService {
  async processWebhook(event, correlationId) {
    if (event.type !== 'charge.succeeded') {
      const error = new Error('Unsupported event type');
      error.status = 400;
      throw error;
    }

    const charge = event.data.object;
    const orderId = charge.metadata.orderId;

    if (!orderId) {
      const error = new Error('Missing orderId in webhook metadata');
      error.status = 400;
      throw error;
    }

    // Record payment
    const payment = await paymentRepository.create({
      orderId,
      stripeChargeId: charge.id,
      amount: charge.amount / 100, // Convert cents to dollars
      currency: charge.currency || 'usd',
      status: 'SUCCEEDED'
    });

    // Update order status to PAID
    try {
      await axios.patch(
        `${ORDER_SERVICE_URL}/orders/${orderId}/status`,
        { status: 'PAID' },
        {
          headers: {
            'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
            'X-Request-ID': correlationId
          }
        }
      );
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Failed to update order status',
        correlationId,
        orderId,
        error: error.message,
        service: 'payment-service',
        timestamp: new Date().toISOString()
      }));
    }

    return payment;
  }
}

module.exports = new PaymentService();

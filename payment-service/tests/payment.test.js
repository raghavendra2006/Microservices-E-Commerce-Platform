const request = require('supertest');

// Mock database
jest.mock('../src/config/database', () => {
  const mockQuery = jest.fn();
  return {
    pool: {
      query: mockQuery,
      on: jest.fn(),
      end: jest.fn()
    }
  };
});

// Mock axios for inter-service calls
jest.mock('axios');
const axios = require('axios');

const app = require('../src/app');
const { pool } = require('../src/config/database');

const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'dev-internal-service-key-2024';
const headers = {
  'X-Internal-Service-Key': SERVICE_KEY,
  'X-Request-ID': 'test-correlation-id'
};

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'payment-service' });
    });
  });

  describe('Inter-service authentication', () => {
    it('should reject requests without service key', async () => {
      const res = await request(app)
        .post('/payments/webhooks/stripe')
        .send({ type: 'charge.succeeded' });
      expect(res.status).toBe(403);
    });

    it('should reject requests with wrong service key', async () => {
      const res = await request(app)
        .post('/payments/webhooks/stripe')
        .set('X-Internal-Service-Key', 'wrong-key')
        .send({ type: 'charge.succeeded' });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /payments/webhooks/stripe', () => {
    it('should process charge.succeeded webhook and update order status', async () => {
      const payment = {
        id: 'pay-1',
        order_id: 'order-1',
        stripe_charge_id: 'ch_3K',
        amount: 20.00,
        currency: 'usd',
        status: 'SUCCEEDED'
      };

      pool.query.mockResolvedValueOnce({ rows: [payment] }); // create payment
      axios.patch.mockResolvedValueOnce({ data: { id: 'order-1', status: 'PAID' } }); // update order

      const res = await request(app)
        .post('/payments/webhooks/stripe')
        .set(headers)
        .send({
          type: 'charge.succeeded',
          data: {
            object: {
              id: 'ch_3K',
              amount: 2000,
              currency: 'usd',
              metadata: { orderId: 'order-1' }
            }
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/order-1/status'),
        { status: 'PAID' },
        expect.any(Object)
      );
    });

    it('should return 400 for unsupported event type', async () => {
      const res = await request(app)
        .post('/payments/webhooks/stripe')
        .set(headers)
        .send({
          type: 'charge.failed',
          data: { object: { id: 'ch_fail' } }
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when orderId is missing', async () => {
      const res = await request(app)
        .post('/payments/webhooks/stripe')
        .set(headers)
        .send({
          type: 'charge.succeeded',
          data: {
            object: {
              id: 'ch_3K',
              amount: 2000,
              metadata: {}
            }
          }
        });

      expect(res.status).toBe(400);
    });

    it('should handle order service failure gracefully', async () => {
      const payment = {
        id: 'pay-1',
        order_id: 'order-1',
        stripe_charge_id: 'ch_3K',
        amount: 20.00,
        status: 'SUCCEEDED'
      };

      pool.query.mockResolvedValueOnce({ rows: [payment] });
      axios.patch.mockRejectedValueOnce(new Error('Order service down'));

      const res = await request(app)
        .post('/payments/webhooks/stripe')
        .set(headers)
        .send({
          type: 'charge.succeeded',
          data: {
            object: {
              id: 'ch_3K',
              amount: 2000,
              currency: 'usd',
              metadata: { orderId: 'order-1' }
            }
          }
        });

      // Should still return 200 since payment was recorded
      expect(res.status).toBe(200);
    });
  });
});

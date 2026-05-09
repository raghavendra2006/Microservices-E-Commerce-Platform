const request = require('supertest');

// Mock database
jest.mock('../src/config/database', () => {
  const mockQuery = jest.fn();
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  return {
    pool: {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient),
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
  'X-User-ID': 'user-123',
  'X-Request-ID': 'test-correlation-id'
};

describe('Order Service', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'order-service' });
    });
  });

  describe('Inter-service authentication', () => {
    it('should reject requests without service key', async () => {
      const res = await request(app).get('/orders');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /orders', () => {
    it('should create an order successfully', async () => {
      const product = { id: 'prod-1', name: 'Test', price: 25.00, stock: 10 };

      // Mock product service call - get product
      axios.get.mockResolvedValueOnce({ data: product });
      // Mock product service call - deduct stock
      axios.patch.mockResolvedValueOnce({ data: { ...product, stock: 8 } });

      // Mock database - BEGIN, INSERT order, INSERT item, COMMIT
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'order-1', user_id: 'user-123', total: 50.00, status: 'PENDING', created_at: new Date().toISOString() }]
        }) // INSERT order
        .mockResolvedValueOnce({
          rows: [{ id: 'item-1', order_id: 'order-1', product_id: 'prod-1', quantity: 2, price: 25.00 }]
        }) // INSERT order_item
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/orders')
        .set(headers)
        .send({
          items: [{ productId: 'prod-1', quantity: 2 }]
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.id).toBe('order-1');
    });

    it('should return 400 for insufficient stock', async () => {
      const product = { id: 'prod-1', name: 'Test', price: 25.00, stock: 1 };
      axios.get.mockResolvedValueOnce({ data: product });

      const res = await request(app)
        .post('/orders')
        .set(headers)
        .send({
          items: [{ productId: 'prod-1', quantity: 5 }]
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for empty items', async () => {
      const res = await request(app)
        .post('/orders')
        .set(headers)
        .send({ items: [] });

      expect(res.status).toBe(400);
    });

    it('should return 401 without user ID', async () => {
      const res = await request(app)
        .post('/orders')
        .set('X-Internal-Service-Key', SERVICE_KEY)
        .send({ items: [{ productId: 'prod-1', quantity: 1 }] });

      expect(res.status).toBe(401);
    });

    it('should return 400 for non-existent product', async () => {
      axios.get.mockRejectedValueOnce({ response: { status: 404 } });

      const res = await request(app)
        .post('/orders')
        .set(headers)
        .send({ items: [{ productId: 'nonexistent', quantity: 1 }] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return an order by id', async () => {
      const order = { id: 'order-1', user_id: 'user-123', status: 'PENDING', total: 50 };
      const items = [{ id: 'item-1', order_id: 'order-1', product_id: 'prod-1', quantity: 2, price: 25 }];

      pool.query.mockResolvedValueOnce({ rows: [order] }); // order query
      pool.query.mockResolvedValueOnce({ rows: items }); // items query

      const res = await request(app)
        .get('/orders/order-1')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('order-1');
      expect(res.body.items).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/orders/nonexistent')
        .set(headers);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /orders/:id/status', () => {
    it('should update order status', async () => {
      const updated = { id: 'order-1', status: 'PAID' };
      pool.query.mockResolvedValueOnce({ rows: [updated] });

      const res = await request(app)
        .patch('/orders/order-1/status')
        .set(headers)
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PAID');
    });

    it('should return 404 for non-existent order', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/orders/nonexistent/status')
        .set(headers)
        .send({ status: 'PAID' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /orders', () => {
    it('should return user orders', async () => {
      const orders = [
        { id: 'order-1', user_id: 'user-123', status: 'PENDING' }
      ];
      pool.query.mockResolvedValueOnce({ rows: orders });

      const res = await request(app)
        .get('/orders')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});

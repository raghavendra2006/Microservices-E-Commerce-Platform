process.env.AUTH_SERVICE_URL = 'http://test';
process.env.PRODUCT_SERVICE_URL = 'http://test';
process.env.ORDER_SERVICE_URL = 'http://test';
process.env.PAYMENT_SERVICE_URL = 'http://test';
process.env.INTERNAL_SERVICE_KEY = 'test';

const request = require('supertest');

// Mock axios
jest.mock('axios');
const axios = require('axios');
axios.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
axios.create = jest.fn(() => axios);

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid-1234'
}));

const app = require('../src/app');

describe('API Gateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return gateway health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'api-gateway' });
    });
  });

  describe('Correlation ID', () => {
    it('should propagate existing X-Request-ID', async () => {
      axios.mockResolvedValueOnce({
        status: 200,
        data: [],
        headers: { 'content-type': 'application/json' }
      });

      const res = await request(app)
        .get('/api/products')
        .set('X-Request-ID', 'custom-id-123');

      expect(res.headers['x-request-id']).toBe('custom-id-123');
    });

    it('should generate X-Request-ID if not present', async () => {
      axios.mockResolvedValueOnce({
        status: 200,
        data: [],
        headers: { 'content-type': 'application/json' }
      });

      const res = await request(app).get('/api/products');

      expect(res.headers['x-request-id']).toBe('mocked-uuid-1234');
    });
  });

  describe('Routing - Products', () => {
    it('should proxy GET /api/products to product service', async () => {
      axios.mockResolvedValueOnce({
        status: 200,
        data: [{ id: '1', name: 'Product 1' }],
        headers: { 'content-type': 'application/json' }
      });

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('/products')
      }));
    });

    it('should proxy POST /api/products to product service', async () => {
      axios.mockResolvedValueOnce({
        status: 201,
        data: { id: '1', name: 'New Product' },
        headers: { 'content-type': 'application/json' }
      });

      const res = await request(app)
        .post('/api/products')
        .send({ name: 'New Product', price: 10 });

      expect(res.status).toBe(201);
    });
  });

  describe('Routing - Auth', () => {
    it('should proxy POST /api/auth/token to auth service', async () => {
      axios.mockResolvedValueOnce({
        status: 200,
        data: { accessToken: 'jwt-token' },
        headers: { 'content-type': 'application/json' }
      });

      const res = await request(app)
        .post('/api/auth/token')
        .send({ email: 'test@example.com', name: 'Test' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('jwt-token');
    });
  });

  describe('Authentication - Protected Routes', () => {
    it('should reject requests to /api/orders without token', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      // Mock auth service validation failure
      axios.post = jest.fn().mockResolvedValueOnce({
        data: { valid: false }
      });

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should allow requests with valid token', async () => {
      // Mock auth service validation success
      axios.post = jest.fn().mockResolvedValueOnce({
        data: {
          valid: true,
          claims: { sub: 'user-1', email: 'test@example.com', role: 'USER' }
        }
      });

      // Mock the proxy call to order service
      axios.mockResolvedValueOnce({
        status: 200,
        data: [],
        headers: { 'content-type': 'application/json' }
      });

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('RBAC - Admin Routes', () => {
    it('should reject non-admin users from /api/admin/summary', async () => {
      axios.post = jest.fn().mockResolvedValueOnce({
        data: {
          valid: true,
          claims: { sub: 'user-1', email: 'test@example.com', role: 'USER' }
        }
      });

      const res = await request(app)
        .get('/api/admin/summary')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(403);
    });

    it('should allow admin users to /api/admin/summary', async () => {
      axios.post = jest.fn().mockResolvedValueOnce({
        data: {
          valid: true,
          claims: { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' }
        }
      });

      axios.mockResolvedValueOnce({
        status: 200,
        data: { summary: 'Platform operational' },
        headers: { 'content-type': 'application/json' }
      });

      const res = await request(app)
        .get('/api/admin/summary')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
    });
  });

  describe('Proxy Error Handling', () => {
    it('should return 502 when downstream service is unavailable', async () => {
      axios.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(502);
    });
  });
});

const request = require('supertest');

// Mock the database before requiring the app
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

const app = require('../src/app');
const { pool } = require('../src/config/database');

const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'dev-internal-service-key-2024';
const headers = { 'X-Internal-Service-Key': SERVICE_KEY };

describe('Product Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'product-service' });
    });
  });

  describe('Inter-service authentication', () => {
    it('should reject requests without service key', async () => {
      const res = await request(app).get('/products');
      expect(res.status).toBe(403);
    });

    it('should reject requests with wrong service key', async () => {
      const res = await request(app)
        .get('/products')
        .set('X-Internal-Service-Key', 'wrong-key');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /products', () => {
    it('should create a product', async () => {
      const product = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'A test product',
        price: 29.99,
        stock: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      pool.query.mockResolvedValueOnce({ rows: [product] });

      const res = await request(app)
        .post('/products')
        .set(headers)
        .send({ name: 'Test Product', description: 'A test product', price: 29.99, stock: 10 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Product');
      expect(res.body.price).toBe(29.99);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/products')
        .set(headers)
        .send({ price: 10 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /products', () => {
    it('should return all products', async () => {
      const products = [
        { id: '1', name: 'Product 1', price: 10, stock: 5 },
        { id: '2', name: 'Product 2', price: 20, stock: 3 }
      ];
      pool.query.mockResolvedValueOnce({ rows: products });

      const res = await request(app).get('/products').set(headers);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should return empty array when no products', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/products').set(headers);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', async () => {
      const product = { id: 'prod-123', name: 'Test', price: 10, stock: 5 };
      pool.query.mockResolvedValueOnce({ rows: [product] });

      const res = await request(app).get('/products/prod-123').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('prod-123');
    });

    it('should return 404 for non-existent product', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/products/nonexistent').set(headers);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /products/:id', () => {
    it('should update a product', async () => {
      const existing = { id: 'prod-123', name: 'Old', description: 'Old desc', price: 10, stock: 5 };
      const updated = { ...existing, name: 'Updated', price: 15 };

      pool.query.mockResolvedValueOnce({ rows: [existing] }); // findById
      pool.query.mockResolvedValueOnce({ rows: [updated] }); // update

      const res = await request(app)
        .put('/products/prod-123')
        .set(headers)
        .send({ name: 'Updated', price: 15 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('should return 404 for non-existent product', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/products/nonexistent')
        .set(headers)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'prod-123' }] });

      const res = await request(app).delete('/products/prod-123').set(headers);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent product', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/products/nonexistent').set(headers);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /products/:id/inventory', () => {
    it('should update product stock', async () => {
      const updated = { id: 'prod-123', name: 'Test', stock: 8 };
      pool.query.mockResolvedValueOnce({ rows: [updated] });

      const res = await request(app)
        .patch('/products/prod-123/inventory')
        .set(headers)
        .send({ quantity: -2 });

      expect(res.status).toBe(200);
      expect(res.body.stock).toBe(8);
    });

    it('should return 400 for insufficient stock', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/products/prod-123/inventory')
        .set(headers)
        .send({ quantity: -100 });

      expect(res.status).toBe(400);
    });
  });
});

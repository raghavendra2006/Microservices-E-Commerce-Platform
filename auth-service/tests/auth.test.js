process.env.DATABASE_URL = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

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

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-2024';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'auth-service' });
    });
  });

  describe('POST /auth/token', () => {
    it('should create a new user and return JWT when user does not exist', async () => {
      const newUser = {
        id: 'test-uuid-123',
        email: 'new@example.com',
        name: 'New User',
        provider: 'google',
        provider_id: '12345',
        role: 'USER'
      };

      // First query: findByEmail returns nothing
      pool.query.mockResolvedValueOnce({ rows: [] });
      // Second query: create returns new user
      pool.query.mockResolvedValueOnce({ rows: [newUser] });

      const res = await request(app)
        .post('/auth/token')
        .send({
          email: 'new@example.com',
          name: 'New User',
          provider: 'google',
          providerId: '12345'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');

      const decoded = jwt.verify(res.body.accessToken, JWT_SECRET);
      expect(decoded.sub).toBe('test-uuid-123');
      expect(decoded.email).toBe('new@example.com');
      expect(decoded.role).toBe('USER');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return JWT for existing user', async () => {
      const existingUser = {
        id: 'existing-uuid-456',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'ADMIN'
      };

      pool.query.mockResolvedValueOnce({ rows: [existingUser] });

      const res = await request(app)
        .post('/auth/token')
        .send({
          email: 'existing@example.com',
          name: 'Existing User',
          provider: 'google',
          providerId: '67890'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');

      const decoded = jwt.verify(res.body.accessToken, JWT_SECRET);
      expect(decoded.sub).toBe('existing-uuid-456');
      expect(decoded.role).toBe('ADMIN');
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/auth/token')
        .send({ name: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/auth/token')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/validate', () => {
    it('should validate a valid token', async () => {
      const token = jwt.sign(
        { sub: 'user-123', email: 'test@example.com', role: 'USER' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/auth/validate')
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.claims.sub).toBe('user-123');
      expect(res.body.claims.email).toBe('test@example.com');
      expect(res.body.claims.role).toBe('USER');
    });

    it('should reject an invalid token', async () => {
      const res = await request(app)
        .post('/auth/validate')
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
    });

    it('should reject an expired token', async () => {
      const token = jwt.sign(
        { sub: 'user-123', email: 'test@example.com', role: 'USER' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .post('/auth/validate')
        .send({ token });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
    });

    it('should return 400 when token is missing', async () => {
      const res = await request(app)
        .post('/auth/validate')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /admin/summary', () => {
    it('should return admin summary', async () => {
      const res = await request(app).get('/admin/summary');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.service).toBe('auth-service');
    });
  });
});

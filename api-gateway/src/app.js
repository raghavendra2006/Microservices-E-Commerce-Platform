const express = require('express');
const { correlationIdMiddleware } = require('./middleware/correlationId');
const { rateLimiterMiddleware } = require('./middleware/rateLimiter');
const { loggerMiddleware } = require('./middleware/logger');
const { createAuthMiddleware, createAdminMiddleware } = require('./middleware/auth');
const { proxyRequest } = require('./proxy');

const app = express();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3003';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004';

app.use(express.json());
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);
app.use(rateLimiterMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// --- Auth routes (public) ---
app.all('/api/auth/*', (req, res) => {
  const targetPath = req.originalUrl.replace('/api/auth', '/auth');
  proxyRequest(req, res, AUTH_SERVICE_URL, targetPath);
});

// --- Product routes (public) ---
app.all('/api/products/*', (req, res) => {
  const targetPath = req.originalUrl.replace('/api/products', '/products');
  proxyRequest(req, res, PRODUCT_SERVICE_URL, targetPath);
});

app.all('/api/products', (req, res) => {
  proxyRequest(req, res, PRODUCT_SERVICE_URL, '/products');
});

// --- Order routes (protected - requires auth) ---
app.all('/api/orders/*', createAuthMiddleware(), (req, res) => {
  const targetPath = req.originalUrl.replace('/api/orders', '/orders');
  proxyRequest(req, res, ORDER_SERVICE_URL, targetPath);
});

app.all('/api/orders', createAuthMiddleware(), (req, res) => {
  proxyRequest(req, res, ORDER_SERVICE_URL, '/orders');
});

// --- Payment webhook routes (public - Stripe calls this) ---
app.all('/api/payments/*', (req, res) => {
  const targetPath = req.originalUrl.replace('/api/payments', '/payments');
  proxyRequest(req, res, PAYMENT_SERVICE_URL, targetPath);
});

// --- Admin routes (protected - requires admin role) ---
app.all('/api/admin/*', createAuthMiddleware(), createAdminMiddleware(), (req, res) => {
  const targetPath = req.originalUrl.replace('/api/admin', '/admin');
  proxyRequest(req, res, AUTH_SERVICE_URL, targetPath);
});

// Error handler
app.use((err, req, res, next) => {
  const correlationId = req.headers['x-request-id'] || 'unknown';
  console.log(JSON.stringify({
    level: 'error',
    message: err.message,
    correlationId,
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  }));
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const { correlationIdMiddleware } = require('./middleware/correlationId');
const { rateLimiterMiddleware } = require('./middleware/rateLimiter');
const { loggerMiddleware } = require('./middleware/logger');
const { createAuthMiddleware, createAdminMiddleware } = require('./middleware/auth');
const { proxyRequest } = require('./proxy');

const app = express();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;

if (!AUTH_SERVICE_URL || !PRODUCT_SERVICE_URL || !ORDER_SERVICE_URL || !PAYMENT_SERVICE_URL || !process.env.INTERNAL_SERVICE_KEY) {
  console.error("CRITICAL: Missing essential environment variables in API Gateway");
  process.exit(1);
}

app.use(helmet());
app.use(compression());
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
  if (req.log) {
    req.log.error({ err }, err.message || 'Internal server error');
  } else {
    console.error(err);
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

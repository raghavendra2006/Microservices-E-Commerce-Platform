const express = require('express');
const authRoutes = require('./routes/authRoutes');
const { loggerMiddleware } = require('./middleware/logger');

const app = express();

app.use(express.json());
app.use(loggerMiddleware);

// Health check - no service auth required
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Auth routes - no service auth required (gateway calls these)
app.use('/auth', authRoutes);

// Admin summary endpoint
app.get('/admin/summary', (req, res) => {
  const correlationId = req.headers['x-request-id'] || 'unknown';
  console.log(JSON.stringify({
    level: 'info',
    message: 'Admin summary requested',
    correlationId,
    service: 'auth-service',
    timestamp: new Date().toISOString()
  }));
  res.json({
    totalUsers: 2,
    activeUsers: 2,
    summary: 'Platform operational',
    service: 'auth-service'
  });
});

// Error handler
app.use((err, req, res, next) => {
  const correlationId = req.headers['x-request-id'] || 'unknown';
  console.log(JSON.stringify({
    level: 'error',
    message: err.message,
    correlationId,
    service: 'auth-service',
    timestamp: new Date().toISOString()
  }));
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

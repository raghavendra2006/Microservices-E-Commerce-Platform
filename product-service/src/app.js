const express = require('express');
const productRoutes = require('./routes/productRoutes');
const { serviceAuthMiddleware } = require('./middleware/serviceAuth');
const { loggerMiddleware } = require('./middleware/logger');

const app = express();

app.use(express.json());
app.use(loggerMiddleware);

// Health check - no service auth
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

// All other routes require service auth
app.use(serviceAuthMiddleware);
app.use('/products', productRoutes);

// Error handler
app.use((err, req, res, next) => {
  const correlationId = req.headers['x-request-id'] || 'unknown';
  console.log(JSON.stringify({
    level: 'error',
    message: err.message,
    correlationId,
    service: 'product-service',
    timestamp: new Date().toISOString()
  }));
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

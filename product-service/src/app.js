const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const productRoutes = require('./routes/productRoutes');
const { serviceAuthMiddleware } = require('./middleware/serviceAuth');
const { loggerMiddleware } = require('./middleware/logger');

if (!process.env.INTERNAL_SERVICE_KEY || !process.env.DATABASE_URL) {
  console.error("CRITICAL: Missing essential environment variables in Product Service");
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(compression());

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
  if (req.log) {
    req.log.error({ err }, err.message || 'Internal server error');
  } else {
    console.error(err);
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

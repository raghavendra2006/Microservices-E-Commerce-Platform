const express = require('express');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const { loggerMiddleware } = require('./middleware/logger');

if (!process.env.JWT_SECRET || !process.env.INTERNAL_SERVICE_KEY || !process.env.DATABASE_URL) {
  console.error("CRITICAL: Missing essential environment variables in Auth Service");
  process.exit(1);
}

const app = express();

app.use(helmet());

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
  if (req.log) {
    req.log.info('Admin summary requested');
  }
  res.json({
    totalUsers: 2,
    activeUsers: 2,
    summary: 'Platform operational',
    service: 'auth-service'
  });
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

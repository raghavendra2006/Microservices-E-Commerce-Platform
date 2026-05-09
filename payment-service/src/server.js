const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `Payment service started on port ${PORT}`,
    service: 'payment-service',
    timestamp: new Date().toISOString()
  }));
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `Order service started on port ${PORT}`,
    service: 'order-service',
    timestamp: new Date().toISOString()
  }));
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `Product service started on port ${PORT}`,
    service: 'product-service',
    timestamp: new Date().toISOString()
  }));
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

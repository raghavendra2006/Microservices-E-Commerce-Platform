const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `Auth service started on port ${PORT}`,
    service: 'auth-service',
    timestamp: new Date().toISOString()
  }));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

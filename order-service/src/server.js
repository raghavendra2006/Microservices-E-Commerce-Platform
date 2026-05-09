
const cluster = require('cluster');
const os = require('os');
const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3003;
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const server = app.listen(PORT, () => {
    console.log(JSON.stringify({
      level: 'info',
      message: `order-service worker started on port ${PORT}`,
      service: 'order-service',
      pid: process.pid,
      timestamp: new Date().toISOString()
    }));
  });

  const shutdown = async (signal) => {
    server.close(async () => {
      try {
        if (pool) await pool.end();
        process.exit(0);
      } catch (err) {
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

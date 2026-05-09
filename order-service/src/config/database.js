const { Pool } = require('pg');
const { logger } = require('../middleware/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error');
});

module.exports = { pool };

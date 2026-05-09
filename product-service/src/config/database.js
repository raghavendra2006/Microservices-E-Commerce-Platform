const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/product_db'
});

pool.on('error', (err) => {
  console.error(JSON.stringify({
    level: 'error',
    message: 'Unexpected database error',
    error: err.message,
    service: 'product-service',
    timestamp: new Date().toISOString()
  }));
});

module.exports = { pool };

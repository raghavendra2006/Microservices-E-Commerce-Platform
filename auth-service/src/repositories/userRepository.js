const { pool } = require('../config/database');

class UserRepository {
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async create({ email, name, provider, providerId, role = 'USER' }) {
    const result = await pool.query(
      `INSERT INTO users (email, name, provider, provider_id, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, name, provider, providerId, role]
    );
    return result.rows[0];
  }

  async findAll() {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  }
}

module.exports = new UserRepository();

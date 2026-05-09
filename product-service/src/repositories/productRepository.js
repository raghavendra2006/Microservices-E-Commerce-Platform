const { pool } = require('../config/database');

class ProductRepository {
  async findAll() {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    return result.rows;
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async create({ name, description, price, stock }) {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, price, stock]
    );
    return result.rows[0];
  }

  async update(id, { name, description, price, stock }) {
    const result = await pool.query(
      `UPDATE products SET name = $1, description = $2, price = $3, stock = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, description, price, stock, id]
    );
    return result.rows[0] || null;
  }

  async delete(id) {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  async updateStock(id, quantityChange) {
    const result = await pool.query(
      `UPDATE products SET stock = stock + $1, updated_at = NOW()
       WHERE id = $2 AND stock + $1 >= 0
       RETURNING *`,
      [quantityChange, id]
    );
    return result.rows[0] || null;
  }
}

module.exports = new ProductRepository();

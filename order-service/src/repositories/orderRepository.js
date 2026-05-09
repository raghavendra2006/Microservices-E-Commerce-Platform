const { pool } = require('../config/database');

class OrderRepository {
  async create(userId, total, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING *`,
        [userId, total]
      );
      const order = orderResult.rows[0];

      const orderItems = [];
      for (const item of items) {
        const itemResult = await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [order.id, item.productId, item.quantity, item.price]
        );
        orderItems.push(itemResult.rows[0]);
      }

      await client.query('COMMIT');
      return { ...order, items: orderItems };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id) {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!orderResult.rows[0]) return null;

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    return { ...orderResult.rows[0], items: itemsResult.rows };
  }

  async findByUserId(userId) {
    const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  }

  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  }
}

module.exports = new OrderRepository();

const { pool } = require('../config/database');

class PaymentRepository {
  async create({ orderId, stripeChargeId, amount, currency, status }) {
    const result = await pool.query(
      `INSERT INTO payments (order_id, stripe_charge_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orderId, stripeChargeId, amount, currency, status]
    );
    return result.rows[0];
  }

  async findByOrderId(orderId) {
    const result = await pool.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
    return result.rows[0] || null;
  }
}

module.exports = new PaymentRepository();

const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

// POST /orders - Create order
router.post('/', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'Creating order',
      correlationId,
      userId,
      service: 'order-service',
      timestamp: new Date().toISOString()
    }));

    const order = await orderService.createOrder(userId, req.body.items, correlationId);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// GET /orders - List user's orders
router.get('/', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const orders = userId
      ? await orderService.getOrdersByUserId(userId)
      : [];
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /orders/:id - Get order by ID
router.get('/:id', async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// PATCH /orders/:id/status - Update order status (internal)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    const { status } = req.body;

    console.log(JSON.stringify({
      level: 'info',
      message: 'Updating order status',
      correlationId,
      orderId: req.params.id,
      newStatus: status,
      service: 'order-service',
      timestamp: new Date().toISOString()
    }));

    const order = await orderService.updateOrderStatus(req.params.id, status);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

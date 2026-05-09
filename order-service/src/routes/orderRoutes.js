const express = require('express');
const router = express.Router();
const Joi = require('joi');
const orderService = require('../services/orderService');

const orderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

const statusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'PAID', 'FAILED', 'SHIPPED', 'DELIVERED', 'CANCELLED').required()
});

// POST /orders - Create order
router.post('/', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const { error, value } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    if (req.log) req.log.info({ userId }, 'Creating order');

    const order = await orderService.createOrder(userId, value.items, correlationId);
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
    const { error, value } = statusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { status } = value;

    if (req.log) req.log.info({ orderId: req.params.id, newStatus: status }, 'Updating order status');

    const order = await orderService.updateOrderStatus(req.params.id, status);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

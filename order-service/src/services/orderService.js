const axios = require('axios');
const orderRepository = require('../repositories/orderRepository');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'dev-internal-service-key-2024';

class OrderService {
  async createOrder(userId, items, correlationId) {
    if (!items || !items.length) {
      const error = new Error('Order must contain at least one item');
      error.status = 400;
      throw error;
    }

    // Step 1: Validate stock and get prices for all items
    const productDetails = [];
    for (const item of items) {
      try {
        const response = await axios.get(`${PRODUCT_SERVICE_URL}/products/${item.productId}`, {
          headers: {
            'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
            'X-Request-ID': correlationId
          }
        });
        const product = response.data;

        if (product.stock < item.quantity) {
          const error = new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
          error.status = 400;
          throw error;
        }

        productDetails.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          name: product.name
        });
      } catch (error) {
        if (error.status === 400) throw error;
        if (error.response && error.response.status === 404) {
          const err = new Error(`Product ${item.productId} not found`);
          err.status = 400;
          throw err;
        }
        throw error;
      }
    }

    // Step 2: Deduct stock for all items
    const deducted = [];
    try {
      for (const detail of productDetails) {
        await axios.patch(
          `${PRODUCT_SERVICE_URL}/products/${detail.productId}/inventory`,
          { quantity: -detail.quantity },
          {
            headers: {
              'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
              'X-Request-ID': correlationId
            }
          }
        );
        deducted.push(detail);
      }
    } catch (error) {
      // Rollback deducted stock on failure
      for (const item of deducted) {
        try {
          await axios.patch(
            `${PRODUCT_SERVICE_URL}/products/${item.productId}/inventory`,
            { quantity: item.quantity },
            {
              headers: {
                'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
                'X-Request-ID': correlationId
              }
            }
          );
        } catch (rollbackError) {
          console.error(JSON.stringify({
            level: 'error',
            message: 'Failed to rollback stock deduction',
            correlationId,
            productId: item.productId,
            service: 'order-service',
            timestamp: new Date().toISOString()
          }));
        }
      }

      const err = new Error('Insufficient stock or product not found');
      err.status = 400;
      throw err;
    }

    // Step 3: Calculate total and create order
    const total = productDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const order = await orderRepository.create(userId, total, productDetails);

    return order;
  }

  async getOrderById(id) {
    const order = await orderRepository.findById(id);
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }
    return order;
  }

  async getOrdersByUserId(userId) {
    return orderRepository.findByUserId(userId);
  }

  async updateOrderStatus(id, status) {
    const order = await orderRepository.updateStatus(id, status);
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }
    return order;
  }
}

module.exports = new OrderService();

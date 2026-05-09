const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const CircuitBreaker = require('opossum');
const orderRepository = require('../repositories/orderRepository');
const { logger } = require('../middleware/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

const productAxios = axios.create({ timeout: 10000 });
axiosRetry(productAxios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

const breaker = new CircuitBreaker(async (config) => {
  return productAxios(config);
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

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
        const response = await breaker.fire({
          method: 'GET',
          url: `${PRODUCT_SERVICE_URL}/products/${item.productId}`,
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
        await breaker.fire({
          method: 'PATCH',
          url: `${PRODUCT_SERVICE_URL}/products/${detail.productId}/inventory`,
          data: { quantity: -detail.quantity },
          headers: {
            'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
            'X-Request-ID': correlationId
          }
        });
        deducted.push(detail);
      }
    } catch (error) {
      // Rollback deducted stock on failure
      for (const item of deducted) {
        try {
          await breaker.fire({
            method: 'PATCH',
            url: `${PRODUCT_SERVICE_URL}/products/${item.productId}/inventory`,
            data: { quantity: item.quantity },
            headers: {
              'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
              'X-Request-ID': correlationId
            }
          });
        } catch (rollbackError) {
          logger.error({
            err: rollbackError,
            correlationId,
            productId: item.productId,
          }, 'Failed to rollback stock deduction');
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

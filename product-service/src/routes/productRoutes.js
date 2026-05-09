const express = require('express');
const router = express.Router();
const productService = require('../services/productService');

// POST /products - Create product
router.post('/', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    console.log(JSON.stringify({
      level: 'info',
      message: 'Creating product',
      correlationId,
      service: 'product-service',
      timestamp: new Date().toISOString()
    }));
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// GET /products - List all products
router.get('/', async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// GET /products/:id - Get single product
router.get('/:id', async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// PUT /products/:id - Update product
router.put('/:id', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    console.log(JSON.stringify({
      level: 'info',
      message: 'Updating product',
      correlationId,
      productId: req.params.id,
      service: 'product-service',
      timestamp: new Date().toISOString()
    }));
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// DELETE /products/:id - Delete product
router.delete('/:id', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    console.log(JSON.stringify({
      level: 'info',
      message: 'Deleting product',
      correlationId,
      productId: req.params.id,
      service: 'product-service',
      timestamp: new Date().toISOString()
    }));
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PATCH /products/:id/inventory - Update stock (internal)
router.patch('/:id/inventory', async (req, res, next) => {
  try {
    const correlationId = req.headers['x-request-id'] || 'unknown';
    const { quantity } = req.body;
    console.log(JSON.stringify({
      level: 'info',
      message: 'Updating product inventory',
      correlationId,
      productId: req.params.id,
      quantity,
      service: 'product-service',
      timestamp: new Date().toISOString()
    }));
    const product = await productService.updateInventory(req.params.id, quantity);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

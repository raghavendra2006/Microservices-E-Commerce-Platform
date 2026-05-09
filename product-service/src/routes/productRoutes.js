const express = require('express');
const router = express.Router();
const Joi = require('joi');
const productService = require('../services/productService');

const productSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  price: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).default(0)
});

const productUpdateSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(''),
  price: Joi.number().min(0),
  stock: Joi.number().integer().min(0)
}).min(1);

const inventorySchema = Joi.object({
  quantity: Joi.number().integer().required()
});

// POST /products - Create product
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    if (req.log) req.log.info('Creating product');
    const product = await productService.createProduct(value);
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
    const { error, value } = productUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    if (req.log) req.log.info({ productId: req.params.id }, 'Updating product');
    const product = await productService.updateProduct(req.params.id, value);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// DELETE /products/:id - Delete product
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.log) req.log.info({ productId: req.params.id }, 'Deleting product');
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PATCH /products/:id/inventory - Update stock (internal)
router.patch('/:id/inventory', async (req, res, next) => {
  try {
    const { error, value } = inventorySchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { quantity } = value;

    if (req.log) req.log.info({ productId: req.params.id, quantity }, 'Updating product inventory');
    const product = await productService.updateInventory(req.params.id, quantity);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

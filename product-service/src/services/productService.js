const productRepository = require('../repositories/productRepository');

class ProductService {
  async getAllProducts() {
    return productRepository.findAll();
  }

  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return product;
  }

  async createProduct(data) {
    if (!data.name || data.price === undefined) {
      const error = new Error('Name and price are required');
      error.status = 400;
      throw error;
    }
    return productRepository.create({
      name: data.name,
      description: data.description || '',
      price: data.price,
      stock: data.stock || 0
    });
  }

  async updateProduct(id, data) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return productRepository.update(id, {
      name: data.name || existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      price: data.price !== undefined ? data.price : existing.price,
      stock: data.stock !== undefined ? data.stock : existing.stock
    });
  }

  async deleteProduct(id) {
    const deleted = await productRepository.delete(id);
    if (!deleted) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return deleted;
  }

  async updateInventory(id, quantityChange) {
    const updated = await productRepository.updateStock(id, quantityChange);
    if (!updated) {
      const error = new Error('Insufficient stock or product not found');
      error.status = 400;
      throw error;
    }
    return updated;
  }
}

module.exports = new ProductService();

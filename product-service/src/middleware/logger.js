function loggerMiddleware(req, res, next) {
  const correlationId = req.headers['x-request-id'] || 'unknown';
  const start = Date.now();

  res.on('finish', () => {
    console.log(JSON.stringify({
      level: 'info',
      message: `${req.method} ${req.originalUrl} ${res.statusCode}`,
      correlationId,
      service: 'product-service',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: Date.now() - start,
      timestamp: new Date().toISOString()
    }));
  });

  next();
}

module.exports = { loggerMiddleware };

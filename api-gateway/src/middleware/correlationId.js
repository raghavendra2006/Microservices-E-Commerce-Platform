const { v4: uuidv4 } = require('uuid');

function correlationIdMiddleware(req, res, next) {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = uuidv4();
  }
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
}

module.exports = { correlationIdMiddleware };

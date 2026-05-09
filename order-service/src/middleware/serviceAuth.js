const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'dev-internal-service-key-2024';

function serviceAuthMiddleware(req, res, next) {
  const serviceKey = req.headers['x-internal-service-key'];

  if (!serviceKey || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid or missing service key' });
  }

  next();
}

module.exports = { serviceAuthMiddleware };

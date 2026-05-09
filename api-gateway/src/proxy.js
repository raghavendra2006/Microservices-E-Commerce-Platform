const axios = require('axios');

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'dev-internal-service-key-2024';

async function proxyRequest(req, res, targetBaseUrl, targetPath) {
  const correlationId = req.headers['x-request-id'] || 'unknown';
  const url = `${targetBaseUrl}${targetPath}`;

  try {
    console.log(JSON.stringify({
      level: 'info',
      message: `Proxying request to ${url}`,
      correlationId,
      service: 'api-gateway',
      method: req.method,
      timestamp: new Date().toISOString()
    }));

    const headers = {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': INTERNAL_SERVICE_KEY,
      'X-Request-ID': correlationId
    };

    // Forward user headers if they exist
    if (req.headers['x-user-id']) headers['X-User-ID'] = req.headers['x-user-id'];
    if (req.headers['x-user-email']) headers['X-User-Email'] = req.headers['x-user-email'];
    if (req.headers['x-user-role']) headers['X-User-Role'] = req.headers['x-user-role'];
    if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];

    const response = await axios({
      method: req.method,
      url,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      params: req.query,
      headers,
      timeout: 30000,
      validateStatus: () => true // Don't throw on any status
    });

    // Forward specific response headers
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }

    res.status(response.status);

    if (response.data !== undefined && response.data !== '') {
      res.json(response.data);
    } else {
      res.end();
    }
  } catch (error) {
    console.log(JSON.stringify({
      level: 'error',
      message: `Proxy error: ${error.message}`,
      correlationId,
      service: 'api-gateway',
      targetUrl: url,
      timestamp: new Date().toISOString()
    }));
    res.status(502).json({ error: 'Bad Gateway: Service unavailable' });
  }
}

module.exports = { proxyRequest };

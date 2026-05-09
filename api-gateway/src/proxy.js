const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const CircuitBreaker = require('opossum');

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

const proxyAxios = axios.create({ timeout: 30000 });
axiosRetry(proxyAxios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

const breaker = new CircuitBreaker(async (config) => {
  return proxyAxios(config);
}, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

async function proxyRequest(req, res, targetBaseUrl, targetPath) {
  const correlationId = req.headers['x-request-id'] || 'unknown';
  const url = `${targetBaseUrl}${targetPath}`;

  try {
    if (req.log) {
      req.log.info(`Proxying request to ${url}`);
    }
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

    const response = await breaker.fire({
      method: req.method,
      url,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      params: req.query,
      headers,
      validateStatus: () => true // Forward all HTTP statuses
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
    if (req.log) {
      req.log.error({ err: error, targetUrl: url }, `Proxy error: ${error.message}`);
    }
    
    if (error.name === 'CircuitBreakerOpenException') {
      res.status(503).json({ error: 'Service Unavailable: Circuit breaker is open' });
    } else {
      res.status(502).json({ error: 'Bad Gateway: Service unavailable' });
    }
  }
}

module.exports = { proxyRequest };

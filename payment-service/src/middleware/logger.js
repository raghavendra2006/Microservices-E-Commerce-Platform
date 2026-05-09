const pino = require('pino');
const pinoHttp = require('pino-http');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    service: 'payment-service'
  }
});

const loggerMiddleware = pinoHttp({
  logger,
  customProps: (req, res) => {
    return {
      correlationId: req.headers['x-request-id'] || 'unknown',
    };
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'x-request-id': req.headers['x-request-id'],
      }
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    })
  }
});

module.exports = { logger, loggerMiddleware };

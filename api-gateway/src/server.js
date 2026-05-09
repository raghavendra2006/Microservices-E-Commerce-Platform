const app = require('./app');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `API Gateway started on port ${PORT}`,
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  }));
});

# Microservices E-Commerce Platform

A production-ready, distributed e-commerce platform built with a microservices architecture. Features OAuth 2.0 authentication, API Gateway with rate limiting, inter-service security, distributed tracing, and comprehensive testing.

## Architecture

```
                    ┌──────────────────────┐
                    │     API Gateway       │
                    │   (Express.js:8080)   │
                    │  • JWT Validation     │
                    │  • Rate Limiting      │
                    │  • Correlation IDs    │
                    │  • Service Key Inject │
                    └──────────┬───────────┘
           ┌───────────┬──────┴──────┬───────────┐
           ▼           ▼             ▼           ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
    │ Auth Service│ │ Product  │ │  Order   │ │  Payment  │
    │  (3001)     │ │ Service  │ │ Service  │ │  Service  │
    │             │ │  (3002)  │ │  (3003)  │ │  (3004)   │
    └──────┬──────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘
           ▼             ▼            ▼             ▼
    ┌──────────┐  ┌──────────┐ ┌──────────┐  ┌──────────┐
    │ auth-db  │  │product-db│ │ order-db │  │payment-db│
    │(Postgres)│  │(Postgres)│ │(Postgres)│  │(Postgres)│
    └──────────┘  └──────────┘ └──────────┘  └──────────┘
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18 |
| Framework | Express.js |
| Database | PostgreSQL 14 |
| Auth | JWT (jsonwebtoken) |
| Gateway | Custom Express proxy |
| Testing | Jest + Supertest |
| Containerization | Docker + Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd Microservices-E-Commerce-Platform

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d --build

# Verify all services are healthy (wait ~2 minutes)
docker ps
```

All 9 services (4 microservices + 4 databases + 1 gateway) will start and become healthy.

## API Reference

All requests go through the API Gateway at `http://localhost:8080`.

### Authentication

#### Get Token (Mock OAuth)
```bash
POST /api/auth/token
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "Test User",
  "provider": "google",
  "providerId": "123456789"
}

# Response: { "accessToken": "<jwt>" }
```

#### Use Seeded Admin Account
```bash
POST /api/auth/token
Content-Type: application/json

{
  "email": "admin@example.com",
  "name": "Admin User",
  "provider": "google",
  "providerId": "000000001"
}
```

### Products

```bash
# List all products
GET /api/products

# Get single product
GET /api/products/:id

# Create product
POST /api/products
{ "name": "Widget", "description": "A widget", "price": 29.99, "stock": 100 }

# Update product
PUT /api/products/:id
{ "name": "Updated Widget", "price": 39.99 }

# Delete product
DELETE /api/products/:id
```

### Orders (Requires Authentication)

```bash
# Create order (include Bearer token)
POST /api/orders
Authorization: Bearer <token>
{
  "items": [
    { "productId": "<product_id>", "quantity": 2 }
  ]
}

# Get order
GET /api/orders/:id
Authorization: Bearer <token>

# List user's orders
GET /api/orders
Authorization: Bearer <token>
```

### Payments (Webhook)

```bash
# Stripe webhook (simulated)
POST /api/payments/webhooks/stripe
{
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_3K...",
      "amount": 2000,
      "currency": "usd",
      "metadata": {
        "orderId": "<order_id>"
      }
    }
  }
}
```

### Admin (Requires Admin Role)

```bash
GET /api/admin/summary
Authorization: Bearer <admin_token>
```

## Security

### Inter-Service Communication
All backend services validate the `X-Internal-Service-Key` header. Direct calls without this header return `403 Forbidden`.

### Rate Limiting
The API Gateway enforces 20 requests per minute per IP address. Exceeding this limit returns `429 Too Many Requests`.

### JWT Authentication
Protected routes require a valid JWT in the `Authorization: Bearer <token>` header. The gateway validates tokens via the auth service.

### RBAC
- **USER role**: Can create orders, view products
- **ADMIN role**: Can access `/api/admin/*` endpoints

## Distributed Tracing

Every request is tagged with an `X-Request-ID` correlation ID. If the client provides one, it's propagated; otherwise, the gateway generates a UUID. All service logs include this ID for end-to-end tracing.

```bash
# Trace a request across services
docker-compose logs | grep "test-correlation-id-123"
```

## Testing

```bash
# Run tests for each service
docker-compose run auth-service npm run test:coverage
docker-compose run product-service npm run test:coverage
docker-compose run order-service npm run test:coverage
docker-compose run payment-service npm run test:coverage

# Run gateway tests
docker-compose run api-gateway npm run test:coverage
```

All services target ≥70% code coverage.

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|----------|-------------|
| `API_GATEWAY_PORT` | Gateway port (default: 8080) |
| `JWT_SECRET` | Secret for JWT signing |
| `INTERNAL_SERVICE_KEY` | Shared secret for inter-service auth |
| `AUTH_DATABASE_URL` | Auth service PostgreSQL URL |
| `PRODUCT_DATABASE_URL` | Product service PostgreSQL URL |
| `ORDER_DATABASE_URL` | Order service PostgreSQL URL |
| `PAYMENT_DATABASE_URL` | Payment service PostgreSQL URL |

## Project Structure

```
/
├── docker-compose.yml
├── .env.example
├── README.md
├── api-gateway/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── proxy.js
│   │   └── middleware/
│   │       ├── auth.js
│   │       ├── correlationId.js
│   │       ├── logger.js
│   │       └── rateLimiter.js
│   └── tests/
├── auth-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── seeds/init.sql
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/database.js
│   │   ├── middleware/logger.js
│   │   ├── repositories/userRepository.js
│   │   ├── services/authService.js
│   │   └── routes/authRoutes.js
│   └── tests/
├── product-service/   (same structure)
├── order-service/     (same structure)
└── payment-service/   (same structure)
```

## Design Decisions

- **Custom API Gateway**: Chosen over Kong/Traefik for full control over auth flow, rate limiting, and header injection.
- **Repository Pattern**: Each service uses a Repository layer for data access abstraction.
- **Service Layer**: Business logic is encapsulated in Service classes, separate from routes.
- **Synchronous Inter-Service Communication**: Order service calls product service via REST for stock validation. Trade-off: simpler but creates coupling. A message broker (RabbitMQ/Kafka) would be preferred for production scale.
- **Saga-like Rollback**: Order creation implements compensating transactions to restore inventory if stock deduction partially fails.
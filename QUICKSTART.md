# Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development without Docker)
- Git

## Getting Started

### Option 1: Using Docker Compose (Recommended)

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Start infrastructure services**:
```bash
docker-compose up -d
```

This will start:
- RabbitMQ (Message Queue) on port 5672 (Management UI on 15672)
- Redis (Cache) on port 6379
- PostgreSQL databases for each service (ports 5432-5437)

3. **Install dependencies** (if running services locally):
```bash
npm install
npm run install:all
```

4. **Start all services**:
```bash
npm run dev
```

Or start services individually:
```bash
cd services/api-gateway && npm run dev
cd services/user-service && npm run dev
# ... etc
```

### Option 2: Manual Setup

1. **Start infrastructure**:
```bash
docker-compose up -d rabbitmq redis user-db vehicle-db payment-db credit-db telematics-db support-db
```

2. **Configure environment variables**:
   - Copy `.env.example` files in each service directory
   - Update database connection strings
   - Set encryption keys and JWT secrets

3. **Build shared libraries**:
```bash
cd shared/message-queue && npm install && npm run build
cd shared/encryption && npm install && npm run build
cd shared/errors && npm install && npm run build
```

4. **Start services**:
```bash
# Terminal 1 - API Gateway
cd services/api-gateway && npm install && npm run dev

# Terminal 2 - User Service
cd services/user-service && npm install && npm run dev

# Terminal 3 - Vehicle Service
cd services/vehicle-service && npm install && npm run dev

# ... continue for other services
```

## Service Endpoints

Once all services are running:

- **API Gateway**: http://localhost:3000
- **User Service**: http://localhost:3001
- **Vehicle Service**: http://localhost:3002
- **Payment Service**: http://localhost:3003
- **Credit Service**: http://localhost:3004
- **Telematics Service**: http://localhost:3005
- **Support Service**: http://localhost:3006

## RabbitMQ Management UI

Access the RabbitMQ management interface at:
- URL: http://localhost:15672
- Username: admin
- Password: admin123

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+256700000000",
    "role": "customer"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Save the token from the response for authenticated requests.

### 3. List Vehicles

```bash
curl http://localhost:3000/api/vehicles?vehicleType=car&limit=10
```

### 4. Create a Vehicle (requires authentication)

```bash
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "make": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "vehicleType": "car",
    "price": 15000000,
    "depositAmount": 3000000,
    "monthlyPayment": 500000,
    "paymentFrequency": "monthly",
    "totalInstallments": 24,
    "description": "Well maintained Toyota Corolla"
  }'
```

### 5. Submit KYC Document

```bash
curl -X POST http://localhost:3000/api/kyc/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "userId": "USER_ID_FROM_REGISTRATION",
    "documentType": "national_id",
    "documentNumber": "CM123456789",
    "documentUrl": "https://example.com/documents/id.pdf"
  }'
```

## Environment Variables

### API Gateway
- `PORT`: Service port (default: 3000)
- `JWT_SECRET`: Secret key for JWT tokens
- `USER_SERVICE_URL`: User service URL
- `VEHICLE_SERVICE_URL`: Vehicle service URL
- `PAYMENT_SERVICE_URL`: Payment service URL
- `CREDIT_SERVICE_URL`: Credit service URL
- `TELEMATICS_SERVICE_URL`: Telematics service URL
- `SUPPORT_SERVICE_URL`: Support service URL

### Each Service
- `PORT`: Service port
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `RABBITMQ_URL`: RabbitMQ connection URL
- `ENCRYPTION_KEY`: Encryption key (min 32 characters)

## Troubleshooting

### Services won't start
1. Check if ports are already in use
2. Verify Docker containers are running: `docker ps`
3. Check service logs: `docker-compose logs [service-name]`

### Database connection errors
1. Verify database containers are running
2. Check database credentials in environment variables
3. Ensure database schema is initialized (happens automatically on first start)

### Message queue connection errors
1. Verify RabbitMQ is running: `docker ps | grep rabbitmq`
2. Check RabbitMQ management UI: http://localhost:15672
3. Verify connection URL in environment variables

### Build errors
1. Ensure all shared libraries are built first
2. Run `npm install` in each service directory
3. Check Node.js version: `node --version` (should be 18+)

## Next Steps

1. **Configure Production Environment Variables**: Update all `.env` files with production values
2. **Set Strong Encryption Keys**: Generate secure encryption keys for each service
3. **Configure Mobile Money APIs**: Integrate actual mobile money provider APIs in payment service
4. **Set Up Monitoring**: Add monitoring and logging infrastructure
5. **Deploy to Production**: Use Kubernetes or similar orchestration platform

## Development Tips

- Use the RabbitMQ management UI to monitor message queues
- Check service health endpoints: `http://localhost:PORT/health`
- Services automatically create database schemas on first start
- Use Postman or similar tools for API testing
- Enable TypeScript strict mode for better type safety


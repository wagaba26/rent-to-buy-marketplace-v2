# Development Environment Deployment Guide

This guide covers what you need to deploy the platform to a **development environment**. Dev environments are simpler than production and focus on getting everything running quickly.

---

## What You Need to Deploy to Dev

### 1. Infrastructure Services (Required)

These are the supporting services that all your applications depend on:

#### **Databases** (7 PostgreSQL databases)
- User Service Database
- Vehicle Service Database  
- Payment Service Database
- Credit Service Database
- Telematics Service Database
- Support Service Database
- Main App Database (for Next.js API routes)

#### **Message Queue**
- RabbitMQ (for async communication between services)

#### **Cache** (Optional but recommended)
- Redis (for caching)

**✅ Already configured in `docker-compose.yml`**

### 2. Backend Microservices (7 services)

- **API Gateway** (Port 3000) - Entry point for all API requests
- **User Service** (Port 3001) - User management, authentication
- **Vehicle Service** (Port 3002) - Vehicle inventory management
- **Payment Service** (Port 3003) - Payment processing
- **Credit Service** (Port 3004) - Credit scoring
- **Telematics Service** (Port 3005) - Vehicle tracking
- **Support Service** (Port 3006) - Customer support

### 3. Frontend Application

- **Next.js Frontend** (Port 3000 or separate port) - Main web application

### 4. External Services

- **Instant.dev** - Real-time data synchronization (free tier available)

---

## Quick Start: Deploy to Dev

### Option 1: Docker Compose (Easiest - Recommended for Dev)

This is the simplest way to get everything running in dev.

#### Step 1: Start Infrastructure

```bash
# Start all infrastructure services (databases, RabbitMQ, Redis)
docker-compose up -d
```

This starts:
- 7 PostgreSQL databases (ports 5432-5437)
- RabbitMQ (port 5672, Management UI on 15672)
- Redis (port 6379)

**Verify infrastructure is running:**
```bash
docker ps
# Should see: rabbitmq, redis, and 7 postgres containers
```

#### Step 2: Set Up Environment Variables

**For Next.js Frontend** - Create `.env` in project root:

```env
# Database (for API routes)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rent_to_own
DB_USER=postgres
DB_PASSWORD=postgres

# JWT (use dev-friendly values, NOT production secrets)
JWT_SECRET=dev-jwt-secret-key-min-32-characters-long
ENCRYPTION_KEY=dev-encryption-key-min-32-characters-long

# Instant.dev (get free App ID from https://instant.dev)
NEXT_PUBLIC_INSTANT_APP_ID=your-instant-app-id-here

# API Gateway URL (if running separately)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**For Each Microservice** - Create `.env` in each service directory:

**`services/api-gateway/.env`:**
```env
PORT=3000
JWT_SECRET=dev-jwt-secret-key-min-32-characters-long
USER_SERVICE_URL=http://localhost:3001
VEHICLE_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3003
CREDIT_SERVICE_URL=http://localhost:3004
TELEMATICS_SERVICE_URL=http://localhost:3005
SUPPORT_SERVICE_URL=http://localhost:3006
```

**`services/user-service/.env`:**
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=userdb
DB_USER=user
DB_PASSWORD=userpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
ENCRYPTION_KEY=dev-encryption-key-min-32-characters-long
JWT_SECRET=dev-jwt-secret-key-min-32-characters-long
```

**`services/vehicle-service/.env`:**
```env
PORT=3002
DB_HOST=localhost
DB_PORT=5433
DB_NAME=vehicledb
DB_USER=vehicle
DB_PASSWORD=vehiclepass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

**`services/payment-service/.env`:**
```env
PORT=3003
DB_HOST=localhost
DB_PORT=5434
DB_NAME=paymentdb
DB_USER=payment
DB_PASSWORD=paymentpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
ENCRYPTION_KEY=dev-encryption-key-min-32-characters-long
```

**`services/credit-service/.env`:**
```env
PORT=3004
DB_HOST=localhost
DB_PORT=5435
DB_NAME=creditdb
DB_USER=credit
DB_PASSWORD=creditpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

**`services/telematics-service/.env`:**
```env
PORT=3005
DB_HOST=localhost
DB_PORT=5436
DB_NAME=telematicsdb
DB_USER=telematics
DB_PASSWORD=telematicspass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

**`services/support-service/.env`:**
```env
PORT=3006
DB_HOST=localhost
DB_PORT=5437
DB_NAME=supportdb
DB_USER=support
DB_PASSWORD=supportpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

#### Step 3: Install Dependencies

```bash
# Install root dependencies (Next.js frontend)
npm install

# Install dependencies for each service
cd services/api-gateway && npm install && cd ../..
cd services/user-service && npm install && cd ../..
cd services/vehicle-service && npm install && cd ../..
cd services/payment-service && npm install && cd ../..
cd services/credit-service && npm install && cd ../..
cd services/telematics-service && npm install && cd ../..
cd services/support-service && npm install && cd ../..

# Install shared libraries
cd shared/message-queue && npm install && cd ../..
cd shared/encryption && npm install && cd ../..
cd shared/errors && npm install && cd ../..
cd shared/http-client && npm install && cd ../..
```

#### Step 4: Initialize Database

```bash
# Initialize main app database
npm run init-db
```

#### Step 5: Start Services

**Option A: Run all services manually (for debugging)**

Open multiple terminals:

```bash
# Terminal 1 - API Gateway
cd services/api-gateway
npm run dev

# Terminal 2 - User Service
cd services/user-service
npm run dev

# Terminal 3 - Vehicle Service
cd services/vehicle-service
npm run dev

# Terminal 4 - Payment Service
cd services/payment-service
npm run dev

# Terminal 5 - Credit Service
cd services/credit-service
npm run dev

# Terminal 6 - Telematics Service
cd services/telematics-service
npm run dev

# Terminal 7 - Support Service
cd services/support-service
npm run dev

# Terminal 8 - Next.js Frontend
cd ../..  # Back to root
npm run dev
```

**Option B: Use a process manager (easier)**

Install `concurrently`:
```bash
npm install -g concurrently
```

Create `start-dev.sh` (Linux/Mac) or `start-dev.ps1` (Windows):

**Linux/Mac (`start-dev.sh`):**
```bash
#!/bin/bash
concurrently \
  "cd services/api-gateway && npm run dev" \
  "cd services/user-service && npm run dev" \
  "cd services/vehicle-service && npm run dev" \
  "cd services/payment-service && npm run dev" \
  "cd services/credit-service && npm run dev" \
  "cd services/telematics-service && npm run dev" \
  "cd services/support-service && npm run dev" \
  "npm run dev"
```

**Windows (`start-dev.ps1`):**
```powershell
concurrently `
  "cd services/api-gateway; npm run dev" `
  "cd services/user-service; npm run dev" `
  "cd services/vehicle-service; npm run dev" `
  "cd services/payment-service; npm run dev" `
  "cd services/credit-service; npm run dev" `
  "cd services/telematics-service; npm run dev" `
  "cd services/support-service; npm run dev" `
  "npm run dev"
```

Run it:
```bash
# Linux/Mac
chmod +x start-dev.sh
./start-dev.sh

# Windows
.\start-dev.ps1
```

#### Step 6: Verify Everything is Running

1. **Check infrastructure:**
```bash
docker ps
# Should see all containers running
```

2. **Check services:**
```bash
# Health check endpoints
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Vehicle Service
# ... etc
```

3. **Access management UIs:**
- RabbitMQ Management: http://localhost:15672 (admin/admin123)
- Frontend: http://localhost:3000

---

### Option 2: Docker Compose for Services (More Isolated)

If you want to run the microservices in Docker too:

1. **Create `docker-compose.dev.yml`** (extends the base one)
2. **Add service definitions** for each microservice
3. **Run:** `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d`

This is more complex but keeps everything containerized.

---

### Option 3: Kubernetes (Overkill for Dev, but possible)

If you want to test Kubernetes locally:

1. **Install minikube or kind:**
```bash
# Minikube
minikube start

# Or kind
kind create cluster
```

2. **Follow the Kubernetes deployment guide** but use dev values:
   - Use simpler resource limits
   - Single replica per service
   - No autoscaling
   - Dev-friendly secrets

---

## Minimum Requirements for Dev

### What You MUST Have:

1. ✅ **PostgreSQL** - At least one database (can use single DB for dev)
2. ✅ **Node.js 18+** - To run services
3. ✅ **Docker & Docker Compose** - For infrastructure
4. ✅ **Instant.dev Account** - Free tier works

### What You CAN Skip in Dev:

- ❌ **Multiple databases** - Can use single PostgreSQL with different schemas
- ❌ **RabbitMQ** - Services can work without it (some features disabled)
- ❌ **Redis** - Optional caching
- ❌ **SSL/TLS** - HTTP is fine for local dev
- ❌ **Monitoring** - Basic logging is enough
- ❌ **Load balancing** - Not needed for dev
- ❌ **Autoscaling** - Single instance per service

### Simplified Dev Setup (Minimal)

If you want the absolute minimum:

1. **Single PostgreSQL database** (instead of 7)
2. **Run only essential services:**
   - Next.js Frontend
   - API Gateway
   - User Service
   - Vehicle Service
3. **Skip optional services:**
   - Payment Service (mock it)
   - Credit Service (mock it)
   - Telematics Service (skip)
   - Support Service (skip)

---

## Dev Environment Checklist

Use this checklist when setting up dev:

- [ ] Docker and Docker Compose installed
- [ ] Node.js 18+ installed
- [ ] Infrastructure services running (`docker-compose up -d`)
- [ ] All `.env` files created with correct values
- [ ] Dependencies installed (root + all services)
- [ ] Database initialized (`npm run init-db`)
- [ ] Instant.dev App ID configured
- [ ] All services starting without errors
- [ ] Health checks passing
- [ ] Frontend accessible at http://localhost:3000
- [ ] Can register/login users
- [ ] Can browse vehicles
- [ ] Real-time updates working (Instant.dev)

---

## Common Dev Issues

### Port Already in Use

```bash
# Find what's using the port
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Kill the process or change port in .env
```

### Database Connection Failed

```bash
# Check if database container is running
docker ps | grep postgres

# Check database logs
docker logs rent-to-own-user-db

# Verify credentials in .env match docker-compose.yml
```

### Services Can't Find Each Other

- Check service URLs in `.env` files
- Ensure services are running on correct ports
- Check firewall isn't blocking localhost connections

### Instant.dev Not Working

- Verify `NEXT_PUBLIC_INSTANT_APP_ID` is set correctly
- Check Instant.dev dashboard for app status
- Ensure frontend can reach Instant.dev (no firewall blocking)

---

## Dev vs Production Differences

| Aspect | Dev | Production |
|--------|-----|------------|
| **Databases** | Single or multiple local DBs | Managed databases (RDS, Cloud SQL) |
| **Secrets** | Simple dev secrets | Strong, randomly generated |
| **SSL/TLS** | HTTP (localhost) | HTTPS required |
| **Monitoring** | Basic logging | Full monitoring stack |
| **Scaling** | Single instance | Auto-scaling, multiple replicas |
| **Backups** | Manual (optional) | Automated daily backups |
| **Message Queue** | Optional | Required, high availability |
| **Cache** | Optional | Recommended for performance |

---

## Next Steps After Dev Deployment

1. **Test all features** - Register, login, browse vehicles, etc.
2. **Set up Instant.dev** - Configure real-time features
3. **Add test data** - Seed some vehicles and users
4. **Configure mobile money** - Set up sandbox/test accounts
5. **Set up CI/CD** - Automate deployments
6. **Plan production deployment** - Use [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md)

---

## Quick Reference

### Start Everything
```bash
# 1. Infrastructure
docker-compose up -d

# 2. Services (use process manager or multiple terminals)
npm run dev  # Frontend
# + all microservices
```

### Stop Everything
```bash
# Stop services (Ctrl+C in terminals)

# Stop infrastructure
docker-compose down
```

### Reset Dev Environment
```bash
# Stop everything
docker-compose down -v  # -v removes volumes (deletes data)

# Restart
docker-compose up -d
npm run init-db
```

### View Logs
```bash
# Infrastructure logs
docker-compose logs -f

# Service logs (if running in Docker)
docker-compose logs -f <service-name>
```

---

**Need help?** Check:
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [README.md](README.md) - Main documentation
- [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) - Production deployment




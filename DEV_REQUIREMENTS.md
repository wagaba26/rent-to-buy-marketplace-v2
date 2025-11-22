# What You Need to Deploy to Dev - Quick Reference

## Summary

To deploy the Rent-to-Own Marketplace to a **development environment**, you need:

### ✅ Infrastructure (3 components)
1. **7 PostgreSQL Databases** - One per microservice
2. **RabbitMQ** - Message queue for async communication
3. **Redis** - Caching (optional but recommended)

### ✅ Backend Services (7 microservices)
1. **API Gateway** (Port 3000)
2. **User Service** (Port 3001)
3. **Vehicle Service** (Port 3002)
4. **Payment Service** (Port 3003)
5. **Credit Service** (Port 3004)
6. **Telematics Service** (Port 3005)
7. **Support Service** (Port 3006)

### ✅ Frontend (1 application)
1. **Next.js Frontend** (Port 3000 or separate)

### ✅ External Services (1)
1. **Instant.dev** - Real-time data sync (free tier available)

---

## Total Components

- **11 Infrastructure containers** (7 DBs + RabbitMQ + Redis + 2 volumes)
- **7 Backend microservices**
- **1 Frontend application**
- **1 External service** (Instant.dev)

**Total: 20 components** (but many can be simplified for dev)

---

## Minimum Dev Setup

If you want the **absolute minimum** to get started:

### Essential Only:
1. ✅ **1 PostgreSQL database** (can share schemas)
2. ✅ **Next.js Frontend**
3. ✅ **API Gateway**
4. ✅ **User Service**
5. ✅ **Vehicle Service**
6. ✅ **Instant.dev**

**Total: 6 components** (much simpler!)

### Can Skip in Dev:
- ❌ Payment Service (mock it)
- ❌ Credit Service (mock it)
- ❌ Telematics Service
- ❌ Support Service
- ❌ RabbitMQ (if not using async features)
- ❌ Redis (if not caching)
- ❌ Multiple databases (use single DB)

---

## Deployment Methods

### Method 1: Docker Compose (Recommended)
- **Infrastructure**: Docker Compose
- **Services**: Run locally with Node.js
- **Time**: 30-60 minutes
- **Complexity**: Low

### Method 2: All Docker
- **Everything**: Docker Compose
- **Time**: 1-2 hours
- **Complexity**: Medium

### Method 3: Kubernetes
- **Everything**: Kubernetes
- **Time**: 2-4 hours
- **Complexity**: High (overkill for dev)

---

## Prerequisites

- ✅ Docker & Docker Compose
- ✅ Node.js 18+
- ✅ npm or yarn
- ✅ Git
- ✅ Instant.dev account (free)

---

## Quick Start Command

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Set up .env files (see DEV_DEPLOYMENT.md)

# 4. Initialize database
npm run init-db

# 5. Start services
npm run dev  # Frontend
# + start each microservice in separate terminals
```

---

## File Checklist

Make sure you have these files configured:

- [ ] `.env` (root) - Frontend config
- [ ] `services/api-gateway/.env`
- [ ] `services/user-service/.env`
- [ ] `services/vehicle-service/.env`
- [ ] `services/payment-service/.env`
- [ ] `services/credit-service/.env`
- [ ] `services/telematics-service/.env`
- [ ] `services/support-service/.env`
- [ ] `docker-compose.yml` (already exists)

---

## Ports Used

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | Web UI |
| API Gateway | 3000 | API entry point |
| User Service | 3001 | User management |
| Vehicle Service | 3002 | Vehicles |
| Payment Service | 3003 | Payments |
| Credit Service | 3004 | Credit scoring |
| Telematics Service | 3005 | Tracking |
| Support Service | 3006 | Support |
| PostgreSQL (main) | 5432 | Database |
| PostgreSQL (user) | 5432 | User DB |
| PostgreSQL (vehicle) | 5433 | Vehicle DB |
| PostgreSQL (payment) | 5434 | Payment DB |
| PostgreSQL (credit) | 5435 | Credit DB |
| PostgreSQL (telematics) | 5436 | Telematics DB |
| PostgreSQL (support) | 5437 | Support DB |
| RabbitMQ | 5672 | Message queue |
| RabbitMQ UI | 15672 | Management |
| Redis | 6379 | Cache |

---

## See Also

- **[DEV_DEPLOYMENT.md](DEV_DEPLOYMENT.md)** - Complete dev deployment guide
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start instructions
- **[DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md)** - Production deployment plan





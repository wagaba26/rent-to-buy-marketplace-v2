---
description: Automated deployment workflow for the rent-to-buy platform
---

# Platform Deployment Workflow

This workflow automates the deployment of the entire rent-to-buy car marketplace platform.

## Prerequisites

Before running this workflow, ensure:
1. **Docker Desktop** is installed and running
2. **Node.js 18+** is installed
3. **PowerShell execution policy** allows scripts

## Deployment Steps

### 1. Verify Docker Desktop is Running

Check that Docker Desktop is running:
```powershell
docker --version
docker ps
```

If Docker is not running, start Docker Desktop and wait for it to fully initialize.

### 2. Start Infrastructure Services

// turbo
Start all infrastructure services (databases, RabbitMQ, Redis):
```powershell
docker compose up -d
```

Wait for services to be healthy (approximately 30 seconds):
```powershell
docker ps
```

### 3. Install Dependencies

// turbo
Install root dependencies:
```powershell
npm install
```

// turbo
Install API Gateway dependencies:
```powershell
cd services/api-gateway
npm install
cd ../..
```

// turbo
Install User Service dependencies:
```powershell
cd services/user-service
npm install
cd ../..
```

// turbo
Install Vehicle Service dependencies:
```powershell
cd services/vehicle-service
npm install
cd ../..
```

// turbo
Install Payment Service dependencies:
```powershell
cd services/payment-service
npm install
cd ../..
```

// turbo
Install Credit Service dependencies:
```powershell
cd services/credit-service
npm install
cd ../..
```

// turbo
Install Telematics Service dependencies:
```powershell
cd services/telematics-service
npm install
cd ../..
```

// turbo
Install Support Service dependencies:
```powershell
cd services/support-service
npm install
cd ../..
```

### 4. Initialize Database

// turbo
Run database initialization:
```powershell
npm run init-db
```

### 5. Start Application Services

Start services in separate terminals or use a process manager.

**Option A: Using Concurrently (Recommended)**

// turbo
Install concurrently globally:
```powershell
npm install -g concurrently
```

Then create a start script or run all services together.

**Option B: Manual Start (Multiple Terminals)**

Terminal 1 - Frontend:
```powershell
npm run dev
```

Terminal 2 - API Gateway:
```powershell
cd services/api-gateway
npm run dev
```

Terminal 3 - User Service:
```powershell
cd services/user-service
npm run dev
```

Terminal 4 - Vehicle Service:
```powershell
cd services/vehicle-service
npm run dev
```

Terminal 5 - Payment Service:
```powershell
cd services/payment-service
npm run dev
```

Terminal 6 - Credit Service:
```powershell
cd services/credit-service
npm run dev
```

Terminal 7 - Telematics Service:
```powershell
cd services/telematics-service
npm run dev
```

Terminal 8 - Support Service:
```powershell
cd services/support-service
npm run dev
```

### 6. Verify Deployment

Access the application:
- **Frontend**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **API Gateway Health**: http://localhost:3000/api/health

### 7. Configure Instant.dev (Optional)

If using Instant.dev for real-time features:
1. Sign up at https://instant.dev
2. Create a new app
3. Update `.env` with your App ID:
   ```
   NEXT_PUBLIC_INSTANT_APP_ID=your-actual-app-id
   ```

## Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Restart Docker Desktop if you see API errors
- Check Docker logs: `docker logs <container-name>`

### Port Conflicts
Find and kill processes using required ports:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Issues
Restart Docker containers:
```powershell
docker compose restart
```

Check database health:
```powershell
docker logs rent-to-own-user-db
```

## What Gets Deployed

- ✅ 7 PostgreSQL databases (User, Vehicle, Payment, Credit, Telematics, Support, Notification)
- ✅ RabbitMQ message queue
- ✅ Redis cache
- ✅ 7 microservices
- ✅ Next.js frontend

## Documentation

- [DEPLOYMENT.md](file:///c:/Users/ugand/rent%20to%20buy%20car%20market%20place/DEPLOYMENT.md) - Production deployment guide
- [DEV_DEPLOYMENT.md](file:///c:/Users/ugand/rent%20to%20buy%20car%20market%20place/DEV_DEPLOYMENT.md) - Development deployment guide
- [QUICK_DEPLOY.md](file:///c:/Users/ugand/rent%20to%20buy%20car%20market%20place/QUICK_DEPLOY.md) - Quick start guide

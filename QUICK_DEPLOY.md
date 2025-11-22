# Quick Deploy Guide

## ⚠️ Prerequisites Check

Before deploying, you need:

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
2. **Node.js 18+** - ✅ You have v24.11.1
3. **PowerShell Execution Policy** - Needs to allow scripts

## Step 1: Fix PowerShell Execution Policy

Open PowerShell as Administrator and run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or for this session only:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

## Step 2: Install Docker Desktop

1. Download: https://www.docker.com/products/docker-desktop
2. Install Docker Desktop
3. Restart your computer
4. Verify:
   ```powershell
   docker --version
   docker compose version
   ```

## Step 3: Deploy the Platform

Once Docker is installed, run:

```powershell
# Run the automated deployment script
powershell -ExecutionPolicy Bypass -File scripts\deploy-dev.ps1
```

This will:
- ✅ Create all `.env` files
- ✅ Start infrastructure (databases, RabbitMQ, Redis)
- ✅ Install all dependencies
- ✅ Initialize databases
- ✅ Verify everything is working

## Step 4: Start Services

After deployment completes, start the services:

### Option A: Using Process Manager (Recommended)

```powershell
# Install concurrently globally
npm install -g concurrently

# Create start script or run manually
npm run dev  # Frontend in one terminal
# Then start each service in separate terminals
```

### Option B: Manual (Multiple Terminals)

Open multiple PowerShell terminals:

**Terminal 1 - Frontend:**
```powershell
npm run dev
```

**Terminal 2 - API Gateway:**
```powershell
cd services/api-gateway
npm run dev
```

**Terminal 3 - User Service:**
```powershell
cd services/user-service
npm run dev
```

**Terminal 4 - Vehicle Service:**
```powershell
cd services/vehicle-service
npm run dev
```

**Terminal 5 - Payment Service:**
```powershell
cd services/payment-service
npm run dev
```

**Terminal 6 - Credit Service:**
```powershell
cd services/credit-service
npm run dev
```

**Terminal 7 - Telematics Service:**
```powershell
cd services/telematics-service
npm run dev
```

**Terminal 8 - Support Service:**
```powershell
cd services/support-service
npm run dev
```

## Step 5: Configure Instant.dev

1. Sign up at https://instant.dev (free)
2. Create a new app
3. Copy your App ID
4. Update `.env` file:
   ```
   NEXT_PUBLIC_INSTANT_APP_ID=your-actual-app-id-here
   ```

## Step 6: Access the Application

- **Frontend**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **API Gateway Health**: http://localhost:3000/health

## Troubleshooting

### "Docker not found"
- Install Docker Desktop
- Restart computer after installation
- Verify: `docker --version`

### "npm cannot be loaded"
- Fix PowerShell execution policy (see Step 1)
- Or use Command Prompt instead of PowerShell

### "Port already in use"
```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### "Database connection failed"
```powershell
# Check if containers are running
docker ps

# Check database logs
docker logs rent-to-own-user-db

# Restart containers
docker-compose restart
```

## What Gets Deployed

- ✅ 7 PostgreSQL databases
- ✅ RabbitMQ message queue
- ✅ Redis cache
- ✅ 7 microservices (API Gateway, User, Vehicle, Payment, Credit, Telematics, Support)
- ✅ Next.js frontend

## Next Steps

Once everything is running:
1. Test user registration/login
2. Browse vehicles
3. Test real-time features (Instant.dev)
4. Review [DEV_DEPLOYMENT.md](DEV_DEPLOYMENT.md) for more details

---

**Need help?** Check:
- [DEV_DEPLOYMENT.md](DEV_DEPLOYMENT.md) - Complete guide
- [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Current status
- [DEV_REQUIREMENTS.md](DEV_REQUIREMENTS.md) - Requirements




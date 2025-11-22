# Rent-to-Own Marketplace - Full Stack Next.js Application

A full-stack Next.js application for a rent-to-own vehicle marketplace with flexible payment plans, credit scoring, and vehicle management.

## Features

- **User Authentication**: Registration and login with JWT
- **Vehicle Management**: Browse, search, and manage vehicles (Real-time with Instant!)
- **Credit Scoring**: Alternative data-based credit assessment
- **Payment Plans**: Flexible weekly/monthly payment options
- **Real-time Updates**: Instant.dev integration for real-time data synchronization
- **Presence Tracking**: See who's browsing vehicles in real-time

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes + Instant.dev (real-time backend)
- **Database**: PostgreSQL (for API routes) + Instant.dev (for real-time data)
- **Authentication**: JWT
- **Real-time**: Instant.dev for vehicle data
- **Message Queue**: RabbitMQ (optional)
- **Encryption**: AES-256-GCM

## Quick Deploy

**Want to deploy quickly?** See [QUICK_DEPLOY.md](QUICK_DEPLOY.md) for step-by-step instructions.

**Current Status:** ✅ Dependencies installed | ⚠️ Docker required for infrastructure

```powershell
# 1. Install Docker Desktop (if not installed)
# Download: https://www.docker.com/products/docker-desktop

# 2. Run deployment script
powershell -ExecutionPolicy Bypass -File scripts\deploy-dev.ps1

# 3. Start services
npm run dev  # Frontend + start each microservice
```

## Getting Started

### Prerequisites

- ✅ Node.js 18+ (you have v24.11.1)
- ⚠️ Docker Desktop (required for infrastructure)
- PostgreSQL 14+ (via Docker)
- (Optional) RabbitMQ for message queue (via Docker)

### Installation

1. **Clone the repository** (if not already done)

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database (for API routes)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rent_to_own
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key-change-in-production-min-32-characters
ENCRYPTION_KEY=default-encryption-key-change-in-production-min-32-chars

# Instant.dev (for real-time data)
NEXT_PUBLIC_INSTANT_APP_ID=your-instant-app-id-here
```

**Important**: Get your Instant App ID from [https://instant.dev](https://instant.dev) and add it to `.env`. See `INSTANT_SETUP.md` for detailed setup instructions.

4. **Set up Instant.dev** (for real-time features):
   - Go to [https://instant.dev](https://instant.dev) and create a free account
   - Create a new app and copy your App ID
   - Add `NEXT_PUBLIC_INSTANT_APP_ID=your-app-id` to your `.env` file
   - See `INSTANT_SETUP.md` for detailed instructions

5. **Create the database** (for API routes):
```bash
createdb rent_to_own
```

6. **Initialize the database schema**:
```bash
npm run init-db
```

7. **Start the development server**:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

**Note**: The app works with just Instant.dev (no PostgreSQL needed for the homepage). PostgreSQL is only needed for authentication and other API routes.

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── vehicles/     # Vehicle endpoints
│   │   └── health/       # Health check
│   ├── components/       # React components
│   ├── dashboard/        # Dashboard pages
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   └── vehicles/        # Vehicle pages
├── lib/                  # Shared utilities
│   ├── auth.ts          # Authentication helpers
│   ├── db.ts            # Database connection
│   ├── encryption.ts    # Encryption service
│   ├── errors.ts        # Error handling
│   └── message-queue.ts # Message queue client
├── store/                # State management (Zustand)
└── scripts/              # Utility scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Vehicles
- `GET /api/vehicles` - List vehicles (with filters)
- `GET /api/vehicles/[id]` - Get vehicle details
- `POST /api/vehicles` - Create vehicle (admin/agent)

### Health
- `GET /api/health` - Health check endpoint

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Database Schema

The application uses a single PostgreSQL database with the following main tables:

- `users` - User accounts and profiles
- `vehicles` - Vehicle inventory
- `vehicle_categories` - Vehicle categories
- `payment_plans` - Payment plan configurations
- `payments` - Payment records
- `credit_scores` - Credit scoring data
- `kyc_verifications` - KYC document verification

## Environment Variables

See `.env.example` for all available environment variables.

## Deployment

### Development Environment

For deploying to a **development environment**, see:

- **[DEV_DEPLOYMENT.md](DEV_DEPLOYMENT.md)** - Complete dev deployment guide
- **[DEV_REQUIREMENTS.md](DEV_REQUIREMENTS.md)** - Quick reference: what you need for dev
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide

**Quick Dev Setup:**
```bash
# 1. Run setup script (creates all .env files)
# Linux/Mac:
./scripts/setup-dev-env.sh
# Windows:
.\scripts\setup-dev-env.ps1

# 2. Start infrastructure
docker-compose up -d

# 3. Install dependencies
npm install

# 4. Initialize database
npm run init-db

# 5. Start services
npm run dev  # Frontend + start each microservice
```

### Production Environment

For **production deployment**, see:

- **[DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md)** - Complete step-by-step deployment plan (3-5 weeks timeline)
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Quick reference checklist for deployment
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment considerations
- **[k8s/DEPLOYMENT_GUIDE.md](k8s/DEPLOYMENT_GUIDE.md)** - Kubernetes-specific deployment guide
- **[README_DEPLOYMENT.md](README_DEPLOYMENT.md)** - Deployment quick reference

### Quick Start Deployment

**For Kubernetes**:
```bash
# 1. Update secrets
vim k8s/secrets.yaml

# 2. Build and push images
./scripts/build-images.sh

# 3. Deploy
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/databases.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/*-deployment.yaml
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/logging.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

**For Docker Compose**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Notes

- The application uses a unified database (single PostgreSQL instance)
- Message queue (RabbitMQ) is optional but recommended for production
- All sensitive data is encrypted at rest using AES-256-GCM
- JWT tokens are used for authentication

## License

Private - All rights reserved

# Quick Start Guide

## ✅ Refactoring Complete!

The platform has been successfully refactored into a full-stack Next.js application.

## What Was Done

1. ✅ **Unified Structure**: All backend services consolidated into Next.js API routes
2. ✅ **Shared Libraries**: Moved encryption, errors, and message queue utilities to `lib/`
3. ✅ **Database**: Single PostgreSQL database with unified schema
4. ✅ **API Routes**: Created Next.js API routes for:
   - Authentication (`/api/auth/login`, `/api/auth/register`)
   - Vehicles (`/api/vehicles`)
   - Health check (`/api/health`)
5. ✅ **Frontend**: Updated to use relative API routes (`/api` instead of external URLs)
6. ✅ **Middleware**: Created Next.js middleware for authentication
7. ✅ **Package.json**: Unified dependencies

## Current Status

The Next.js development server is running in the background.

## Next Steps

### 1. Set Up Database

Make sure PostgreSQL is running and create the database:

```bash
# Create database
createdb rent_to_own

# Or using psql:
psql -U postgres -c "CREATE DATABASE rent_to_own;"
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rent_to_own
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your-secret-key-change-in-production-min-32-characters
ENCRYPTION_KEY=default-encryption-key-change-in-production-min-32-chars

RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### 3. Initialize Database

```bash
npm run init-db
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health
- **API Routes**: http://localhost:3000/api/*

## Project Structure

```
├── app/
│   ├── api/              # API routes (Next.js App Router)
│   │   ├── auth/         # Authentication
│   │   ├── vehicles/     # Vehicle management
│   │   └── health/       # Health check
│   ├── dashboard/        # Dashboard pages
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   ├── vehicles/        # Vehicle pages
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/           # React components
├── lib/                  # Shared utilities
│   ├── auth.ts          # Auth helpers
│   ├── db.ts            # Database connection
│   ├── encryption.ts    # Encryption service
│   ├── errors.ts        # Error handling
│   └── message-queue.ts # Message queue client
├── store/                # State management (Zustand)
└── scripts/              # Utility scripts
```

## Available API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Vehicles
- `GET /api/vehicles` - List vehicles (with filters)
- `GET /api/vehicles/[id]` - Get vehicle details
- `POST /api/vehicles` - Create vehicle (requires auth)

### Health
- `GET /api/health` - Health check

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Initialize database
npm run init-db
```

## Notes

- The app uses a single PostgreSQL database (unified from multiple microservice databases)
- RabbitMQ is optional but recommended for production
- All sensitive data is encrypted using AES-256-GCM
- JWT tokens are used for authentication
- The frontend uses relative API routes (`/api`) which work seamlessly with Next.js

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Ensure PostgreSQL is running
2. Check your `.env` file has correct database credentials
3. Verify the database exists: `psql -U postgres -l`

### Port Already in Use

If port 3000 is already in use:
```bash
# Kill the process or use a different port
PORT=3001 npm run dev
```

## Remaining Work (Optional)

The following features from the original microservices can be added:

- Payment service routes (`/api/payments`)
- Credit scoring routes (`/api/credit`, `/api/scoring`)
- Support service routes (`/api/support`)
- Telematics service routes (`/api/telematics`)
- Background job scheduling (cron tasks)

These can be added incrementally as needed.


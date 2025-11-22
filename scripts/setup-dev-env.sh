#!/bin/bash

# Development Environment Setup Script
# This script helps set up all .env files for development

set -e

echo "🚀 Setting up development environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate dev secrets (not secure, but fine for dev)
JWT_SECRET="dev-jwt-secret-key-$(openssl rand -hex 16)"
ENCRYPTION_KEY="dev-encryption-key-$(openssl rand -hex 16)"

echo -e "${YELLOW}Generated dev secrets:${NC}"
echo "JWT_SECRET: $JWT_SECRET"
echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
echo ""

# Root .env file
echo "📝 Creating root .env file..."
cat > .env << EOF
# Database (for API routes)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rent_to_own
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Instant.dev (REPLACE WITH YOUR APP ID)
NEXT_PUBLIC_INSTANT_APP_ID=your-instant-app-id-here

# API Gateway URL
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
echo -e "${GREEN}✅ Created .env${NC}"

# API Gateway .env
echo "📝 Creating services/api-gateway/.env..."
mkdir -p services/api-gateway
cat > services/api-gateway/.env << EOF
PORT=3000
JWT_SECRET=$JWT_SECRET
USER_SERVICE_URL=http://localhost:3001
VEHICLE_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3003
CREDIT_SERVICE_URL=http://localhost:3004
TELEMATICS_SERVICE_URL=http://localhost:3005
SUPPORT_SERVICE_URL=http://localhost:3006
EOF
echo -e "${GREEN}✅ Created services/api-gateway/.env${NC}"

# User Service .env
echo "📝 Creating services/user-service/.env..."
mkdir -p services/user-service
cat > services/user-service/.env << EOF
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=userdb
DB_USER=user
DB_PASSWORD=userpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_SECRET=$JWT_SECRET
EOF
echo -e "${GREEN}✅ Created services/user-service/.env${NC}"

# Vehicle Service .env
echo "📝 Creating services/vehicle-service/.env..."
mkdir -p services/vehicle-service
cat > services/vehicle-service/.env << EOF
PORT=3002
DB_HOST=localhost
DB_PORT=5433
DB_NAME=vehicledb
DB_USER=vehicle
DB_PASSWORD=vehiclepass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
EOF
echo -e "${GREEN}✅ Created services/vehicle-service/.env${NC}"

# Payment Service .env
echo "📝 Creating services/payment-service/.env..."
mkdir -p services/payment-service
cat > services/payment-service/.env << EOF
PORT=3003
DB_HOST=localhost
DB_PORT=5434
DB_NAME=paymentdb
DB_USER=payment
DB_PASSWORD=paymentpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF
echo -e "${GREEN}✅ Created services/payment-service/.env${NC}"

# Credit Service .env
echo "📝 Creating services/credit-service/.env..."
mkdir -p services/credit-service
cat > services/credit-service/.env << EOF
PORT=3004
DB_HOST=localhost
DB_PORT=5435
DB_NAME=creditdb
DB_USER=credit
DB_PASSWORD=creditpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
EOF
echo -e "${GREEN}✅ Created services/credit-service/.env${NC}"

# Telematics Service .env
echo "📝 Creating services/telematics-service/.env..."
mkdir -p services/telematics-service
cat > services/telematics-service/.env << EOF
PORT=3005
DB_HOST=localhost
DB_PORT=5436
DB_NAME=telematicsdb
DB_USER=telematics
DB_PASSWORD=telematicspass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
EOF
echo -e "${GREEN}✅ Created services/telematics-service/.env${NC}"

# Support Service .env
echo "📝 Creating services/support-service/.env..."
mkdir -p services/support-service
cat > services/support-service/.env << EOF
PORT=3006
DB_HOST=localhost
DB_PORT=5437
DB_NAME=supportdb
DB_USER=support
DB_PASSWORD=supportpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
EOF
echo -e "${GREEN}✅ Created services/support-service/.env${NC}"

echo ""
echo -e "${GREEN}✅ All .env files created!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "1. Update NEXT_PUBLIC_INSTANT_APP_ID in .env with your Instant.dev App ID"
echo "2. Make sure Docker is running"
echo "3. Start infrastructure: docker-compose up -d"
echo "4. Install dependencies: npm install"
echo "5. Initialize database: npm run init-db"
echo ""
echo "Then you can start the services!"





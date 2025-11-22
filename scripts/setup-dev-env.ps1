# Development Environment Setup Script (PowerShell)
# This script helps set up all .env files for development

Write-Host "Setting up development environment..." -ForegroundColor Cyan
Write-Host ""

# Generate dev secrets (not secure, but fine for dev)
$JWT_SECRET = "dev-jwt-secret-key-" + (-join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_}))
$ENCRYPTION_KEY = "dev-encryption-key-" + (-join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_}))

Write-Host "Generated dev secrets:" -ForegroundColor Yellow
Write-Host "JWT_SECRET: $JWT_SECRET"
Write-Host "ENCRYPTION_KEY: $ENCRYPTION_KEY"
Write-Host ""

# Root .env file
Write-Host "Creating root .env file..." -ForegroundColor Cyan
@"
# Database (for API routes)
DB_HOST=localhost
DB_PORT=5438
DB_NAME=rent_to_own
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Instant.dev (REPLACE WITH YOUR APP ID)
NEXT_PUBLIC_INSTANT_APP_ID=your-instant-app-id-here

# API Gateway URL
NEXT_PUBLIC_API_URL=http://localhost:4000
"@ | Out-File -FilePath .env -Encoding utf8
Write-Host "Created .env" -ForegroundColor Green

# API Gateway .env
Write-Host "Creating services/api-gateway/.env..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path services/api-gateway | Out-Null
@"
PORT=4000
JWT_SECRET=$JWT_SECRET
USER_SERVICE_URL=http://localhost:4001
VEHICLE_SERVICE_URL=http://localhost:4002
PAYMENT_SERVICE_URL=http://localhost:4003
CREDIT_SERVICE_URL=http://localhost:4004
TELEMATICS_SERVICE_URL=http://localhost:4005
SUPPORT_SERVICE_URL=http://localhost:4006
"@ | Out-File -FilePath services/api-gateway/.env -Encoding utf8
Write-Host "Created services/api-gateway/.env" -ForegroundColor Green

# User Service .env
Write-Host "Creating services/user-service/.env..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path services/user-service | Out-Null
@"
PORT=4001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=userdb
DB_USER=user
DB_PASSWORD=userpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_SECRET=$JWT_SECRET
"@ | Out-File -FilePath services/user-service/.env -Encoding utf8
Write-Host "Created services/user-service/.env" -ForegroundColor Green

# Vehicle Service .env
Write-Host "Creating services/vehicle-service/.env..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path services/vehicle-service | Out-Null
@"
PORT=4002
DB_HOST=localhost
DB_PORT=5433
DB_NAME=vehicledb
DB_USER=vehicle
DB_PASSWORD=vehiclepass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
"@ | Out-File -FilePath services/vehicle-service/.env -Encoding utf8
Write-Host "Created services/vehicle-service/.env" -ForegroundColor Green

# Payment Service .env
Write-Host "Creating services/payment-service/.env..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path services/payment-service | Out-Null
@"
PORT=4003
DB_HOST=localhost
DB_PORT=5434
DB_NAME=paymentdb
DB_USER=payment
DB_PASSWORD=paymentpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
ENCRYPTION_KEY=$ENCRYPTION_KEY
"@ | Out-File -FilePath services/payment-service/.env -Encoding utf8
Write-Host "Created services/payment-service/.env" -ForegroundColor Green

# Credit Service .env
Write-Host "Creating services/credit-service/.env..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path services/credit-service | Out-Null
@"
PORT=4004
DB_HOST=localhost
DB_PORT=5435
DB_NAME=creditdb
DB_USER=credit
DB_PASSWORD=creditpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
"@ | Out-File -FilePath services/credit-service/.env -Encoding utf8
Write-Host "Created services/credit-service/.env" -ForegroundColor Green

# Telematics Service .env
Write-Host "Creating services/telematics-service/.env..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path services/telematics-service | Out-Null
@"
PORT=4005
DB_HOST=localhost
DB_PORT=5436
DB_NAME=telematicsdb
DB_USER=telematics
DB_PASSWORD=telematicspass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
"@ | Out-File -FilePath services/telematics-service/.env -Encoding utf8
Write-Host "Created services/telematics-service/.env" -ForegroundColor Green

# Support Service .env
Write-Host "Creating services/support-service/.env..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path services/support-service | Out-Null
@"
PORT=4006
DB_HOST=localhost
DB_PORT=5437
DB_NAME=supportdb
DB_USER=support
DB_PASSWORD=supportpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
"@ | Out-File -FilePath services/support-service/.env -Encoding utf8
Write-Host "Created services/support-service/.env" -ForegroundColor Green

Write-Host ""
Write-Host "All .env files created!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. Update NEXT_PUBLIC_INSTANT_APP_ID in .env with your Instant.dev App ID"
Write-Host "2. Make sure Docker is running"
Write-Host "3. Start infrastructure: docker-compose up -d"
Write-Host "4. Install dependencies: npm install"
Write-Host "5. Initialize database: npm run init-db"
Write-Host ""
Write-Host "Then you can start the services!"


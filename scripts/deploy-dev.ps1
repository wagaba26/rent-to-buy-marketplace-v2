# Development Deployment Script
# This script automates the deployment process for dev environment

param(
    [switch]$SkipInfrastructure,
    [switch]$SkipDependencies,
    [switch]$SkipDatabase
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Development Deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Setup environment files
Write-Host "📝 Step 1: Setting up environment files..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env files..." -ForegroundColor Cyan
    & "$PSScriptRoot\setup-dev-env.ps1"
} else {
    Write-Host "✅ .env files already exist" -ForegroundColor Green
}

# Step 2: Check prerequisites
Write-Host ""
Write-Host "🔍 Step 2: Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker compose version 2>&1
    Write-Host "✅ Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found." -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm.cmd --version 2>&1
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found." -ForegroundColor Red
    exit 1
}

# Step 3: Start infrastructure
if (-not $SkipInfrastructure) {
    Write-Host ""
    Write-Host "🐳 Step 3: Starting infrastructure services..." -ForegroundColor Yellow
    
    Write-Host "Starting Docker containers..." -ForegroundColor Cyan
    docker-compose up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to start Docker containers" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Check if containers are running
    $containers = docker ps --format "{{.Names}}" | Select-String "rent-to-own"
    if ($containers.Count -gt 0) {
        Write-Host "✅ Infrastructure services started:" -ForegroundColor Green
        $containers | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
    } else {
        Write-Host "⚠️  Warning: No containers found. Check docker-compose logs." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Step 3: Skipping infrastructure (already running)" -ForegroundColor Yellow
}

# Step 4: Install dependencies
if (-not $SkipDependencies) {
    Write-Host ""
    Write-Host "📦 Step 4: Installing dependencies..." -ForegroundColor Yellow
    
    Write-Host "Installing root dependencies..." -ForegroundColor Cyan
    npm.cmd install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Root dependencies installed" -ForegroundColor Green
    
    # Install service dependencies
    $services = @(
        "api-gateway",
        "user-service",
        "vehicle-service",
        "payment-service",
        "credit-service",
        "telematics-service",
        "support-service"
    )
    
    foreach ($service in $services) {
        $servicePath = "services\$service"
        if (Test-Path $servicePath) {
            Write-Host "Installing dependencies for $service..." -ForegroundColor Cyan
            Push-Location $servicePath
            npm.cmd install
            Pop-Location
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ $service dependencies installed" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Warning: Failed to install $service dependencies" -ForegroundColor Yellow
            }
        }
    }
    
    # Install shared library dependencies
    $sharedLibs = @(
        "message-queue",
        "encryption",
        "errors",
        "http-client"
    )
    
    foreach ($lib in $sharedLibs) {
        $libPath = "shared\$lib"
        if (Test-Path $libPath) {
            Write-Host "Installing dependencies for shared/$lib..." -ForegroundColor Cyan
            Push-Location $libPath
            npm.cmd install
            Pop-Location
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ shared/$lib dependencies installed" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Step 4: Skipping dependency installation" -ForegroundColor Yellow
}

# Step 5: Initialize database
if (-not $SkipDatabase) {
    Write-Host ""
    Write-Host "🗄️  Step 5: Initializing database..." -ForegroundColor Yellow
    
    # Wait a bit more for database to be ready
    Write-Host "Waiting for database to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    Write-Host "Running database initialization..." -ForegroundColor Cyan
    npm.cmd run init-db
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database initialized" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: Database initialization may have failed. Check logs." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Step 5: Skipping database initialization" -ForegroundColor Yellow
}

# Step 6: Verify deployment
Write-Host ""
Write-Host "✅ Step 6: Verifying deployment..." -ForegroundColor Yellow

# Check if Instant.dev App ID is set
$envContent = Get-Content ".env" -Raw
if ($envContent -match "your-instant-app-id-here") {
    Write-Host "⚠️  WARNING: Please update NEXT_PUBLIC_INSTANT_APP_ID in .env with your Instant.dev App ID" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Development Deployment Complete!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update .env file with your Instant.dev App ID:" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_INSTANT_APP_ID=your-actual-app-id" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start the services:" -ForegroundColor White
Write-Host "   # Option A: Use a process manager (concurrently)" -ForegroundColor Gray
Write-Host "   npm install -g concurrently" -ForegroundColor Gray
Write-Host "   # Then run all services (see DEV_DEPLOYMENT.md)" -ForegroundColor Gray
Write-Host ""
Write-Host "   # Option B: Start manually in separate terminals:" -ForegroundColor Gray
Write-Host "   npm run dev                    # Frontend" -ForegroundColor Gray
Write-Host "   cd services/api-gateway && npm run dev" -ForegroundColor Gray
Write-Host "   cd services/user-service && npm run dev" -ForegroundColor Gray
Write-Host "   # ... etc for other services" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access the application:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "   RabbitMQ UI: http://localhost:15672 (admin/admin123)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Check service health:" -ForegroundColor White
Write-Host "   curl http://localhost:3000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - DEV_DEPLOYMENT.md - Complete dev deployment guide" -ForegroundColor Gray
Write-Host "   - DEV_REQUIREMENTS.md - What you need for dev" -ForegroundColor Gray
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan

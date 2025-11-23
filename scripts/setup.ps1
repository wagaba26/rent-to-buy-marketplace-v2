#!/usr/bin/env pwsh
# Automated Setup Script for Rent-to-Buy Car Marketplace
# This script automates the entire setup process

Write-Host "🚀 Starting Automated Setup for Rent-to-Buy Car Marketplace..." -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as administrator. Some operations may fail." -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check Prerequisites
Write-Host "📋 Step 1: Checking Prerequisites..." -ForegroundColor Green
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found." -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
try {
    $pgVersion = psql --version
    Write-Host "✅ PostgreSQL installed: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PostgreSQL CLI (psql) not found in PATH." -ForegroundColor Yellow
    Write-Host "   You may need to run database migration manually." -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Install Dependencies
Write-Host "📦 Step 2: Installing Dependencies..." -ForegroundColor Green
Write-Host ""

try {
    npm install
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Setup Environment Variables
Write-Host "🔧 Step 3: Setting up Environment Variables..." -ForegroundColor Green
Write-Host ""

if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists. Backing up to .env.backup" -ForegroundColor Yellow
    Copy-Item ".env" ".env.backup" -Force
}

# Generate secure random secrets
function Generate-Secret {
    param([int]$length = 32)
    $bytes = New-Object byte[] $length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$jwtSecret = Generate-Secret
$refreshSecret = Generate-Secret
$encryptionKey = Generate-Secret
$storageSecret = Generate-Secret

# Create .env file
$envContent = @"
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rent_to_own
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=$jwtSecret
REFRESH_SECRET=$refreshSecret
JWT_EXPIRES_IN=15m

# Encryption
ENCRYPTION_KEY=$encryptionKey

# Storage
STORAGE_SECRET=$storageSecret
UPLOAD_PATH=./uploads

# Token Settings
ROTATE_REFRESH_TOKENS=true

# CORS
ALLOWED_ORIGINS=http://localhost:4007

# RabbitMQ (optional)
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Node Environment
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ Environment variables configured" -ForegroundColor Green
Write-Host "   Secrets have been generated automatically" -ForegroundColor Cyan

Write-Host ""

# Step 4: Create Upload Directories
Write-Host "📁 Step 4: Creating Upload Directories..." -ForegroundColor Green
Write-Host ""

$directories = @(
    "uploads",
    "uploads/retailers",
    "uploads/customers",
    "uploads/vehicles",
    "uploads/applications"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "✓  Exists: $dir" -ForegroundColor Gray
    }
}

Write-Host ""

# Step 5: Database Setup
Write-Host "🗄️  Step 5: Database Setup..." -ForegroundColor Green
Write-Host ""

$dbHost = "localhost"
$dbPort = "5432"
$dbName = "rent_to_own"
$dbUser = "postgres"

Write-Host "Attempting to connect to PostgreSQL..." -ForegroundColor Cyan

# Check if database exists
$checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$dbName'"
try {
    $dbExists = psql -h $dbHost -p $dbPort -U $dbUser -d postgres -t -c $checkDbQuery 2>$null
    
    if ($dbExists -match "1") {
        Write-Host "✅ Database '$dbName' already exists" -ForegroundColor Green
    } else {
        Write-Host "Creating database '$dbName'..." -ForegroundColor Cyan
        psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE $dbName"
        Write-Host "✅ Database created successfully" -ForegroundColor Green
    }
    
    # Run migration
    Write-Host ""
    Write-Host "Running database migration..." -ForegroundColor Cyan
    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f "scripts/migration-security-rbac.sql"
    Write-Host "✅ Database migration completed" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️  Could not connect to PostgreSQL automatically" -ForegroundColor Yellow
    Write-Host "   Please run the migration manually:" -ForegroundColor Yellow
    Write-Host "   psql -U postgres -d rent_to_own -f scripts/migration-security-rbac.sql" -ForegroundColor Cyan
}

Write-Host ""

# Step 6: Create Admin User
Write-Host "👤 Step 6: Creating Admin User..." -ForegroundColor Green
Write-Host ""

$adminEmail = "admin@rentobuy.com"
$adminPassword = "Admin123!"

Write-Host "Default admin credentials:" -ForegroundColor Cyan
Write-Host "  Email: $adminEmail" -ForegroundColor White
Write-Host "  Password: $adminPassword" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Change these credentials after first login!" -ForegroundColor Yellow

Write-Host ""

# Step 7: Summary
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Review .env file and update if needed" -ForegroundColor White
Write-Host "2. Start the development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Access the application:" -ForegroundColor White
Write-Host "   http://localhost:4007" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Login with admin credentials:" -ForegroundColor White
Write-Host "   Email: $adminEmail" -ForegroundColor Yellow
Write-Host "   Password: $adminPassword" -ForegroundColor Yellow
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "- API Documentation: See SECURITY_IMPLEMENTATION.md" -ForegroundColor White
Write-Host "- Testing Guide: See walkthrough.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Green

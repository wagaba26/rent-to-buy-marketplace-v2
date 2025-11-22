# PowerShell build script for Windows
# Usage: .\scripts\build-images.ps1 [tag]

param(
    [string]$Tag = "latest",
    [string]$Registry = "rent-to-own"
)

Write-Host "Building Docker images with tag: $Tag"
Write-Host "Registry: $Registry"

# Services that need shared packages
$ServicesWithShared = @(
    "user-service",
    "vehicle-service",
    "payment-service",
    "credit-service",
    "telematics-service",
    "support-service"
)

# API Gateway (no shared dependencies)
Write-Host "Building api-gateway..."
docker build -t "$Registry/api-gateway:$Tag" `
    -f services/api-gateway/Dockerfile `
    services/api-gateway

# Build shared packages first
Write-Host "Building shared packages..."
Push-Location shared/encryption
npm run build
Pop-Location

Push-Location shared/errors
npm run build
Pop-Location

Push-Location shared/message-queue
npm run build
Pop-Location

Push-Location shared/http-client
npm run build
Pop-Location

# Build services with shared dependencies
foreach ($service in $ServicesWithShared) {
    Write-Host "Building $service..."
    
    # Build from root with service Dockerfile
    docker build -t "$Registry/$service:$Tag" `
        -f "services/$service/Dockerfile" `
        --build-arg BUILDKIT_INLINE_CACHE=1 `
        .
}

Write-Host "All images built successfully!"
Write-Host ""
Write-Host "Images:"
docker images | Select-String $Registry


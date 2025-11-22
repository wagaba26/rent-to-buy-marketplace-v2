# Docker Build Instructions

## Build Context

All Dockerfiles are designed to be built **from the repository root**, not from individual service directories.

## Build Command Pattern

```bash
# From repository root
docker build -t rent-to-own/<service-name>:<tag> -f services/<service-name>/Dockerfile .
```

## Example Builds

```bash
# API Gateway (no shared dependencies)
docker build -t rent-to-own/api-gateway:latest -f services/api-gateway/Dockerfile services/api-gateway

# User Service (with shared dependencies)
docker build -t rent-to-own/user-service:latest -f services/user-service/Dockerfile .

# Vehicle Service
docker build -t rent-to-own/vehicle-service:latest -f services/vehicle-service/Dockerfile .

# Payment Service
docker build -t rent-to-own/payment-service:latest -f services/payment-service/Dockerfile .

# Credit Service
docker build -t rent-to-own/credit-service:latest -f services/credit-service/Dockerfile .

# Telematics Service
docker build -t rent-to-own/telematics-service:latest -f services/telematics-service/Dockerfile .

# Support Service
docker build -t rent-to-own/support-service:latest -f services/support-service/Dockerfile .
```

## Using Build Scripts

### Linux/Mac

```bash
chmod +x scripts/build-images.sh
./scripts/build-images.sh [tag]
```

### Windows

```powershell
.\scripts\build-images.ps1 [tag]
```

## Dockerfile Structure

All service Dockerfiles follow this pattern:

1. **Builder Stage**
   - Copy root package.json for workspace support
   - Copy shared packages
   - Copy service files
   - Install dependencies
   - Build shared packages
   - Build service

2. **Production Stage**
   - Copy service package.json
   - Install production dependencies only
   - Copy built application
   - Copy built shared packages
   - Set up non-root user
   - Configure health checks

## Notes

- Services with shared dependencies must be built from root
- API Gateway can be built from its own directory
- All Dockerfiles use multi-stage builds for optimization
- Health checks are included in all images


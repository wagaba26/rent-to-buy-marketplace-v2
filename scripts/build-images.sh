#!/bin/bash

# Build script for all Docker images
# Usage: ./scripts/build-images.sh [tag]

set -e

TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-rent-to-own}

echo "Building Docker images with tag: $TAG"
echo "Registry: $REGISTRY"

# Services that need shared packages
SERVICES_WITH_SHARED=(
  "user-service"
  "vehicle-service"
  "payment-service"
  "credit-service"
  "telematics-service"
  "support-service"
)

# API Gateway (no shared dependencies)
echo "Building api-gateway..."
docker build -t $REGISTRY/api-gateway:$TAG \
  -f services/api-gateway/Dockerfile \
  services/api-gateway

# Build shared packages first
echo "Building shared packages..."
cd shared/encryption && npm run build || true && cd ../..
cd shared/errors && npm run build || true && cd ../..
cd shared/message-queue && npm run build || true && cd ../..
cd shared/http-client && npm run build || true && cd ../..

# Build services with shared dependencies
# Note: These need to be built from root with proper context
for service in "${SERVICES_WITH_SHARED[@]}"; do
  echo "Building $service..."
  
  # Create a temporary build context
  mkdir -p /tmp/docker-build-$service
  
  # Copy service files
  cp -r services/$service/* /tmp/docker-build-$service/
  
  # Copy shared packages
  cp -r shared /tmp/docker-build-$service/
  
  # Copy root package.json for workspace support
  cp package.json /tmp/docker-build-$service/../../
  cp package-lock.json /tmp/docker-build-$service/../../ 2>/dev/null || true
  
  # Build from service directory but with root context
  docker build -t $REGISTRY/$service:$TAG \
    -f services/$service/Dockerfile \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    .
  
  # Cleanup
  rm -rf /tmp/docker-build-$service
done

echo "All images built successfully!"
echo ""
echo "Images:"
docker images | grep $REGISTRY


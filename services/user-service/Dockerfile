# Multi-stage build for User Service
# Build from root: docker build -f services/user-service/Dockerfile .
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files for workspace support
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY shared ./shared

# Copy service files
COPY services/user-service/package*.json ./services/user-service/
COPY services/user-service/tsconfig.json ./services/user-service/
COPY services/user-service/src ./services/user-service/src

# Install all dependencies (workspace dependencies)
RUN npm install

# Build shared packages
WORKDIR /app/shared/encryption
RUN npm run build || true

WORKDIR /app/shared/errors
RUN npm run build || true

WORKDIR /app/shared/message-queue
RUN npm run build || true

WORKDIR /app/shared/http-client
RUN npm run build || true

# Build service
WORKDIR /app/services/user-service
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy service package.json
COPY services/user-service/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/services/user-service/dist ./dist

# Copy built shared packages
COPY --from=builder /app/shared ./shared

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]


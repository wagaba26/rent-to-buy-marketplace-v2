# Multi-stage build for Payment Service
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY ../../package*.json ../../
COPY ../../tsconfig.json ../../

# Copy shared packages
COPY ../../shared ./shared

# Copy service files
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies
WORKDIR /app/../../..
RUN npm install

# Build shared packages
WORKDIR /app/../../shared/encryption
RUN npm run build || true

WORKDIR /app/../../shared/errors
RUN npm run build || true

WORKDIR /app/../../shared/message-queue
RUN npm run build || true

# Build service
WORKDIR /app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/../../shared ./shared

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]


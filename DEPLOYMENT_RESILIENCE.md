# Deployment & Resilience Guide

This document outlines the complete deployment and resilience strategy for the Rent-to-Own Marketplace microservices platform.

## Overview

The platform is designed for production deployment with:
- **Containerization**: All services containerized with Docker
- **Orchestration**: Kubernetes for deployment, scaling, and management
- **Independent Services**: Each service has its own database and can be scaled independently
- **Monitoring**: Prometheus and Grafana for metrics and alerting
- **Logging**: ELK stack (Elasticsearch, Logstash, Kibana) for centralized logging
- **Resilience**: Circuit breakers, timeouts, and fallback mechanisms

## Architecture Components

### 1. Containerization

All microservices are containerized using Docker with multi-stage builds for optimized image sizes.

**Dockerfiles Location:**
- `services/api-gateway/Dockerfile`
- `services/user-service/Dockerfile`
- `services/vehicle-service/Dockerfile`
- `services/payment-service/Dockerfile`
- `services/credit-service/Dockerfile`
- `services/telematics-service/Dockerfile`
- `services/support-service/Dockerfile`

**Key Features:**
- Multi-stage builds for smaller images
- Non-root user execution
- Health check endpoints
- Production-optimized dependencies

### 2. Kubernetes Orchestration

Complete Kubernetes manifests are provided in the `k8s/` directory:

#### Core Components

- **Namespace**: `k8s/namespace.yaml` - Isolated namespace for all resources
- **ConfigMaps**: `k8s/configmap.yaml` - Non-sensitive configuration
- **Secrets**: `k8s/secrets.yaml` - Sensitive data (passwords, API keys)
- **Deployments**: Individual deployment files for each service
- **Services**: ClusterIP services for internal communication
- **Ingress**: `k8s/ingress.yaml` - External access configuration

#### Infrastructure

- **Databases**: `k8s/databases.yaml` - PostgreSQL StatefulSets for each service
- **RabbitMQ**: `k8s/rabbitmq.yaml` - Message queue StatefulSet
- **Monitoring**: `k8s/monitoring.yaml` - Prometheus and Grafana
- **Logging**: `k8s/logging.yaml` - ELK stack deployment
- **Autoscaling**: `k8s/hpa.yaml` - Horizontal Pod Autoscalers

### 3. Service Independence

Each service has:
- **Separate Database**: Isolated PostgreSQL instance
- **Independent Scaling**: Can be scaled independently based on load
- **Own Health Checks**: Liveness, readiness, and startup probes
- **Resource Limits**: CPU and memory limits per service

### 4. Monitoring & Alerting

#### Prometheus

- Collects metrics from all services
- Scrapes service endpoints every 15 seconds
- Stores time-series data for analysis

#### Grafana

- Visualizes metrics from Prometheus
- Pre-configured dashboards for service health
- Alerting rules for service degradation

#### Key Metrics Monitored

- Request rates and latencies
- Error rates
- CPU and memory usage
- Database connection pool status
- Message queue depths
- Circuit breaker states

### 5. Centralized Logging

#### ELK Stack

- **Elasticsearch**: Stores logs from all services
- **Logstash**: Processes and enriches log data
- **Kibana**: Visualizes and searches logs
- **Filebeat**: Collects logs from containers (DaemonSet)

#### Log Features

- Structured JSON logging
- Service-level log filtering
- Request tracing across services
- Error log aggregation
- Performance log analysis

### 6. Circuit Breakers & Timeouts

#### Resilient HTTP Client

A shared HTTP client library (`shared/http-client`) provides:

- **Circuit Breaker Pattern**: Prevents cascading failures
- **Automatic Retries**: Exponential backoff for transient failures
- **Timeouts**: Configurable request timeouts
- **Fallback Mechanisms**: Graceful degradation when services are unavailable

#### Configuration

```typescript
import { createServiceClient } from '@rent-to-own/http-client';

const creditServiceClient = createServiceClient(
  'credit-service',
  'http://credit-service:3004',
  {
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    },
    fallback: (error) => ({
      data: { success: false, error: 'Service temporarily unavailable' },
      status: 503,
    }),
  }
);
```

#### Circuit Breaker States

1. **Closed**: Normal operation, requests flow through
2. **Open**: Too many failures, requests fail fast with fallback
3. **Half-Open**: Testing if service has recovered

### 7. Health Checks

All services implement health check endpoints:

- **Path**: `/health`
- **Response**: JSON with service status and database connectivity
- **Probes**:
  - **Liveness**: Detects if service is running
  - **Readiness**: Detects if service is ready to accept traffic
  - **Startup**: Allows time for service initialization

Example health check response:
```json
{
  "status": "ok",
  "service": "user-service",
  "db": "connected"
}
```

### 8. Horizontal Pod Autoscaling

Each service has an HPA configured to:
- **Scale Up**: When CPU > 70% or Memory > 80%
- **Scale Down**: When resources are underutilized
- **Min Replicas**: 2-3 depending on service
- **Max Replicas**: 5-10 depending on service

## Deployment Strategies

### Development

Use Docker Compose for local development:

```bash
docker-compose up -d
```

### Production

#### Option 1: Kubernetes (Recommended)

Follow the [Kubernetes Deployment Guide](k8s/DEPLOYMENT_GUIDE.md):

```bash
# 1. Build and push images
docker build -t rent-to-own/api-gateway:latest ./services/api-gateway
# ... build other services

# 2. Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/databases.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/*-deployment.yaml
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/logging.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

#### Option 2: Docker Compose (Production)

For simpler deployments, use production docker-compose:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Resilience Features

### 1. Service Isolation

- Each service runs in its own container
- Independent database prevents cascading failures
- Service failures don't affect other services

### 2. Graceful Degradation

- Circuit breakers prevent overwhelming failing services
- Fallback responses for non-critical operations
- Timeout mechanisms prevent hanging requests

### 3. Automatic Recovery

- Health checks automatically restart unhealthy containers
- Circuit breakers automatically test service recovery
- Kubernetes automatically reschedules failed pods

### 4. Load Distribution

- Multiple replicas distribute load
- Kubernetes service load balancing
- Horizontal autoscaling based on demand

### 5. Data Persistence

- StatefulSets for databases ensure data persistence
- Volume claims for persistent storage
- Backup strategies for disaster recovery

## Monitoring & Alerting

### Prometheus Queries

Example queries for monitoring:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Circuit breaker state
circuit_breaker_state{state="open"}
```

### Grafana Dashboards

Pre-configured dashboards for:
- Service overview
- Request rates and latencies
- Error rates
- Resource utilization
- Database metrics
- Message queue metrics

### Alerting Rules

Configure alerts for:
- High error rates (> 5%)
- Slow response times (p95 > 1s)
- Circuit breaker open
- High CPU usage (> 80%)
- High memory usage (> 85%)
- Database connection failures
- Message queue depth > 1000

## Logging & Tracing

### Log Structure

All services log in JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "user-service",
  "message": "User created successfully",
  "userId": "123",
  "requestId": "req-456"
}
```

### Request Tracing

- Include `requestId` in all log entries
- Trace requests across services
- Use correlation IDs for distributed tracing

### Log Retention

- Elasticsearch indices rotated daily
- 30-day retention policy (configurable)
- Archive old logs to cold storage

## Security Considerations

### Secrets Management

- Use Kubernetes Secrets for sensitive data
- Never commit secrets to version control
- Rotate secrets regularly
- Use external secret management (e.g., HashiCorp Vault) in production

### Network Security

- Network policies to restrict inter-service communication
- TLS/SSL for all external communications
- Service mesh (Istio/Linkerd) for advanced security

### Container Security

- Non-root user execution
- Minimal base images (Alpine Linux)
- Regular security scanning
- Keep dependencies updated

## Disaster Recovery

### Backup Strategy

1. **Database Backups**
   - Automated daily backups
   - Point-in-time recovery
   - Backup retention: 30 days

2. **Configuration Backups**
   - Version control for all configs
   - Encrypted backup of secrets
   - Document recovery procedures

3. **Application Backups**
   - Docker images in registry
   - Kubernetes manifests in Git
   - Deployment scripts versioned

### Recovery Procedures

1. **Service Recovery**
   - Automatic pod restart
   - Circuit breaker recovery
   - Health check recovery

2. **Database Recovery**
   - Restore from latest backup
   - Point-in-time recovery if needed
   - Verify data integrity

3. **Full System Recovery**
   - Restore from infrastructure as code
   - Restore databases
   - Redeploy services

## Performance Optimization

### Resource Allocation

- Right-size resource requests/limits
- Monitor actual usage
- Adjust based on metrics

### Caching

- Redis for frequently accessed data
- Response caching where appropriate
- Database query result caching

### Database Optimization

- Connection pooling
- Read replicas for read-heavy services
- Query optimization
- Index optimization

## Maintenance

### Regular Tasks

- Monitor service health daily
- Review error logs weekly
- Update dependencies monthly
- Review and adjust resource limits quarterly
- Security audit quarterly

### Updates

- Use rolling updates for zero downtime
- Test in staging first
- Monitor during rollout
- Rollback plan ready

## Troubleshooting

### Common Issues

1. **Service Not Starting**
   - Check pod logs
   - Verify environment variables
   - Check resource limits

2. **Database Connection Issues**
   - Verify database is running
   - Check connection string
   - Verify network policies

3. **High Error Rates**
   - Check service logs
   - Verify dependencies
   - Check circuit breaker state

4. **Performance Issues**
   - Check resource utilization
   - Review slow query logs
   - Check message queue depth

## Best Practices

1. **Always use health checks** for all services
2. **Implement circuit breakers** for inter-service calls
3. **Set appropriate timeouts** for all external calls
4. **Monitor everything** - metrics, logs, traces
5. **Test failure scenarios** regularly
6. **Document runbooks** for common issues
7. **Automate deployments** with CI/CD
8. **Use infrastructure as code** for all resources
9. **Regular security audits** and updates
10. **Plan for disaster recovery**

## Additional Resources

- [Kubernetes Deployment Guide](k8s/DEPLOYMENT_GUIDE.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [Service READMEs](services/*/README.md)


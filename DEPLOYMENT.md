# Deployment Guide

## Production Deployment Considerations

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong encryption keys (min 32 characters, randomly generated)
- [ ] Configure JWT secrets (use strong random strings)
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable database encryption at rest
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring and alerting
- [ ] Review and restrict CORS policies
- [ ] Implement API key management for external services

### Environment Variables

Each service requires specific environment variables. Create `.env` files for each service with production values:

#### API Gateway
```env
PORT=3000
JWT_SECRET=<strong-random-secret>
USER_SERVICE_URL=http://user-service:3001
VEHICLE_SERVICE_URL=http://vehicle-service:3002
PAYMENT_SERVICE_URL=http://payment-service:3003
CREDIT_SERVICE_URL=http://credit-service:3004
TELEMATICS_SERVICE_URL=http://telematics-service:3005
SUPPORT_SERVICE_URL=http://support-service:3006
```

#### User Service
```env
PORT=3001
DB_HOST=user-db
DB_PORT=5432
DB_NAME=userdb
DB_USER=user
DB_PASSWORD=<strong-password>
RABBITMQ_URL=amqp://admin:<password>@rabbitmq:5672
ENCRYPTION_KEY=<32-char-min-encryption-key>
JWT_SECRET=<strong-random-secret>
```

Similar configuration for other services.

### Database Setup

1. **Create Production Databases**:
   - Use managed database services (AWS RDS, Google Cloud SQL, etc.)
   - Enable automated backups
   - Configure read replicas for read-heavy services
   - Enable encryption at rest

2. **Run Migrations**:
   - Services auto-create schemas on first start
   - For production, consider using migration tools (Knex.js, TypeORM migrations)

3. **Connection Pooling**:
   - Configure appropriate pool sizes
   - Monitor connection usage
   - Set up connection timeouts

### Message Queue Setup

1. **RabbitMQ Production Configuration**:
   - Use managed RabbitMQ service (CloudAMQP, AWS MQ, etc.)
   - Configure high availability
   - Set up monitoring
   - Configure dead letter queues
   - Set appropriate message TTL

2. **Queue Management**:
   - Create durable queues
   - Configure queue limits
   - Set up queue monitoring

### Container Deployment

#### Docker Compose (Simple Deployment)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  api-gateway:
    build: ./services/api-gateway
    environment:
      - NODE_ENV=production
    ports:
      - "80:3000"
    depends_on:
      - user-service
      - vehicle-service
      # ... other services
```

#### Kubernetes Deployment

1. **Create Namespace**:
```bash
kubectl create namespace rent-to-own
```

2. **Deploy ConfigMaps and Secrets**:
```bash
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=<secret> \
  --from-literal=encryption-key=<key> \
  -n rent-to-own
```

3. **Deploy Services**:
   - Create Deployment manifests for each service
   - Configure Service resources for internal communication
   - Set up Ingress for external access

4. **Deploy Databases**:
   - Use StatefulSets for databases
   - Or use managed database services

### Monitoring & Logging

1. **Application Monitoring**:
   - Prometheus for metrics
   - Grafana for dashboards
   - Set up alerts for:
     - High error rates
     - Slow response times
     - Queue depths
     - Database connection issues

2. **Logging**:
   - Centralized logging (ELK stack, Loki, etc.)
   - Structured logging (JSON format)
   - Log retention policies
   - Log aggregation

3. **Health Checks**:
   - Configure Kubernetes liveness/readiness probes
   - Set up health check endpoints
   - Monitor service dependencies

### Scaling

1. **Horizontal Scaling**:
   - Each service can be scaled independently
   - Use Kubernetes HPA (Horizontal Pod Autoscaler)
   - Monitor resource usage

2. **Database Scaling**:
   - Read replicas for read-heavy operations
   - Connection pooling
   - Query optimization

3. **Message Queue Scaling**:
   - RabbitMQ cluster for high availability
   - Multiple consumers for parallel processing

### Backup & Recovery

1. **Database Backups**:
   - Automated daily backups
   - Point-in-time recovery
   - Test restore procedures

2. **Configuration Backups**:
   - Version control for configuration
   - Backup encryption keys securely
   - Document recovery procedures

### CI/CD Pipeline

1. **Build Process**:
   - Build Docker images
   - Run tests
   - Security scanning

2. **Deployment Process**:
   - Blue-green deployment
   - Canary deployments
   - Rollback procedures

3. **Testing**:
   - Unit tests
   - Integration tests
   - End-to-end tests
   - Load testing

### Mobile Money Integration

1. **Provider Setup**:
   - Register with mobile money providers (MTN, Airtel, etc.)
   - Obtain API credentials
   - Configure webhooks for payment notifications

2. **Security**:
   - Store API keys securely (use secrets management)
   - Implement webhook signature verification
   - Use HTTPS for all API calls

3. **Error Handling**:
   - Implement retry logic
   - Handle provider downtime
   - Monitor transaction success rates

### Performance Optimization

1. **Caching**:
   - Implement Redis caching
   - Cache frequently accessed data
   - Set appropriate TTLs

2. **Database Optimization**:
   - Add appropriate indexes
   - Optimize queries
   - Use connection pooling

3. **API Optimization**:
   - Implement pagination
   - Use compression
   - Optimize response sizes

### Disaster Recovery

1. **Backup Strategy**:
   - Regular database backups
   - Configuration backups
   - Code repository backups

2. **Recovery Procedures**:
   - Document recovery steps
   - Test recovery procedures
   - Maintain runbooks

3. **High Availability**:
   - Multi-region deployment
   - Database replication
   - Load balancing

## Maintenance

### Regular Tasks

- Monitor service health
- Review error logs
- Update dependencies
- Review security patches
- Performance tuning
- Capacity planning

### Updates

1. **Service Updates**:
   - Deploy updates gradually
   - Monitor for issues
   - Rollback if necessary

2. **Database Migrations**:
   - Test migrations in staging
   - Backup before migration
   - Monitor during migration

3. **Infrastructure Updates**:
   - Plan maintenance windows
   - Communicate with stakeholders
   - Test in staging first


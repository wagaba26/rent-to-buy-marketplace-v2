# Deployment Plan - Rent-to-Own Marketplace Platform

## Overview

This document provides a comprehensive, step-by-step deployment plan for the Rent-to-Own Marketplace platform. The platform consists of:
- **Frontend**: Next.js application
- **Backend**: 7 microservices (API Gateway, User Service, Vehicle Service, Payment Service, Credit Service, Telematics Service, Support Service)
- **Databases**: PostgreSQL (one per service)
- **Message Queue**: RabbitMQ
- **Real-time**: Instant.dev
- **Infrastructure**: Kubernetes or Docker Compose

---

## Phase 1: Pre-Deployment Preparation

### 1.1 Environment Assessment

**Timeline**: 1-2 days

- [ ] **Choose deployment platform**:
  - Option A: Kubernetes (recommended for production)
  - Option B: Docker Compose (simpler, good for smaller deployments)
  - Option C: Cloud Platform (AWS, GCP, Azure) with managed services

- [ ] **Infrastructure requirements**:
  - Minimum 4 CPU cores, 16GB RAM for development/staging
  - Production: 8+ CPU cores, 32GB+ RAM (scalable)
  - Storage: 100GB+ for databases and logs
  - Network: Load balancer, DNS configuration

- [ ] **Third-party services setup**:
  - [ ] Instant.dev account and App ID
  - [ ] Mobile Money provider accounts (MTN, Airtel, etc.)
  - [ ] Domain name and SSL certificate
  - [ ] Container registry (Docker Hub, AWS ECR, GCR, etc.)

### 1.2 Security Preparation

**Timeline**: 1 day

- [ ] **Generate secure secrets**:
```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate encryption key (32+ characters)
openssl rand -base64 32

# Generate database passwords
openssl rand -base64 24
```

- [ ] **Set up secrets management**:
  - Kubernetes Secrets
  - AWS Secrets Manager / Azure Key Vault / GCP Secret Manager
  - Or secure environment variable storage

- [ ] **SSL/TLS certificates**:
  - Obtain SSL certificates (Let's Encrypt, AWS Certificate Manager, etc.)
  - Configure certificate renewal

### 1.3 Code Preparation

**Timeline**: 1 day

- [ ] **Code review and testing**:
  - Run all tests
  - Fix any critical bugs
  - Code quality checks

- [ ] **Version control**:
  - Tag release version
  - Create deployment branch
  - Document changes

- [ ] **Environment configuration**:
  - Review all `.env` files
  - Document required environment variables
  - Create environment-specific configs (dev, staging, prod)

---

## Phase 2: Infrastructure Setup

### 2.1 Container Registry Setup

**Timeline**: 2-4 hours

1. **Create container registry** (if not using public Docker Hub):
```bash
# AWS ECR example
aws ecr create-repository --repository-name rent-to-own/api-gateway
aws ecr create-repository --repository-name rent-to-own/user-service
# ... repeat for all services
```

2. **Configure Docker authentication**:
```bash
# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Docker Hub
docker login
```

### 2.2 Database Setup

**Timeline**: 4-8 hours

**Option A: Managed Databases (Recommended for Production)**

- [ ] **Set up managed PostgreSQL**:
  - AWS RDS, Google Cloud SQL, or Azure Database for PostgreSQL
  - Create databases for each service:
    - `userdb`
    - `vehicledb`
    - `paymentdb`
    - `creditdb`
    - `telematicsdb`
    - `supportdb`

- [ ] **Configure database**:
  - Enable automated backups
  - Configure read replicas (if needed)
  - Enable encryption at rest
  - Set up connection pooling (PgBouncer recommended)
  - Configure firewall/security groups

**Option B: Self-Managed Databases (Kubernetes)**

- [ ] Deploy PostgreSQL StatefulSets using `k8s/databases.yaml`
- [ ] Configure persistent volumes
- [ ] Set up backup jobs

### 2.3 Message Queue Setup

**Timeline**: 2-4 hours

**Option A: Managed RabbitMQ (Recommended)**

- [ ] **Set up managed RabbitMQ**:
  - AWS MQ, CloudAMQP, or Azure Service Bus
  - Configure high availability
  - Set up monitoring

**Option B: Self-Managed RabbitMQ**

- [ ] Deploy RabbitMQ using `k8s/rabbitmq.yaml`
- [ ] Configure clustering (for HA)
- [ ] Set up monitoring

### 2.4 Kubernetes Cluster Setup (If using K8s)

**Timeline**: 4-8 hours

- [ ] **Create Kubernetes cluster**:
  - EKS (AWS), GKE (Google), AKS (Azure), or self-managed
  - Minimum: 3 nodes, 4 CPU, 16GB RAM each

- [ ] **Install required components**:
```bash
# Ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Cert-manager (for SSL)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

- [ ] **Configure cluster**:
  - Set up RBAC
  - Configure network policies
  - Set up monitoring namespace

---

## Phase 3: Build and Containerization

### 3.1 Build Docker Images

**Timeline**: 2-4 hours

1. **Build all service images**:

```bash
# Using provided script (Linux/Mac)
./scripts/build-images.sh

# Or manually for each service
docker build -t rent-to-own/api-gateway:latest ./services/api-gateway
docker build -t rent-to-own/user-service:latest ./services/user-service
docker build -t rent-to-own/vehicle-service:latest ./services/vehicle-service
docker build -t rent-to-own/payment-service:latest ./services/payment-service
docker build -t rent-to-own/credit-service:latest ./services/credit-service
docker build -t rent-to-own/telematics-service:latest ./services/telematics-service
docker build -t rent-to-own/support-service:latest ./services/support-service

# Build Next.js frontend
docker build -t rent-to-own/frontend:latest .
```

2. **Tag images with version**:
```bash
VERSION=v1.0.0
docker tag rent-to-own/api-gateway:latest rent-to-own/api-gateway:$VERSION
# ... repeat for all services
```

3. **Push to registry**:
```bash
# Push all images
docker push rent-to-own/api-gateway:latest
docker push rent-to-own/api-gateway:$VERSION
# ... repeat for all services
```

### 3.2 Image Security Scanning

**Timeline**: 1-2 hours

- [ ] **Scan images for vulnerabilities**:
```bash
# Using Trivy
trivy image rent-to-own/api-gateway:latest

# Or using Docker Scout
docker scout cves rent-to-own/api-gateway:latest
```

- [ ] Fix critical vulnerabilities before deployment

---

## Phase 4: Configuration Management

### 4.1 Update Kubernetes Secrets

**Timeline**: 1 hour

1. **Edit `k8s/secrets.yaml`** with production values:
```yaml
# Replace all placeholder values with actual secrets
data:
  jwt-secret: <base64-encoded-secret>
  encryption-key: <base64-encoded-key>
  db-passwords: <base64-encoded-passwords>
  # ... etc
```

2. **Create secrets**:
```bash
kubectl apply -f k8s/secrets.yaml
```

### 4.2 Update ConfigMaps

**Timeline**: 1 hour

1. **Edit `k8s/configmap.yaml`** with production settings:
   - Service URLs
   - Database connection strings
   - Mobile Money callback URLs
   - Instant.dev App ID
   - Environment-specific settings

2. **Apply ConfigMaps**:
```bash
kubectl apply -f k8s/configmap.yaml
```

### 4.3 Environment Variables for Frontend

**Timeline**: 30 minutes

- [ ] **Create `.env.production`** for Next.js:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_INSTANT_APP_ID=your-instant-app-id
# ... other public env vars
```

---

## Phase 5: Database Initialization

### 5.1 Create Database Schemas

**Timeline**: 1-2 hours

1. **For each service database**:
```bash
# Connect to database
psql -h <db-host> -U <user> -d userdb

# Run initialization script (if available)
# Or services will auto-create schemas on first start
```

2. **Run migrations** (if using migration tools):
```bash
# Example with Knex
npm run migrate:production
```

3. **Verify schemas**:
```bash
# Check tables exist
psql -h <db-host> -U <user> -d userdb -c "\dt"
```

### 5.2 Seed Initial Data (Optional)

**Timeline**: 1 hour

- [ ] Seed vehicle categories
- [ ] Seed payment plan templates
- [ ] Create admin user (if needed)

---

## Phase 6: Service Deployment

### 6.1 Deploy Infrastructure Components

**Timeline**: 2-4 hours

1. **Create namespace**:
```bash
kubectl apply -f k8s/namespace.yaml
```

2. **Deploy databases** (if self-managed):
```bash
kubectl apply -f k8s/databases.yaml
# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=user-db -n rent-to-own --timeout=300s
```

3. **Deploy RabbitMQ** (if self-managed):
```bash
kubectl apply -f k8s/rabbitmq.yaml
kubectl wait --for=condition=ready pod -l app=rabbitmq -n rent-to-own --timeout=300s
```

### 6.2 Deploy Microservices

**Timeline**: 2-4 hours

**Deploy in order** (services that others depend on first):

1. **Deploy core services**:
```bash
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/vehicle-service-deployment.yaml
kubectl apply -f k8s/credit-service-deployment.yaml
```

2. **Wait for core services to be ready**:
```bash
kubectl wait --for=condition=available deployment/user-service -n rent-to-own --timeout=300s
kubectl wait --for=condition=available deployment/vehicle-service -n rent-to-own --timeout=300s
kubectl wait --for=condition=available deployment/credit-service -n rent-to-own --timeout=300s
```

3. **Deploy dependent services**:
```bash
kubectl apply -f k8s/payment-service-deployment.yaml
kubectl apply -f k8s/telematics-service-deployment.yaml
kubectl apply -f k8s/support-service-deployment.yaml
```

4. **Deploy API Gateway**:
```bash
kubectl apply -f k8s/api-gateway-deployment.yaml
```

5. **Deploy Frontend** (Next.js):
```bash
# Create frontend deployment (if not in k8s folder)
kubectl apply -f k8s/frontend-deployment.yaml
```

### 6.3 Verify Service Health

**Timeline**: 1 hour

```bash
# Check all pods are running
kubectl get pods -n rent-to-own

# Check service endpoints
kubectl get endpoints -n rent-to-own

# Test health endpoints
kubectl port-forward -n rent-to-own svc/api-gateway 8080:80
curl http://localhost:8080/health
```

---

## Phase 7: Monitoring and Logging

### 7.1 Deploy Monitoring Stack

**Timeline**: 2-4 hours

1. **Deploy Prometheus and Grafana**:
```bash
kubectl apply -f k8s/monitoring.yaml
```

2. **Access monitoring**:
```bash
# Port forward to Prometheus
kubectl port-forward -n rent-to-own svc/prometheus 9090:9090

# Port forward to Grafana
kubectl port-forward -n rent-to-own svc/grafana 3000:3000
```

3. **Configure Grafana dashboards**:
   - Import service dashboards
   - Set up alerts
   - Configure notification channels

### 7.2 Deploy Logging Stack

**Timeline**: 2-4 hours

1. **Deploy ELK stack**:
```bash
kubectl apply -f k8s/logging.yaml
```

2. **Access Kibana**:
```bash
kubectl port-forward -n rent-to-own svc/kibana 5601:5601
```

3. **Configure log indices**:
   - Create index patterns
   - Set up log retention policies
   - Configure log searches

### 7.3 Set Up Alerting

**Timeline**: 2-4 hours

- [ ] Configure Prometheus alert rules
- [ ] Set up alert manager
- [ ] Configure notification channels (Email, Slack, PagerDuty)
- [ ] Test alerts

---

## Phase 8: Networking and External Access

### 8.1 Configure Ingress

**Timeline**: 2-4 hours

1. **Deploy Ingress**:
```bash
kubectl apply -f k8s/ingress.yaml
```

2. **Configure SSL/TLS**:
```bash
# If using cert-manager
kubectl apply -f k8s/cert-manager-issuer.yaml
```

3. **Update DNS**:
   - Point domain to load balancer IP
   - Configure subdomains (api.yourdomain.com, app.yourdomain.com)

### 8.2 Configure Load Balancer

**Timeline**: 1-2 hours

- [ ] Set up load balancer (if not automatic)
- [ ] Configure health checks
- [ ] Set up SSL termination
- [ ] Configure firewall rules

---

## Phase 9: Autoscaling and Performance

### 9.1 Deploy Horizontal Pod Autoscalers

**Timeline**: 1 hour

```bash
kubectl apply -f k8s/hpa.yaml
```

### 9.2 Configure Resource Limits

**Timeline**: 1-2 hours

- [ ] Review and adjust resource requests/limits in deployments
- [ ] Monitor resource usage
- [ ] Optimize based on actual usage

### 9.3 Performance Testing

**Timeline**: 4-8 hours

- [ ] Load testing
- [ ] Stress testing
- [ ] Identify bottlenecks
- [ ] Optimize as needed

---

## Phase 10: CI/CD Pipeline Setup

### 10.1 Set Up CI/CD

**Timeline**: 4-8 hours

**Option A: GitHub Actions**

1. **Create `.github/workflows/deploy.yml`**:
```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push images
        # ... build steps
      - name: Deploy to Kubernetes
        # ... deployment steps
```

**Option B: GitLab CI/CD, Jenkins, or other**

- [ ] Configure pipeline
- [ ] Set up automated testing
- [ ] Configure deployment stages
- [ ] Set up rollback procedures

### 10.2 Deployment Strategies

- [ ] **Blue-Green Deployment**: Set up for zero-downtime
- [ ] **Canary Deployment**: Gradual rollout
- [ ] **Rolling Updates**: Default Kubernetes strategy

---

## Phase 11: Backup and Disaster Recovery

### 11.1 Database Backups

**Timeline**: 2-4 hours

1. **Set up automated backups**:
   - Daily full backups
   - Hourly incremental backups (if supported)
   - Point-in-time recovery

2. **Test restore procedures**:
```bash
# Test restore from backup
pg_restore -h <db-host> -U <user> -d <database> <backup-file>
```

### 11.2 Configuration Backups

**Timeline**: 1 hour

- [ ] Backup Kubernetes manifests
- [ ] Backup secrets (securely)
- [ ] Version control all configurations

### 11.3 Disaster Recovery Plan

**Timeline**: 4-8 hours

- [ ] Document recovery procedures
- [ ] Test recovery scenarios
- [ ] Set up multi-region deployment (if needed)
- [ ] Define RTO (Recovery Time Objective) and RPO (Recovery Point Objective)

---

## Phase 12: Post-Deployment Verification

### 12.1 Functional Testing

**Timeline**: 4-8 hours

- [ ] **User Authentication**:
  - [ ] Registration
  - [ ] Login
  - [ ] JWT token validation

- [ ] **Vehicle Management**:
  - [ ] Browse vehicles
  - [ ] Search and filter
  - [ ] Real-time updates (Instant.dev)

- [ ] **Payment Processing**:
  - [ ] Create payment plan
  - [ ] Process payment
  - [ ] Payment webhooks

- [ ] **Credit Scoring**:
  - [ ] Submit credit application
  - [ ] Receive credit score

- [ ] **Other Features**:
  - [ ] Telematics data
  - [ ] Support tickets
  - [ ] Notifications

### 12.2 Performance Verification

**Timeline**: 2-4 hours

- [ ] Response time checks
- [ ] Load testing
- [ ] Database query performance
- [ ] Real-time sync performance

### 12.3 Security Verification

**Timeline**: 2-4 hours

- [ ] SSL/TLS verification
- [ ] Authentication/authorization checks
- [ ] API security testing
- [ ] Penetration testing (optional)

---

## Phase 13: Documentation and Handover

### 13.1 Documentation

**Timeline**: 4-8 hours

- [ ] **Operational Runbooks**:
  - [ ] Service restart procedures
  - [ ] Database backup/restore
  - [ ] Troubleshooting guides
  - [ ] Common issues and solutions

- [ ] **Architecture Documentation**:
  - [ ] System architecture diagram
  - [ ] Network topology
  - [ ] Data flow diagrams

- [ ] **API Documentation**:
  - [ ] API endpoints
  - [ ] Authentication
  - [ ] Request/response examples

### 13.2 Team Training

**Timeline**: 4-8 hours

- [ ] Train operations team
- [ ] Train developers
- [ ] Document access procedures
- [ ] Share monitoring dashboards

---

## Phase 14: Go-Live Checklist

### Final Pre-Launch Checklist

- [ ] All services deployed and healthy
- [ ] Databases backed up
- [ ] Monitoring and alerting configured
- [ ] SSL certificates valid
- [ ] DNS configured correctly
- [ ] Load balancer configured
- [ ] Security review completed
- [ ] Performance testing passed
- [ ] Backup and recovery tested
- [ ] Documentation complete
- [ ] Team trained
- [ ] Rollback plan ready
- [ ] Support channels ready
- [ ] Maintenance window scheduled (if needed)

### Launch

1. **Final verification**:
```bash
# Check all services
kubectl get pods -n rent-to-own

# Check service health
curl https://api.yourdomain.com/health

# Check frontend
curl https://yourdomain.com
```

2. **Switch DNS** (if needed)
3. **Monitor closely** for first 24-48 hours
4. **Be ready to rollback** if critical issues arise

---

## Phase 15: Post-Launch Monitoring

### 15.1 First 24 Hours

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check database performance
- [ ] Monitor queue depths
- [ ] Review logs for errors
- [ ] Check user feedback

### 15.2 First Week

- [ ] Performance optimization
- [ ] Fix any discovered issues
- [ ] Adjust resource limits
- [ ] Fine-tune autoscaling
- [ ] Review and optimize costs

---

## Deployment Options Summary

### Option 1: Kubernetes (Recommended for Production)

**Pros**:
- Scalable and production-ready
- High availability
- Auto-scaling
- Rolling updates
- Service discovery

**Cons**:
- More complex setup
- Requires Kubernetes expertise
- Higher infrastructure costs

**Timeline**: 2-3 weeks

### Option 2: Docker Compose (Simpler)

**Pros**:
- Simple setup
- Good for smaller deployments
- Lower learning curve
- Faster initial deployment

**Cons**:
- Limited scalability
- Manual scaling
- Less production-ready features

**Timeline**: 1 week

**Deployment**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Cloud Platform (AWS/GCP/Azure)

**Pros**:
- Managed services
- Auto-scaling
- High availability
- Integrated monitoring
- Pay-as-you-go

**Cons**:
- Vendor lock-in
- Can be expensive
- Requires cloud expertise

**Timeline**: 2-3 weeks

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Pre-Deployment | 3-5 days | None |
| Infrastructure Setup | 2-3 days | Phase 1 |
| Build & Containerization | 1-2 days | Phase 1 |
| Configuration | 1 day | Phase 2 |
| Database Init | 1-2 days | Phase 2 |
| Service Deployment | 2-3 days | Phases 3-5 |
| Monitoring & Logging | 2-3 days | Phase 6 |
| Networking | 1-2 days | Phase 6 |
| Autoscaling | 1 day | Phase 7 |
| CI/CD | 2-3 days | Phase 6 |
| Backup & DR | 2-3 days | Phase 6 |
| Verification | 2-3 days | Phase 6 |
| Documentation | 2-3 days | All phases |
| **Total** | **3-5 weeks** | |

---

## Cost Estimation (Monthly)

### Infrastructure Costs (Example - AWS)

- **Kubernetes Cluster (EKS)**: $73/month + node costs
- **EC2 Instances (3x t3.large)**: ~$150/month
- **RDS PostgreSQL (db.t3.medium x6)**: ~$600/month
- **RabbitMQ (AWS MQ)**: ~$200/month
- **Load Balancer**: ~$20/month
- **Storage (EBS)**: ~$50/month
- **Monitoring (CloudWatch)**: ~$50/month
- **Total**: ~$1,143/month

*Note: Costs vary significantly based on region, usage, and provider*

---

## Support and Maintenance

### Regular Tasks

- **Daily**: Monitor dashboards, check error logs
- **Weekly**: Review performance metrics, optimize queries
- **Monthly**: Security updates, dependency updates, capacity planning
- **Quarterly**: Disaster recovery testing, architecture review

### On-Call Rotation

- Set up on-call rotation
- Configure alerting
- Document escalation procedures

---

## Troubleshooting Quick Reference

### Service Not Starting
```bash
kubectl describe pod <pod-name> -n rent-to-own
kubectl logs <pod-name> -n rent-to-own
```

### Database Connection Issues
```bash
kubectl get pods -l app=user-db -n rent-to-own
kubectl logs -l app=user-db -n rent-to-own
```

### Service Unavailable
```bash
kubectl get endpoints -n rent-to-own
kubectl describe svc <service-name> -n rent-to-own
```

### High Resource Usage
```bash
kubectl top pods -n rent-to-own
kubectl top nodes
```

---

## Next Steps

1. **Review this plan** with your team
2. **Choose deployment option** (Kubernetes recommended)
3. **Set up infrastructure** (Phase 2)
4. **Follow phases sequentially**
5. **Document any deviations** from this plan
6. **Update plan** based on lessons learned

---

## Additional Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment considerations
- [k8s/DEPLOYMENT_GUIDE.md](k8s/DEPLOYMENT_GUIDE.md) - Kubernetes-specific guide
- [README_DEPLOYMENT.md](README_DEPLOYMENT.md) - Quick reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

---

**Last Updated**: [Current Date]
**Version**: 1.0.0




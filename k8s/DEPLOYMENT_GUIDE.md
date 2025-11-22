# Kubernetes Deployment Guide

This guide covers deploying the Rent-to-Own Marketplace microservices to Kubernetes.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured to access your cluster
- Docker registry access (for pushing images)
- Helm (optional, for easier management)

## Pre-Deployment Steps

### 1. Build and Push Docker Images

Build all service images:

```bash
# Build all services
docker build -t rent-to-own/api-gateway:latest ./services/api-gateway
docker build -t rent-to-own/user-service:latest ./services/user-service
docker build -t rent-to-own/vehicle-service:latest ./services/vehicle-service
docker build -t rent-to-own/payment-service:latest ./services/payment-service
docker build -t rent-to-own/credit-service:latest ./services/credit-service
docker build -t rent-to-own/telematics-service:latest ./services/telematics-service
docker build -t rent-to-own/support-service:latest ./services/support-service

# Push to your registry (replace with your registry)
docker push rent-to-own/api-gateway:latest
docker push rent-to-own/user-service:latest
docker push rent-to-own/vehicle-service:latest
docker push rent-to-own/payment-service:latest
docker push rent-to-own/credit-service:latest
docker push rent-to-own/telematics-service:latest
docker push rent-to-own/support-service:latest
```

### 2. Update Secrets

**CRITICAL**: Update `k8s/secrets.yaml` with production values:

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY

# Edit k8s/secrets.yaml and replace all placeholder values
```

### 3. Update ConfigMaps

Review and update `k8s/configmap.yaml` with your production configuration:
- Service URLs
- Database hosts
- Mobile Money callback URLs
- Environment-specific settings

## Deployment Steps

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create Secrets and ConfigMaps

```bash
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
```

### 3. Deploy Infrastructure

Deploy databases and message queue:

```bash
kubectl apply -f k8s/databases.yaml
kubectl apply -f k8s/rabbitmq.yaml
```

Wait for databases to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=user-db -n rent-to-own --timeout=300s
kubectl wait --for=condition=ready pod -l app=vehicle-db -n rent-to-own --timeout=300s
# ... repeat for other databases
```

### 4. Deploy Services

Deploy all microservices:

```bash
kubectl apply -f k8s/api-gateway-deployment.yaml
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/vehicle-service-deployment.yaml
kubectl apply -f k8s/payment-service-deployment.yaml
kubectl apply -f k8s/credit-service-deployment.yaml
kubectl apply -f k8s/telematics-service-deployment.yaml
kubectl apply -f k8s/support-service-deployment.yaml
```

### 5. Deploy Monitoring

```bash
kubectl apply -f k8s/monitoring.yaml
```

### 6. Deploy Logging

```bash
kubectl apply -f k8s/logging.yaml
```

### 7. Deploy Horizontal Pod Autoscalers

```bash
kubectl apply -f k8s/hpa.yaml
```

### 8. Deploy Ingress

```bash
# Ensure you have an ingress controller installed (e.g., nginx-ingress)
kubectl apply -f k8s/ingress.yaml
```

## Verification

### Check Pod Status

```bash
kubectl get pods -n rent-to-own
```

All pods should be in `Running` state.

### Check Service Health

```bash
# Port forward to API Gateway
kubectl port-forward -n rent-to-own svc/api-gateway 8080:80

# Test health endpoint
curl http://localhost:8080/health
```

### Check Logs

```bash
# View logs for a specific service
kubectl logs -n rent-to-own -l app=api-gateway --tail=100

# Follow logs
kubectl logs -n rent-to-own -f -l app=user-service
```

### Access Monitoring

```bash
# Port forward to Prometheus
kubectl port-forward -n rent-to-own svc/prometheus 9090:9090

# Port forward to Grafana
kubectl port-forward -n rent-to-own svc/grafana 3000:3000
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### Access Logging

```bash
# Port forward to Kibana
kubectl port-forward -n rent-to-own svc/kibana 5601:5601
```

Access Kibana at: http://localhost:5601

## Scaling

### Manual Scaling

```bash
kubectl scale deployment api-gateway -n rent-to-own --replicas=5
```

### Automatic Scaling

HPA is already configured. Check HPA status:

```bash
kubectl get hpa -n rent-to-own
```

## Updates and Rollouts

### Rolling Update

```bash
# Update image
kubectl set image deployment/api-gateway api-gateway=rent-to-own/api-gateway:v1.1.0 -n rent-to-own

# Monitor rollout
kubectl rollout status deployment/api-gateway -n rent-to-own

# Rollback if needed
kubectl rollout undo deployment/api-gateway -n rent-to-own
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n rent-to-own

# Check logs
kubectl logs <pod-name> -n rent-to-own
```

### Database Connection Issues

```bash
# Check database pod status
kubectl get pods -l app=user-db -n rent-to-own

# Check database logs
kubectl logs -l app=user-db -n rent-to-own
```

### Service Unavailable

```bash
# Check service endpoints
kubectl get endpoints -n rent-to-own

# Check service configuration
kubectl describe svc api-gateway -n rent-to-own
```

## Production Considerations

### 1. Use Managed Databases

For production, consider using managed database services:
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL

Update service environment variables to point to managed databases.

### 2. Use Managed Message Queue

Consider using:
- AWS MQ
- Google Cloud Pub/Sub
- Azure Service Bus

### 3. Enable TLS/SSL

Configure TLS certificates for ingress using cert-manager:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f k8s/cert-manager-issuer.yaml
```

### 4. Resource Limits

Review and adjust resource requests/limits based on your workload:

```bash
kubectl top pods -n rent-to-own
```

### 5. Backup Strategy

Set up automated backups for databases:

```bash
# Example: Use Velero for backup
velero backup create rent-to-own-backup --include-namespaces rent-to-own
```

### 6. Network Policies

Implement network policies for security:

```bash
kubectl apply -f k8s/network-policies.yaml
```

## Cleanup

To remove all resources:

```bash
kubectl delete namespace rent-to-own
```

**Warning**: This will delete all data. Ensure you have backups!


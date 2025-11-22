# Kubernetes Deployment Files

This directory contains all Kubernetes manifests for deploying the Rent-to-Own Marketplace platform.

## File Structure

```
k8s/
├── namespace.yaml              # Namespace definition
├── configmap.yaml              # Configuration values
├── secrets.yaml                # Sensitive data (UPDATE BEFORE DEPLOYING!)
├── databases.yaml              # PostgreSQL StatefulSets
├── rabbitmq.yaml               # RabbitMQ StatefulSet
├── api-gateway-deployment.yaml # API Gateway deployment
├── user-service-deployment.yaml
├── vehicle-service-deployment.yaml
├── payment-service-deployment.yaml
├── credit-service-deployment.yaml
├── telematics-service-deployment.yaml
├── support-service-deployment.yaml
├── monitoring.yaml             # Prometheus & Grafana
├── logging.yaml                # ELK stack
├── hpa.yaml                    # Horizontal Pod Autoscalers
├── ingress.yaml                # Ingress configuration
├── DEPLOYMENT_GUIDE.md         # Detailed deployment guide
└── README.md                   # This file
```

## Quick Start

### 1. Update Secrets

**CRITICAL**: Edit `secrets.yaml` with production values:

```bash
# Generate secure secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY

# Edit secrets.yaml
vim k8s/secrets.yaml
```

### 2. Build and Push Images

```bash
# Build all services
docker build -t rent-to-own/api-gateway:latest -f services/api-gateway/Dockerfile .
docker build -t rent-to-own/user-service:latest -f services/user-service/Dockerfile .
# ... repeat for all services

# Push to registry
docker push rent-to-own/api-gateway:latest
# ... push all services
```

### 3. Deploy

```bash
# Apply all manifests
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

### 4. Verify

```bash
# Check all pods
kubectl get pods -n rent-to-own

# Check services
kubectl get svc -n rent-to-own

# Check ingress
kubectl get ingress -n rent-to-own
```

## Deployment Order

1. **Infrastructure First**
   - Namespace
   - Secrets & ConfigMaps
   - Databases
   - RabbitMQ

2. **Services**
   - All microservices (can be deployed in parallel)

3. **Observability**
   - Monitoring (Prometheus, Grafana)
   - Logging (ELK stack)

4. **Scaling & Routing**
   - HPA
   - Ingress

## Access Points

After deployment, access services via:

- **API Gateway**: `http://api.rent-to-own.com` (via Ingress)
- **Prometheus**: Port-forward to `9090`
- **Grafana**: Port-forward to `3000`
- **Kibana**: Port-forward to `5601`
- **RabbitMQ Management**: Port-forward to `15672`

## Troubleshooting

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed troubleshooting steps.

## Production Considerations

1. **Use Managed Services**: Consider managed databases and message queues
2. **Update Image Tags**: Use version tags instead of `latest`
3. **Resource Limits**: Adjust based on actual usage
4. **Network Policies**: Implement for security
5. **TLS/SSL**: Configure certificates for ingress
6. **Backups**: Set up automated backups


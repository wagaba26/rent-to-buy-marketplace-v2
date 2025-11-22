# Deployment Checklist - Quick Reference

Use this checklist during actual deployment. Check off items as you complete them.

## Pre-Deployment

- [ ] Infrastructure chosen (K8s/Docker Compose/Cloud)
- [ ] Container registry set up
- [ ] Secrets generated (JWT, encryption keys, DB passwords)
- [ ] SSL certificates obtained
- [ ] Instant.dev App ID obtained
- [ ] Mobile Money provider accounts set up
- [ ] Domain name configured
- [ ] Code reviewed and tested
- [ ] Release version tagged

## Infrastructure Setup

- [ ] Kubernetes cluster created (if using K8s)
- [ ] Container registry configured
- [ ] Databases created (managed or self-hosted)
- [ ] RabbitMQ set up (managed or self-hosted)
- [ ] Ingress controller installed
- [ ] Cert-manager installed (for SSL)

## Build & Push

- [ ] All Docker images built
- [ ] Images tagged with version
- [ ] Images pushed to registry
- [ ] Images scanned for vulnerabilities
- [ ] Critical vulnerabilities fixed

## Configuration

- [ ] `k8s/secrets.yaml` updated with production values
- [ ] `k8s/configmap.yaml` updated
- [ ] Frontend `.env.production` created
- [ ] All environment variables documented

## Database

- [ ] All databases created
- [ ] Database schemas initialized
- [ ] Initial data seeded (if needed)
- [ ] Database backups configured
- [ ] Connection pooling configured

## Deployment

- [ ] Namespace created
- [ ] Secrets applied
- [ ] ConfigMaps applied
- [ ] Databases deployed (if self-hosted)
- [ ] RabbitMQ deployed (if self-hosted)
- [ ] Core services deployed (user, vehicle, credit)
- [ ] Dependent services deployed (payment, telematics, support)
- [ ] API Gateway deployed
- [ ] Frontend deployed
- [ ] All pods running and healthy

## Monitoring & Logging

- [ ] Prometheus deployed
- [ ] Grafana deployed
- [ ] ELK stack deployed
- [ ] Dashboards configured
- [ ] Alerts configured
- [ ] Notification channels set up

## Networking

- [ ] Ingress deployed
- [ ] SSL certificates configured
- [ ] DNS configured
- [ ] Load balancer configured
- [ ] Firewall rules set

## Autoscaling

- [ ] HPA deployed
- [ ] Resource limits reviewed
- [ ] Autoscaling tested

## CI/CD

- [ ] CI/CD pipeline configured
- [ ] Automated tests passing
- [ ] Deployment automation tested
- [ ] Rollback procedures tested

## Backup & DR

- [ ] Database backups automated
- [ ] Backup restore tested
- [ ] Configuration backed up
- [ ] Disaster recovery plan documented
- [ ] DR procedures tested

## Verification

- [ ] All services healthy
- [ ] Health endpoints responding
- [ ] User authentication working
- [ ] Vehicle browsing working
- [ ] Real-time updates working
- [ ] Payment processing tested
- [ ] Credit scoring tested
- [ ] Performance acceptable
- [ ] Security verified

## Documentation

- [ ] Runbooks created
- [ ] Architecture documented
- [ ] API documentation updated
- [ ] Team trained
- [ ] Access procedures documented

## Go-Live

- [ ] Final health check passed
- [ ] DNS switched (if needed)
- [ ] Monitoring active
- [ ] Support team ready
- [ ] Rollback plan ready
- [ ] Launch!

## Post-Launch (First 24 Hours)

- [ ] Error rates monitored
- [ ] Response times monitored
- [ ] Database performance checked
- [ ] Logs reviewed
- [ ] User feedback collected
- [ ] Issues addressed

## Post-Launch (First Week)

- [ ] Performance optimized
- [ ] Resource limits adjusted
- [ ] Costs reviewed
- [ ] Lessons learned documented

---

## Quick Commands

### Check Status
```bash
kubectl get pods -n rent-to-own
kubectl get services -n rent-to-own
kubectl get ingress -n rent-to-own
```

### Check Logs
```bash
kubectl logs -n rent-to-own -l app=api-gateway --tail=100
```

### Test Health
```bash
kubectl port-forward -n rent-to-own svc/api-gateway 8080:80
curl http://localhost:8080/health
```

### Rollback
```bash
kubectl rollout undo deployment/<service-name> -n rent-to-own
```

### Scale Service
```bash
kubectl scale deployment/<service-name> -n rent-to-own --replicas=3
```

---

**Print this checklist and use it during deployment!**





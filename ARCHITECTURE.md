# Architecture Documentation

## Overview

The Rent-to-Own Mobility Marketplace is built using a microservices architecture, ensuring resilience, scalability, and maintainability. Each service operates independently with its own database and can be scaled horizontally.

## Architecture Diagram

```
┌─────────────┐
│   Clients   │
│  (Web/Mobile)│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         API Gateway                  │
│  (Routing, Auth, Rate Limiting)     │
└──────┬──────────────────────────────┘
       │
       ├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
       │          │          │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   User   │ │ Vehicle  │ │ Payment  │ │  Credit   │ │Telematics│ │ Support  │
│ Service  │ │ Service  │ │ Service  │ │ Service   │ │ Service  │ │ Service  │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │           │            │            │            │            │
     ▼           ▼            ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ User DB  │ │Vehicle DB│ │Payment DB│ │Credit DB  │ │Telematics│ │Support DB│
│          │ │          │ │          │ │           │ │   DB     │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

       │           │            │            │            │            │
       └───────────┴────────────┴────────────┴────────────┴────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  RabbitMQ        │
                    │  (Message Queue) │
                    └─────────────────┘
```

## Services

### 1. API Gateway (Port 3000)
- **Purpose**: Single entry point for all client requests
- **Responsibilities**:
  - Request routing to appropriate services
  - Authentication and authorization
  - Rate limiting
  - Request/response transformation
- **Technology**: Express.js with http-proxy-middleware

### 2. User Service (Port 3001)
- **Purpose**: User and agent management with KYC verification
- **Responsibilities**:
  - User registration and authentication
  - User profile management
  - KYC document submission and verification
  - Role-based access control (customer, agent, admin)
- **Database**: PostgreSQL (userdb)
- **Key Features**:
  - JWT-based authentication
  - Encrypted sensitive data (phone numbers)
  - KYC workflow management

### 3. Vehicle Service (Port 3002)
- **Purpose**: Vehicle listing and inventory management
- **Responsibilities**:
  - Vehicle CRUD operations
  - Vehicle search and filtering
  - Reservation management
  - Inventory tracking
- **Database**: PostgreSQL (vehicledb)
- **Key Features**:
  - Support for motorcycles, cars, vans, and trucks
  - Flexible payment plan configuration
  - Real-time availability tracking

### 4. Payment Service (Port 3003)
- **Purpose**: Payment scheduling and automatic collections
- **Responsibilities**:
  - Payment plan creation and management
  - Automatic payment collection via mobile money
  - Payment history tracking
  - Payment failure handling
- **Database**: PostgreSQL (paymentdb)
- **Key Features**:
  - Scheduled payment processing (cron jobs)
  - Mobile money integration (MTN, Airtel, etc.)
  - Encrypted payment method storage
  - Retry logic for failed payments

### 5. Credit Service (Port 3004)
- **Purpose**: Credit scoring and assessment
- **Responsibilities**:
  - Credit score calculation
  - Credit assessment for vehicle purchases
  - Risk level determination
  - Behavioral analysis
- **Database**: PostgreSQL (creditdb)
- **Key Features**:
  - Alternative data integration
  - Behavioral signal analysis
  - Dynamic credit score updates
  - Conditional approval workflows

### 6. Telematics Service (Port 3005)
- **Purpose**: Real-time vehicle tracking and risk management
- **Responsibilities**:
  - GPS tracking data collection
  - Real-time location monitoring
  - Risk event detection
  - Vehicle status monitoring
- **Database**: PostgreSQL (telematicsdb)
- **Key Features**:
  - WebSocket support for real-time updates
  - Speed violation detection
  - Geofencing capabilities
  - Risk event logging

### 7. Support Service (Port 3006)
- **Purpose**: Customer support, notifications, and upgrades
- **Responsibilities**:
  - Support ticket management
  - Notification delivery (email, SMS, push)
  - Vehicle upgrade workflows
  - Customer communication
- **Database**: PostgreSQL (supportdb)
- **Key Features**:
  - Multi-channel notifications
  - Ticket escalation workflows
  - Upgrade request management
  - Event-driven notifications

## Communication Patterns

### Synchronous Communication
- **HTTP/REST**: Used for direct client-service communication via API Gateway
- **Request-Response**: Standard REST API calls for immediate responses

### Asynchronous Communication
- **Message Queue (RabbitMQ)**: Used for inter-service communication
- **Event-Driven**: Services publish events that other services subscribe to
- **Benefits**:
  - Loose coupling between services
  - Resilience to service failures
  - Scalability
  - Event sourcing capabilities

### Event Types

#### User Events
- `user.created` - New user registration
- `kyc.submitted` - KYC document submitted
- `kyc.approved` - KYC verification approved

#### Vehicle Events
- `vehicle.created` - New vehicle listed
- `vehicle.reserved` - Vehicle reservation created

#### Payment Events
- `payment.plan.created` - New payment plan created
- `payment.completed` - Payment successfully processed
- `payment.failed` - Payment processing failed

#### Credit Events
- `credit.approved` - Credit assessment approved
- `credit.rejected` - Credit assessment rejected

#### Telematics Events
- `telematics.risk.detected` - Risk event detected from vehicle tracking

#### Support Events
- `support.ticket.created` - New support ticket created
- `upgrade.requested` - Vehicle upgrade requested
- `upgrade.approved` - Upgrade request approved

## Data Security

### Encryption
- **At Rest**: Sensitive data encrypted using AES-256-GCM
- **In Transit**: TLS/HTTPS for all communications
- **Encrypted Fields**:
  - Phone numbers
  - Document numbers
  - Payment method details

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-Based Access Control**: Customer, Agent, Admin roles
- **API Gateway**: Centralized authentication middleware

## Resilience Patterns

### Error Handling
- **Custom Error Classes**: Standardized error responses
- **Retry Logic**: Automatic retries for transient failures
- **Circuit Breaker**: Prevents cascading failures (to be implemented)
- **Dead Letter Queue**: Failed messages moved to DLQ after max retries

### Database Resilience
- **Connection Pooling**: Efficient database connection management
- **Health Checks**: Regular database connectivity checks
- **Graceful Shutdown**: Proper cleanup on service termination

### Message Queue Resilience
- **Persistent Messages**: Messages survive broker restarts
- **Acknowledgments**: Messages only removed after successful processing
- **Retry with Exponential Backoff**: Failed messages retried with increasing delays

## Scalability

### Horizontal Scaling
- Each service can be scaled independently
- Stateless services enable easy horizontal scaling
- Database connection pooling handles increased load

### Caching Strategy
- Redis available for caching (to be implemented)
- Cache frequently accessed data (vehicle listings, user profiles)

### Load Balancing
- API Gateway can be load balanced
- Services behind load balancers for high availability

## Deployment

### Development
- Docker Compose for local development
- All services run in containers
- Shared infrastructure (RabbitMQ, Redis, Databases)

### Production Considerations
- Kubernetes for orchestration
- Service mesh for advanced routing
- Monitoring and logging (Prometheus, Grafana, ELK)
- CI/CD pipelines for automated deployments

## Monitoring & Observability

### Health Checks
- Each service exposes `/health` endpoint
- Database connectivity checks
- Service status reporting

### Logging
- Structured logging (to be enhanced)
- Centralized log aggregation (to be implemented)

### Metrics
- Request/response times
- Error rates
- Queue depths
- Database connection pool status

## Future Enhancements

1. **Service Mesh**: Implement Istio or Linkerd for advanced traffic management
2. **API Gateway Enhancements**: Add API versioning, request transformation
3. **Caching Layer**: Implement Redis caching for frequently accessed data
4. **Monitoring**: Add Prometheus metrics and Grafana dashboards
5. **Distributed Tracing**: Implement OpenTelemetry for request tracing
6. **Circuit Breaker**: Add circuit breaker pattern for external service calls
7. **Rate Limiting**: Per-user rate limiting
8. **API Documentation**: OpenAPI/Swagger documentation


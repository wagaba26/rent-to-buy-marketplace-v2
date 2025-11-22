# Payment & Collections Service

## Overview

The Payment & Collections Service handles all monetary transactions for the rent-to-own marketplace. It manages payment schedules, collects deposits and recurring installments via mobile money, tracks payment histories, and handles automated retries with grace periods to reduce accidental defaults.

## Features

### ✅ Payment Schedule Management
- Create payment schedules based on vehicle price, deposit, and term length (12, 18, 24, or 36 months)
- Support for weekly and monthly payment frequencies
- Automatic calculation of installment amounts
- Grace period configuration to reduce accidental defaults

### ✅ Mobile Money Integration
- Integration with mobile money providers (MTN, Airtel, Africell, etc.)
- Callback handling for payment confirmations
- Secure storage of payment credentials (encrypted phone numbers)
- Support for multiple payment methods (mobile money, bank transfer, cash)

### ✅ Automated Retry Logic
- Configurable retry attempts (default: 3)
- Exponential backoff for retry delays
- Automatic retry scheduling for failed payments
- Retry history tracking

### ✅ Grace Period Handling
- Configurable grace periods (default: 7 days)
- Automatic overdue detection after grace period expires
- Reduces accidental defaults by giving customers time to resolve payment issues

### ✅ Idempotent Transactions
- Idempotency key support to prevent double-charges
- Automatic idempotency key generation
- Cached response for duplicate requests
- Expired key cleanup

### ✅ Payment Tracking
- Comprehensive payment history
- Outstanding balance calculations
- Payment status tracking (pending, processing, completed, failed, refunded)
- Real-time payment status updates

### ✅ Event-Driven Architecture
- Publishes events: `payment.plan.created`, `payment.completed`, `payment.failed`, `payment.overdue`
- Triggers credit score updates on payment events
- Triggers vehicle immobilization for severely overdue payments (>30 days)
- Subscribes to credit approval events

## API Endpoints

### Payment Plans

#### Create Payment Plan
```
POST /payments/plans
```

Creates a payment plan based on vehicle price, deposit, and term length.

**Request Body:**
```json
{
  "userId": "uuid",
  "vehicleId": "uuid",
  "vehiclePrice": 5000000,
  "depositAmount": 500000,
  "termLengthMonths": 24,
  "paymentFrequency": "monthly",
  "gracePeriodDays": 7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "user_id": "uuid",
      "vehicle_id": "uuid",
      "vehicle_price": 5000000,
      "deposit_amount": 500000,
      "installment_amount": 187500,
      "payment_frequency": "monthly",
      "term_length_months": 24,
      "total_installments": 24,
      "remaining_installments": 24,
      "next_payment_date": "2024-02-01",
      "status": "active"
    }
  }
}
```

#### Get User Payment Plans
```
GET /payments/plans/user/:userId
```

Returns all payment plans for a user.

#### Get Outstanding Balance
```
GET /payments/plans/:planId/balance
```

Returns the outstanding balance for a specific payment plan.

**Response:**
```json
{
  "success": true,
  "data": {
    "planId": "uuid",
    "totalAmount": 5000000,
    "depositAmount": 500000,
    "totalPaid": 1875000,
    "outstandingBalance": 3125000,
    "remainingInstallments": 16,
    "nextPaymentDate": "2024-03-01"
  }
}
```

### Payments

#### Make Payment
```
POST /payments
```

Processes a payment with idempotency support.

**Request Body:**
```json
{
  "paymentPlanId": "uuid",
  "userId": "uuid",
  "amount": 187500,
  "paymentMethod": "mobile_money",
  "mobileMoneyProvider": "mtn",
  "phoneNumber": "+256700000000",
  "idempotencyKey": "optional-key",
  "isDeposit": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "payment_plan_id": "uuid",
      "user_id": "uuid",
      "amount": 187500,
      "status": "completed",
      "external_transaction_id": "MTN-1234567890",
      "processed_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Mobile Money Callback
```
POST /payments/callbacks/mobile-money
```

Endpoint for mobile money providers to send payment confirmations.

**Request Body:**
```json
{
  "provider": "mtn",
  "transactionId": "MTN-1234567890",
  "externalTransactionId": "EXT-123456",
  "status": "success",
  "amount": 187500,
  "phoneNumber": "+256700000000",
  "reference": "payment-uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "signature": "verification-signature"
}
```

#### Get Payment History
```
GET /payments/history/:userId?limit=50&offset=0&status=completed&paymentPlanId=uuid
```

Returns payment history for a user with optional filtering.

**Query Parameters:**
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (optional)
- `paymentPlanId`: Filter by payment plan (optional)

#### Get Outstanding Balance (User)
```
GET /payments/balance/:userId
```

Returns total outstanding balance across all payment plans for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "totalOutstandingBalance": 3125000,
    "plans": [
      {
        "planId": "uuid",
        "vehicleId": "uuid",
        "outstandingBalance": 3125000,
        "remainingInstallments": 16,
        "nextPaymentDate": "2024-03-01",
        "status": "active"
      }
    ]
  }
}
```

## Database Schema

### payment_plans
- `id`: UUID (Primary Key)
- `user_id`: UUID
- `vehicle_id`: UUID
- `vehicle_price`: DECIMAL(12, 2)
- `deposit_amount`: DECIMAL(12, 2)
- `installment_amount`: DECIMAL(12, 2)
- `payment_frequency`: VARCHAR(20) ('weekly' | 'monthly')
- `term_length_months`: INTEGER (12, 18, 24, 36)
- `total_installments`: INTEGER
- `remaining_installments`: INTEGER
- `next_payment_date`: DATE
- `grace_period_days`: INTEGER (default: 7)
- `status`: VARCHAR(50) ('active' | 'completed' | 'defaulted' | 'cancelled' | 'overdue')
- `overdue_days`: INTEGER
- `last_overdue_check`: TIMESTAMP
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### payments
- `id`: UUID (Primary Key)
- `payment_plan_id`: UUID (Foreign Key)
- `user_id`: UUID
- `amount`: DECIMAL(12, 2)
- `payment_method`: VARCHAR(50) ('mobile_money' | 'bank_transfer' | 'cash')
- `mobile_money_provider`: VARCHAR(50)
- `phone_number`: VARCHAR(50) (unencrypted, for processing)
- `encrypted_phone_number`: VARCHAR(500) (encrypted storage)
- `transaction_id`: VARCHAR(255)
- `external_transaction_id`: VARCHAR(255)
- `idempotency_key`: VARCHAR(255) (Unique)
- `status`: VARCHAR(50) ('pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled')
- `scheduled_date`: DATE
- `due_date`: DATE
- `processed_at`: TIMESTAMP
- `failure_reason`: TEXT
- `retry_count`: INTEGER (default: 0)
- `max_retries`: INTEGER (default: 3)
- `next_retry_at`: TIMESTAMP
- `is_deposit`: BOOLEAN (default: false)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### payment_retries
- `id`: UUID (Primary Key)
- `payment_id`: UUID (Foreign Key)
- `attempt_number`: INTEGER
- `status`: VARCHAR(50) ('pending' | 'processing' | 'completed' | 'failed')
- `attempted_at`: TIMESTAMP
- `completed_at`: TIMESTAMP
- `failure_reason`: TEXT
- `created_at`: TIMESTAMP

### mobile_money_callbacks
- `id`: UUID (Primary Key)
- `payment_id`: UUID (Foreign Key)
- `provider`: VARCHAR(50)
- `callback_data`: JSONB
- `status`: VARCHAR(50) ('received' | 'processed' | 'failed')
- `processed_at`: TIMESTAMP
- `error_message`: TEXT
- `created_at`: TIMESTAMP

### idempotency_keys
- `id`: UUID (Primary Key)
- `key`: VARCHAR(255) (Unique)
- `payment_id`: UUID (Foreign Key, nullable)
- `response_data`: JSONB
- `created_at`: TIMESTAMP
- `expires_at`: TIMESTAMP

## Scheduled Jobs

### Payment Collection
- **Schedule**: Daily at 2:00 AM
- **Purpose**: Process payments due today
- **Actions**:
  - Find all active payment plans with due payments
  - Create payment records
  - Initiate mobile money collections
  - Update payment plans on success

### Overdue Check
- **Schedule**: Every 6 hours
- **Purpose**: Check for overdue payments
- **Actions**:
  - Find payments past due date (including grace period)
  - Update payment plan status to 'overdue'
  - Calculate days overdue
  - Publish `payment.overdue` events
  - Trigger vehicle immobilization for severely overdue payments (>30 days)

### Retry Processing
- **Schedule**: Every hour
- **Purpose**: Process payment retries
- **Actions**:
  - Find payments due for retry
  - Attempt payment collection again
  - Update retry status
  - Schedule next retry if needed

### Idempotency Cleanup
- **Schedule**: Daily at 3:00 AM
- **Purpose**: Clean up expired idempotency keys
- **Actions**:
  - Delete idempotency keys older than 24 hours

## Events

### Published Events

#### payment.plan.created
Published when a new payment plan is created.

```json
{
  "type": "payment.plan.created",
  "payload": {
    "planId": "uuid",
    "userId": "uuid",
    "vehicleId": "uuid",
    "installmentAmount": 187500,
    "termLengthMonths": 24
  },
  "timestamp": 1705315200000
}
```

#### payment.completed
Published when a payment is successfully completed.

```json
{
  "type": "payment.completed",
  "payload": {
    "paymentId": "uuid",
    "paymentPlanId": "uuid",
    "userId": "uuid",
    "amount": 187500,
    "isDeposit": false
  },
  "timestamp": 1705315200000
}
```

#### payment.failed
Published when a payment fails.

```json
{
  "type": "payment.failed",
  "payload": {
    "paymentId": "uuid",
    "paymentPlanId": "uuid",
    "userId": "uuid",
    "reason": "Insufficient funds"
  },
  "timestamp": 1705315200000
}
```

#### payment.overdue
Published when a payment becomes overdue.

```json
{
  "type": "payment.overdue",
  "payload": {
    "paymentId": "uuid",
    "paymentPlanId": "uuid",
    "userId": "uuid",
    "vehicleId": "uuid",
    "amount": 187500,
    "daysOverdue": 8,
    "dueDate": "2024-01-15"
  },
  "timestamp": 1705315200000
}
```

### Subscribed Events

- `credit.approved`: Credit approval events (could trigger payment plan creation)
- `vehicle.reserved`: Vehicle reservation events

## Environment Variables

```env
# Service Configuration
PORT=3003

# Database Configuration
DB_HOST=localhost
DB_PORT=5434
DB_NAME=paymentdb
DB_USER=payment
DB_PASSWORD=paymentpass

# Encryption
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Message Queue
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Mobile Money Configuration
MOBILE_MONEY_PROVIDER=mtn
MOBILE_MONEY_API_KEY=your-api-key
MOBILE_MONEY_API_SECRET=your-api-secret
MOBILE_MONEY_CALLBACK_URL=http://localhost:3003/payments/callbacks/mobile-money
MOBILE_MONEY_ENV=sandbox
```

## Security Considerations

1. **Encrypted Storage**: Phone numbers are encrypted at rest using AES-256-GCM
2. **No Full Credentials**: Mobile money credentials are not stored in the database
3. **Idempotency**: All payment transactions support idempotency keys to prevent double-charges
4. **Callback Verification**: Mobile money callbacks should be verified using provider signatures (implemented in production)
5. **Separate Database**: Payment data is stored in a separate database for isolation

## Error Handling

The service uses standardized error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `INVALID_CALLBACK`: Invalid mobile money callback
- `CALLBACK_ERROR`: Error processing callback

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Testing

The service includes mock implementations for mobile money providers. In production, replace these with actual API integrations:

- MTN Mobile Money API
- Airtel Money API
- Africell Money API
- Other provider APIs

## Production Deployment

1. **Update Environment Variables**: Set production values for all environment variables
2. **Configure Mobile Money APIs**: Replace mock implementations with actual provider integrations
3. **Enable Callback Verification**: Implement signature verification for mobile money callbacks
4. **Set Up Monitoring**: Monitor payment success rates, retry attempts, and overdue payments
5. **Configure Alerts**: Set up alerts for high failure rates or overdue payment thresholds
6. **Database Backups**: Ensure regular backups of the payment database
7. **Idempotency Key Cleanup**: Ensure the cleanup job runs regularly

## Integration with Other Services

- **Credit Service**: Receives `payment.completed` and `payment.failed` events to update credit scores
- **Telematics Service**: Receives `payment.overdue` events to immobilize vehicles
- **Support Service**: Receives payment events to send notifications to users
- **Vehicle Service**: Payment plans are linked to vehicles


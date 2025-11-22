# Independent Credit-Scoring Service

A self-contained scoring engine that evaluates applicants' risk and determines maximum vehicle value and deposit requirements. This service operates independently from any existing BNPL platform and communicates with other services through REST APIs and events.

## Features

- **Comprehensive Scoring**: Evaluates applicants based on multiple data sources:
  - Personal information (employment status, income)
  - Mobile money transaction history
  - Utility payment behavior
  - SACCO contributions
  - Prior loan performance

- **Weighted Scoring Rules**: Each data source has defined weights:
  - Personal Info: 15%
  - Mobile Money: 30%
  - Utility Payments: 20%
  - SACCO Contributions: 15%
  - Loan Performance: 20%

- **Tier System**: Maps credit scores to vehicle categories and deposit requirements:
  - **Tier A** (800-1000): Up to 50M UGX, 10% deposit, all vehicle types
  - **Tier B** (650-799): Up to 30M UGX, 20% deposit, motorcycles/cars/vans
  - **Tier C** (500-649): Up to 15M UGX, 30% deposit, motorcycles/cars
  - **Tier D** (350-499): Up to 8M UGX, 40% deposit, motorcycles only
  - **Tier E** (0-349): Not eligible

- **Dynamic Updates**: Scores update automatically based on:
  - Repayment behavior (rewards on-time, penalizes missed)
  - Telematics data (rewards safe driving, penalizes violations)
  - Payment history

- **Audit Logging**: All scoring decisions are logged for compliance and model improvement

## API Endpoints

### POST /scoring/scoreApplicant

Score a new applicant or recalculate an existing applicant's score.

**Request Body:**
```json
{
  "applicantId": "APP123456",
  "applicantData": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "nationalId": "CM123456789",
      "phoneNumber": "+256700000000",
      "email": "john.doe@example.com",
      "employmentStatus": "employed",
      "monthlyIncome": 2000000
    },
    "mobileMoneyHistory": {
      "provider": "MTN",
      "accountNumber": "256700000000",
      "averageMonthlyVolume": 5000000,
      "averageMonthlyTransactions": 50,
      "consistentPaymentMonths": 12,
      "missedPayments": 1,
      "lastActivityDate": "2024-01-15"
    },
    "utilityPayments": {
      "provider": "UMEME",
      "accountNumber": "ACC123456",
      "averageMonthlyAmount": 50000,
      "onTimePaymentRate": 0.95,
      "monthsActive": 24,
      "lastPaymentDate": "2024-01-10",
      "missedPayments": 2
    },
    "saccoContributions": {
      "saccoName": "Example SACCO",
      "memberNumber": "MEM123",
      "monthlyContribution": 200000,
      "monthsActive": 18,
      "consistentContributions": 18,
      "missedContributions": 0,
      "lastContributionDate": "2024-01-01"
    },
    "priorLoanPerformance": [
      {
        "lenderName": "Bank XYZ",
        "loanAmount": 5000000,
        "loanType": "personal",
        "repaymentStatus": "completed",
        "onTimeRepaymentRate": 0.98,
        "monthsRepaid": 12,
        "totalMonths": 12,
        "defaultedLoans": 0
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicantId": "APP123456",
    "score": 785,
    "tier": "B",
    "factors": {
      "personalInfo": { "score": 200, "weight": 0.15, ... },
      "mobileMoney": { "score": 280, "weight": 0.30, ... },
      "utilityPayments": { "score": 180, "weight": 0.20, ... },
      "saccoContributions": { "score": 200, "weight": 0.15, ... },
      "loanPerformance": { "score": 280, "weight": 0.20, ... }
    },
    "maximumVehicleValue": 30000000,
    "requiredDepositPercentage": 20,
    "calculatedAt": "2024-01-20T10:00:00Z"
  }
}
```

### POST /scoring/updateScore

Update an applicant's score based on new repayment or telematics data.

**Request Body:**
```json
{
  "applicantId": "APP123456",
  "updateType": "repayment",
  "data": {
    "repaymentSuccess": true,
    "repaymentAmount": 500000
  }
}
```

**Or for telematics:**
```json
{
  "applicantId": "APP123456",
  "updateType": "telematics",
  "data": {
    "telematicsScore": 0.85,
    "telematicsEvents": {
      "speedingViolations": 2,
      "harshBraking": 1,
      "safeDrivingDays": 25
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicantId": "APP123456",
    "scoreBefore": 785,
    "scoreAfter": 800,
    "tierBefore": "B",
    "tierAfter": "A",
    "adjustment": 15,
    "maximumVehicleValue": 50000000,
    "requiredDepositPercentage": 10
  }
}
```

### GET /scoring/getTier/:applicantId

Get the current tier and associated configuration for an applicant.

**Response:**
```json
{
  "success": true,
  "data": {
    "applicantId": "APP123456",
    "tier": "B",
    "score": 785,
    "tierConfiguration": {
      "tier": "B",
      "minScore": 650,
      "maxScore": 799,
      "maxVehicleValue": 30000000,
      "depositPercentage": 20,
      "vehicleCategories": ["motorcycle", "car", "van"]
    },
    "maximumVehicleValue": 30000000,
    "requiredDepositPercentage": 20,
    "lastUpdated": "2024-01-20T10:00:00Z"
  }
}
```

### GET /scoring/score/:applicantId

Get the current credit score for an applicant.

**Response:**
```json
{
  "success": true,
  "data": {
    "applicantId": "APP123456",
    "score": 785,
    "tier": "B",
    "factors": { ... },
    "maximumVehicleValue": 30000000,
    "requiredDepositPercentage": 20,
    "lastUpdated": "2024-01-20T10:00:00Z",
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

### GET /scoring/auditLogs/:applicantId

Get audit logs for an applicant (for debugging and compliance).

**Query Parameters:**
- `limit` (optional): Maximum number of logs to return (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "applicantId": "APP123456",
        "action": "score_calculated",
        "scoreBefore": null,
        "scoreAfter": 785,
        "tierBefore": null,
        "tierAfter": "B",
        "inputs": { ... },
        "decision": "Score calculated: 785 (Tier B)...",
        "timestamp": "2024-01-15T08:00:00Z"
      }
    ]
  }
}
```

## Database Schema

The service maintains a dedicated scoring database with the following tables:

- **applicant_data**: Stores applicant information and data sources
- **credit_scores**: Stores calculated credit scores and tiers
- **score_updates**: History of score updates
- **scoring_audit_logs**: Comprehensive audit trail
- **tier_configurations**: Tier thresholds and rules

## Event-Driven Updates

The service automatically subscribes to events for dynamic score updates:

- **payment.completed**: Rewards successful repayments (+15 points)
- **payment.failed**: Penalizes failed repayments (-25 points)
- **telematics.risk.detected**: Adjusts based on driving behavior
- **payment.success**: Rewards successful payments (+10 points)

## Scoring Logic

### Score Calculation

1. **Personal Information** (0-200 points, 15% weight)
   - Employment status: Employed (100), Self-employed (70), Unemployed (30)
   - Income stability: Based on monthly income thresholds

2. **Mobile Money** (0-300 points, 30% weight)
   - Volume: Based on average monthly volume
   - Consistency: Based on months with consistent activity
   - Reliability: Penalizes missed payments

3. **Utility Payments** (0-200 points, 20% weight)
   - On-time rate: Percentage of on-time payments
   - Consistency: Based on months active
   - Penalties: For missed payments

4. **SACCO Contributions** (0-200 points, 15% weight)
   - Consistency: Based on consistent contribution months
   - Amount: Based on monthly contribution amount
   - Penalties: For missed contributions

5. **Loan Performance** (0-300 points, 20% weight)
   - Repayment rate: Average on-time repayment rate
   - Default history: Penalizes defaults
   - Current status: Rewards current/completed loans

Final score is normalized to 0-1000 scale.

### Score Updates

- **Repayment Success**: +15 points
- **Repayment Failure**: -25 points
- **Safe Driving**: +0 to +15 points (based on telematics score)
- **Driving Violations**: -5 points per speeding violation, -3 per harsh braking
- **Safe Driving Days**: +0.5 points per day (max +10)
- **Payment Success**: +10 points
- **Payment Failure**: -20 points

## Stateless Design

The scoring engine is stateless, allowing multiple instances to run concurrently. All state is stored in the database, and scoring logic is pure functions.

## Auditability

All scoring decisions are logged with:
- Input data
- Calculated scores
- Decision rationale
- Timestamps
- Before/after states

This enables:
- Regulatory compliance
- Model improvement
- Debugging and troubleshooting
- Transparency for applicants

## Environment Variables

```env
PORT=3004
DB_HOST=localhost
DB_PORT=5435
DB_NAME=creditdb
DB_USER=credit
DB_PASSWORD=creditpass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

## Running the Service

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

## Integration

The service communicates with other services through:

1. **REST APIs**: Other services call the scoring endpoints
2. **Message Queue**: Subscribes to events for automatic score updates
3. **Database**: Dedicated PostgreSQL database for scoring data

## Example Integration

```typescript
// Score a new applicant
const response = await fetch('http://localhost:3004/scoring/scoreApplicant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    applicantId: 'APP123456',
    applicantData: { ... }
  })
});

// Update score after repayment
await fetch('http://localhost:3004/scoring/updateScore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    applicantId: 'APP123456',
    updateType: 'repayment',
    data: { repaymentSuccess: true, repaymentAmount: 500000 }
  })
});

// Get tier information
const tierResponse = await fetch('http://localhost:3004/scoring/getTier/APP123456');
```


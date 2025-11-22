# Vehicle Service

The Vehicle Service manages vehicle inventory, listings, reservations, and categories for the Rent-to-Own Marketplace platform.

## Features

### Vehicle Management
- ✅ Complete CRUD operations for vehicles
- ✅ Support for multiple vehicle types (motorcycle, car, van, truck)
- ✅ Category-based organization
- ✅ Eligibility tier classification (basic, standard, premium, luxury)
- ✅ Flexible payment terms (weekly/monthly)
- ✅ Advanced search and filtering
- ✅ Real-time availability tracking

### Category Management
- ✅ Create, read, update, and delete vehicle categories
- ✅ Category assignment to vehicles
- ✅ Default categories (Economy, Standard, Premium, Luxury)

### Reservation System
- ✅ Vehicle reservation with expiry logic
- ✅ Automatic reservation expiry via background scheduler
- ✅ Prevents double-booking
- ✅ Reservation cancellation
- ✅ Reservation history tracking

### Data Models

#### Vehicle
- `id` (UUID): Unique identifier
- `make` (string): Vehicle manufacturer
- `model` (string): Vehicle model
- `year` (integer): Manufacturing year
- `vehicle_type` (enum): motorcycle, car, van, truck
- `category_id` (UUID): Reference to vehicle category
- `vin` (string, unique): Vehicle Identification Number
- `registration_number` (string, unique): Registration number
- `color` (string): Vehicle color
- `mileage` (integer): Current mileage
- `price` (decimal): Total vehicle price
- `deposit_amount` (decimal): Required deposit
- `weekly_payment` (decimal): Weekly payment amount
- `monthly_payment` (decimal): Monthly payment amount
- `payment_frequency` (enum): weekly, monthly
- `payment_term_months` (integer): Total payment term in months
- `eligibility_tier` (enum): basic, standard, premium, luxury
- `status` (enum): available, reserved, rented, sold, maintenance
- `description` (text): Vehicle description
- `images` (array): Image URLs
- `specifications` (JSONB): Additional specifications

#### Category
- `id` (UUID): Unique identifier
- `name` (string, unique): Category name
- `description` (text): Category description

#### Reservation
- `id` (UUID): Unique identifier
- `vehicle_id` (UUID): Reference to vehicle
- `user_id` (UUID): Reference to user
- `status` (enum): pending, approved, rejected, expired, completed
- `reserved_until` (timestamp): Reservation end date
- `expires_at` (timestamp): Automatic expiry timestamp

## API Endpoints

### Vehicle Endpoints

#### List Vehicles
```
GET /vehicles
```

Query Parameters:
- `vehicleType` (optional): Filter by type (motorcycle, car, van, truck)
- `categoryId` (optional): Filter by category UUID
- `eligibilityTier` (optional): Filter by tier (basic, standard, premium, luxury)
- `make` (optional): Filter by make (partial match)
- `model` (optional): Filter by model (partial match)
- `search` (optional): Search in make, model, description
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `minDeposit` (optional): Minimum deposit filter
- `maxDeposit` (optional): Maximum deposit filter
- `status` (optional): Filter by status (default: available)
- `limit` (optional): Results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

Response:
```json
{
  "success": true,
  "data": {
    "vehicles": [...],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "count": 10,
      "total": 100
    }
  }
}
```

#### Get Vehicle by ID
```
GET /vehicles/:id
```

Response includes vehicle details and active reservations.

#### Create Vehicle (Admin/Agent)
```
POST /vehicles
```

Required Fields:
- `make`, `model`, `year`, `vehicleType`, `price`, `depositAmount`

Optional Fields:
- `categoryId`, `vin`, `registrationNumber`, `color`, `mileage`
- `weeklyPayment`, `monthlyPayment`, `paymentFrequency`, `paymentTermMonths`
- `eligibilityTier`, `description`, `images`, `specifications`

#### Update Vehicle (Admin/Agent)
```
PUT /vehicles/:id
```

Allows partial updates of vehicle fields.

#### Delete Vehicle (Admin)
```
DELETE /vehicles/:id
```

Cannot delete vehicles with active reservations or currently rented.

#### Reserve Vehicle
```
POST /vehicles/:id/reserve
```

Body:
```json
{
  "userId": "uuid",
  "reservedUntil": "2024-12-31T23:59:59Z", // optional
  "expiryHours": 24 // optional, default: 24
}
```

#### Cancel Reservation
```
POST /vehicles/:id/reservations/:reservationId/cancel
```

#### Get Vehicle Reservations
```
GET /vehicles/:id/reservations?status=pending
```

### Category Endpoints

#### List Categories
```
GET /categories
```

#### Get Category by ID
```
GET /categories/:id
```

#### Create Category (Admin)
```
POST /categories
```

Body:
```json
{
  "name": "Economy",
  "description": "Budget-friendly vehicles"
}
```

#### Update Category (Admin)
```
PUT /categories/:id
```

#### Delete Category (Admin)
```
DELETE /categories/:id
```

Cannot delete categories assigned to vehicles.

## Reservation Expiry Logic

The service includes a background scheduler that automatically expires reservations:

1. **Automatic Expiry**: Reservations expire based on the `expires_at` timestamp
2. **Default Expiry**: 24 hours from creation (configurable via `expiryHours`)
3. **Status Update**: Expired reservations are marked as 'expired'
4. **Vehicle Availability**: Vehicles are automatically set to 'available' when all reservations expire
5. **Scheduler Interval**: Checks every 60 seconds (configurable via `RESERVATION_CHECK_INTERVAL_MS`)

## Environment Variables

```env
PORT=3002
DB_HOST=localhost
DB_PORT=5433
DB_NAME=vehicledb
DB_USER=vehicle
DB_PASSWORD=vehiclepass
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
RESERVATION_CHECK_INTERVAL_MS=60000
```

## Database Schema

The service uses PostgreSQL with the following tables:
- `vehicles`: Main vehicle inventory
- `vehicle_categories`: Category definitions
- `vehicle_reservations`: Reservation tracking

All tables include proper indexes for optimal query performance.

## Event Publishing

The service publishes the following events to RabbitMQ:

- `vehicle.created`: When a new vehicle is added
- `vehicle.updated`: When a vehicle is updated
- `vehicle.deleted`: When a vehicle is deleted
- `vehicle.reserved`: When a vehicle is reserved
- `reservation.expired`: When a reservation expires
- `category.created`: When a category is created
- `category.updated`: When a category is updated
- `category.deleted`: When a category is deleted

## Input Validation

All endpoints include comprehensive input validation:
- Required field validation
- Type validation (UUID, numbers, strings, enums)
- Range validation (year, price, deposit)
- Business rule validation (deposit <= price, unique VIN/registration)
- SQL injection prevention via parameterized queries

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
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions

## Horizontal Scaling

The service is designed for horizontal scaling:
- Stateless API endpoints
- Database connection pooling
- Message queue for async communication
- No shared state between instances
- Reservation expiry scheduler runs independently on each instance (idempotent operations)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Health Check

```
GET /health
```

Returns service and database connection status.


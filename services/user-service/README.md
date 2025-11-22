# User & Agent Management Service

Complete user and agent onboarding service with KYC verification, authentication, and role-based permissions.

## Features

### Authentication & Authorization
- **Sign-up**: User and agent registration with role assignment
- **Login**: JWT-based authentication with secure password hashing
- **Password Reset**: Complete password reset flow with secure tokens
  - Request password reset via email
  - Verify reset token
  - Reset password with token
  - Change password (authenticated users)

### Role-Based Access Control
- **Roles**: `customer`, `agent`, `admin`
- **Permissions**: Fine-grained permission system
  - Role-based permissions (default permissions for each role)
  - User-specific permissions (override permissions for specific users)
  - Permission checking middleware
  - Permission management (grant/revoke permissions)

**Default Permissions:**
- **Customer**: `view_own_profile`, `update_own_profile`, `submit_kyc`, `view_own_kyc_status`, `make_payment`
- **Agent**: `onboard_customer`, `collect_payment`, `view_customer_profile`, `verify_kyc`, `view_payment_history`, plus all customer permissions
- **Admin**: `manage_users`, `manage_vehicles`, `view_all_profiles`, `verify_kyc`, `manage_payments`, `view_analytics`, `manage_permissions`, plus all agent permissions

### KYC (Know Your Customer) Verification
- **Document Submission**: Submit KYC documents with encrypted storage
  - Document types (ID, passport, driver's license, etc.)
  - Encrypted document numbers at rest
  - Secure document storage paths
  - Document URL support
- **Verification Workflow**: 
  - Status tracking: `pending`, `approved`, `rejected`
  - Verification by agents/admins
  - Verification notes
  - Automatic user activation upon approval

### Credit Scoring Integration
- **Onboarding Integration**: Automatically fetch eligibility tiers during user registration
  - Optional applicant data during registration
  - Automatic credit scoring for customers
  - Eligibility tier storage
- **Credit Service Client**: HTTP client for credit service integration
  - Score applicants
  - Get eligibility tiers
  - Get credit scores
  - Update credit scores

### Data Security
- **Password Hashing**: bcrypt with salt rounds (10)
- **PII Encryption**: AES-256-GCM encryption at rest
  - Phone numbers encrypted
  - Document numbers encrypted
  - Storage paths encrypted
- **Secure Token Generation**: Cryptographically secure random tokens for password reset

### User Management
- **User Profiles**: Get and update user profiles
- **User Listing**: List users with filtering (role, status)
- **Eligibility Tier**: Get user's current eligibility tier and credit information
- **Permissions**: View and manage user permissions

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Register new user/agent
- `POST /auth/login` - Login and get JWT token

### Password Reset (`/password-reset`)
- `POST /password-reset/request-reset` - Request password reset (public)
- `POST /password-reset/verify-token` - Verify reset token (public)
- `POST /password-reset/reset` - Reset password with token (public)
- `POST /password-reset/change-password` - Change password (authenticated)

### Users (`/users`)
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `GET /users` - List users (agent/admin only)
- `GET /users/:id/eligibility-tier` - Get user eligibility tier
- `GET /users/:id/permissions` - Get user permissions
- `POST /users/:id/permissions` - Grant permission (admin only)
- `DELETE /users/:id/permissions/:permission` - Revoke permission (admin only)

### KYC (`/kyc`)
- `POST /kyc/submit` - Submit KYC document
- `GET /kyc/:userId` - Get KYC status for user
- `POST /kyc/verify/:kycId` - Verify KYC document (agent/admin only)

## Database Schema

### Users Table
- `id` (UUID, primary key)
- `email` (unique)
- `password_hash`
- `role` (customer, agent, admin)
- `first_name`, `last_name`
- `phone_number`, `encrypted_phone`
- `status` (pending, active, suspended, deleted)
- `eligibility_tier` (integer)
- `credit_score_id` (UUID)
- `created_at`, `updated_at`

### Password Reset Tokens Table
- `id` (UUID, primary key)
- `user_id` (foreign key)
- `token` (unique)
- `expires_at`
- `used` (boolean)
- `created_at`

### KYC Verifications Table
- `id` (UUID, primary key)
- `user_id` (foreign key)
- `document_type`
- `document_number`, `encrypted_document_number`
- `document_url`
- `storage_path`, `encrypted_storage_path`
- `status` (pending, approved, rejected)
- `verification_notes`
- `verified_at`, `verified_by`
- `created_at`, `updated_at`

### Role Permissions Table
- `id` (UUID, primary key)
- `role`
- `permission`
- `created_at`
- Unique constraint on (role, permission)

### User Permissions Table
- `id` (UUID, primary key)
- `user_id` (foreign key)
- `permission`
- `granted_at`, `granted_by`
- Unique constraint on (user_id, permission)

## Environment Variables

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=userdb
DB_USER=user
DB_PASSWORD=userpass
ENCRYPTION_KEY=your-encryption-key-min-32-characters
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
CREDIT_SERVICE_URL=http://localhost:3004
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

## Integration with Credit Service

The user service integrates with the credit service to:
1. **Fetch eligibility tiers** during user onboarding (if applicant data is provided)
2. **Store eligibility tier** information in user records
3. **Retrieve detailed tier information** when requested
4. **Trigger credit scoring** after KYC approval (if not already scored)

The integration is fault-tolerant - if the credit service is unavailable, user operations still succeed.

## Security Features

1. **Password Security**:
   - Passwords hashed with bcrypt (10 salt rounds)
   - Password reset tokens expire after 24 hours
   - Tokens invalidated after use
   - All user tokens invalidated on password change

2. **Data Encryption**:
   - Sensitive PII encrypted at rest using AES-256-GCM
   - Encrypted fields: phone numbers, document numbers, storage paths
   - Encryption keys should be stored securely (environment variables)

3. **Authentication**:
   - JWT tokens for stateless authentication
   - Token expiration configurable
   - User info passed via headers from API gateway

4. **Authorization**:
   - Role-based access control
   - Permission-based authorization
   - Ownership checks for resource access

## Error Handling

All errors follow a consistent format:
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE"
  }
}
```

## Event Publishing

The service publishes events to RabbitMQ:
- `user.created` - New user registered
- `password.reset.requested` - Password reset requested
- `password.reset.completed` - Password reset completed
- `password.changed` - Password changed
- `kyc.submitted` - KYC document submitted
- `kyc.approved` - KYC document approved
- `kyc.rejected` - KYC document rejected

## Service Isolation

The user service is isolated from other services:
- Own database (userdb)
- Independent error handling
- Authentication failures don't affect other services
- Graceful degradation when credit service is unavailable

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

## Testing

Test the service endpoints using the API gateway:
- Public endpoints: `/api/auth/*`, `/api/password-reset/*`
- Protected endpoints: `/api/users/*`, `/api/kyc/*`

Make sure to:
1. Register a user first
2. Login to get JWT token
3. Use token in `Authorization: Bearer <token>` header for protected routes


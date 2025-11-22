# Support Service

Customer support, notifications, and upgrade workflows service for the Rent-to-Own Marketplace.

## Features

### Notifications

- **Multi-channel messaging**: Send SMS, Email, and WhatsApp messages
- **Message templating**: Pre-built templates for common use cases (onboarding, payment reminders, delinquency notices, marketing campaigns)
- **Scheduling**: Schedule notifications for future delivery
- **Async processing**: Decoupled notification sending via message queues to avoid blocking critical flows
- **Delivery tracking**: Track delivery status, open rates, and click rates
- **Bulk sending**: Send notifications to multiple recipients for campaigns

### Support Tickets

- **Ticket management**: Create, update, and track support tickets
- **Auto-routing**: Automatically route tickets to appropriate teams based on category and priority
- **Team assignment**: Support for multiple specialized teams (Technical, Payment, Vehicle, Credit, General, Escalation)
- **Message threading**: Threaded conversations within tickets

### Upgrade Requests

- **Vehicle upgrades**: Request and manage vehicle upgrade workflows
- **Approval workflow**: Admin approval process for upgrades

## API Endpoints

### Notifications

#### Send Notification
```
POST /notifications/send
```
Send a single notification. Notifications are queued for async processing.

**Request Body:**
```json
{
  "userId": "uuid",
  "type": "payment_reminder",
  "channel": "sms",
  "recipient": "+256700000000",
  "templateId": "payment_reminder",
  "templateVariables": {
    "name": "John Doe",
    "amount": "UGX 187,500",
    "dueDate": "2024-01-15",
    "vehicleName": "Toyota Corolla 2020"
  },
  "scheduledFor": "2024-01-15T08:00:00Z",
  "priority": "normal"
}
```

#### Send Bulk Notifications
```
POST /notifications/send/bulk
```
Send notifications to multiple recipients (max 1000 per request).

**Request Body:**
```json
{
  "userIds": ["uuid1", "uuid2"],
  "type": "marketing_campaign",
  "channel": "email",
  "templateId": "marketing_campaign",
  "templateVariables": {
    "campaignTitle": "New Year Special",
    "message": "Get 10% off your next payment!",
    "promoCode": "NEWYEAR2024",
    "callToAction": "Use code at checkout"
  },
  "perUserVariables": {
    "uuid1": { "recipient": "user1@example.com" },
    "uuid2": { "recipient": "user2@example.com" }
  }
}
```

#### Get User Notifications
```
GET /notifications/user/:userId?status=sent&channel=sms&limit=50&offset=0
```

#### Get Templates
```
GET /notifications/templates?type=payment_reminder
GET /notifications/templates/:id
```

#### Analytics
```
GET /notifications/analytics?type=payment_reminder&channel=sms&startDate=2024-01-01&endDate=2024-01-31
GET /notifications/analytics/channels?startDate=2024-01-01&endDate=2024-01-31
```

#### Track Email Open (Webhook)
```
GET /notifications/track/open/:notificationId
```
Returns a 1x1 transparent pixel for email tracking.

#### Track Link Click
```
GET /notifications/track/click/:notificationId?url=https://example.com
```
Redirects to the URL after tracking the click.

### Support Tickets

#### Create Ticket
```
POST /support/tickets
```
**Request Body:**
```json
{
  "userId": "uuid",
  "subject": "Payment issue",
  "description": "I'm having trouble making a payment",
  "category": "payment",
  "priority": "high"
}
```

#### Get User Tickets
```
GET /support/tickets/user/:userId?status=open&limit=50&offset=0
```

#### Get Ticket Details
```
GET /support/tickets/:id
```

#### Add Message to Ticket
```
POST /support/tickets/:id/messages
```
**Request Body:**
```json
{
  "userId": "uuid",
  "message": "I've tried multiple times",
  "isFromSupport": false
}
```

#### Update Ticket Status
```
PATCH /support/tickets/:id/status
```
**Request Body:**
```json
{
  "status": "in_progress",
  "assignedTo": "team-id"
}
```

#### Get Team Statistics
```
GET /support/teams/stats
```

#### Manually Assign Ticket
```
POST /support/tickets/:id/assign
```
**Request Body:**
```json
{
  "teamId": "technical"
}
```

### Upgrade Requests

#### Request Upgrade
```
POST /upgrades/request
```

#### Get User Upgrades
```
GET /upgrades/user/:userId?status=pending
```

#### Approve/Reject Upgrade
```
PATCH /upgrades/:id/status
```

## Message Templates

### Available Templates

1. **onboarding_confirmation**: Welcome message for new users
   - Variables: `name`, `userId`

2. **payment_reminder**: Reminder for upcoming payments
   - Variables: `name`, `amount`, `dueDate`, `vehicleName`

3. **delinquency_notice**: Urgent notice for overdue payments
   - Variables: `name`, `amount`, `daysOverdue`, `vehicleName`, `supportPhone`, `supportEmail`

4. **marketing_campaign**: Marketing messages
   - Variables: `campaignTitle`, `message`, `promoCode`, `callToAction`

5. **support_ticket_created**: Confirmation when support ticket is created
   - Variables: `name`, `ticketId`, `subject`, `category`

### Custom Templates

You can register custom templates programmatically using the `MessageTemplatingService`.

## Support Teams

The service automatically routes tickets to appropriate teams:

- **Technical Support**: Technical issues, app bugs, account access
- **Payment Support**: Payment, billing, refunds
- **Vehicle Support**: Vehicle reservations, delivery, maintenance, upgrades
- **Credit Support**: Credit applications, approvals, scoring
- **General Support**: General inquiries, feedback
- **Escalation Team**: Urgent tickets requiring immediate attention

## Event Subscriptions

The service subscribes to the following events:

- `payment.completed` - Sends payment success notification
- `payment.failed` - Sends payment failure notification
- `payment.overdue` - Sends delinquency notice
- `user.created` - Sends onboarding confirmation
- `telematics.risk.detected` - Sends risk alerts for critical issues
- `support.ticket.created` - Handles ticket routing

## Published Events

The service publishes the following events:

- `notification.created` - When a notification is created
- `notification.sent` - When a notification is successfully sent
- `notification.delivery.tracked` - When delivery status is updated
- `support.ticket.created` - When a support ticket is created
- `support.ticket.routed` - When a ticket is routed to a team
- `upgrade.requested` - When an upgrade is requested
- `upgrade.approved` / `upgrade.rejected` - When upgrade status changes

## Scheduled Jobs

- **Auto-route tickets**: Every 5 minutes - Routes unassigned tickets to appropriate teams
- **Payment reminders**: Daily at 8 AM - Sends payment reminders (placeholder, integrate with payment service)
- **Cleanup**: Daily at 3 AM - Removes delivery tracking records older than 90 days

## Configuration

### Environment Variables

```env
# Service
PORT=3006
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5437
DB_NAME=supportdb
DB_USER=support
DB_PASSWORD=supportpass

# Encryption
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Message Queue
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Notification Providers (optional, defaults to sandbox mode)
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret
EMAIL_API_KEY=your-email-api-key
EMAIL_API_SECRET=your-email-api-secret
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_API_SECRET=your-whatsapp-api-secret

# Support Contact
SUPPORT_PHONE=+256700000000
SUPPORT_EMAIL=support@rent-to-own.com
```

## Architecture

### Decoupled Notification Processing

Notifications are processed asynchronously using a worker pattern:

1. API endpoint receives notification request
2. Notification record created in database
3. Job queued to message queue
4. Worker process picks up job
5. Worker sends notification via appropriate provider
6. Delivery status tracked and events emitted

This ensures that notification sending doesn't block critical transaction flows.

### Delivery Tracking

The service tracks:
- **Sent**: Notification queued and sent to provider
- **Delivered**: Provider confirms delivery
- **Opened**: Email opened (via tracking pixel)
- **Clicked**: Link clicked in notification
- **Failed**: Delivery failed

Analytics are available via the `/notifications/analytics` endpoint.

## Database Schema

### notifications
- `id`: UUID
- `user_id`: UUID
- `type`: VARCHAR(50)
- `title`: VARCHAR(255)
- `message`: TEXT
- `channel`: VARCHAR(20) - sms, email, whatsapp, push, in_app
- `encrypted_recipient`: VARCHAR(500)
- `status`: VARCHAR(20) - pending, sent, failed, delivered, opened, clicked
- `template_id`: VARCHAR(100)
- `template_variables`: JSONB
- `subject`: VARCHAR(255)
- `scheduled_for`: TIMESTAMP
- `priority`: VARCHAR(20) - low, normal, high
- `external_id`: VARCHAR(255) - Provider transaction ID
- `cost`: DECIMAL(10, 4)
- `error_message`: TEXT
- `sent_at`: TIMESTAMP
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### notification_delivery_tracking
- `id`: UUID
- `notification_id`: UUID (FK)
- `channel`: VARCHAR(20)
- `status`: VARCHAR(20)
- `timestamp`: TIMESTAMP
- `metadata`: JSONB

### support_tickets
- `id`: UUID
- `user_id`: UUID
- `subject`: VARCHAR(255)
- `description`: TEXT
- `category`: VARCHAR(50)
- `priority`: VARCHAR(20) - low, medium, high, urgent
- `status`: VARCHAR(50) - open, in_progress, resolved, closed
- `assigned_to`: UUID (team ID)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP
- `resolved_at`: TIMESTAMP

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Start production server
npm start
```

## Integration with Other Services

### User Service
- Fetch user contact information (email, phone) for notifications
- Validate user existence before sending notifications

### Payment Service
- Subscribe to payment events for automated notifications
- Query payment plans for reminder scheduling

### Vehicle Service
- Fetch vehicle information for notification templates
- Handle vehicle-related support tickets

## Future Enhancements

- [ ] Webhook support for provider callbacks
- [ ] A/B testing for message templates
- [ ] Advanced analytics dashboard
- [ ] Multi-language template support
- [ ] Notification preferences per user
- [ ] Rate limiting per user/channel
- [ ] Retry logic for failed notifications
- [ ] Notification batching for cost optimization


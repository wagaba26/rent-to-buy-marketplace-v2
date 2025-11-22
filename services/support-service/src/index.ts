import express from 'express';
import { Pool } from 'pg';
import cron from 'node-cron';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { EncryptionService } from '@rent-to-own/encryption';
import { errorHandler } from '@rent-to-own/errors';
import dotenv from 'dotenv';
import { supportRoutes } from './routes/support';
import { notificationRoutes } from './routes/notifications';
import { upgradeRoutes } from './routes/upgrades';
import { SMSProvider, EmailProvider, WhatsAppProvider } from './services/notificationProviders';
import { MessageTemplatingService } from './services/messageTemplating';
import { NotificationWorker } from './services/notificationWorker';
import { SupportRoutingService } from './services/supportRouting';
import { DeliveryTrackingService } from './services/deliveryTracking';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5437'),
  database: process.env.DB_NAME || 'supportdb',
  user: process.env.DB_USER || 'support',
  password: process.env.DB_PASSWORD || 'supportpass',
});

// Initialize encryption service
const encryptionService = new EncryptionService(
  process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-min-32-chars'
);

// Initialize message queue
const messageQueue = new MessageQueueClient({
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
});

// Initialize notification providers
const smsProvider = new SMSProvider({
  apiKey: process.env.SMS_API_KEY || 'sms-api-key',
  apiSecret: process.env.SMS_API_SECRET,
  environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
});

const emailProvider = new EmailProvider({
  apiKey: process.env.EMAIL_API_KEY || 'email-api-key',
  apiSecret: process.env.EMAIL_API_SECRET,
  environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
});

const whatsappProvider = new WhatsAppProvider({
  apiKey: process.env.WHATSAPP_API_KEY || 'whatsapp-api-key',
  apiSecret: process.env.WHATSAPP_API_SECRET,
  environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
});

// Initialize templating service
const templatingService = new MessageTemplatingService();

// Initialize delivery tracking
const deliveryTrackingService = new DeliveryTrackingService(pool, messageQueue);

// Initialize support routing
const supportRoutingService = new SupportRoutingService(pool, messageQueue);

// Initialize notification worker
const notificationWorker = new NotificationWorker(
  pool,
  messageQueue,
  encryptionService,
  smsProvider,
  emailProvider,
  whatsappProvider,
  templatingService
);

// Middleware
app.use(express.json());

// Routes
app.use('/support', supportRoutes(pool, messageQueue, supportRoutingService));
app.use('/notifications', notificationRoutes(pool, encryptionService, messageQueue, templatingService, deliveryTrackingService));
app.use('/upgrades', upgradeRoutes(pool, messageQueue));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'support-service', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'support-service', db: 'disconnected' });
  }
});

// Error handling
app.use(errorHandler);

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        assigned_to UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ticket_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        message TEXT NOT NULL,
        is_from_support BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'in_app')),
        encrypted_recipient VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'opened', 'clicked')),
        template_id VARCHAR(100),
        template_variables JSONB,
        subject VARCHAR(255),
        scheduled_for TIMESTAMP,
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
        external_id VARCHAR(255),
        cost DECIMAL(10, 4),
        error_message TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notification_delivery_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );

      CREATE TABLE IF NOT EXISTS upgrade_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        current_vehicle_id UUID,
        requested_vehicle_id UUID NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
        approved_by UUID,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
      CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_notification_delivery_tracking_notification_id ON notification_delivery_tracking(notification_id);
      CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_id ON upgrade_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status ON upgrade_requests(status);
    `);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Subscribe to events
async function subscribeToEvents() {
  try {
    // Listen for payment events to send notifications
    await messageQueue.subscribe('payment.events', 'support-service-queue', 'payment.completed', async (message) => {
      console.log('Payment completed event received, sending notification:', message);
      const { userId, amount, paymentPlanId } = message.payload;
      if (userId) {
        // Queue notification using template
        await messageQueue.publish('notifications.queue', 'notification.send', {
          type: 'notification.send',
          payload: {
            notificationId: '', // Will be created by route handler
            userId,
            type: 'payment_success',
            channel: 'sms',
            recipient: '', // Will be fetched from user service in production
            templateId: 'payment_reminder', // Using reminder template with success message
            templateVariables: {
              name: 'Customer', // In production, fetch from user service
              amount: `UGX ${amount?.toLocaleString() || '0'}`,
              dueDate: new Date().toLocaleDateString(),
              vehicleName: 'Your Vehicle', // In production, fetch from vehicle service
            },
            priority: 'normal',
          },
          timestamp: Date.now(),
        });
      }
    });

    await messageQueue.subscribe('payment.events', 'support-service-queue', 'payment.failed', async (message) => {
      console.log('Payment failed event received, sending notification:', message);
      const { userId, reason, amount } = message.payload;
      if (userId) {
        await messageQueue.publish('notifications.queue', 'notification.send', {
          type: 'notification.send',
          payload: {
            notificationId: '',
            userId,
            type: 'payment_failed',
            channel: 'sms',
            recipient: '',
            templateId: 'delinquency_notice',
            templateVariables: {
              name: 'Customer',
              amount: `UGX ${amount?.toLocaleString() || '0'}`,
              daysOverdue: '0',
              vehicleName: 'Your Vehicle',
              supportPhone: process.env.SUPPORT_PHONE || '+256700000000',
              supportEmail: process.env.SUPPORT_EMAIL || 'support@rent-to-own.com',
            },
            priority: 'high',
          },
          timestamp: Date.now(),
        });
      }
    });

    await messageQueue.subscribe('payment.events', 'support-service-queue', 'payment.overdue', async (message) => {
      console.log('Payment overdue event received, sending notification:', message);
      const { userId, daysOverdue, amount } = message.payload;
      if (userId) {
        await messageQueue.publish('notifications.queue', 'notification.send', {
          type: 'notification.send',
          payload: {
            notificationId: '',
            userId,
            type: 'delinquency',
            channel: 'whatsapp',
            recipient: '',
            templateId: 'delinquency_notice',
            templateVariables: {
              name: 'Customer',
              amount: `UGX ${amount?.toLocaleString() || '0'}`,
              daysOverdue: String(daysOverdue || 0),
              vehicleName: 'Your Vehicle',
              supportPhone: process.env.SUPPORT_PHONE || '+256700000000',
              supportEmail: process.env.SUPPORT_EMAIL || 'support@rent-to-own.com',
            },
            priority: 'high',
          },
          timestamp: Date.now(),
        });
      }
    });

    // Listen for user events
    await messageQueue.subscribe('user.events', 'support-service-queue', 'user.created', async (message) => {
      console.log('User created event received, sending onboarding notification:', message);
      const { userId, name, email, phone } = message.payload;
      if (userId) {
        // Send onboarding confirmation via multiple channels
        const channels: ('sms' | 'email' | 'whatsapp')[] = ['sms', 'email'];
        for (const channel of channels) {
          const recipient = channel === 'email' ? email : phone;
          if (recipient) {
            await messageQueue.publish('notifications.queue', 'notification.send', {
              type: 'notification.send',
              payload: {
                notificationId: '',
                userId,
                type: 'onboarding',
                channel,
                recipient,
                templateId: 'onboarding_confirmation',
                templateVariables: {
                  name: name || 'Customer',
                  userId,
                },
                priority: 'normal',
              },
              timestamp: Date.now(),
            });
          }
        }
      }
    });

    // Listen for risk events
    await messageQueue.subscribe('telematics.events', 'support-service-queue', 'telematics.risk.detected', async (message) => {
      console.log('Risk detected event received, sending notification:', message);
      const { userId, riskType, severity } = message.payload;
      if (userId && severity === 'critical') {
        await messageQueue.publish('notifications.queue', 'notification.send', {
          type: 'notification.send',
          payload: {
            notificationId: '',
            userId,
            type: 'risk_alert',
            channel: 'sms',
            recipient: '', // Will be fetched from user service
            message: `URGENT: A ${severity} risk has been detected: ${riskType}. Please contact support immediately.`,
            priority: 'high',
          },
          timestamp: Date.now(),
        });
      }
    });

    // Listen for support ticket events
    await messageQueue.subscribe('support.events', 'support-service-queue', 'support.ticket.created', async (message) => {
      console.log('Support ticket created event received:', message);
      // Auto-routing is handled in the route handler
    });

    console.log('Event subscriptions initialized');
  } catch (error) {
    console.error('Failed to subscribe to events:', error);
  }
}

// Scheduled jobs
function startScheduledJobs() {
  // Auto-route pending support tickets every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running auto-route for pending tickets...');
    try {
      await supportRoutingService.autoRoutePendingTickets();
    } catch (error) {
      console.error('Error in auto-routing tickets:', error);
    }
  });

  // Send payment reminders daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Sending daily payment reminders...');
    try {
      // In production, query payment service for due payments and send reminders
      // This is a placeholder - actual implementation would query payment plans
      console.log('Payment reminder job completed');
    } catch (error) {
      console.error('Error sending payment reminders:', error);
    }
  });

  // Clean up old delivery tracking records (older than 90 days) daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Cleaning up old delivery tracking records...');
    try {
      await pool.query(
        `DELETE FROM notification_delivery_tracking 
         WHERE timestamp < NOW() - INTERVAL '90 days'`
      );
      console.log('Delivery tracking cleanup completed');
    } catch (error) {
      console.error('Error cleaning up delivery tracking:', error);
    }
  });

  console.log('Scheduled jobs initialized');
}

// Start server
async function start() {
  try {
    await initializeDatabase();
    await messageQueue.connect();
    await subscribeToEvents();
    await notificationWorker.start();
    startScheduledJobs();
    
    app.listen(PORT, () => {
      console.log(`Support service running on port ${PORT}`);
      console.log('Features enabled:');
      console.log('  - SMS, Email, WhatsApp notifications');
      console.log('  - Message templating');
      console.log('  - Notification scheduling');
      console.log('  - Delivery and open rate tracking');
      console.log('  - Support ticket routing');
      console.log('  - Async notification processing');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  await messageQueue.close();
  process.exit(0);
});

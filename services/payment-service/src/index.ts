import express from 'express';
import { Pool } from 'pg';
import cron from 'node-cron';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { EncryptionService } from '@rent-to-own/encryption';
import { errorHandler } from '@rent-to-own/errors';
import dotenv from 'dotenv';
import { paymentRoutes } from './routes/payments';
import { schedulePayments } from './schedulers/paymentScheduler';
import { IdempotencyService } from './services/idempotency';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'paymentdb',
  user: process.env.DB_USER || 'payment',
  password: process.env.DB_PASSWORD || 'paymentpass',
});

// Initialize encryption service
const encryptionService = new EncryptionService(
  process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-min-32-chars'
);

// Initialize message queue
const messageQueue = new MessageQueueClient({
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
});

// Middleware
app.use(express.json());

// Routes
app.use('/payments', paymentRoutes(pool, encryptionService, messageQueue));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'payment-service', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'payment-service', db: 'disconnected' });
  }
});

// Error handling
app.use(errorHandler);

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        vehicle_id UUID NOT NULL,
        vehicle_price DECIMAL(12, 2) NOT NULL,
        deposit_amount DECIMAL(12, 2) NOT NULL,
        installment_amount DECIMAL(12, 2) NOT NULL,
        payment_frequency VARCHAR(20) NOT NULL CHECK (payment_frequency IN ('weekly', 'monthly')),
        term_length_months INTEGER NOT NULL CHECK (term_length_months IN (12, 18, 24, 36)),
        total_installments INTEGER NOT NULL,
        remaining_installments INTEGER NOT NULL,
        next_payment_date DATE NOT NULL,
        grace_period_days INTEGER DEFAULT 7,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled', 'overdue')),
        overdue_days INTEGER DEFAULT 0,
        last_overdue_check TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('mobile_money', 'bank_transfer', 'cash')),
        mobile_money_provider VARCHAR(50),
        phone_number VARCHAR(50),
        encrypted_phone_number VARCHAR(500),
        transaction_id VARCHAR(255),
        external_transaction_id VARCHAR(255),
        idempotency_key VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
        scheduled_date DATE,
        due_date DATE,
        processed_at TIMESTAMP,
        failure_reason TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        next_retry_at TIMESTAMP,
        is_deposit BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payment_retries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        failure_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mobile_money_callbacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        callback_data JSONB NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('received', 'processed', 'failed')),
        processed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
        response_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_payment_plans_user_id ON payment_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_plans_vehicle_id ON payment_plans(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);
      CREATE INDEX IF NOT EXISTS idx_payment_plans_next_payment_date ON payment_plans(next_payment_date);
      CREATE INDEX IF NOT EXISTS idx_payment_plans_overdue ON payment_plans(status, overdue_days) WHERE status = 'overdue';
      
      CREATE INDEX IF NOT EXISTS idx_payments_payment_plan_id ON payments(payment_plan_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_scheduled_date ON payments(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
      CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_payments_next_retry ON payments(status, next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_payment_retries_payment_id ON payment_retries(payment_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_money_callbacks_payment_id ON mobile_money_callbacks(payment_id);
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);
    `);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Subscribe to events
async function subscribeToEvents() {
  try {
    // Listen for credit approval events
    await messageQueue.subscribe('credit.events', 'payment-service-queue', 'credit.approved', async (message) => {
      console.log('Credit approved event received:', message);
      // Handle credit approval - could trigger payment plan creation
    });

    // Listen for vehicle events (in case we need to cancel payment plans)
    await messageQueue.subscribe('vehicle.events', 'payment-service-queue', 'vehicle.reserved', async (message) => {
      console.log('Vehicle reserved event received:', message);
      // Could trigger payment plan creation if needed
    });
  } catch (error) {
    console.error('Failed to subscribe to events:', error);
  }
}

// Schedule payment processing (runs daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled payment collection...');
  try {
    await schedulePayments(pool, encryptionService, messageQueue);
  } catch (error) {
    console.error('Error in scheduled payment collection:', error);
  }
});

// Check for overdue payments (runs every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  console.log('Checking for overdue payments...');
  try {
    await schedulePayments(pool, encryptionService, messageQueue);
  } catch (error) {
    console.error('Error checking overdue payments:', error);
  }
});

// Process payment retries (runs every hour)
cron.schedule('0 * * * *', async () => {
  console.log('Processing payment retries...');
  try {
    await schedulePayments(pool, encryptionService, messageQueue);
  } catch (error) {
    console.error('Error processing payment retries:', error);
  }
});

// Cleanup expired idempotency keys (runs daily at 3 AM)
cron.schedule('0 3 * * *', async () => {
  console.log('Cleaning up expired idempotency keys...');
  try {
    const idempotencyService = new IdempotencyService(pool);
    const deletedCount = await idempotencyService.cleanupExpiredKeys();
    console.log(`Cleaned up ${deletedCount} expired idempotency keys`);
  } catch (error) {
    console.error('Error cleaning up idempotency keys:', error);
  }
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    await messageQueue.connect();
    await subscribeToEvents();
    
    app.listen(PORT, () => {
      console.log(`Payment service running on port ${PORT}`);
      console.log('Payment schedulers active:');
      console.log('  - Payment collection: Daily at 2 AM');
      console.log('  - Overdue check: Every 6 hours');
      console.log('  - Retry processing: Every hour');
      console.log('  - Idempotency cleanup: Daily at 3 AM');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  await messageQueue.close();
  process.exit(0);
});


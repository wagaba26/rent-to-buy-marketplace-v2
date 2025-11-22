import express from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { EncryptionService } from '@rent-to-own/encryption';
import { errorHandler } from '@rent-to-own/errors';
import dotenv from 'dotenv';
import { userRoutes } from './routes/users';
import { authRoutes } from './routes/auth';
import { kycRoutes } from './routes/kyc';
import { passwordResetRoutes } from './routes/passwordReset';
import { CreditServiceClient } from './services/creditServiceClient';
import { extractUserInfo } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'userdb',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'userpass',
});

// Initialize encryption service
const encryptionService = new EncryptionService(
  process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-min-32-chars'
);

// Initialize message queue
const messageQueue = new MessageQueueClient({
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
});

// Initialize credit service client
const creditServiceClient = new CreditServiceClient(
  process.env.CREDIT_SERVICE_URL || 'http://localhost:3004'
);

// Middleware
app.use(express.json());
app.use(extractUserInfo); // Extract user info from headers or JWT token

// Routes
app.use('/auth', authRoutes(pool, encryptionService, messageQueue, creditServiceClient));
app.use('/password-reset', passwordResetRoutes(pool, encryptionService, messageQueue));
app.use('/users', userRoutes(pool, encryptionService, messageQueue, creditServiceClient));
app.use('/kyc', kycRoutes(pool, encryptionService, messageQueue, creditServiceClient));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'user-service', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'user-service', db: 'disconnected' });
  }
});

// Error handling
app.use(errorHandler);

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone_number VARCHAR(50),
        encrypted_phone VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        eligibility_tier INTEGER,
        credit_score_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(100) NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by UUID,
        UNIQUE(user_id, permission)
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role VARCHAR(50) NOT NULL,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role, permission)
      );

      CREATE TABLE IF NOT EXISTS kyc_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        document_number VARCHAR(255),
        encrypted_document_number VARCHAR(500),
        document_url TEXT,
        storage_path VARCHAR(500),
        encrypted_storage_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        verification_notes TEXT,
        verified_at TIMESTAMP,
        verified_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
      CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_verifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);
    `);

    // Insert default role permissions
    await pool.query(`
      INSERT INTO role_permissions (role, permission) VALUES
      ('customer', 'view_own_profile'),
      ('customer', 'update_own_profile'),
      ('customer', 'submit_kyc'),
      ('customer', 'view_own_kyc_status'),
      ('customer', 'make_payment'),
      ('agent', 'onboard_customer'),
      ('agent', 'collect_payment'),
      ('agent', 'view_customer_profile'),
      ('agent', 'verify_kyc'),
      ('agent', 'view_payment_history'),
      ('agent', 'view_own_profile'),
      ('agent', 'update_own_profile'),
      ('admin', 'manage_users'),
      ('admin', 'manage_vehicles'),
      ('admin', 'view_all_profiles'),
      ('admin', 'verify_kyc'),
      ('admin', 'manage_payments'),
      ('admin', 'view_analytics'),
      ('admin', 'manage_permissions')
      ON CONFLICT (role, permission) DO NOTHING;
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Start server
async function start() {
  try {
    await initializeDatabase();
    await messageQueue.connect();
    
    app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
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


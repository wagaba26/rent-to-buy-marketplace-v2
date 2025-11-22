import express from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { errorHandler } from '@rent-to-own/errors';
import dotenv from 'dotenv';
import { vehicleRoutes } from './routes/vehicles';
import { categoryRoutes } from './routes/categories';
import { ReservationExpiryScheduler } from './schedulers/reservationExpiry';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'vehicledb',
  user: process.env.DB_USER || 'vehicle',
  password: process.env.DB_PASSWORD || 'vehiclepass',
});

// Initialize message queue
const messageQueue = new MessageQueueClient({
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
});

// Middleware
app.use(express.json());

// Routes
app.use('/vehicles', vehicleRoutes(pool, messageQueue));
app.use('/categories', categoryRoutes(pool, messageQueue));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'vehicle-service', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'vehicle-service', db: 'disconnected' });
  }
});

// Error handling
app.use(errorHandler);

// Initialize database schema
async function initializeDatabase() {
  try {
    // Create categories table first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create vehicles table with enhanced schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        make VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
        vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'truck')),
        category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,
        vin VARCHAR(100) UNIQUE,
        registration_number VARCHAR(100) UNIQUE,
        color VARCHAR(50),
        mileage INTEGER DEFAULT 0 CHECK (mileage >= 0),
        price DECIMAL(12, 2) NOT NULL CHECK (price > 0),
        deposit_amount DECIMAL(12, 2) NOT NULL CHECK (deposit_amount > 0 AND deposit_amount <= price),
        weekly_payment DECIMAL(12, 2) CHECK (weekly_payment > 0),
        monthly_payment DECIMAL(12, 2) CHECK (monthly_payment > 0),
        payment_frequency VARCHAR(20) CHECK (payment_frequency IN ('weekly', 'monthly')),
        payment_term_months INTEGER CHECK (payment_term_months > 0),
        eligibility_tier VARCHAR(50) CHECK (eligibility_tier IN ('basic', 'standard', 'premium', 'luxury')),
        status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'rented', 'sold', 'maintenance')),
        description TEXT,
        images TEXT[],
        specifications JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create vehicle_reservations table with expiry tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'completed')),
        reserved_until TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
      CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
      CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);
      CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_eligibility_tier ON vehicles(eligibility_tier);
      CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
      CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_id ON vehicle_reservations(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON vehicle_reservations(user_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_status ON vehicle_reservations(status);
      CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON vehicle_reservations(expires_at);
      CREATE INDEX IF NOT EXISTS idx_reservations_active ON vehicle_reservations(vehicle_id, status) WHERE status IN ('pending', 'approved');
    `);

    // Insert default categories if they don't exist
    await pool.query(`
      INSERT INTO vehicle_categories (name, description)
      VALUES 
        ('Economy', 'Budget-friendly vehicles with basic features'),
        ('Standard', 'Mid-range vehicles with standard features'),
        ('Premium', 'High-end vehicles with advanced features'),
        ('Luxury', 'Top-tier vehicles with luxury features')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Initialize reservation expiry scheduler
const reservationScheduler = new ReservationExpiryScheduler(
  pool,
  messageQueue,
  parseInt(process.env.RESERVATION_CHECK_INTERVAL_MS || '60000') // Default: 1 minute
);

// Subscribe to events
async function subscribeToEvents() {
  try {
    // Listen for rental events
    await messageQueue.subscribe('payment.events', 'vehicle-service-queue', 'payment.completed', async (message) => {
      console.log('Payment completed event received:', message);
      // Update vehicle status when payment is completed
      // This would typically mark the vehicle as rented
      if (message.payload?.vehicleId) {
        await pool.query(
          "UPDATE vehicles SET status = 'rented', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [message.payload.vehicleId]
        );
      }
    });

    await messageQueue.subscribe('payment.events', 'vehicle-service-queue', 'payment.failed', async (message) => {
      console.log('Payment failed event received:', message);
      // Handle payment failure - potentially release reservation
      if (message.payload?.reservationId) {
        // Expire the reservation if payment fails
        await reservationScheduler.expireReservation(message.payload.reservationId);
      }
    });
  } catch (error) {
    console.error('Failed to subscribe to events:', error);
  }
}

// Start server
async function start() {
  try {
    await initializeDatabase();
    await messageQueue.connect();
    await subscribeToEvents();
    
    // Start reservation expiry scheduler
    reservationScheduler.start();
    
    app.listen(PORT, () => {
      console.log(`Vehicle service running on port ${PORT}`);
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
  reservationScheduler.stop();
  await pool.end();
  await messageQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  reservationScheduler.stop();
  await pool.end();
  await messageQueue.close();
  process.exit(0);
});


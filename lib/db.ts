import { Pool } from 'pg';

// Single database connection pool for the unified app
let pool: Pool | null = null;

export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rent_to_own',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function initializeDatabase() {
  const db = getDb();
  
  try {
    // Users table
    await db.query(`
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
    `);

    // Vehicles tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS vehicle_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

    // Payment tables
    await db.query(`
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

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
        response_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // Credit scoring tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id UUID NOT NULL UNIQUE,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
        tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'standard', 'premium', 'luxury')),
        maximum_vehicle_value DECIMAL(12, 2),
        required_deposit_percentage DECIMAL(5, 2),
        factors JSONB NOT NULL,
        alternative_data JSONB,
        behavioral_signals JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS score_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id UUID NOT NULL,
        update_type VARCHAR(50) NOT NULL,
        score_before INTEGER NOT NULL,
        score_after INTEGER NOT NULL,
        tier_before VARCHAR(20),
        tier_after VARCHAR(20),
        adjustment INTEGER NOT NULL,
        update_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
      CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
      CREATE INDEX IF NOT EXISTS idx_payment_plans_user_id ON payment_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_payment_plan_id ON payments(payment_plan_id);
      CREATE INDEX IF NOT EXISTS idx_credit_scores_applicant_id ON credit_scores(applicant_id);
    `);

    // Insert default role permissions
    await db.query(`
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

    // Insert default vehicle categories
    await db.query(`
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
    throw error;
  }
}


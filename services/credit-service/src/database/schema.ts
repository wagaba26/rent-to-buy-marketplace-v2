import { Pool } from 'pg';

/**
 * Initialize comprehensive database schema for the independent credit-scoring service
 */
export async function initializeScoringDatabase(pool: Pool): Promise<void> {
  try {
    // Table for storing applicant data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applicant_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id VARCHAR(255) NOT NULL UNIQUE,
        personal_info JSONB NOT NULL,
        mobile_money_history JSONB,
        utility_payments JSONB,
        sacco_contributions JSONB,
        prior_loan_performance JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_applicant_data_applicant_id ON applicant_data(applicant_id);
    `);

    // Table for storing credit scores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id VARCHAR(255) NOT NULL UNIQUE,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
        tier VARCHAR(1) NOT NULL CHECK (tier IN ('A', 'B', 'C', 'D', 'E')),
        factors JSONB NOT NULL,
        maximum_vehicle_value DECIMAL(15, 2) NOT NULL,
        required_deposit_percentage DECIMAL(5, 2) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_credit_scores_applicant_id ON credit_scores(applicant_id);
      CREATE INDEX IF NOT EXISTS idx_credit_scores_tier ON credit_scores(tier);
      CREATE INDEX IF NOT EXISTS idx_credit_scores_score ON credit_scores(score);
    `);

    // Table for storing score update history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS score_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id VARCHAR(255) NOT NULL,
        update_type VARCHAR(50) NOT NULL CHECK (update_type IN ('repayment', 'telematics', 'payment', 'manual')),
        score_before INTEGER NOT NULL,
        score_after INTEGER NOT NULL,
        tier_before VARCHAR(1) NOT NULL,
        tier_after VARCHAR(1) NOT NULL,
        adjustment INTEGER NOT NULL,
        update_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_score_updates_applicant_id ON score_updates(applicant_id);
      CREATE INDEX IF NOT EXISTS idx_score_updates_created_at ON score_updates(created_at);
    `);

    // Table for comprehensive audit logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scoring_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('score_calculated', 'score_updated', 'tier_assigned', 'tier_changed')),
        score_before INTEGER,
        score_after INTEGER,
        tier_before VARCHAR(1),
        tier_after VARCHAR(1),
        inputs JSONB NOT NULL,
        decision TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_applicant_id ON scoring_audit_logs(applicant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON scoring_audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON scoring_audit_logs(created_at);
    `);

    // Table for tier configurations (can be updated for business rules)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier VARCHAR(1) NOT NULL UNIQUE CHECK (tier IN ('A', 'B', 'C', 'D', 'E')),
        min_score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        max_vehicle_value DECIMAL(15, 2) NOT NULL,
        deposit_percentage DECIMAL(5, 2) NOT NULL,
        vehicle_categories JSONB NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tier_configurations_tier ON tier_configurations(tier);
    `);

    // Insert default tier configurations if they don't exist
    await pool.query(`
      INSERT INTO tier_configurations (tier, min_score, max_score, max_vehicle_value, deposit_percentage, vehicle_categories)
      VALUES
        ('A', 800, 1000, 50000000, 10, '["motorcycle", "car", "van", "truck"]'::jsonb),
        ('B', 650, 799, 30000000, 20, '["motorcycle", "car", "van"]'::jsonb),
        ('C', 500, 649, 15000000, 30, '["motorcycle", "car"]'::jsonb),
        ('D', 350, 499, 8000000, 40, '["motorcycle"]'::jsonb),
        ('E', 0, 349, 0, 0, '[]'::jsonb)
      ON CONFLICT (tier) DO NOTHING;
    `);

    console.log('Scoring database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize scoring database schema:', error);
    throw error;
  }
}


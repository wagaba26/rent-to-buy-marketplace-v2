import express from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { errorHandler } from '@rent-to-own/errors';
import dotenv from 'dotenv';
import { creditRoutes } from './routes/credit';
import { scoringRoutes } from './routes/scoring';
import { initializeScoringDatabase } from './database/schema';
import { ScoringEngine } from './services/scoringEngine';
import { AuditLogger } from './services/auditLogger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5435'),
  database: process.env.DB_NAME || 'creditdb',
  user: process.env.DB_USER || 'credit',
  password: process.env.DB_PASSWORD || 'creditpass',
});

// Initialize message queue
const messageQueue = new MessageQueueClient({
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
});

// Middleware
app.use(express.json());

// Routes - Independent Credit Scoring Service
// Root-level routes matching exact endpoint names
app.use('/', scoringRoutes(pool));
// Also available under /scoring prefix
app.use('/scoring', scoringRoutes(pool));

// Legacy routes (for backward compatibility)
app.use('/credit', creditRoutes(pool, messageQueue));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'credit-service', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'credit-service', db: 'disconnected' });
  }
});

// Error handling
app.use(errorHandler);

// Initialize database schema
async function initializeDatabase() {
  try {
    // Initialize new comprehensive scoring database schema
    await initializeScoringDatabase(pool);

    // Legacy schema (for backward compatibility)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_scores_legacy (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
        risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
        factors JSONB NOT NULL,
        alternative_data JSONB,
        behavioral_signals JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS credit_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        vehicle_id UUID,
        requested_amount DECIMAL(12, 2),
        assessment_result VARCHAR(50) NOT NULL CHECK (assessment_result IN ('approved', 'rejected', 'pending', 'conditional')),
        credit_score_id UUID,
        conditions JSONB,
        assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_credit_scores_legacy_user_id ON credit_scores_legacy(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_scores_legacy_risk_level ON credit_scores_legacy(risk_level);
      CREATE INDEX IF NOT EXISTS idx_credit_assessments_user_id ON credit_assessments(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_assessments_result ON credit_assessments(assessment_result);
    `);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Subscribe to events for dynamic score updates
async function subscribeToEvents() {
  try {
    const auditLogger = new AuditLogger(pool);

    // Listen for repayment events to update credit score
    await messageQueue.subscribe('payment.events', 'credit-service-queue', 'payment.completed', async (message) => {
      console.log('Payment completed event received, updating credit score:', message);
      const { userId, applicantId } = message.payload;
      const identifier = applicantId || userId;
      
      if (identifier) {
        await updateCreditScoreFromEvent(pool, auditLogger, identifier, 'repayment', {
          repaymentSuccess: true,
          repaymentAmount: message.payload.amount,
        });
      }
    });

    await messageQueue.subscribe('payment.events', 'credit-service-queue', 'payment.failed', async (message) => {
      console.log('Payment failed event received, updating credit score:', message);
      const { userId, applicantId } = message.payload;
      const identifier = applicantId || userId;
      
      if (identifier) {
        await updateCreditScoreFromEvent(pool, auditLogger, identifier, 'repayment', {
          repaymentSuccess: false,
          repaymentAmount: message.payload.amount,
        });
      }
    });

    // Listen for telematics risk events
    await messageQueue.subscribe('telematics.events', 'credit-service-queue', 'telematics.risk.detected', async (message) => {
      console.log('Telematics risk event received, updating credit score:', message);
      const { userId, applicantId } = message.payload;
      const identifier = applicantId || userId;
      
      if (identifier) {
        await updateCreditScoreFromEvent(pool, auditLogger, identifier, 'telematics', {
          telematicsScore: message.payload.riskScore ? 1 - message.payload.riskScore : 0.5, // Invert risk to safety score
          telematicsEvents: {
            speedingViolations: message.payload.speedingViolations || 0,
            harshBraking: message.payload.harshBraking || 0,
            safeDrivingDays: message.payload.safeDrivingDays || 0,
          },
        });
      }
    });

    // Listen for SafeDriving events
    await messageQueue.subscribe('credit.events', 'credit-service-queue', 'telematics.safedriving', async (message) => {
      console.log('SafeDriving event received, updating credit score:', message);
      const { userId, applicantId } = message.payload;
      const identifier = applicantId || userId;
      
      if (identifier) {
        await updateCreditScoreFromEvent(pool, auditLogger, identifier, 'telematics', {
          telematicsScore: message.payload.telematicsScore || 0.7,
          telematicsEvents: {
            speedingViolations: message.payload.speedingViolations || 0,
            harshBraking: message.payload.harshBraking || 0,
            harshAcceleration: message.payload.harshAcceleration || 0,
            safeDrivingDays: message.payload.safeDrivingDays || 0,
          },
        });
      }
    });

    // Listen for UnsafeDriving events
    await messageQueue.subscribe('credit.events', 'credit-service-queue', 'telematics.unsafedriving', async (message) => {
      console.log('UnsafeDriving event received, updating credit score:', message);
      const { userId, applicantId } = message.payload;
      const identifier = applicantId || userId;
      
      if (identifier) {
        await updateCreditScoreFromEvent(pool, auditLogger, identifier, 'telematics', {
          telematicsScore: message.payload.telematicsScore || 0.3,
          telematicsEvents: {
            speedingViolations: message.payload.speedingViolations || 0,
            harshBraking: message.payload.harshBraking || 0,
            harshAcceleration: message.payload.harshAcceleration || 0,
            safeDrivingDays: message.payload.safeDrivingDays || 0,
          },
        });
      }
    });

    // Listen for general payment events
    await messageQueue.subscribe('payment.events', 'credit-service-queue', 'payment.success', async (message) => {
      console.log('Payment success event received, updating credit score:', message);
      const { userId, applicantId } = message.payload;
      const identifier = applicantId || userId;
      
      if (identifier) {
        await updateCreditScoreFromEvent(pool, auditLogger, identifier, 'payment', {
          paymentSuccess: true,
          paymentAmount: message.payload.amount,
        });
      }
    });
  } catch (error) {
    console.error('Failed to subscribe to events:', error);
  }
}

// Helper function to update credit score from events using the scoring engine
async function updateCreditScoreFromEvent(
  pool: Pool,
  auditLogger: AuditLogger,
  applicantId: string,
  updateType: 'repayment' | 'telematics' | 'payment' | 'manual',
  data: any
) {
  try {
    // Get current score
    const result = await pool.query(
      'SELECT score, tier FROM credit_scores WHERE applicant_id = $1',
      [applicantId]
    );

    if (result.rows.length === 0) {
      console.log(`No credit score found for applicant ${applicantId}, skipping update`);
      return;
    }

    const currentScore = result.rows[0].score;
    const currentTier = result.rows[0].tier;

    // Calculate score update using scoring engine
    const { newScore, newTier, adjustment } = ScoringEngine.updateScore(
      currentScore,
      currentTier,
      {
        applicantId,
        updateType,
        data,
      }
    );

    // Update credit score
    const tierConfig = ScoringEngine.getTierConfig(newTier);
    if (!tierConfig) {
      console.error(`Invalid tier configuration for tier: ${newTier}`);
      return;
    }

    await pool.query(
      `UPDATE credit_scores 
       SET score = $1, tier = $2, maximum_vehicle_value = $3, required_deposit_percentage = $4, last_updated = CURRENT_TIMESTAMP
       WHERE applicant_id = $5`,
      [newScore, newTier, tierConfig.maxVehicleValue, tierConfig.depositPercentage, applicantId]
    );

    // Record score update history
    await pool.query(
      `INSERT INTO score_updates 
       (applicant_id, update_type, score_before, score_after, tier_before, tier_after, adjustment, update_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [applicantId, updateType, currentScore, newScore, currentTier, newTier, adjustment, JSON.stringify(data)]
    );

    // Log the update
    const decision = `Score updated from ${currentScore} to ${newScore} (${adjustment > 0 ? '+' : ''}${adjustment}) via ${updateType}. Tier: ${currentTier} → ${newTier}`;
    await auditLogger.logAction(
      applicantId,
      'score_updated',
      { updateType, data },
      decision,
      {
        scoreBefore: currentScore,
        scoreAfter: newScore,
        tierBefore: currentTier,
        tierAfter: newTier,
      }
    );

    console.log(`Credit score updated for applicant ${applicantId}: ${currentScore} → ${newScore}`);
  } catch (error) {
    console.error('Error updating credit score from event:', error);
  }
}

// Start server
async function start() {
  try {
    await initializeDatabase();
    await messageQueue.connect();
    await subscribeToEvents();
    
    app.listen(PORT, () => {
      console.log(`Credit service running on port ${PORT}`);
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


import express from 'express';
import { Pool } from 'pg';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { errorHandler } from '@rent-to-own/errors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { telematicsRoutes } from './routes/telematics';
import { processTelematicsData } from './services/riskManagement';
import { triggerAlerts } from './services/alerts';
import { checkImmobilization } from './services/immobilization';
import { updateDrivingBehaviorSummary, publishCreditEvent } from './services/drivingBehavior';
import { WeatherService } from '../../../lib/external-apis/weather-service';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3005;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5436'),
  database: process.env.DB_NAME || 'telematicsdb',
  user: process.env.DB_USER || 'telematics',
  password: process.env.DB_PASSWORD || 'telematicspass',
});

// Initialize message queue
const messageQueue = new MessageQueueClient({
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
});

// WebSocket connections map
const connections = new Map<string, any>();

// Middleware
app.use(express.json());

// Routes
app.use('/telematics', telematicsRoutes(pool, messageQueue));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'telematics-service', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'telematics-service', db: 'disconnected' });
  }
});

// Error handling
app.use(errorHandler);

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const vehicleId = new URL(req.url || '', `http://${req.headers.host}`).searchParams.get('vehicleId');

  if (!vehicleId) {
    ws.close(1008, 'vehicleId required');
    return;
  }

  connections.set(vehicleId, ws);
  console.log(`WebSocket connected for vehicle ${vehicleId}`);

  ws.on('message', async (data: Buffer) => {
    try {
      const telematicsData = JSON.parse(data.toString());
      await handleTelematicsData(vehicleId, telematicsData);
    } catch (error) {
      console.error('Error processing telematics data:', error);
    }
  });

  ws.on('close', () => {
    connections.delete(vehicleId);
    console.log(`WebSocket disconnected for vehicle ${vehicleId}`);
  });
});

// Handle incoming telematics data with enhanced sensor support
async function handleTelematicsData(vehicleId: string, data: any) {
  try {
    // Fetch weather data if location is available
    let weatherData = null;
    let weatherRiskScore = 0;

    if (data.latitude && data.longitude) {
      try {
        weatherData = await WeatherService.getCurrentWeather(data.latitude, data.longitude);
        weatherRiskScore = WeatherService.calculateWeatherRisk(weatherData).riskScore;
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
      }
    }

    // Store enhanced telematics data with all sensor types
    await pool.query(
      `INSERT INTO telematics_data (
        vehicle_id, latitude, longitude, speed, heading, engine_status, 
        fuel_level, braking_force, acceleration, idling_duration_seconds,
        rpm, odometer_km, battery_voltage, gps_signal_strength, device_tamper_status,
        weather_data, weather_risk_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        vehicleId,
        data.latitude,
        data.longitude,
        data.speed || 0,
        data.heading,
        data.engineStatus || 'unknown',
        data.fuelLevel,
        data.brakingForce || 0,
        data.acceleration || 0,
        data.idlingDurationSeconds || 0,
        data.rpm,
        data.odometerKm,
        data.batteryVoltage,
        data.gpsSignalStrength,
        data.deviceTamperStatus || false,
        weatherData ? JSON.stringify(weatherData) : null,
        weatherRiskScore,
      ]
    );

    // Process for risk detection (includes geo-fencing and anomaly detection)
    const riskAssessment = await processTelematicsData(pool, vehicleId, data);

    if (riskAssessment.hasRisk) {
      // Store risk event
      if (riskAssessment.userId) {
        await pool.query(
          `INSERT INTO risk_events (vehicle_id, user_id, risk_type, severity, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [vehicleId, riskAssessment.userId, riskAssessment.riskType, riskAssessment.severity, JSON.stringify(riskAssessment.details)]
        );
      }

      // Publish risk event to message queue (fault-tolerant - continue if queue fails)
      try {
        await messageQueue.publish('telematics.events', 'telematics.risk.detected', {
          type: 'telematics.risk.detected',
          payload: {
            vehicleId,
            userId: riskAssessment.userId,
            riskType: riskAssessment.riskType,
            severity: riskAssessment.severity,
            details: riskAssessment.details,
          },
          timestamp: Date.now(),
        });
      } catch (queueError) {
        console.error('Failed to publish to message queue (continuing):', queueError);
        // Continue processing - fault-tolerant design
      }

      // Trigger alerts (fault-tolerant)
      if (riskAssessment.userId && riskAssessment.severity) {
        try {
          await triggerAlerts(pool, vehicleId, riskAssessment.userId, riskAssessment);
        } catch (alertError) {
          console.error('Failed to trigger alerts (continuing):', alertError);
        }
      }

      // Check if immobilization is needed (fault-tolerant)
      if (riskAssessment.severity === 'critical' || riskAssessment.riskType === 'payment_overdue') {
        try {
          await checkImmobilization(pool, vehicleId, riskAssessment);
        } catch (immobError) {
          console.error('Failed to check immobilization (continuing):', immobError);
        }
      }
    }

    // Update driving behavior summary for credit scoring
    try {
      await updateDrivingBehaviorSummary(pool, vehicleId, data, riskAssessment.userId);
    } catch (summaryError) {
      console.error('Failed to update driving behavior summary (continuing):', summaryError);
    }
  } catch (error) {
    console.error('Error handling telematics data:', error);
    // Continue processing - fault-tolerant design ensures service continues
  }
}

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      -- Enhanced telematics data table with all sensor data
      CREATE TABLE IF NOT EXISTS telematics_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        speed DECIMAL(5, 2),
        heading DECIMAL(5, 2),
        engine_status VARCHAR(20),
        fuel_level DECIMAL(5, 2),
        braking_force DECIMAL(5, 2),
        acceleration DECIMAL(5, 2),
        idling_duration_seconds INTEGER DEFAULT 0,
        rpm INTEGER,
        odometer_km DECIMAL(10, 2),
        battery_voltage DECIMAL(4, 2),
        gps_signal_strength INTEGER,
        device_tamper_status BOOLEAN DEFAULT false,
        weather_data JSONB,
        weather_risk_score INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add weather columns if they don't exist (migration)
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE telematics_data ADD COLUMN weather_data JSONB;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE telematics_data ADD COLUMN weather_risk_score INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
      END $$;

      -- Authorized zones/geo-fences for vehicles
      CREATE TABLE IF NOT EXISTS authorized_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL,
        zone_name VARCHAR(255) NOT NULL,
        zone_type VARCHAR(50) NOT NULL CHECK (zone_type IN ('allowed', 'restricted')),
        center_latitude DECIMAL(10, 8) NOT NULL,
        center_longitude DECIMAL(11, 8) NOT NULL,
        radius_meters DECIMAL(10, 2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enhanced risk events table
      CREATE TABLE IF NOT EXISTS risk_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL,
        user_id UUID,
        risk_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        details JSONB,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        acknowledged BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP
      );

      -- Alerts table for customers and support team
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL,
        user_id UUID,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        message TEXT NOT NULL,
        channel VARCHAR(50) CHECK (channel IN ('sms', 'email', 'push', 'in_app')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Immobilization status and actions
      CREATE TABLE IF NOT EXISTS immobilization_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL,
        user_id UUID,
        reason VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'warning_sent', 'immobilized', 'released')),
        warning_count INTEGER DEFAULT 0,
        grace_period_hours INTEGER DEFAULT 24,
        warning_sent_at TIMESTAMP,
        immobilized_at TIMESTAMP,
        released_at TIMESTAMP,
        released_by UUID,
        released_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Driving behavior summary for credit scoring
      CREATE TABLE IF NOT EXISTS driving_behavior_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL,
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        total_distance_km DECIMAL(10, 2) DEFAULT 0,
        speeding_violations INTEGER DEFAULT 0,
        harsh_braking_count INTEGER DEFAULT 0,
        harsh_acceleration_count INTEGER DEFAULT 0,
        idling_duration_minutes INTEGER DEFAULT 0,
        safe_driving_score DECIMAL(5, 2) DEFAULT 100.0,
        credit_event_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vehicle_id, user_id, date)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_telematics_vehicle_id ON telematics_data(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_telematics_timestamp ON telematics_data(timestamp);
      CREATE INDEX IF NOT EXISTS idx_telematics_vehicle_timestamp ON telematics_data(vehicle_id, timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_authorized_zones_vehicle_id ON authorized_zones(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_authorized_zones_active ON authorized_zones(vehicle_id, is_active) WHERE is_active = true;
      
      CREATE INDEX IF NOT EXISTS idx_risk_events_vehicle_id ON risk_events(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_risk_events_user_id ON risk_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_risk_events_severity ON risk_events(severity);
      CREATE INDEX IF NOT EXISTS idx_risk_events_detected_at ON risk_events(detected_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_immobilization_vehicle_id ON immobilization_status(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_immobilization_status ON immobilization_status(status);
      
      CREATE INDEX IF NOT EXISTS idx_driving_behavior_vehicle_user ON driving_behavior_summary(vehicle_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_driving_behavior_date ON driving_behavior_summary(date DESC);
      CREATE INDEX IF NOT EXISTS idx_driving_behavior_credit_event ON driving_behavior_summary(credit_event_published) WHERE credit_event_published = false;
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

    server.listen(PORT, () => {
      console.log(`Telematics service running on port ${PORT} `);
      console.log(`WebSocket server ready on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Background job to publish credit scoring events (runs every hour)
async function publishCreditScoringEvents() {
  try {
    // Get all unpublished driving behavior summaries
    const summaries = await pool.query(
      `SELECT dbs.*, dbs.user_id as applicant_id
       FROM driving_behavior_summary dbs
       WHERE dbs.credit_event_published = false
       AND dbs.date <= CURRENT_DATE
       ORDER BY dbs.date DESC
       LIMIT 100`
    );

    for (const summary of summaries.rows) {
      try {
        await publishCreditEvent(
          messageQueue,
          summary.vehicle_id,
          summary.user_id,
          summary.date,
          summary
        );

        // Mark as published
        await pool.query(
          `UPDATE driving_behavior_summary
           SET credit_event_published = true
           WHERE vehicle_id = $1 AND user_id = $2 AND date = $3`,
          [summary.vehicle_id, summary.user_id, summary.date]
        );
      } catch (error) {
        console.error(`Failed to publish credit event for vehicle ${summary.vehicle_id}:`, error);
        // Continue with next event
      }
    }
  } catch (error) {
    console.error('Error in credit scoring event publisher:', error);
  }
}

// Schedule credit scoring event publication (every hour)
cron.schedule('0 * * * *', publishCreditScoringEvents);

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  await messageQueue.close();
  wss.close();
  process.exit(0);
});


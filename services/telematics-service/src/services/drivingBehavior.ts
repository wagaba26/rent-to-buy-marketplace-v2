import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { RiskAssessment } from './riskManagement';

/**
 * Update driving behavior summary and publish credit scoring events
 */
export async function updateDrivingBehaviorSummary(
  pool: Pool,
  vehicleId: string,
  telematicsData: any,
  userId: string | undefined
): Promise<void> {
  if (!userId) return;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Get or create today's summary
    let summaryResult = await pool.query(
      `SELECT * FROM driving_behavior_summary
       WHERE vehicle_id = $1 AND user_id = $2 AND date = $3`,
      [vehicleId, userId, today]
    );

    if (summaryResult.rows.length === 0) {
      // Create new summary for today
      await pool.query(
        `INSERT INTO driving_behavior_summary 
         (vehicle_id, user_id, date, safe_driving_score)
         VALUES ($1, $2, $3, 100.0)`,
        [vehicleId, userId, today]
      );
      summaryResult = await pool.query(
        `SELECT * FROM driving_behavior_summary
         WHERE vehicle_id = $1 AND user_id = $2 AND date = $3`,
        [vehicleId, userId, today]
      );
    }

    const summary = summaryResult.rows[0];
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Update distance if odometer data available
    // Note: Distance calculation would ideally track last odometer reading
    // For now, we'll accumulate based on speed * time or use odometer differences
    if (telematicsData.odometerKm) {
      // Get last recorded odometer for this vehicle
      const lastOdometerResult = await pool.query(
        `SELECT odometer_km FROM telematics_data
         WHERE vehicle_id = $1 AND odometer_km IS NOT NULL
         ORDER BY timestamp DESC
         LIMIT 1
         OFFSET 1`,
        [vehicleId]
      );
      
      if (lastOdometerResult.rows.length > 0) {
        const lastOdometer = parseFloat(lastOdometerResult.rows[0].odometer_km);
        const distanceDelta = Math.abs(telematicsData.odometerKm - lastOdometer);
        if (distanceDelta > 0 && distanceDelta < 1000) { // Sanity check: max 1000km between readings
          updates.push(`total_distance_km = total_distance_km + $${paramCount++}`);
          values.push(distanceDelta);
        }
      }
    }

    // Update idling duration
    if (telematicsData.idlingDurationSeconds) {
      updates.push(`idling_duration_minutes = idling_duration_minutes + $${paramCount++}`);
      values.push(telematicsData.idlingDurationSeconds / 60);
    }

    // Track violations (increment counters if thresholds exceeded)
    if (telematicsData.speed && telematicsData.speed > 120) {
      updates.push(`speeding_violations = speeding_violations + $${paramCount++}`);
      values.push(1);
    }
    if (telematicsData.brakingForce && telematicsData.brakingForce > 0.7) {
      updates.push(`harsh_braking_count = harsh_braking_count + $${paramCount++}`);
      values.push(1);
    }
    if (telematicsData.acceleration && Math.abs(telematicsData.acceleration) > 3.0) {
      updates.push(`harsh_acceleration_count = harsh_acceleration_count + $${paramCount++}`);
      values.push(1);
    }

    // Recalculate safe driving score based on violations
    let safeDrivingScore = 100.0;
    
    // Get current violation counts
    const currentSpeeding = (summary.speeding_violations || 0) + (telematicsData.speed > 120 ? 1 : 0);
    const currentHarshBraking = (summary.harsh_braking_count || 0) + (telematicsData.brakingForce > 0.7 ? 1 : 0);
    const currentHarshAccel = (summary.harsh_acceleration_count || 0) + (Math.abs(telematicsData.acceleration || 0) > 3.0 ? 1 : 0);
    
    // Penalties based on violation counts
    safeDrivingScore -= currentSpeeding * 2; // -2 per speeding violation
    safeDrivingScore -= currentHarshBraking * 3; // -3 per harsh braking
    safeDrivingScore -= currentHarshAccel * 2; // -2 per harsh acceleration
    
    // Additional penalties for severe violations
    if (telematicsData.speed > 150) {
      safeDrivingScore -= 10; // Severe speeding penalty
    }

    // Clamp score between 0 and 100
    safeDrivingScore = Math.max(0, Math.min(100, safeDrivingScore));

    // Apply score decay based on current score (exponential moving average)
    const currentScore = parseFloat(summary.safe_driving_score || '100');
    const newScore = (currentScore * 0.95 + safeDrivingScore * 0.05); // Weighted average
    
    updates.push(`safe_driving_score = $${paramCount++}`);
    values.push(newScore);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add vehicle_id, user_id, date for WHERE clause
    values.push(vehicleId, userId, today);

    // Update summary
    await pool.query(
      `UPDATE driving_behavior_summary
       SET ${updates.join(', ')}
       WHERE vehicle_id = $${paramCount++} AND user_id = $${paramCount++} AND date = $${paramCount++}`,
      values
    );

    // Publish credit scoring event at end of day (or if score drops significantly)
    if (!summary.credit_event_published) {
      const shouldPublish = await shouldPublishCreditEvent(pool, vehicleId, userId, today, newScore);
      if (shouldPublish) {
        await publishCreditScoringEvent(pool, vehicleId, userId, today);
      }
    }
  } catch (error) {
    console.error('Error updating driving behavior summary:', error);
  }
}

/**
 * Check if credit scoring event should be published
 */
async function shouldPublishCreditEvent(
  pool: Pool,
  vehicleId: string,
  userId: string,
  date: string,
  currentScore: number
): Promise<boolean> {
  // Publish at end of day or if score drops significantly
  const now = new Date();
  const dayEnd = new Date(date + 'T23:59:59');
  
  // Publish if it's near end of day or score is very low
  if (now >= dayEnd || currentScore < 50) {
    return true;
  }

  return false;
}

/**
 * Publish SafeDriving or UnsafeDriving event to credit service
 */
async function publishCreditScoringEvent(
  pool: Pool,
  vehicleId: string,
  userId: string,
  date: string
): Promise<void> {
  try {
    // Get today's summary
    const summaryResult = await pool.query(
      `SELECT * FROM driving_behavior_summary
       WHERE vehicle_id = $1 AND user_id = $2 AND date = $3`,
      [vehicleId, userId, date]
    );

    if (summaryResult.rows.length === 0) return;

    const summary = summaryResult.rows[0];
    const safeDrivingScore = parseFloat(summary.safe_driving_score || '100');
    const isSafeDriving = safeDrivingScore >= 70;

    // Calculate metrics
    const speedingViolations = summary.speeding_violations || 0;
    const harshBraking = summary.harsh_braking_count || 0;
    const harshAcceleration = summary.harsh_acceleration_count || 0;
    const safeDrivingDays = safeDrivingScore >= 80 ? 1 : 0;

    // Determine event type
    const eventType = isSafeDriving ? 'SafeDriving' : 'UnsafeDriving';

    // Publish event (this will be picked up by credit service)
    // Note: We'll use the message queue instance from the main service
    // For now, we'll mark as published and let the main service handle publishing
    
    // Mark as published to avoid duplicate events
    await pool.query(
      `UPDATE driving_behavior_summary
       SET credit_event_published = true
       WHERE vehicle_id = $1 AND user_id = $2 AND date = $3`,
      [vehicleId, userId, date]
    );

    console.log(`Ready to publish ${eventType} event for vehicle ${vehicleId}, user ${userId}`);
  } catch (error) {
    console.error('Error publishing credit scoring event:', error);
  }
}

/**
 * Publish credit scoring event via message queue
 */
export async function publishCreditEvent(
  messageQueue: MessageQueueClient,
  vehicleId: string,
  userId: string,
  date: string,
  summary: any
): Promise<void> {
  try {
    const safeDrivingScore = parseFloat(summary.safe_driving_score || '100');
    const isSafeDriving = safeDrivingScore >= 70;

    const eventType = isSafeDriving ? 'SafeDriving' : 'UnsafeDriving';

    await messageQueue.publish('credit.events', `telematics.${eventType.toLowerCase()}`, {
      type: `telematics.${eventType.toLowerCase()}`,
      payload: {
        vehicleId,
        userId,
        applicantId: userId, // For credit service compatibility
        date,
        safeDrivingScore,
        speedingViolations: summary.speeding_violations || 0,
        harshBraking: summary.harsh_braking_count || 0,
        harshAcceleration: summary.harsh_acceleration_count || 0,
        safeDrivingDays: safeDrivingScore >= 80 ? 1 : 0,
        telematicsScore: safeDrivingScore / 100, // Normalize to 0-1
        telematicsEvents: {
          speedingViolations: summary.speeding_violations || 0,
          harshBraking: summary.harsh_braking_count || 0,
          safeDrivingDays: safeDrivingScore >= 80 ? 1 : 0,
        },
      },
      timestamp: Date.now(),
    });

    console.log(`Published ${eventType} event for vehicle ${vehicleId}`);
  } catch (error) {
    console.error('Failed to publish credit scoring event:', error);
    // Continue processing - fault-tolerant
  }
}


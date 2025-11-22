import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { RiskAssessment } from './riskManagement';

export interface ImmobilizationStatus {
  id: string;
  vehicleId: string;
  userId?: string;
  reason: string;
  status: 'pending' | 'warning_sent' | 'immobilized' | 'released';
  warningCount: number;
  gracePeriodHours: number;
  warningSentAt?: Date;
  immobilizedAt?: Date;
  releasedAt?: Date;
}

/**
 * Check if vehicle should be immobilized and handle grace periods
 */
export async function checkImmobilization(
  pool: Pool,
  vehicleId: string,
  riskAssessment: RiskAssessment
): Promise<void> {
  // Only immobilize for critical risks or payment overdue
  if (
    riskAssessment.severity !== 'critical' &&
    riskAssessment.riskType !== 'payment_overdue'
  ) {
    return;
  }

  try {
    // Check current immobilization status
    const statusResult = await pool.query(
      `SELECT * FROM immobilization_status
       WHERE vehicle_id = $1 AND status IN ('pending', 'warning_sent', 'immobilized')
       ORDER BY created_at DESC
       LIMIT 1`,
      [vehicleId]
    );

    const gracePeriodHours = 24; // Default grace period
    const maxWarnings = 2; // Send 2 warnings before immobilization

    if (statusResult.rows.length === 0) {
      // Create new immobilization record
      await pool.query(
        `INSERT INTO immobilization_status 
         (vehicle_id, user_id, reason, status, grace_period_hours, warning_count)
         VALUES ($1, $2, $3, 'pending', $4, 0)`,
        [
          vehicleId,
          riskAssessment.userId,
          riskAssessment.riskType === 'payment_overdue'
            ? 'Payment overdue'
            : `Critical risk: ${riskAssessment.riskType}`,
          gracePeriodHours,
        ]
      );

      // Send first warning
      await sendImmobilizationWarning(pool, vehicleId, riskAssessment.userId, 1, gracePeriodHours);
      return;
    }

    const currentStatus = statusResult.rows[0];
    const warningCount = currentStatus.warning_count || 0;

    // Check if grace period has expired
    if (currentStatus.status === 'warning_sent' && currentStatus.warning_sent_at) {
      const warningTime = new Date(currentStatus.warning_sent_at);
      const gracePeriodEnd = new Date(
        warningTime.getTime() + (currentStatus.grace_period_hours || gracePeriodHours) * 60 * 60 * 1000
      );

      if (new Date() > gracePeriodEnd && warningCount >= maxWarnings) {
        // Grace period expired - immobilize vehicle
        await immobilizeVehicle(pool, vehicleId, riskAssessment.userId, currentStatus.id);
        return;
      }
    }

    // Send additional warnings if needed
    if (warningCount < maxWarnings && currentStatus.status !== 'immobilized') {
      await sendImmobilizationWarning(
        pool,
        vehicleId,
        riskAssessment.userId,
        warningCount + 1,
        gracePeriodHours
      );
    }
  } catch (error) {
    console.error('Error checking immobilization:', error);
    // Continue processing - don't block vehicle if check fails
  }
}

/**
 * Send immobilization warning to customer
 */
async function sendImmobilizationWarning(
  pool: Pool,
  vehicleId: string,
  userId: string | undefined,
  warningNumber: number,
  gracePeriodHours: number
): Promise<void> {
  if (!userId) return;

  const message = `WARNING ${warningNumber}: Your vehicle will be immobilized in ${gracePeriodHours} hours due to ${warningNumber === 1 ? 'payment overdue or critical violation' : 'non-compliance'}. Please contact support immediately.`;

  try {
    // Update immobilization status
    await pool.query(
      `UPDATE immobilization_status
       SET status = 'warning_sent', 
           warning_count = $1,
           warning_sent_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_id = $2 AND status IN ('pending', 'warning_sent')`,
      [warningNumber, vehicleId]
    );

    // Create alert
    await pool.query(
      `INSERT INTO alerts (vehicle_id, user_id, alert_type, severity, message, channel, status)
       VALUES ($1, $2, 'immobilization_warning', 'critical', $3, 'sms', 'pending')`,
      [vehicleId, userId, message]
    );

    // Also send via email
    await pool.query(
      `INSERT INTO alerts (vehicle_id, user_id, alert_type, severity, message, channel, status)
       VALUES ($1, $2, 'immobilization_warning', 'critical', $3, 'email', 'pending')`,
      [vehicleId, userId, message]
    );

    console.log(`Sent immobilization warning ${warningNumber} for vehicle ${vehicleId}`);
  } catch (error) {
    console.error('Failed to send immobilization warning:', error);
  }
}

/**
 * Immobilize vehicle (disable engine)
 */
async function immobilizeVehicle(
  pool: Pool,
  vehicleId: string,
  userId: string | undefined,
  immobilizationId: string
): Promise<void> {
  try {
    // Update status to immobilized
    await pool.query(
      `UPDATE immobilization_status
       SET status = 'immobilized',
           immobilized_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [immobilizationId]
    );

    // Send immobilization command to hardware (via WebSocket or message queue)
    // In production, this would interface with actual immobilization hardware
    await sendImmobilizationCommand(vehicleId, true);

    // Create critical alert
    if (userId) {
      await pool.query(
        `INSERT INTO alerts (vehicle_id, user_id, alert_type, severity, message, channel, status)
         VALUES ($1, $2, 'vehicle_immobilized', 'critical', $3, 'sms', 'pending')`,
        [vehicleId, userId, 'Your vehicle has been immobilized. Please contact support immediately.']
      );
    }

    console.log(`Vehicle ${vehicleId} immobilized`);
  } catch (error) {
    console.error('Failed to immobilize vehicle:', error);
  }
}

/**
 * Send immobilization command to vehicle hardware
 * In production, this would interface with actual immobilization hardware via API or IoT protocol
 */
async function sendImmobilizationCommand(
  vehicleId: string,
  immobilize: boolean
): Promise<void> {
  // TODO: Implement actual hardware interface
  // This could be:
  // 1. WebSocket message to vehicle tracking device
  // 2. HTTP request to vehicle control API
  // 3. Message queue event that hardware subscribes to
  // 4. IoT protocol (MQTT, CoAP, etc.)

  console.log(`Sending immobilization command: vehicle=${vehicleId}, immobilize=${immobilize}`);
  
  // Placeholder: In production, send actual command to hardware
  // Example:
  // await messageQueue.publish('vehicle.commands', 'immobilization', {
  //   vehicleId,
  //   command: immobilize ? 'disable_engine' : 'enable_engine',
  //   timestamp: Date.now(),
  // });
}

/**
 * Release vehicle immobilization
 */
export async function releaseImmobilization(
  pool: Pool,
  vehicleId: string,
  releasedBy: string,
  reason: string
): Promise<void> {
  try {
    // Update status
    await pool.query(
      `UPDATE immobilization_status
       SET status = 'released',
           released_at = CURRENT_TIMESTAMP,
           released_by = $1,
           released_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_id = $3 AND status = 'immobilized'`,
      [releasedBy, reason, vehicleId]
    );

    // Send release command to hardware
    await sendImmobilizationCommand(vehicleId, false);

    console.log(`Vehicle ${vehicleId} immobilization released`);
  } catch (error) {
    console.error('Failed to release immobilization:', error);
    throw error;
  }
}


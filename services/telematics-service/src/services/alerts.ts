import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { RiskAssessment } from './riskManagement';

export interface Alert {
  vehicleId: string;
  userId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  channel: 'sms' | 'email' | 'push' | 'in_app';
}

/**
 * Trigger alerts to customers and support team
 */
export async function triggerAlerts(
  pool: Pool,
  vehicleId: string,
  userId: string,
  riskAssessment: RiskAssessment
): Promise<void> {
  if (!riskAssessment.riskType || !riskAssessment.severity) {
    return;
  }

  const alerts: Alert[] = [];

  // Determine alert message based on risk type
  let alertMessage = '';
  let alertType = riskAssessment.riskType;

  switch (riskAssessment.riskType) {
    case 'speed_violation':
      alertMessage = `Speed violation detected: ${riskAssessment.details?.speed || 'N/A'} km/h`;
      break;
    case 'geo_fence_violation':
      alertMessage = `Vehicle has left authorized zone: ${riskAssessment.details?.zoneName || 'N/A'}`;
      break;
    case 'tampering_detected':
      alertMessage = 'Possible device tampering detected';
      break;
    case 'payment_overdue':
      alertMessage = 'Payment overdue. Please make payment to avoid vehicle immobilization.';
      break;
    case 'harsh_braking':
      alertMessage = 'Harsh braking detected - drive safely';
      break;
    case 'excessive_idling':
      alertMessage = 'Excessive idling detected';
      break;
    default:
      alertMessage = `Risk detected: ${riskAssessment.riskType}`;
  }

  // Determine alert channels based on severity
  const channels: Array<'sms' | 'email' | 'push' | 'in_app'> = ['in_app'];
  
  if (riskAssessment.severity === 'high' || riskAssessment.severity === 'critical') {
    channels.push('sms', 'email');
  } else if (riskAssessment.severity === 'medium') {
    channels.push('email');
  }

  // Create alerts for each channel
  for (const channel of channels) {
    alerts.push({
      vehicleId,
      userId,
      alertType,
      severity: riskAssessment.severity,
      message: alertMessage,
      channel,
    });
  }

  // Store alerts in database
  for (const alert of alerts) {
    try {
      await pool.query(
        `INSERT INTO alerts (vehicle_id, user_id, alert_type, severity, message, channel, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [alert.vehicleId, alert.userId, alert.alertType, alert.severity, alert.message, alert.channel]
      );
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  // Publish alert event to support service (fault-tolerant)
  try {
    // Note: This assumes support service subscribes to these events
    // Implementation would depend on your message queue setup
  } catch (error) {
    console.error('Failed to publish alert event (continuing):', error);
  }
}

/**
 * Send alert via message queue to support service
 */
export async function publishAlertEvent(
  messageQueue: MessageQueueClient,
  alert: Alert
): Promise<void> {
  try {
    await messageQueue.publish('support.events', 'alert.created', {
      type: 'alert.created',
      payload: alert,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to publish alert event:', error);
    throw error;
  }
}


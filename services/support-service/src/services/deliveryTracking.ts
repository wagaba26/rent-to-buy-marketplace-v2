/**
 * Delivery and Open Rate Tracking Service
 * Tracks notification delivery status and open rates for analytics
 */

import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';

export interface DeliveryMetrics {
  notificationId: string;
  channel: 'sms' | 'email' | 'whatsapp';
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  averageCost: number;
  totalCost: number;
}

export class DeliveryTrackingService {
  private pool: Pool;
  private messageQueue: MessageQueueClient;

  constructor(pool: Pool, messageQueue: MessageQueueClient) {
    this.pool = pool;
    this.messageQueue = messageQueue;
  }

  /**
   * Track delivery status update
   */
  async trackDelivery(metrics: DeliveryMetrics): Promise<void> {
    try {
      // Update notification status
      await this.pool.query(
        `UPDATE notifications 
         SET status = $1, updated_at = $2
         WHERE id = $3`,
        [metrics.status, metrics.timestamp, metrics.notificationId]
      );

      // Insert delivery tracking record
      await this.pool.query(
        `INSERT INTO notification_delivery_tracking 
         (notification_id, channel, status, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          metrics.notificationId,
          metrics.channel,
          metrics.status,
          metrics.timestamp,
          metrics.metadata ? JSON.stringify(metrics.metadata) : null,
        ]
      );

      // Emit event for analytics
      await this.messageQueue.publish('support.events', 'notification.delivery.tracked', {
        type: 'notification.delivery.tracked',
        payload: {
          notificationId: metrics.notificationId,
          channel: metrics.channel,
          status: metrics.status,
          timestamp: metrics.timestamp.getTime(),
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error tracking delivery:', error);
      throw error;
    }
  }

  /**
   * Track email open (via tracking pixel or webhook)
   */
  async trackEmailOpen(notificationId: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackDelivery({
      notificationId,
      channel: 'email',
      status: 'opened',
      timestamp: new Date(),
      metadata,
    });
  }

  /**
   * Track link click
   */
  async trackClick(notificationId: string, linkUrl: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackDelivery({
      notificationId,
      channel: 'email', // Could be email or WhatsApp
      status: 'clicked',
      timestamp: new Date(),
      metadata: { ...metadata, linkUrl },
    });
  }

  /**
   * Get analytics for a notification type
   */
  async getAnalytics(
    type?: string,
    channel?: 'sms' | 'email' | 'whatsapp',
    startDate?: Date,
    endDate?: Date
  ): Promise<NotificationAnalytics> {
    try {
      let query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
          COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
          COUNT(*) FILTER (WHERE status = 'opened') as total_opened,
          COUNT(*) FILTER (WHERE status = 'clicked') as total_clicked,
          COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
          AVG(cost) as avg_cost,
          SUM(cost) as total_cost
        FROM notifications
        WHERE 1=1
      `;
      const values: any[] = [];
      let paramCount = 1;

      if (type) {
        query += ` AND type = $${paramCount++}`;
        values.push(type);
      }

      if (channel) {
        query += ` AND channel = $${paramCount++}`;
        values.push(channel);
      }

      if (startDate) {
        query += ` AND created_at >= $${paramCount++}`;
        values.push(startDate);
      }

      if (endDate) {
        query += ` AND created_at <= $${paramCount++}`;
        values.push(endDate);
      }

      const result = await this.pool.query(query, values);
      const row = result.rows[0];

      const totalSent = parseInt(row.total_sent) || 0;
      const totalDelivered = parseInt(row.total_delivered) || 0;
      const totalOpened = parseInt(row.total_opened) || 0;
      const totalClicked = parseInt(row.total_clicked) || 0;
      const totalFailed = parseInt(row.total_failed) || 0;

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalFailed,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        averageCost: parseFloat(row.avg_cost) || 0,
        totalCost: parseFloat(row.total_cost) || 0,
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Get delivery timeline for a notification
   */
  async getDeliveryTimeline(notificationId: string): Promise<DeliveryMetrics[]> {
    try {
      const result = await this.pool.query(
        `SELECT notification_id, channel, status, timestamp, metadata
         FROM notification_delivery_tracking
         WHERE notification_id = $1
         ORDER BY timestamp ASC`,
        [notificationId]
      );

      return result.rows.map((row) => ({
        notificationId: row.notification_id,
        channel: row.channel,
        status: row.status,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));
    } catch (error) {
      console.error('Error getting delivery timeline:', error);
      throw error;
    }
  }

  /**
   * Get channel performance comparison
   */
  async getChannelPerformance(startDate?: Date, endDate?: Date): Promise<Record<string, NotificationAnalytics>> {
    const channels: ('sms' | 'email' | 'whatsapp')[] = ['sms', 'email', 'whatsapp'];
    const performance: Record<string, NotificationAnalytics> = {};

    for (const channel of channels) {
      performance[channel] = await this.getAnalytics(undefined, channel, startDate, endDate);
    }

    return performance;
  }
}


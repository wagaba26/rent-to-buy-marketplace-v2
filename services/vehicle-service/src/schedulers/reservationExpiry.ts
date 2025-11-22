import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';

export class ReservationExpiryScheduler {
  private pool: Pool;
  private messageQueue: MessageQueueClient;
  private intervalId?: NodeJS.Timeout;
  private checkIntervalMs: number;

  constructor(pool: Pool, messageQueue: MessageQueueClient, checkIntervalMs: number = 60000) {
    this.pool = pool;
    this.messageQueue = messageQueue;
    this.checkIntervalMs = checkIntervalMs;
  }

  /**
   * Start the scheduler to periodically check and expire reservations
   */
  start() {
    // Run immediately on start
    this.checkAndExpireReservations();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.checkAndExpireReservations();
    }, this.checkIntervalMs);

    console.log(`Reservation expiry scheduler started (checking every ${this.checkIntervalMs / 1000}s)`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('Reservation expiry scheduler stopped');
    }
  }

  /**
   * Check for expired reservations and update their status
   */
  private async checkAndExpireReservations() {
    try {
      const now = new Date();

      // Find all pending or approved reservations that have expired
      const expiredReservations = await this.pool.query(
        `SELECT id, vehicle_id, user_id, status, expires_at
         FROM vehicle_reservations
         WHERE status IN ('pending', 'approved')
           AND expires_at <= $1`,
        [now]
      );

      if (expiredReservations.rows.length === 0) {
        return;
      }

      console.log(`Found ${expiredReservations.rows.length} expired reservation(s)`);

      // Update expired reservations
      const reservationIds = expiredReservations.rows.map((r) => r.id);
      const vehicleIds = [...new Set(expiredReservations.rows.map((r) => r.vehicle_id))];

      // Update reservation statuses
      await this.pool.query(
        `UPDATE vehicle_reservations
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($1::uuid[])`,
        [reservationIds]
      );

      // Update vehicle statuses back to available if no other active reservations exist
      for (const vehicleId of vehicleIds) {
        const activeReservations = await this.pool.query(
          `SELECT COUNT(*) as count
           FROM vehicle_reservations
           WHERE vehicle_id = $1
             AND status IN ('pending', 'approved')
             AND expires_at > $2`,
          [vehicleId, now]
        );

        if (parseInt(activeReservations.rows[0].count) === 0) {
          // Check if vehicle is actually reserved (not rented or sold)
          const vehicle = await this.pool.query(
            'SELECT status FROM vehicles WHERE id = $1',
            [vehicleId]
          );

          if (vehicle.rows.length > 0 && vehicle.rows[0].status === 'reserved') {
            await this.pool.query(
              `UPDATE vehicles
               SET status = 'available', updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [vehicleId]
            );

            console.log(`Vehicle ${vehicleId} status updated to available`);
          }
        }
      }

      // Publish expiry events
      for (const reservation of expiredReservations.rows) {
        await this.messageQueue.publish('vehicle.events', 'reservation.expired', {
          type: 'reservation.expired',
          payload: {
            reservationId: reservation.id,
            vehicleId: reservation.vehicle_id,
            userId: reservation.user_id,
            previousStatus: reservation.status,
          },
          timestamp: Date.now(),
        });
      }

      console.log(`Expired ${expiredReservations.rows.length} reservation(s)`);
    } catch (error) {
      console.error('Error checking expired reservations:', error);
    }
  }

  /**
   * Manually expire a specific reservation (useful for testing or admin actions)
   */
  async expireReservation(reservationId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `UPDATE vehicle_reservations
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('pending', 'approved')
         RETURNING vehicle_id`,
        [reservationId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const vehicleId = result.rows[0].vehicle_id;

      // Check if vehicle should be made available
      const activeReservations = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM vehicle_reservations
         WHERE vehicle_id = $1
           AND status IN ('pending', 'approved')
           AND expires_at > CURRENT_TIMESTAMP`,
        [vehicleId]
      );

      if (parseInt(activeReservations.rows[0].count) === 0) {
        await this.pool.query(
          `UPDATE vehicles
           SET status = 'available', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status = 'reserved'`,
          [vehicleId]
        );
      }

      return true;
    } catch (error) {
      console.error('Error expiring reservation:', error);
      throw error;
    }
  }
}


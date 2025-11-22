import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';

export function upgradeRoutes(pool: Pool, messageQueue: MessageQueueClient): Router {
  const router = Router();

  // Request vehicle upgrade
  router.post('/request', async (req: Request, res: Response) => {
    try {
      const { userId, currentVehicleId, requestedVehicleId, reason } = req.body;

      if (!userId || !requestedVehicleId) {
        throw new ValidationError('userId and requestedVehicleId are required');
      }

      const result = await pool.query(
        `INSERT INTO upgrade_requests (user_id, current_vehicle_id, requested_vehicle_id, reason, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [userId, currentVehicleId, requestedVehicleId, reason]
      );

      const upgrade = result.rows[0];

      // Publish upgrade requested event
      await messageQueue.publish('support.events', 'upgrade.requested', {
        type: 'upgrade.requested',
        payload: {
          upgradeId: upgrade.id,
          userId: upgrade.user_id,
          currentVehicleId: upgrade.current_vehicle_id,
          requestedVehicleId: upgrade.requested_vehicle_id,
        },
        timestamp: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: { upgrade },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Get user upgrade requests
  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status } = req.query;

      let query = 'SELECT * FROM upgrade_requests WHERE user_id = $1';
      const values: any[] = [userId];

      if (status) {
        query += ' AND status = $2';
        values.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { upgrades: result.rows },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Approve/reject upgrade request (admin)
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, approvedBy } = req.body;

      if (!status || !['approved', 'rejected'].includes(status)) {
        throw new ValidationError('Status must be approved or rejected');
      }

      const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      const values: any[] = [status];

      if (status === 'approved' && approvedBy) {
        updates.push('approved_by = $2', 'approved_at = CURRENT_TIMESTAMP');
        values.push(approvedBy);
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE upgrade_requests SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Upgrade request');
      }

      const upgrade = result.rows[0];

      // Publish upgrade status changed event
      await messageQueue.publish('support.events', `upgrade.${status}`, {
        type: `upgrade.${status}`,
        payload: {
          upgradeId: upgrade.id,
          userId: upgrade.user_id,
          status: upgrade.status,
        },
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        data: { upgrade },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  return router;
}


import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { releaseImmobilization } from '../services/immobilization';

export function telematicsRoutes(pool: Pool, messageQueue: MessageQueueClient): Router {
  const router = Router();

  // Get vehicle location history
  router.get('/:vehicleId/location', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const { startDate, endDate, limit = 100 } = req.query;

      let query = `
        SELECT latitude, longitude, speed, heading, timestamp
        FROM telematics_data
        WHERE vehicle_id = $1
      `;
      const values: any[] = [vehicleId];
      let paramCount = 2;

      if (startDate) {
        query += ` AND timestamp >= $${paramCount++}`;
        values.push(new Date(startDate as string));
      }
      if (endDate) {
        query += ` AND timestamp <= $${paramCount++}`;
        values.push(new Date(endDate as string));
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramCount++}`;
      values.push(parseInt(limit as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { locations: result.rows },
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

  // Get current vehicle status
  router.get('/:vehicleId/status', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const result = await pool.query(
        `SELECT latitude, longitude, speed, heading, engine_status, fuel_level, timestamp
         FROM telematics_data
         WHERE vehicle_id = $1
         ORDER BY timestamp DESC
         LIMIT 1`,
        [vehicleId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Vehicle telematics data');
      }

      res.json({
        success: true,
        data: { status: result.rows[0] },
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

  // Get risk events for vehicle
  router.get('/:vehicleId/risks', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const { severity, limit = 50 } = req.query;

      let query = `
        SELECT * FROM risk_events
        WHERE vehicle_id = $1
      `;
      const values: any[] = [vehicleId];
      let paramCount = 2;

      if (severity) {
        query += ` AND severity = $${paramCount++}`;
        values.push(severity);
      }

      query += ` ORDER BY detected_at DESC LIMIT $${paramCount++}`;
      values.push(parseInt(limit as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { risks: result.rows },
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

  // Get risk events for user
  router.get('/user/:userId/risks', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { severity, limit = 50 } = req.query;

      let query = `
        SELECT * FROM risk_events
        WHERE user_id = $1
      `;
      const values: any[] = [userId];
      let paramCount = 2;

      if (severity) {
        query += ` AND severity = $${paramCount++}`;
        values.push(severity);
      }

      query += ` ORDER BY detected_at DESC LIMIT $${paramCount++}`;
      values.push(parseInt(limit as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { risks: result.rows },
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

  // === Geo-fencing Routes ===

  // Get authorized zones for vehicle
  router.get('/:vehicleId/zones', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const result = await pool.query(
        `SELECT * FROM authorized_zones
         WHERE vehicle_id = $1
         ORDER BY created_at DESC`,
        [vehicleId]
      );

      res.json({
        success: true,
        data: { zones: result.rows },
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

  // Create authorized zone
  router.post('/:vehicleId/zones', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const { zoneName, zoneType, centerLatitude, centerLongitude, radiusMeters } = req.body;

      if (!zoneName || !zoneType || !centerLatitude || !centerLongitude || !radiusMeters) {
        throw new ValidationError('Missing required fields: zoneName, zoneType, centerLatitude, centerLongitude, radiusMeters');
      }

      if (!['allowed', 'restricted'].includes(zoneType)) {
        throw new ValidationError('zoneType must be "allowed" or "restricted"');
      }

      const result = await pool.query(
        `INSERT INTO authorized_zones 
         (vehicle_id, zone_name, zone_type, center_latitude, center_longitude, radius_meters)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [vehicleId, zoneName, zoneType, centerLatitude, centerLongitude, radiusMeters]
      );

      res.status(201).json({
        success: true,
        data: { zone: result.rows[0] },
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

  // Update authorized zone
  router.patch('/zones/:zoneId', async (req: Request, res: Response) => {
    try {
      const { zoneId } = req.params;
      const { zoneName, zoneType, centerLatitude, centerLongitude, radiusMeters, isActive } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (zoneName !== undefined) {
        updates.push(`zone_name = $${paramCount++}`);
        values.push(zoneName);
      }
      if (zoneType !== undefined) {
        if (!['allowed', 'restricted'].includes(zoneType)) {
          throw new ValidationError('zoneType must be "allowed" or "restricted"');
        }
        updates.push(`zone_type = $${paramCount++}`);
        values.push(zoneType);
      }
      if (centerLatitude !== undefined) {
        updates.push(`center_latitude = $${paramCount++}`);
        values.push(centerLatitude);
      }
      if (centerLongitude !== undefined) {
        updates.push(`center_longitude = $${paramCount++}`);
        values.push(centerLongitude);
      }
      if (radiusMeters !== undefined) {
        updates.push(`radius_meters = $${paramCount++}`);
        values.push(radiusMeters);
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(isActive);
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(zoneId);

      const result = await pool.query(
        `UPDATE authorized_zones
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Authorized zone');
      }

      res.json({
        success: true,
        data: { zone: result.rows[0] },
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

  // === Alerts Routes ===

  // Get alerts for vehicle
  router.get('/:vehicleId/alerts', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const { status, severity, limit = 50 } = req.query;

      let query = `
        SELECT * FROM alerts
        WHERE vehicle_id = $1
      `;
      const values: any[] = [vehicleId];
      let paramCount = 2;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        values.push(status);
      }
      if (severity) {
        query += ` AND severity = $${paramCount++}`;
        values.push(severity);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++}`;
      values.push(parseInt(limit as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { alerts: result.rows },
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

  // Get alerts for user
  router.get('/user/:userId/alerts', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status, severity, limit = 50 } = req.query;

      let query = `
        SELECT * FROM alerts
        WHERE user_id = $1
      `;
      const values: any[] = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        values.push(status);
      }
      if (severity) {
        query += ` AND severity = $${paramCount++}`;
        values.push(severity);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++}`;
      values.push(parseInt(limit as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { alerts: result.rows },
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

  // === Immobilization Routes ===

  // Get immobilization status for vehicle
  router.get('/:vehicleId/immobilization', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const result = await pool.query(
        `SELECT * FROM immobilization_status
         WHERE vehicle_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [vehicleId]
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: { status: null },
        });
      }

      res.json({
        success: true,
        data: { status: result.rows[0] },
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

  // Release vehicle immobilization (admin/support action)
  router.post('/:vehicleId/immobilization/release', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const { releasedBy, reason } = req.body;

      if (!releasedBy || !reason) {
        throw new ValidationError('Missing required fields: releasedBy, reason');
      }

      await releaseImmobilization(pool, vehicleId, releasedBy, reason);

      res.json({
        success: true,
        message: 'Vehicle immobilization released',
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

  // Get driving behavior summary
  router.get('/:vehicleId/behavior', async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const { userId, date, limit = 30 } = req.query;

      let query = `
        SELECT * FROM driving_behavior_summary
        WHERE vehicle_id = $1
      `;
      const values: any[] = [vehicleId];
      let paramCount = 2;

      if (userId) {
        query += ` AND user_id = $${paramCount++}`;
        values.push(userId);
      }
      if (date) {
        query += ` AND date = $${paramCount++}`;
        values.push(date);
      }

      query += ` ORDER BY date DESC LIMIT $${paramCount++}`;
      values.push(parseInt(limit as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { summaries: result.rows },
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


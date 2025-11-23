import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { validate, validators } from '../middleware/validation';
import { VehicleValidator } from '../../../../lib/external-apis/vehicle-validator';

export function vehicleRoutes(pool: Pool, messageQueue: MessageQueueClient): Router {
  const router = Router();

  // List vehicles with enhanced filters
  router.get(
    '/',
    validate({
      query: {
        vehicleType: (v) => v === undefined || validators.enum(['motorcycle', 'car', 'van', 'truck'])(v),
        categoryId: (v) => v === undefined || validators.uuid(v),
        eligibilityTier: (v) => v === undefined || validators.enum(['basic', 'standard', 'premium', 'luxury'])(v),
        minPrice: (v) => v === undefined || validators.positiveNumber(v),
        maxPrice: (v) => v === undefined || validators.positiveNumber(v),
        minDeposit: (v) => v === undefined || validators.positiveNumber(v),
        maxDeposit: (v) => v === undefined || validators.positiveNumber(v),
        status: (v) => v === undefined || validators.enum(['available', 'reserved', 'rented', 'sold', 'maintenance'])(v),
        limit: (v) => v === undefined || (validators.integer(v) && parseInt(v) > 0 && parseInt(v) <= 100),
        offset: (v) => v === undefined || (validators.integer(v) && parseInt(v) >= 0),
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const {
          vehicleType,
          categoryId,
          eligibilityTier,
          make,
          model,
          minPrice,
          maxPrice,
          minDeposit,
          maxDeposit,
          status,
          search,
          limit = 50,
          offset = 0,
        } = req.query;

        let query = `
          SELECT 
            v.id, v.make, v.model, v.year, v.vehicle_type, v.color, v.mileage,
            v.price, v.deposit_amount, v.weekly_payment, v.monthly_payment,
            v.payment_frequency, v.payment_term_months, v.eligibility_tier,
            v.status, v.description, v.images, v.specifications, v.created_at,
            c.id as category_id, c.name as category_name
          FROM vehicles v
          LEFT JOIN vehicle_categories c ON v.category_id = c.id
          WHERE 1=1
        `;
        const values: any[] = [];
        let paramCount = 1;

        if (vehicleType) {
          query += ` AND v.vehicle_type = $${paramCount++}`;
          values.push(vehicleType);
        }

        if (categoryId) {
          query += ` AND v.category_id = $${paramCount++}`;
          values.push(categoryId);
        }

        if (eligibilityTier) {
          query += ` AND v.eligibility_tier = $${paramCount++}`;
          values.push(eligibilityTier);
        }

        if (make) {
          query += ` AND v.make ILIKE $${paramCount++}`;
          values.push(`%${make}%`);
        }

        if (model) {
          query += ` AND v.model ILIKE $${paramCount++}`;
          values.push(`%${model}%`);
        }

        if (search) {
          query += ` AND (
            v.make ILIKE $${paramCount} OR
            v.model ILIKE $${paramCount} OR
            v.description ILIKE $${paramCount}
          )`;
          values.push(`%${search}%`);
          paramCount++;
        }

        if (minPrice) {
          query += ` AND v.price >= $${paramCount++}`;
          values.push(parseFloat(minPrice as string));
        }

        if (maxPrice) {
          query += ` AND v.price <= $${paramCount++}`;
          values.push(parseFloat(maxPrice as string));
        }

        if (minDeposit) {
          query += ` AND v.deposit_amount >= $${paramCount++}`;
          values.push(parseFloat(minDeposit as string));
        }

        if (maxDeposit) {
          query += ` AND v.deposit_amount <= $${paramCount++}`;
          values.push(parseFloat(maxDeposit as string));
        }

        if (status) {
          query += ` AND v.status = $${paramCount++}`;
          values.push(status);
        } else {
          // Default to available if no status specified
          query += ` AND v.status = 'available'`;
        }

        // Get total count for pagination
        const countQuery = query.replace(
          /SELECT[\s\S]*?FROM/,
          'SELECT COUNT(*) as total FROM'
        );
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);

        query += ` ORDER BY v.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        values.push(parseInt(limit as string), parseInt(offset as string));

        const result = await pool.query(query, values);

        res.json({
          success: true,
          data: {
            vehicles: result.rows,
            pagination: {
              limit: parseInt(limit as string),
              offset: parseInt(offset as string),
              count: result.rows.length,
              total,
            },
          },
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
    }
  );

  // Get vehicle by ID with full details
  router.get(
    '/:id',
    validate({
      params: {
        id: validators.uuid,
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const result = await pool.query(
          `SELECT 
            v.id, v.make, v.model, v.year, v.vehicle_type, v.vin, v.registration_number,
            v.color, v.mileage, v.price, v.deposit_amount, v.weekly_payment,
            v.monthly_payment, v.payment_frequency, v.payment_term_months,
            v.eligibility_tier, v.status, v.description, v.images, v.specifications,
            v.created_at, v.updated_at,
            c.id as category_id, c.name as category_name, c.description as category_description
           FROM vehicles v
           LEFT JOIN vehicle_categories c ON v.category_id = c.id
           WHERE v.id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new NotFoundError('Vehicle');
        }

        // Check for active reservations
        const reservations = await pool.query(
          `SELECT id, user_id, status, reserved_until, expires_at, created_at
           FROM vehicle_reservations
           WHERE vehicle_id = $1 AND status IN ('pending', 'approved')
           ORDER BY created_at DESC`,
          [id]
        );

        res.json({
          success: true,
          data: {
            vehicle: result.rows[0],
            activeReservations: reservations.rows,
          },
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
    }
  );

  // Create vehicle (admin/agent)
  router.post(
    '/',
    validate({
      body: {
        make: (v) => validators.required(v) && validators.string(1, 255)(v),
        model: (v) => validators.required(v) && validators.string(1, 255)(v),
        year: (v) => validators.required(v) && validators.year(v),
        vehicleType: (v) => validators.required(v) && validators.enum(['motorcycle', 'car', 'van', 'truck'])(v),
        price: (v) => validators.required(v) && validators.positiveNumber(v),
        depositAmount: (v) => validators.required(v) && validators.positiveNumber(v),
        categoryId: (v) => v === undefined || validators.uuid(v),
        eligibilityTier: (v) => v === undefined || validators.enum(['basic', 'standard', 'premium', 'luxury'])(v),
        paymentFrequency: (v) => v === undefined || validators.enum(['weekly', 'monthly'])(v),
        paymentTermMonths: (v) => v === undefined || validators.positiveNumber(v),
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const {
          make,
          model,
          year,
          vehicleType,
          categoryId,
          vin,
          registrationNumber,
          color,
          mileage = 0,
          price,
          depositAmount,
          weeklyPayment,
          monthlyPayment,
          paymentFrequency,
          paymentTermMonths,
          eligibilityTier,
          description,
          images = [],
        } = req.body;

        // Validate VIN and populate specs if provided
        let vehicleSpecs = specifications;
        let validatedMake = make;
        let validatedModel = model;
        let validatedYear = year;
        let validatedType = vehicleType;

        if (vin) {
          try {
            const nhtsaData = await VehicleValidator.decodeVIN(vin);

            if (!VehicleValidator.isValidVIN(nhtsaData)) {
              throw new ValidationError('Invalid VIN: Unable to decode vehicle details');
            }

            const extractedSpecs = VehicleValidator.extractVehicleSpecs(nhtsaData);

            // Auto-populate fields if they match
            if (extractedSpecs.make) validatedMake = extractedSpecs.make;
            if (extractedSpecs.model) validatedModel = extractedSpecs.model;
            if (extractedSpecs.year) validatedYear = parseInt(extractedSpecs.year);

            // Merge specs
            vehicleSpecs = {
              ...vehicleSpecs,
              ...extractedSpecs,
              nhtsaData: nhtsaData.Results
            };
          } catch (error: any) {
            console.error('VIN Validation Error:', error.message);
            // We don't block creation on API failure, but we warn
            if (error instanceof ValidationError) throw error;
          }
        }

        // Validate deposit doesn't exceed price
        if (parseFloat(depositAmount) > parseFloat(price)) {
          throw new ValidationError('Deposit amount cannot exceed vehicle price');
        }

        // Validate category exists if provided
        if (categoryId) {
          const categoryCheck = await pool.query(
            'SELECT id FROM vehicle_categories WHERE id = $1',
            [categoryId]
          );
          if (categoryCheck.rows.length === 0) {
            throw new NotFoundError('Category');
          }
        }

        // Validate VIN uniqueness if provided
        if (vin) {
          const vinCheck = await pool.query('SELECT id FROM vehicles WHERE vin = $1', [vin]);
          if (vinCheck.rows.length > 0) {
            throw new ValidationError('Vehicle with this VIN already exists');
          }
        }

        // Validate registration number uniqueness if provided
        if (registrationNumber) {
          const regCheck = await pool.query(
            'SELECT id FROM vehicles WHERE registration_number = $1',
            [registrationNumber]
          );
          if (regCheck.rows.length > 0) {
            throw new ValidationError('Vehicle with this registration number already exists');
          }
        }

        const result = await pool.query(
          `INSERT INTO vehicles (
            make, model, year, vehicle_type, category_id, vin, registration_number,
            color, mileage, price, deposit_amount, weekly_payment, monthly_payment,
            payment_frequency, payment_term_months, eligibility_tier, description,
            images, specifications, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'available'
          )
          RETURNING *`,
          [
            validatedMake,
            validatedModel,
            parseInt(validatedYear),
            vehicleType,
            categoryId || null,
            vin || null,
            registrationNumber || null,
            color || null,
            parseInt(mileage),
            parseFloat(price),
            parseFloat(depositAmount),
            weeklyPayment ? parseFloat(weeklyPayment) : null,
            monthlyPayment ? parseFloat(monthlyPayment) : null,
            paymentFrequency || null,
            paymentTermMonths ? parseInt(paymentTermMonths) : null,
            eligibilityTier || null,
            description || null,
            images,
            JSON.stringify(vehicleSpecs),
          ]
        );

        const vehicle = result.rows[0];

        // Publish vehicle created event
        await messageQueue.publish('vehicle.events', 'vehicle.created', {
          type: 'vehicle.created',
          payload: {
            vehicleId: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            price: vehicle.price,
            categoryId: vehicle.category_id,
          },
          timestamp: Date.now(),
        });

        res.status(201).json({
          success: true,
          data: { vehicle },
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
    }
  );

  // Update vehicle (admin/agent)
  router.put(
    '/:id',
    validate({
      params: {
        id: validators.uuid,
      },
      body: {
        make: (v) => v === undefined || validators.string(1, 255)(v),
        model: (v) => v === undefined || validators.string(1, 255)(v),
        year: (v) => v === undefined || validators.year(v),
        categoryId: (v) => v === undefined || validators.uuid(v),
        eligibilityTier: (v) => v === undefined || validators.enum(['basic', 'standard', 'premium', 'luxury'])(v),
        paymentFrequency: (v) => v === undefined || validators.enum(['weekly', 'monthly'])(v),
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        // Check if vehicle exists
        const existing = await pool.query('SELECT id, status FROM vehicles WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          throw new NotFoundError('Vehicle');
        }

        const allowedFields = [
          'make',
          'model',
          'year',
          'category_id',
          'color',
          'mileage',
          'price',
          'deposit_amount',
          'weekly_payment',
          'monthly_payment',
          'payment_frequency',
          'payment_term_months',
          'eligibility_tier',
          'description',
          'images',
          'specifications',
          'status',
        ];

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
          const dbKey = key === 'categoryId' ? 'category_id' : key;
          if (allowedFields.includes(dbKey)) {
            if (dbKey === 'specifications' && typeof value === 'object') {
              updateFields.push(`${dbKey} = $${paramCount++}`);
              values.push(JSON.stringify(value));
            } else if (dbKey === 'year' || dbKey === 'mileage' || dbKey === 'payment_term_months') {
              updateFields.push(`${dbKey} = $${paramCount++}`);
              values.push(parseInt(value as string));
            } else if (
              dbKey === 'price' ||
              dbKey === 'deposit_amount' ||
              dbKey === 'weekly_payment' ||
              dbKey === 'monthly_payment'
            ) {
              updateFields.push(`${dbKey} = $${paramCount++}`);
              values.push(parseFloat(value as string));
            } else {
              updateFields.push(`${dbKey} = $${paramCount++}`);
              values.push(value);
            }
          }
        }

        if (updateFields.length === 0) {
          throw new ValidationError('No valid fields to update');
        }

        // Validate category if being updated
        if (updates.categoryId) {
          const categoryCheck = await pool.query(
            'SELECT id FROM vehicle_categories WHERE id = $1',
            [updates.categoryId]
          );
          if (categoryCheck.rows.length === 0) {
            throw new NotFoundError('Category');
          }
        }

        // Validate deposit doesn't exceed price if both are being updated
        if (updates.depositAmount && updates.price) {
          if (parseFloat(updates.depositAmount) > parseFloat(updates.price)) {
            throw new ValidationError('Deposit amount cannot exceed vehicle price');
          }
        } else if (updates.depositAmount) {
          const currentPrice = await pool.query('SELECT price FROM vehicles WHERE id = $1', [id]);
          if (parseFloat(updates.depositAmount) > parseFloat(currentPrice.rows[0].price)) {
            throw new ValidationError('Deposit amount cannot exceed vehicle price');
          }
        } else if (updates.price) {
          const currentDeposit = await pool.query('SELECT deposit_amount FROM vehicles WHERE id = $1', [id]);
          if (parseFloat(currentDeposit.rows[0].deposit_amount) > parseFloat(updates.price)) {
            throw new ValidationError('Deposit amount cannot exceed vehicle price');
          }
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
          `UPDATE vehicles SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
          values
        );

        const vehicle = result.rows[0];

        // Publish vehicle updated event
        await messageQueue.publish('vehicle.events', 'vehicle.updated', {
          type: 'vehicle.updated',
          payload: {
            vehicleId: vehicle.id,
            changes: Object.keys(updates),
          },
          timestamp: Date.now(),
        });

        res.json({
          success: true,
          data: { vehicle },
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
    }
  );

  // Delete vehicle (admin only)
  router.delete(
    '/:id',
    validate({
      params: {
        id: validators.uuid,
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Check if vehicle exists
        const existing = await pool.query('SELECT id, make, model FROM vehicles WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          throw new NotFoundError('Vehicle');
        }

        // Check if vehicle has active reservations
        const activeReservations = await pool.query(
          `SELECT COUNT(*) as count
           FROM vehicle_reservations
           WHERE vehicle_id = $1 AND status IN ('pending', 'approved')`,
          [id]
        );

        if (parseInt(activeReservations.rows[0].count) > 0) {
          throw new ValidationError(
            'Cannot delete vehicle with active reservations. Cancel or complete reservations first.'
          );
        }

        // Check if vehicle is currently rented
        if (existing.rows[0].status === 'rented') {
          throw new ValidationError('Cannot delete vehicle that is currently rented');
        }

        await pool.query('DELETE FROM vehicles WHERE id = $1', [id]);

        // Publish vehicle deleted event
        await messageQueue.publish('vehicle.events', 'vehicle.deleted', {
          type: 'vehicle.deleted',
          payload: {
            vehicleId: id,
            make: existing.rows[0].make,
            model: existing.rows[0].model,
          },
          timestamp: Date.now(),
        });

        res.json({
          success: true,
          message: 'Vehicle deleted successfully',
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
    }
  );

  // Reserve vehicle with expiry
  router.post(
    '/:id/reserve',
    validate({
      params: {
        id: validators.uuid,
      },
      body: {
        userId: (v) => validators.required(v) && validators.uuid(v),
        reservedUntil: (v) => v === undefined || validators.futureDate(v),
        expiryHours: (v) => v === undefined || validators.positiveNumber(v),
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { userId, reservedUntil, expiryHours = 24 } = req.body;

        // Check if vehicle exists and is available
        const vehicleCheck = await pool.query(
          'SELECT id, status FROM vehicles WHERE id = $1',
          [id]
        );
        if (vehicleCheck.rows.length === 0) {
          throw new NotFoundError('Vehicle');
        }

        if (vehicleCheck.rows[0].status !== 'available') {
          throw new ValidationError('Vehicle is not available for reservation');
        }

        // Check for existing active reservations
        const existingReservation = await pool.query(
          `SELECT id FROM vehicle_reservations
           WHERE vehicle_id = $1 AND status IN ('pending', 'approved')
           AND expires_at > CURRENT_TIMESTAMP`,
          [id]
        );

        if (existingReservation.rows.length > 0) {
          throw new ValidationError('Vehicle already has an active reservation');
        }

        // Calculate expiry time
        const now = new Date();
        const reservedUntilDate = reservedUntil ? new Date(reservedUntil) : null;
        const expiresAt = new Date(now.getTime() + parseInt(expiryHours) * 60 * 60 * 1000);

        // Create reservation
        const reservationResult = await pool.query(
          `INSERT INTO vehicle_reservations (vehicle_id, user_id, status, reserved_until, expires_at)
           VALUES ($1, $2, 'pending', $3, $4)
           RETURNING id, vehicle_id, user_id, status, reserved_until, expires_at, created_at`,
          [id, userId, reservedUntilDate, expiresAt]
        );

        // Update vehicle status
        await pool.query(
          "UPDATE vehicles SET status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [id]
        );

        const reservation = reservationResult.rows[0];

        // Publish reservation created event
        await messageQueue.publish('vehicle.events', 'vehicle.reserved', {
          type: 'vehicle.reserved',
          payload: {
            reservationId: reservation.id,
            vehicleId: reservation.vehicle_id,
            userId: reservation.user_id,
            expiresAt: reservation.expires_at,
          },
          timestamp: Date.now(),
        });

        res.status(201).json({
          success: true,
          data: { reservation },
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
    }
  );

  // Cancel reservation
  router.post(
    '/:id/reservations/:reservationId/cancel',
    validate({
      params: {
        id: validators.uuid,
        reservationId: validators.uuid,
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { id, reservationId } = req.params;

        // Check reservation exists and belongs to vehicle
        const reservation = await pool.query(
          `SELECT id, status FROM vehicle_reservations
           WHERE id = $1 AND vehicle_id = $2`,
          [reservationId, id]
        );

        if (reservation.rows.length === 0) {
          throw new NotFoundError('Reservation');
        }

        if (!['pending', 'approved'].includes(reservation.rows[0].status)) {
          throw new ValidationError('Only pending or approved reservations can be cancelled');
        }

        // Update reservation status
        await pool.query(
          `UPDATE vehicle_reservations
           SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [reservationId]
        );

        // Check if vehicle should be made available
        const activeReservations = await pool.query(
          `SELECT COUNT(*) as count
           FROM vehicle_reservations
           WHERE vehicle_id = $1
             AND status IN ('pending', 'approved')
             AND expires_at > CURRENT_TIMESTAMP`,
          [id]
        );

        if (parseInt(activeReservations.rows[0].count) === 0) {
          await pool.query(
            `UPDATE vehicles
             SET status = 'available', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'reserved'`,
            [id]
          );
        }

        res.json({
          success: true,
          message: 'Reservation cancelled successfully',
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
    }
  );

  // Get vehicle reservations
  router.get(
    '/:id/reservations',
    validate({
      params: {
        id: validators.uuid,
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { status } = req.query;

        let query = `
          SELECT id, vehicle_id, user_id, status, reserved_until, expires_at, created_at, updated_at
          FROM vehicle_reservations
          WHERE vehicle_id = $1
        `;
        const values: any[] = [id];
        let paramCount = 2;

        if (status) {
          query += ` AND status = $${paramCount++}`;
          values.push(status);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, values);

        res.json({
          success: true,
          data: { reservations: result.rows },
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
    }
  );

  return router;
}

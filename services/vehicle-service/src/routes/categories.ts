import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { validate, validators } from '../middleware/validation';

export function categoryRoutes(pool: Pool, messageQueue: MessageQueueClient): Router {
  const router = Router();

  // List all categories
  router.get('/', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, name, description, created_at, updated_at
         FROM vehicle_categories
         ORDER BY name ASC`
      );

      res.json({
        success: true,
        data: { categories: result.rows },
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

  // Get category by ID
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
          `SELECT id, name, description, created_at, updated_at
           FROM vehicle_categories
           WHERE id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new NotFoundError('Category');
        }

        res.json({
          success: true,
          data: { category: result.rows[0] },
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

  // Create category (admin only)
  router.post(
    '/',
    validate({
      body: {
        name: (v) => validators.required(v) && validators.string(1, 100)(v),
        description: (v) => v === undefined || validators.string(0, 1000)(v),
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { name, description } = req.body;

        // Check if category with same name already exists
        const existing = await pool.query(
          'SELECT id FROM vehicle_categories WHERE name = $1',
          [name]
        );

        if (existing.rows.length > 0) {
          throw new ValidationError('Category with this name already exists');
        }

        const result = await pool.query(
          `INSERT INTO vehicle_categories (name, description)
           VALUES ($1, $2)
           RETURNING id, name, description, created_at, updated_at`,
          [name, description || null]
        );

        const category = result.rows[0];

        // Publish category created event
        await messageQueue.publish('vehicle.events', 'category.created', {
          type: 'category.created',
          payload: {
            categoryId: category.id,
            name: category.name,
          },
          timestamp: Date.now(),
        });

        res.status(201).json({
          success: true,
          data: { category },
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

  // Update category (admin only)
  router.put(
    '/:id',
    validate({
      params: {
        id: validators.uuid,
      },
      body: {
        name: (v) => v === undefined || validators.string(1, 100)(v),
        description: (v) => v === undefined || validators.string(0, 1000)(v),
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { name, description } = req.body;

        // Check if category exists
        const existing = await pool.query(
          'SELECT id FROM vehicle_categories WHERE id = $1',
          [id]
        );

        if (existing.rows.length === 0) {
          throw new NotFoundError('Category');
        }

        // Check if new name conflicts with existing category
        if (name) {
          const nameConflict = await pool.query(
            'SELECT id FROM vehicle_categories WHERE name = $1 AND id != $2',
            [name, id]
          );

          if (nameConflict.rows.length > 0) {
            throw new ValidationError('Category with this name already exists');
          }
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (name !== undefined) {
          updateFields.push(`name = $${paramCount++}`);
          values.push(name);
        }

        if (description !== undefined) {
          updateFields.push(`description = $${paramCount++}`);
          values.push(description);
        }

        if (updateFields.length === 0) {
          throw new ValidationError('No fields to update');
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
          `UPDATE vehicle_categories
           SET ${updateFields.join(', ')}
           WHERE id = $${paramCount}
           RETURNING id, name, description, created_at, updated_at`,
          values
        );

        const category = result.rows[0];

        // Publish category updated event
        await messageQueue.publish('vehicle.events', 'category.updated', {
          type: 'category.updated',
          payload: {
            categoryId: category.id,
            name: category.name,
          },
          timestamp: Date.now(),
        });

        res.json({
          success: true,
          data: { category },
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

  // Delete category (admin only)
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

        // Check if category exists
        const existing = await pool.query(
          'SELECT id, name FROM vehicle_categories WHERE id = $1',
          [id]
        );

        if (existing.rows.length === 0) {
          throw new NotFoundError('Category');
        }

        // Check if category is being used by any vehicles
        const vehiclesUsingCategory = await pool.query(
          'SELECT COUNT(*) as count FROM vehicles WHERE category_id = $1',
          [id]
        );

        if (parseInt(vehiclesUsingCategory.rows[0].count) > 0) {
          throw new ValidationError(
            'Cannot delete category that is assigned to vehicles. Remove vehicles from this category first.'
          );
        }

        await pool.query('DELETE FROM vehicle_categories WHERE id = $1', [id]);

        // Publish category deleted event
        await messageQueue.publish('vehicle.events', 'category.deleted', {
          type: 'category.deleted',
          payload: {
            categoryId: id,
            name: existing.rows[0].name,
          },
          timestamp: Date.now(),
        });

        res.json({
          success: true,
          message: 'Category deleted successfully',
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


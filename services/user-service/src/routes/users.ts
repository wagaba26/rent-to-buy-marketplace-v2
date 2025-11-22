import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EncryptionService } from '@rent-to-own/encryption';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError, ForbiddenError } from '@rent-to-own/errors';
import { CreditServiceClient } from '../services/creditServiceClient';
import { checkPermission, AuthenticatedRequest, checkOwnershipOrAdmin } from '../middleware/permissions';

export function userRoutes(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient,
  creditServiceClient?: CreditServiceClient
): Router {
  const router = Router();

  // Get user profile
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT id, email, role, first_name, last_name, phone_number, status, created_at
         FROM users WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }

      const user = result.rows[0];
      res.json({
        success: true,
        data: { user },
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

  // Update user profile
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, phoneNumber } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (firstName !== undefined) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(firstName);
      }
      if (lastName !== undefined) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(lastName);
      }
      if (phoneNumber !== undefined) {
        updates.push(`phone_number = $${paramCount++}, encrypted_phone = $${paramCount++}`);
        values.push(phoneNumber, encryptionService.encrypt(phoneNumber));
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, first_name, last_name, phone_number, status`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: { user: result.rows[0] },
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

  // Get eligibility tier for user
  router.get('/:id/eligibility-tier', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const authenticatedUserId = req.user?.userId;

      // Check permission: users can view their own tier, agents/admins can view any
      if (authenticatedUserId && id !== authenticatedUserId) {
        const permissionCheck = await pool.query(
          `SELECT 1 FROM role_permissions rp
           JOIN users u ON rp.role = u.role
           WHERE u.id = $1 AND (rp.permission = 'view_customer_profile' OR rp.permission = 'view_all_profiles')
           UNION
           SELECT 1 FROM user_permissions up
           WHERE up.user_id = $1 AND (up.permission = 'view_customer_profile' OR up.permission = 'view_all_profiles')`,
          [authenticatedUserId]
        );

        if (permissionCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: { message: 'Permission denied', code: 'FORBIDDEN' },
          });
        }
      }

      // Get user eligibility tier from database
      const userResult = await pool.query(
        'SELECT id, eligibility_tier, credit_score_id FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundError('User');
      }

      const user = userResult.rows[0];

      // If user has credit score ID, fetch detailed tier information from credit service
      if (creditServiceClient && user.credit_score_id) {
        try {
          const eligibilityTier = await creditServiceClient.getEligibilityTier(user.credit_score_id);

          if (eligibilityTier) {
            return res.json({
              success: true,
              data: {
                userId: id,
                eligibilityTier: eligibilityTier.tier,
                creditScore: eligibilityTier.score,
                tierConfiguration: eligibilityTier.tierConfiguration,
                maximumVehicleValue: eligibilityTier.maximumVehicleValue,
                requiredDepositPercentage: eligibilityTier.requiredDepositPercentage,
                lastUpdated: eligibilityTier.lastUpdated,
              },
            });
          }
        } catch (creditError: any) {
          console.error('Failed to fetch eligibility tier from credit service:', creditError.message);
          // Fall through to return basic tier from database
        }
      }

      // Return basic tier information from database
      res.json({
        success: true,
        data: {
          userId: id,
          eligibilityTier: user.eligibility_tier || null,
          creditScoreId: user.credit_score_id || null,
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
  });

  // Get user permissions
  router.get('/:id/permissions', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const authenticatedUserId = req.user?.userId;

      // Users can view their own permissions, admins can view any
      if (authenticatedUserId && id !== authenticatedUserId) {
        const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [
          authenticatedUserId,
        ]);

        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
          return res.status(403).json({
            success: false,
            error: { message: 'Permission denied', code: 'FORBIDDEN' },
          });
        }
      }

      // Get user role and permissions
      const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);

      if (userResult.rows.length === 0) {
        throw new NotFoundError('User');
      }

      const user = userResult.rows[0];

      // Get role-based permissions
      const rolePermissionsResult = await pool.query(
        'SELECT permission FROM role_permissions WHERE role = $1',
        [user.role]
      );

      // Get user-specific permissions
      const userPermissionsResult = await pool.query(
        'SELECT permission FROM user_permissions WHERE user_id = $1',
        [id]
      );

      const permissions = [
        ...rolePermissionsResult.rows.map((r) => r.permission),
        ...userPermissionsResult.rows.map((r) => r.permission),
      ];

      res.json({
        success: true,
        data: {
          userId: id,
          role: user.role,
          permissions: [...new Set(permissions)], // Remove duplicates
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
  });

  // Grant permission to user (admin only)
  router.post(
    '/:id/permissions',
    (req, res, next) => checkPermission('manage_permissions', pool)(req, res, next),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { permission, grantedBy } = req.body;
        const grantedById = req.user?.userId || grantedBy;

        if (!permission) {
          throw new ValidationError('Permission is required');
        }

        // Verify user exists
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
          throw new NotFoundError('User');
        }

        // Grant permission
        await pool.query(
          `INSERT INTO user_permissions (user_id, permission, granted_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, permission) DO UPDATE SET granted_by = $3`,
          [id, permission, grantedById]
        );

        res.status(201).json({
          success: true,
          message: 'Permission granted successfully',
          data: { userId: id, permission },
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

  // Revoke permission from user (admin only)
  router.delete(
    '/:id/permissions/:permission',
    (req, res, next) => checkPermission('manage_permissions', pool)(req, res, next),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id, permission } = req.params;

        // Revoke permission
        const result = await pool.query(
          'DELETE FROM user_permissions WHERE user_id = $1 AND permission = $2 RETURNING id',
          [id, permission]
        );

        if (result.rows.length === 0) {
          throw new NotFoundError('Permission');
        }

        res.json({
          success: true,
          message: 'Permission revoked successfully',
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

  // List users (with permission check)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { role, status, limit = 50, offset = 0 } = req.query;
      const authenticatedUserId = req.user?.userId;

      // Check permission: agents and admins can list users
      if (authenticatedUserId) {
        const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [
          authenticatedUserId,
        ]);

        if (userResult.rows.length > 0) {
          const userRole = userResult.rows[0].role;
          if (userRole !== 'admin' && userRole !== 'agent') {
            return res.status(403).json({
              success: false,
              error: { message: 'Permission denied', code: 'FORBIDDEN' },
            });
          }
        }
      }

      let query = 'SELECT id, email, role, first_name, last_name, status, eligibility_tier, created_at FROM users WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;

      if (role) {
        query += ` AND role = $${paramCount++}`;
        values.push(role);
      }
      if (status) {
        query += ` AND status = $${paramCount++}`;
        values.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      values.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: {
          users: result.rows,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            count: result.rows.length,
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
  });

  return router;
}


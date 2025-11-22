import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { UnauthorizedError, ForbiddenError } from '@rent-to-own/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Check if user has a specific permission
 */
export function checkPermission(permission: string, pool: Pool) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check if user has the permission via role or direct assignment
      const permissionResult = await pool.query(
        `SELECT 1
         FROM role_permissions rp
         WHERE rp.role = $1 AND rp.permission = $2
         UNION
         SELECT 1
         FROM user_permissions up
         WHERE up.user_id = $3 AND up.permission = $2`,
        [user.role, permission, user.userId]
      );

      if (permissionResult.rows.length === 0) {
        throw new ForbiddenError(`Permission denied: ${permission} required`);
      }

      next();
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  };
}

/**
 * Check if user has any of the specified permissions
 */
export function checkAnyPermission(pool: Pool, ...permissions: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Build query to check if user has any of the permissions
      const permissionPlaceholders = permissions.map((_, index) => `$${index + 3}`).join(',');
      const query = `
        SELECT 1
        FROM role_permissions rp
        WHERE rp.role = $1 AND rp.permission IN (${permissionPlaceholders})
        UNION
        SELECT 1
        FROM user_permissions up
        WHERE up.user_id = $2 AND up.permission IN (${permissionPlaceholders})
        LIMIT 1
      `;

      const permissionResult = await pool.query(query, [user.role, user.userId, ...permissions]);

      if (permissionResult.rows.length === 0) {
        throw new ForbiddenError(`Permission denied: one of [${permissions.join(', ')}] required`);
      }

      next();
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  };
}

/**
 * Check if user has a specific role
 */
export function checkRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!roles.includes(user.role)) {
        throw new ForbiddenError(`Access denied: ${roles.join(' or ')} role required`);
      }

      next();
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  };
}

/**
 * Check if user owns the resource or has admin permission
 */
export function checkOwnershipOrAdmin(resourceUserIdField: string = 'userId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Admin can access any resource
      if (user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

      if (resourceUserId && resourceUserId === user.userId) {
        return next();
      }

      throw new ForbiddenError('Access denied: you can only access your own resources');
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  };
}


import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Extract user information from headers (set by API gateway) or JWT token
 */
export function extractUserInfo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Try to get user info from headers (set by API gateway)
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (userId && userEmail && userRole) {
    req.user = {
      userId,
      email: userEmail,
      role: userRole,
    };
    return next();
  }

  // Fallback to JWT token verification (for direct service calls)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // No authentication required for public routes
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    // Invalid token, but continue (let route handlers decide if auth is required)
    return next();
  }
}

/**
 * Require authentication - returns 401 if user is not authenticated
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
    });
  }
  next();
}


import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  retailerId?: string; // For retailer users
}

export interface TokenPayload extends AuthUser {
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  // Try to get from headers (for API routes)
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');
  const retailerId = request.headers.get('x-retailer-id');

  if (userId && email && role) {
    return {
      userId,
      email,
      role,
      retailerId: retailerId || undefined
    };
  }

  // Try JWT token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Only accept access tokens for authentication
    if (decoded.type !== 'access') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      retailerId: decoded.retailerId,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate access token (short-lived, 15 minutes)
 */
export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
      retailerId: user.retailerId,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token (long-lived, 7 days)
 */
export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
      retailerId: user.retailerId,
      type: 'refresh',
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateAccessToken instead
 */
export function generateToken(user: AuthUser): string {
  return generateAccessToken(user);
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (decoded.type !== 'access') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      retailerId: decoded.retailerId,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as TokenPayload;

    if (decoded.type !== 'refresh') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      retailerId: decoded.retailerId,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken instead
 */
export function verifyToken(token: string): AuthUser | null {
  return verifyAccessToken(token);
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(
  token: string,
  userId: string,
  deviceInfo?: any,
  ipAddress?: string
): Promise<void> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at, device_info, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [token, userId, expiresAt, JSON.stringify(deviceInfo || {}), ipAddress]
  );
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const db = getDb();

  await db.query(
    `UPDATE refresh_tokens 
     SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP 
     WHERE token = $1`,
    [token]
  );
}

/**
 * Check if refresh token is revoked
 */
export async function isRefreshTokenRevoked(token: string): Promise<boolean> {
  const db = getDb();

  const result = await db.query(
    `SELECT revoked FROM refresh_tokens WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return true; // Token not found, consider it revoked
  }

  return result.rows[0].revoked;
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const db = getDb();

  await db.query(
    `UPDATE refresh_tokens 
     SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP 
     WHERE user_id = $1 AND revoked = FALSE`,
    [userId]
  );
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const db = getDb();

  await db.query(
    `DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP`
  );
}


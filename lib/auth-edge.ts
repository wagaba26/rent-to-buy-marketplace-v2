import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
    userId: string;
    email: string;
    role: string;
    retailerId?: string;
}

export interface TokenPayload extends AuthUser {
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

/**
 * Edge-compatible auth user getter (no database dependencies)
 * Use this in middleware and edge functions
 */
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

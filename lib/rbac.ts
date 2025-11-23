import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, AuthUser } from './auth';
import { getDb } from './db';

/**
 * RBAC Middleware Factory
 * Provides role-based access control and ownership validation
 */

/**
 * Require specific role(s) to access endpoint
 */
export function requireRole(...allowedRoles: string[]) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
        const user = getAuthUser(request);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Insufficient permissions',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        return null; // Access granted
    };
}

/**
 * Require ownership of a resource
 */
export async function requireOwnership(
    resourceType: 'vehicle' | 'application' | 'retailer',
    resourceId: string,
    user: AuthUser
): Promise<boolean> {
    const db = getDb();

    try {
        switch (resourceType) {
            case 'vehicle': {
                // Check if vehicle belongs to retailer
                if (user.role !== 'retailer' || !user.retailerId) {
                    return false;
                }

                const result = await db.query(
                    `SELECT retailer_id FROM vehicles WHERE id = $1`,
                    [resourceId]
                );

                if (result.rows.length === 0) {
                    return false;
                }

                return result.rows[0].retailer_id === user.retailerId;
            }

            case 'application': {
                // Check if application belongs to customer
                if (user.role === 'customer') {
                    const result = await db.query(
                        `SELECT customer_id FROM credit_applications WHERE id = $1`,
                        [resourceId]
                    );

                    if (result.rows.length === 0) {
                        return false;
                    }

                    return result.rows[0].customer_id === user.userId;
                }

                // Check if application is for retailer's vehicle
                if (user.role === 'retailer' && user.retailerId) {
                    const result = await db.query(
                        `SELECT ca.id 
             FROM credit_applications ca
             JOIN vehicles v ON v.id = ca.vehicle_id
             WHERE ca.id = $1 AND v.retailer_id = $2`,
                        [resourceId, user.retailerId]
                    );

                    return result.rows.length > 0;
                }

                return false;
            }

            case 'retailer': {
                // Check if retailer profile belongs to user
                if (user.role !== 'retailer' || !user.retailerId) {
                    return false;
                }

                return user.retailerId === resourceId;
            }

            default:
                return false;
        }
    } catch (error) {
        console.error('Ownership check error:', error);
        return false;
    }
}

/**
 * Check if user has specific permission
 */
export async function checkPermission(
    user: AuthUser,
    permission: string
): Promise<boolean> {
    const db = getDb();

    try {
        // Check role-based permissions
        const roleResult = await db.query(
            `SELECT 1 FROM role_permissions WHERE role = $1 AND permission = $2`,
            [user.role, permission]
        );

        if (roleResult.rows.length > 0) {
            return true;
        }

        // Check user-specific permissions
        const userResult = await db.query(
            `SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission = $2`,
            [user.userId, permission]
        );

        return userResult.rows.length > 0;
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
}

/**
 * Middleware to check permission
 */
export function requirePermission(permission: string) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
        const user = getAuthUser(request);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        const hasPermission = await checkPermission(user, permission);

        if (!hasPermission) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Insufficient permissions',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        return null; // Access granted
    };
}

/**
 * Helper to get user from request or return error
 */
export function getAuthUserOrError(
    request: NextRequest
): { user: AuthUser } | { error: NextResponse } {
    const user = getAuthUser(request);

    if (!user) {
        return {
            error: NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            ),
        };
    }

    return { user };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = () => requireRole('admin');

/**
 * Retailer-only middleware
 */
export const requireRetailer = () => requireRole('retailer');

/**
 * Customer-only middleware
 */
export const requireCustomer = () => requireRole('customer');

/**
 * Retailer or Admin middleware
 */
export const requireRetailerOrAdmin = () => requireRole('retailer', 'admin');

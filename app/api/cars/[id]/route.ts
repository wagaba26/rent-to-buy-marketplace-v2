import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireOwnership } from '@/lib/rbac';
import { AuditLogger } from '@/lib/audit-logger';
import { handleError } from '@/lib/errors';

/**
 * GET /api/cars/[id] - Get car details (role-based filtering)
 * PUT /api/cars/[id] - Update car (retailer only, ownership required)
 * DELETE /api/cars/[id] - Delete car (retailer only, ownership required)
 */

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const db = getDb();
        const user = getAuthUser(request);
        const vehicleId = params.id;

        // Get vehicle
        const result = await db.query(
            `SELECT v.*, r.business_name as retailer_name
       FROM vehicles v
       LEFT JOIN retailers r ON r.id = v.retailer_id
       WHERE v.id = $1`,
            [vehicleId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Vehicle not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        const vehicle = result.rows[0];

        // Role-based filtering
        if (!user || user.role === 'customer') {
            // Surface info only for customers/public
            const { retailer_id, retailer_name, vin, registration_number, ...surfaceInfo } = vehicle;
            return NextResponse.json({
                success: true,
                data: { vehicle: surfaceInfo },
            });
        }

        if (user.role === 'retailer') {
            // Retailers see full details only for own vehicles
            if (vehicle.retailer_id !== user.retailerId) {
                const { retailer_id, retailer_name, vin, registration_number, ...surfaceInfo } = vehicle;
                return NextResponse.json({
                    success: true,
                    data: { vehicle: surfaceInfo },
                });
            }
        }

        // Admin or owner sees everything
        return NextResponse.json({
            success: true,
            data: { vehicle },
        });
    } catch (error) {
        const errorResponse = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: errorResponse.message,
                    code: errorResponse.code,
                },
            },
            { status: errorResponse.statusCode }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        const user = getAuthUser(request);

        if (!user || user.role !== 'retailer') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only retailers can update vehicles',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const vehicleId = params.id;

        // Check ownership
        const hasOwnership = await requireOwnership('vehicle', vehicleId, user);

        if (!hasOwnership) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You can only update your own vehicles',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const db = getDb();

        // Build update query dynamically
        const allowedFields = [
            'price',
            'deposit_amount',
            'weekly_payment',
            'monthly_payment',
            'payment_term_months',
            'mileage',
            'status',
            'description',
        ];

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates.push(`${field} = $${paramIndex++}`);
                values.push(body[field]);
            }
        }

        if (updates.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'No valid fields to update',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(vehicleId);

        const query = `
      UPDATE vehicles
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, make, model, year, price, updated_at
    `;

        const result = await db.query(query, values);

        await AuditLogger.logVehicle('update', vehicleId, user.retailerId, ipAddress, {
            updatedFields: Object.keys(body),
        });

        return NextResponse.json({
            success: true,
            data: {
                message: 'Vehicle updated successfully',
                vehicle: result.rows[0],
            },
        });
    } catch (error) {
        const errorResponse = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: errorResponse.message,
                    code: errorResponse.code,
                },
            },
            { status: errorResponse.statusCode }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        const user = getAuthUser(request);

        if (!user || user.role !== 'retailer') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only retailers can delete vehicles',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const vehicleId = params.id;

        // Check ownership
        const hasOwnership = await requireOwnership('vehicle', vehicleId, user);

        if (!hasOwnership) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You can only delete your own vehicles',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const db = getDb();

        // Soft delete (update status to 'deleted')
        await db.query(
            `UPDATE vehicles SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [vehicleId]
        );

        await AuditLogger.logVehicle('delete', vehicleId, user.retailerId, ipAddress);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Vehicle deleted successfully',
            },
        });
    } catch (error) {
        const errorResponse = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: errorResponse.message,
                    code: errorResponse.code,
                },
            },
            { status: errorResponse.statusCode }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireOwnership } from '@/lib/rbac';
import { handleError } from '@/lib/errors';

/**
 * GET /api/applications/customer/[id] - Get customer's own applications
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = getAuthUser(request);

        if (!user || user.role !== 'customer') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only customers can view their applications',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const customerId = params.id;

        // Verify ownership
        if (customerId !== user.userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You can only view your own applications',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const db = getDb();

        // Get customer's applications
        const result = await db.query(
            `SELECT 
        ca.id, ca.status, ca.employment_status, ca.monthly_income,
        ca.rejection_reason, ca.approved_amount, ca.created_at, ca.updated_at,
        v.id as vehicle_id, v.make, v.model, v.year, v.price, v.images,
        r.business_name as retailer_name
       FROM credit_applications ca
       JOIN vehicles v ON v.id = ca.vehicle_id
       LEFT JOIN retailers r ON r.id = ca.retailer_id
       WHERE ca.customer_id = $1
       ORDER BY ca.created_at DESC`,
            [customerId]
        );

        return NextResponse.json({
            success: true,
            data: {
                applications: result.rows,
                count: result.rows.length,
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

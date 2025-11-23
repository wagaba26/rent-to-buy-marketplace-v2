import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/rbac';
import { AuditLogger } from '@/lib/audit-logger';
import { getAuthUser } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        // Check admin permission
        const authCheck = await requireAdmin()(request);
        if (authCheck) return authCheck;

        const user = getAuthUser(request)!;
        const body = await request.json();
        const { retailerId } = body;

        if (!retailerId) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Retailer ID is required',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        const db = getDb();

        // Get retailer details
        const retailerResult = await db.query(
            `SELECT r.*, u.email 
       FROM retailers r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1`,
            [retailerId]
        );

        if (retailerResult.rows.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Retailer not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        const retailer = retailerResult.rows[0];

        if (retailer.status !== 'pending') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `Retailer is already ${retailer.status}`,
                        code: 'INVALID_STATUS',
                    },
                },
                { status: 400 }
            );
        }

        // Approve retailer
        await db.query(
            `UPDATE retailers 
       SET status = 'approved', approval_date = CURRENT_TIMESTAMP, approved_by = $1
       WHERE id = $2`,
            [user.userId, retailerId]
        );

        // Update user status to active
        await db.query(
            `UPDATE users SET status = 'active' WHERE id = $1`,
            [retailer.user_id]
        );

        // Log approval
        await AuditLogger.logRetailer('approve', retailerId, user.userId, ipAddress, {
            businessName: retailer.business_name,
            approvedBy: user.email,
        });

        return NextResponse.json({
            success: true,
            data: {
                message: 'Retailer approved successfully',
                retailerId,
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

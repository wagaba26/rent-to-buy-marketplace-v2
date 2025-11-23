import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/rbac';
import { getAuthUser } from '@/lib/auth';
import { AuditLogger } from '@/lib/audit-logger';
import { handleError } from '@/lib/errors';

/**
 * PUT /api/applications/[id]/status - Update application status (admin only)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        // Check admin permission
        const authCheck = await requireAdmin()(request);
        if (authCheck) return authCheck;

        const user = getAuthUser(request)!;
        const applicationId = params.id;
        const body = await request.json();
        const { status, rejectionReason, approvedAmount, approvedTerms } = body;

        if (!status) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Status is required',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'withdrawn'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid status',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        const db = getDb();

        // Get current application
        const appResult = await db.query(
            'SELECT * FROM credit_applications WHERE id = $1',
            [applicationId]
        );

        if (appResult.rows.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Application not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        const currentApp = appResult.rows[0];

        // Update application
        const result = await db.query(
            `UPDATE credit_applications 
       SET status = $1, 
           rejection_reason = $2,
           approved_amount = $3,
           approved_terms = $4,
           reviewed_by = $5,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
            [
                status,
                status === 'rejected' ? rejectionReason : null,
                status === 'approved' ? approvedAmount : null,
                status === 'approved' ? JSON.stringify(approvedTerms || {}) : null,
                user.userId,
                applicationId,
            ]
        );

        // Log status change
        await AuditLogger.logApplication(
            'status_change',
            applicationId,
            user.userId,
            ipAddress,
            {
                oldStatus: currentApp.status,
                newStatus: status,
                rejectionReason,
            }
        );

        return NextResponse.json({
            success: true,
            data: {
                message: 'Application status updated successfully',
                application: result.rows[0],
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

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { AuditLogger } from '@/lib/audit-logger';
import { handleError } from '@/lib/errors';

/**
 * GET /api/admin/audit-logs - Get audit logs (admin only)
 */
export async function GET(request: NextRequest) {
    try {
        // Check admin permission
        const authCheck = await requireAdmin()(request);
        if (authCheck) return authCheck;

        const { searchParams } = new URL(request.url);

        const userId = searchParams.get('userId');
        const action = searchParams.get('action');
        const resourceType = searchParams.get('resourceType');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        const filters: any = {
            limit,
            offset,
        };

        if (userId) filters.userId = userId;
        if (action) filters.action = action;
        if (resourceType) filters.resourceType = resourceType;
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);

        const logs = await AuditLogger.getLogs(filters);

        return NextResponse.json({
            success: true,
            data: {
                logs,
                count: logs.length,
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

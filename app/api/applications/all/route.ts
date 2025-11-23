import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/rbac';
import { getAuthUser } from '@/lib/auth';
import { AuditLogger } from '@/lib/audit-logger';
import { handleError } from '@/lib/errors';

/**
 * GET /api/applications/all - Get all applications (admin only)
 * PUT /api/applications/[id]/status - Update application status (admin only)
 */

export async function GET(request: NextRequest) {
    try {
        // Check admin permission
        const authCheck = await requireAdmin()(request);
        if (authCheck) return authCheck;

        const db = getDb();
        const { searchParams } = new URL(request.url);

        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = `
      SELECT 
        ca.*, 
        v.make, v.model, v.year, v.price as vehicle_price,
        u.email as customer_email, u.first_name, u.last_name,
        r.business_name as retailer_name,
        cs.score as credit_score, cs.tier as credit_tier
      FROM credit_applications ca
      JOIN vehicles v ON v.id = ca.vehicle_id
      JOIN users u ON u.id = ca.customer_id
      LEFT JOIN retailers r ON r.id = ca.retailer_id
      LEFT JOIN credit_scores cs ON cs.id = ca.credit_score_id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND ca.status = $${paramIndex++}`;
            params.push(status);
        }

        query += ` ORDER BY ca.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

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

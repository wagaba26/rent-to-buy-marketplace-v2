import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/rbac';
import { handleError } from '@/lib/errors';

/**
 * GET /api/admin/retailers - List all retailers (admin only)
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
        r.*,
        u.email, u.status as user_status,
        COUNT(DISTINCT v.id) as vehicle_count,
        COUNT(DISTINCT ca.id) as application_count
      FROM retailers r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.retailer_id = r.id
      LEFT JOIN credit_applications ca ON ca.retailer_id = r.id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND r.status = $${paramIndex++}`;
            params.push(status);
        }

        query += ` GROUP BY r.id, u.email, u.status`;
        query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM retailers WHERE 1=1';
        const countParams: any[] = [];

        if (status) {
            countQuery += ` AND status = $1`;
            countParams.push(status);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        return NextResponse.json({
            success: true,
            data: {
                retailers: result.rows,
                count: result.rows.length,
                total,
                limit,
                offset,
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

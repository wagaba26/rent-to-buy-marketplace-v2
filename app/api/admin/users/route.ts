import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/rbac';
import { handleError } from '@/lib/errors';

/**
 * GET /api/admin/users - List all users (admin only)
 */
export async function GET(request: NextRequest) {
    try {
        // Check admin permission
        const authCheck = await requireAdmin()(request);
        if (authCheck) return authCheck;

        const db = getDb();
        const { searchParams } = new URL(request.url);

        const role = searchParams.get('role');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = `
      SELECT 
        u.id, u.email, u.role, u.status, u.first_name, u.last_name,
        u.phone_number, u.created_at, u.updated_at,
        r.id as retailer_id, r.business_name, r.status as retailer_status
      FROM users u
      LEFT JOIN retailers r ON r.user_id = u.id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (role) {
            query += ` AND u.role = $${paramIndex++}`;
            params.push(role);
        }

        if (status) {
            query += ` AND u.status = $${paramIndex++}`;
            params.push(status);
        }

        query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const countParams: any[] = [];
        let countIndex = 1;

        if (role) {
            countQuery += ` AND role = $${countIndex++}`;
            countParams.push(role);
        }

        if (status) {
            countQuery += ` AND status = $${countIndex}`;
            countParams.push(status);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        return NextResponse.json({
            success: true,
            data: {
                users: result.rows,
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

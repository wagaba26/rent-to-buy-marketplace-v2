import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { handleError } from '@/lib/errors';

export async function GET(request: NextRequest) {
    try {
        const db = getDb();

        const result = await db.query(
            `SELECT id, name, description, created_at, updated_at
       FROM vehicle_categories
       ORDER BY name ASC`
        );

        return NextResponse.json({
            success: true,
            data: {
                categories: result.rows,
            },
        });
    } catch (error) {
        const errorResponse = handleError(error);
        return NextResponse.json(
            { success: false, error: { message: errorResponse.message, code: errorResponse.code } },
            { status: errorResponse.statusCode }
        );
    }
}

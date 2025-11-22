import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { NotFoundError, handleError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = getDb();

    const result = await db.query(
      `SELECT 
        v.*, c.id as category_id, c.name as category_name, c.description as category_description
       FROM vehicles v
       LEFT JOIN vehicle_categories c ON v.category_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Vehicle not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Get active reservations
    const reservations = await db.query(
      `SELECT id, user_id, status, reserved_until, expires_at, created_at
       FROM vehicle_reservations
       WHERE vehicle_id = $1 AND status IN ('pending', 'approved')
       ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        vehicle: result.rows[0],
        reservations: reservations.rows,
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


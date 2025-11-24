import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyToken(token);

        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Get KYC status
        const result = await pool.query(
            `SELECT status, submitted_at, verified_at, rejection_reason
       FROM kyc_verifications 
       WHERE user_id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    status: 'not_started',
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error: any) {
        console.error('KYC status error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get KYC status' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const {
            firstName,
            lastName,
            dateOfBirth,
            nin,
            phone,
            identityDocuments,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            addressDocuments,
            employmentStatus,
            monthlyIncome,
            incomeDocuments,
        } = body;

        // Check if KYC already exists
        const existing = await pool.query(
            'SELECT id, status FROM kyc_verifications WHERE user_id = $1',
            [decoded.userId]
        );

        if (existing.rows.length > 0 && existing.rows[0].status !== 'rejected') {
            return NextResponse.json(
                { success: false, error: 'KYC already submitted' },
                { status: 400 }
            );
        }

        // Create or update KYC record
        const documents = {
            identity: identityDocuments || [],
            address: addressDocuments || [],
            income: incomeDocuments || [],
        };

        if (existing.rows.length > 0) {
            // Update existing
            await pool.query(
                `UPDATE kyc_verifications 
         SET status = 'pending',
             document_type = 'national_id',
             document_url = $1,
             submitted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [JSON.stringify(documents), decoded.userId]
            );
        } else {
            // Create new
            await pool.query(
                `INSERT INTO kyc_verifications 
         (user_id, status, document_type, document_url, submitted_at, created_at, updated_at)
         VALUES ($1, 'pending', 'national_id', $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [decoded.userId, JSON.stringify(documents)]
            );
        }

        // Update user details
        await pool.query(
            `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, nin = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
            [firstName, lastName, phone, nin, decoded.userId]
        );

        return NextResponse.json({
            success: true,
            data: {
                message: 'KYC submitted successfully',
            },
        });
    } catch (error: any) {
        console.error('KYC submission error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to submit KYC' },
            { status: 500 }
        );
    }
}

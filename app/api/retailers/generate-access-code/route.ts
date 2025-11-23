import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/rbac';
import { AuditLogger } from '@/lib/audit-logger';
import { getAuthUser } from '@/lib/auth';
import { handleError } from '@/lib/errors';

/**
 * Generate Access Code for Approved Retailer
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        // Check admin permission
        const authCheck = await requireAdmin()(request);
        if (authCheck) return authCheck;

        const user = getAuthUser(request)!;
        const body = await request.json();
        const { retailerId, expiresInDays = 30 } = body;

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

        // Verify retailer exists and is approved
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

        if (retailer.status !== 'approved') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Retailer must be approved before generating access code',
                        code: 'INVALID_STATUS',
                    },
                },
                { status: 400 }
            );
        }

        // Generate unique access code (16 characters, alphanumeric)
        const accessCode = crypto.randomBytes(12).toString('base64')
            .replace(/[+/=]/g, '')
            .substring(0, 16)
            .toUpperCase();

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Store access code
        await db.query(
            `INSERT INTO retailer_access_codes (code, retailer_id, generated_by, expires_at)
       VALUES ($1, $2, $3, $4)`,
            [accessCode, retailerId, user.userId, expiresAt]
        );

        // Log access code generation
        await AuditLogger.logRetailer('access_code_generated', retailerId, user.userId, ipAddress, {
            businessName: retailer.business_name,
            generatedBy: user.email,
            expiresAt: expiresAt.toISOString(),
        });

        return NextResponse.json({
            success: true,
            data: {
                message: 'Access code generated successfully',
                accessCode,
                retailerId,
                expiresAt: expiresAt.toISOString(),
                warning: 'This code will only be shown once. Please save it securely.',
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

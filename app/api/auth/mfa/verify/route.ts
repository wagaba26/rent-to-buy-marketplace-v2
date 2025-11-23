import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { MFAService } from '@/lib/mfa';
import { AuditLogger } from '@/lib/audit-logger';
import { handleError } from '@/lib/errors';

/**
 * Verify MFA token and enable MFA
 */
export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        const user = getAuthUser(request);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'MFA token is required',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        // Verify token
        const valid = await MFAService.verifyToken(user.userId, token);

        if (!valid) {
            await AuditLogger.logSecurity('mfa_verification_failed', user.userId, ipAddress);

            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid MFA token',
                        code: 'INVALID_MFA_TOKEN',
                    },
                },
                { status: 401 }
            );
        }

        // Enable MFA
        await MFAService.enableMFA(user.userId);

        await AuditLogger.logSecurity('mfa_enabled', user.userId, ipAddress);

        return NextResponse.json({
            success: true,
            data: {
                message: 'MFA enabled successfully',
                enabled: true,
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

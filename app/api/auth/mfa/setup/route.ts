import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { MFAService } from '@/lib/mfa';
import { AuditLogger } from '@/lib/audit-logger';
import { handleError } from '@/lib/errors';

/**
 * Setup MFA for authenticated user
 * Returns QR code and backup codes
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

        // Generate MFA secret
        const mfaData = await MFAService.generateSecret(user.userId, user.email);

        await AuditLogger.logSecurity('mfa_setup_initiated', user.userId, ipAddress);

        return NextResponse.json({
            success: true,
            data: {
                secret: mfaData.secret,
                qrCode: mfaData.qrCode,
                backupCodes: mfaData.backupCodes,
                message: 'Scan the QR code with your authenticator app and verify to enable MFA',
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

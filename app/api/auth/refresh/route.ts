import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, storeRefreshToken, isRefreshTokenRevoked, revokeRefreshToken } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { getDb } from '@/lib/db';

/**
 * Refresh Access Token
 * Accepts refresh token and issues new access token
 */
export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        const body = await request.json();
        const { refreshToken } = body;

        if (!refreshToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Refresh token is required',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        // Verify refresh token
        const user = verifyRefreshToken(refreshToken);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid refresh token',
                        code: 'INVALID_TOKEN',
                    },
                },
                { status: 401 }
            );
        }

        // Check if token is revoked
        const revoked = await isRefreshTokenRevoked(refreshToken);

        if (revoked) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Refresh token has been revoked',
                        code: 'TOKEN_REVOKED',
                    },
                },
                { status: 401 }
            );
        }

        // Get retailer ID if user is retailer
        let retailerId: string | undefined;
        if (user.role === 'retailer') {
            const db = getDb();
            const retailerResult = await db.query(
                'SELECT id FROM retailers WHERE user_id = $1',
                [user.userId]
            );

            if (retailerResult.rows.length > 0) {
                retailerId = retailerResult.rows[0].id;
            }
        }

        const authUser = {
            ...user,
            retailerId,
        };

        // Generate new access token
        const newAccessToken = generateAccessToken(authUser);

        // Optionally rotate refresh token (recommended for security)
        const rotateRefreshToken = process.env.ROTATE_REFRESH_TOKENS === 'true';
        let newRefreshToken = refreshToken;

        if (rotateRefreshToken) {
            // Revoke old refresh token
            await revokeRefreshToken(refreshToken);

            // Generate new refresh token
            newRefreshToken = generateRefreshToken(authUser);

            // Store new refresh token
            await storeRefreshToken(newRefreshToken, user.userId, { userAgent }, ipAddress);
        }

        return NextResponse.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
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
